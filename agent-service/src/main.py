import json
import jwt
import logging
import asyncio
from contextlib import asynccontextmanager
from typing import Dict, Any, List
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from src.config import settings
from src.db import db_manager
from src.llm import llm_manager
from src.tools.workspace_tools import WORKSPACE_TOOLS_SCHEMAS, execute_tool

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)

# Track active tasks for each active conversation
active_tasks: Dict[int, asyncio.Task] = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Connect PostgreSQL database pool
    await db_manager.connect()
    yield
    # Shutdown: Close database pool
    await db_manager.disconnect()

app = FastAPI(
    title="Zenith AI Agent Microservice",
    description="Agent service handling WebSockets, LLM connection, and workspace tool calls.",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def decode_token(token: str) -> Dict[str, Any]:
    """Decode JWT token using Express secret key"""
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        logger.error("JWT token has expired")
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError as e:
        logger.error(f"Invalid JWT token: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "zenith-agent-backend"}

async def auto_title_conversation(conversation_id: int, user_message: str):
    """Generates a brief title based on the user's first query"""
    try:
        prompt = (
            "Genera un título ultra corto (máximo 4 palabras, sin comillas, directo, sin puntos finales) "
            f"en español que resuma esta solicitud del usuario:\n'{user_message}'"
        )
        content, _ = await llm_manager.get_response([{"role": "user", "content": prompt}], tools=None)
        if content and len(content.strip()) < 50:
            title = content.strip().strip('"').strip("'")
            logger.info(f"Auto-titled conversation {conversation_id} to '{title}'")
            await db_manager.update_conversation_title(conversation_id, title)
    except Exception as e:
        logger.error(f"Failed to auto-title conversation {conversation_id}: {e}")

async def get_adaptive_system_prompt(user_id: int) -> str:
    """Assembles the system prompt in real-time by prepending user preferences and skills"""
    memories = await db_manager.get_user_memories(user_id)
    skills = await db_manager.get_user_skills(user_id)
    
    base_instructions = (
        "Eres Zenith Agent, un asistente de IA inteligente de búsqueda de empleo.\n"
        "Puedes interactuar con el espacio de trabajo del usuario (job boards, tarjetas de empleo) "
        "y administrar tus preferencias usando las herramientas suministradas.\n"
        "Sé directo, profesional y mantén tus respuestas concisas en español."
    )
    
    memories_section = ""
    if memories:
        memories_section = "\n\n## PREFERENCIAS Y HECHOS DEL USUARIO (Memoria Permanente)\n"
        for m in memories:
            category_label = "Preferencia" if m["category"] == "preference" else "Hecho"
            memories_section += f"- [{category_label} ID: {m['id']}]: {m['content']}\n"
            
    skills_section = ""
    if skills:
        skills_section = "\n\n## SKILLS/HABILIDADES APRENDIDAS (Recetas Ejecutables)\n"
        for s in skills:
            skills_section += f"- Skill '{s['name']}': {s['description']} (Receta: {json.dumps(s['recipe'])})\n"
            
    return base_instructions + memories_section + skills_section

async def run_background_preference_extraction(conversation_id: int, user_id: int):
    """
    Evaluates the conversation turns to passively extract user preferences or facts 
    and save them into the database, simulating Nous Research Hermes learning loops.
    """
    try:
        # Load the latest few messages
        history = await db_manager.get_conversation_history(conversation_id)
        if len(history) < 2:
            return

        # Fetch existing memories to avoid redundant duplicates
        existing_memories = await db_manager.get_user_memories(user_id)
        existing_contents = [m["content"].lower().strip() for m in existing_memories]

        # Extract only the last 4 turns to focus on new context
        recent_turns = history[-4:]
        turns_text = ""
        for t in recent_turns:
            turns_text += f"{t['role'].upper()}: {t['content']}\n"

        prompt = (
            "Eres un extractor de preferencias para Zenith Agent. Analiza el siguiente fragmento de diálogo "
            "e identifica si el usuario expresó de forma explícita alguna preferencia o regla general sobre "
            "cómo Zenith Agent debería gestionar sus ofertas, salarios, ubicaciones o tableros (ej. 'Prefiere empleos remotos', "
            "'Ignorar ofertas de Acme Corp').\n\n"
            "Diálogo reciente:\n"
            f"{turns_text}\n"
            "Responde estrictamente con un array JSON de objetos con formato:\n"
            '[{"category": "preference" o "fact", "content": "directiva de 3-10 palabras en español"}]\n'
            "Si no se expresan nuevas preferencias permanentes, responde únicamente con un array vacío [].\n"
            "No incluyas explicaciones ni formato markdown de bloque (sin ```json)."
        )

        content, _ = await llm_manager.get_response([{"role": "user", "content": prompt}], tools=None)
        if not content:
            return

        cleaned_content = content.strip()
        if cleaned_content.startswith("```"):
            lines = cleaned_content.split("\n")
            cleaned_content = "\n".join([line for line in lines if not line.startswith("```")])
        
        parsed_memories = json.loads(cleaned_content)
        if isinstance(parsed_memories, list) and len(parsed_memories) > 0:
            for item in parsed_memories:
                category = item.get("category", "preference")
                content_text = item.get("content", "").strip()
                
                if not content_text or content_text.lower().strip() in existing_contents:
                    continue
                    
                logger.info(f"Background extractor auto-saved new preference: '{content_text}' for user {user_id}")
                await db_manager.save_user_memory(user_id, category, content_text)
                
    except Exception as e:
        logger.error(f"Error in background preference extraction: {e}")

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    """
    WebSocket endpoint handling real-time agent communications, tool executions,
    conversation switcher states, and run cancellations.
    """
    await websocket.accept()
    logger.info("New WebSocket connection request accepted")

    try:
        # 1. Authenticate user
        payload = decode_token(token)
        user_id = payload.get("userId")
        email = payload.get("email")
        if not user_id:
            logger.error("Token payload is missing 'userId'")
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token payload")
            return

        logger.info(f"User {email} (ID: {user_id}) successfully authenticated over WebSocket")

        # 2. Get onboarding status and active conversation
        onboarding_status = await db_manager.get_onboarding_status(user_id)
        conversation_id = await db_manager.get_or_create_conversation(user_id)
        logger.info(f"Active conversation: {conversation_id} for user {user_id}")

        # Seed initial message if empty
        history = await db_manager.get_conversation_history(conversation_id)
        if not history:
            initial_msg = get_initial_welcome_message(onboarding_status)
            if initial_msg:
                await db_manager.save_message(
                    conversation_id=conversation_id,
                    role="agent",
                    type_name=initial_msg["type"],
                    content=initial_msg["content"],
                    actions=initial_msg.get("actions")
                )
                history = await db_manager.get_conversation_history(conversation_id)

        # Send initial history and conversations list
        conversations = await db_manager.get_user_conversations(user_id)
        await websocket.send_json({
            "event": "history",
            "messages": history,
            "onboardingStatus": onboarding_status,
            "conversationId": conversation_id
        })
        await websocket.send_json({
            "event": "conversations_list",
            "conversations": conversations
        })

        # 3. Message Loop
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            event_type = message_data.get("event")
            
            if event_type == "message" or event_type == "action":
                if conversation_id in active_tasks:
                    logger.warn(f"Task already active for conversation {conversation_id}. Rejecting new run.")
                    continue

                user_text = ""
                if event_type == "message":
                    user_text = message_data.get("content", "").strip()
                else:
                    action_name = message_data.get("action")
                    user_text = message_data.get("label", action_name)

                if not user_text:
                    continue

                # Save user message to Postgres
                await db_manager.save_message(
                    conversation_id=conversation_id,
                    role="user",
                    type_name="chat",
                    content=user_text
                )
                
                # Check if this is the first user message to trigger auto-titling in background
                user_msg_count = sum(1 for m in history if m["role"] == "user")
                if user_msg_count == 0:
                    asyncio.create_task(auto_title_conversation(conversation_id, user_text))

                # Create placeholder thinking block
                thinking_msg_id = await db_manager.save_message(
                    conversation_id=conversation_id,
                    role="agent",
                    type_name="thinking",
                    content="Procesando..."
                )
                
                await stream_current_history(websocket, conversation_id)

                # Spawn loop runner as an asyncio task to support stop cancellation
                task = asyncio.create_task(
                    run_agent_loop(websocket, conversation_id, user_id, token, thinking_msg_id)
                )
                active_tasks[conversation_id] = task
                
                # Clean up task reference on done
                def make_cleanup(cid):
                    return lambda t: active_tasks.pop(cid, None)
                task.add_done_callback(make_cleanup(conversation_id))

            elif event_type == "stop_generation":
                task = active_tasks.get(conversation_id)
                if task and not task.done():
                    logger.info(f"Cancelling active generation run for conversation {conversation_id}")
                    task.cancel()
                    await websocket.send_json({"event": "generation_stopped"})
                else:
                    logger.warn("Stop generation requested but no active task was found")

            elif event_type == "list_conversations":
                convs = await db_manager.get_user_conversations(user_id)
                await websocket.send_json({
                    "event": "conversations_list",
                    "conversations": convs
                })

            elif event_type == "select_conversation":
                selected_id = int(message_data.get("conversation_id"))
                conversation_id = selected_id
                logger.info(f"User switched to conversation {conversation_id}")
                
                history = await db_manager.get_conversation_history(conversation_id)
                await websocket.send_json({
                    "event": "history",
                    "messages": history,
                    "onboardingStatus": onboarding_status,
                    "conversationId": conversation_id
                })

            elif event_type == "new_conversation":
                new_id = await db_manager.create_new_conversation(user_id)
                conversation_id = new_id
                logger.info(f"User created new conversation {conversation_id}")
                
                initial_msg = get_initial_welcome_message(onboarding_status)
                if initial_msg:
                    await db_manager.save_message(
                        conversation_id=conversation_id,
                        role="agent",
                        type_name=initial_msg["type"],
                        content=initial_msg["content"],
                        actions=initial_msg.get("actions")
                    )
                
                history = await db_manager.get_conversation_history(conversation_id)
                convs = await db_manager.get_user_conversations(user_id)
                
                await websocket.send_json({
                    "event": "history",
                    "messages": history,
                    "onboardingStatus": onboarding_status,
                    "conversationId": conversation_id
                })
                await websocket.send_json({
                    "event": "conversations_list",
                    "conversations": convs
                })

            elif event_type == "delete_conversation":
                del_id = int(message_data.get("conversation_id"))
                logger.info(f"User deleted conversation {del_id}")
                
                task = active_tasks.get(del_id)
                if task and not task.done():
                    task.cancel()

                await db_manager.delete_conversation(del_id)
                
                if del_id == conversation_id:
                    conversation_id = await db_manager.get_or_create_conversation(user_id)
                    history = await db_manager.get_conversation_history(conversation_id)
                    await websocket.send_json({
                        "event": "history",
                        "messages": history,
                        "onboardingStatus": onboarding_status,
                        "conversationId": conversation_id
                    })

                convs = await db_manager.get_user_conversations(user_id)
                await websocket.send_json({
                    "event": "conversations_list",
                    "conversations": convs
                })

    except WebSocketDisconnect:
        logger.info("WebSocket connection closed by client")
    except Exception as e:
        logger.error(f"Unexpected error in WebSocket session: {e}", exc_info=True)
        try:
            await websocket.close(code=status.WS_1011_INTERNAL_ERROR, reason=str(e))
        except:
            pass

async def stream_current_history(websocket: WebSocket, conversation_id: int):
    """Refreshes and sends the active message logs list to the client"""
    history = await db_manager.get_conversation_history(conversation_id)
    await websocket.send_json({
        "event": "messages_update",
        "messages": history
    })

async def run_agent_loop(websocket: WebSocket, conversation_id: int, user_id: int, user_token: str, thinking_msg_id: int):
    """
    Core reasoning loop wrapped in an asyncio task to support stop cancellations.
    """
    current_thinking_id = thinking_msg_id
    loop_limit = 5
    loop_count = 0

    try:
        await websocket.send_json({"event": "generation_started"})

        while loop_count < loop_limit:
            loop_count += 1
            
            history = await db_manager.get_conversation_history(conversation_id)
            
            # Assemble dynamic system prompt and prepend it to the LLM message payload on EVERY turn (adaptive prompt)
            system_prompt = await get_adaptive_system_prompt(user_id)
            messages_payload = [{"role": "system", "content": system_prompt}] + history
            
            # Send payload to LLM
            content, tool_calls = await llm_manager.get_response(messages_payload, tools=WORKSPACE_TOOLS_SCHEMAS)
            
            if tool_calls:
                for tool_call in tool_calls:
                    tool_name = tool_call.function.name
                    tool_args = json.loads(tool_call.function.arguments)
                    
                    logger.info(f"Agent requested tool execution: '{tool_name}'")
                    
                    await db_manager.save_message(
                        conversation_id=conversation_id,
                        role="tool",
                        type_name="tool_call",
                        content=f"Ejecutando {tool_name}...",
                        tool_name=tool_name,
                        tool_input=tool_args
                    )
                    
                    async with db_manager.pool.acquire() as conn:
                        await conn.execute("DELETE FROM agent_messages WHERE id = $1", current_thinking_id)
                    
                    await stream_current_history(websocket, conversation_id)
                    
                    # Execute tool (passing user_id for memory-modifying tools)
                    tool_result = await execute_tool(tool_name, tool_args, user_token, user_id)
                    
                    await db_manager.save_message(
                        conversation_id=conversation_id,
                        role="tool",
                        type_name="tool_result",
                        content=json.dumps(tool_result),
                        tool_name=tool_name,
                        tool_output=tool_result
                    )
                    
                    current_thinking_id = await db_manager.save_message(
                        conversation_id=conversation_id,
                        role="agent",
                        type_name="thinking",
                        content="Pensando..."
                    )
                    
                    await stream_current_history(websocket, conversation_id)
                    
                continue
                
            else:
                if content:
                    await db_manager.save_message(
                        conversation_id=conversation_id,
                        role="agent",
                        type_name="chat",
                        content=content
                    )
                
                async with db_manager.pool.acquire() as conn:
                    await conn.execute("DELETE FROM agent_messages WHERE id = $1", current_thinking_id)
                    
                await stream_current_history(websocket, conversation_id)
                break

    except asyncio.CancelledError:
        logger.info(f"Run loop canceled for conversation {conversation_id}")
        try:
            async with db_manager.pool.acquire() as conn:
                await conn.execute("DELETE FROM agent_messages WHERE id = $1", current_thinking_id)
            
            await db_manager.save_message(
                conversation_id=conversation_id,
                role="agent",
                type_name="chat",
                content="*Generación cancelada por el usuario.*"
            )
            await stream_current_history(websocket, conversation_id)
        except Exception as e:
            logger.error(f"Error executing cancel cleanup: {e}")
        raise

    finally:
        try:
            await websocket.send_json({"event": "generation_stopped"})
        except:
            pass
            
        # Trigger background consolidation loop to learn preferences asynchronously after response finishes
        asyncio.create_task(run_background_preference_extraction(conversation_id, user_id))

def get_initial_welcome_message(status_str: str) -> Dict[str, Any]:
    """Provides seed onboarding blocks based on user state"""
    if status_str == "uninitialized":
        return {
            "type": "action",
            "content": "¡Hola! 👋 Soy **Zenith Agent**, tu asistente inteligente de búsqueda laboral.\n\nNoté que aún no tengo contexto de tu perfil profesional. ¿Quieres que investigue tu LinkedIn para entender tu experiencia y habilidades?",
            "actions": [
                { "label": "✅ Sí, investiga mi LinkedIn", "action": "start_linkedin", "variant": "primary" },
                { "label": "⏭ Después", "action": "dismiss", "variant": "secondary" }
            ]
        }
    return {
        "type": "chat",
        "content": "¡Hola! ¿En qué puedo ayudarte hoy con tu espacio de trabajo? Puedes pedirme que liste tus tableros, cree nuevos tableros o mueva/archive tus tarjetas."
    }
