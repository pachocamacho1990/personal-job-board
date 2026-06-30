import json
import jwt
import logging
import asyncio
from contextlib import asynccontextmanager
from typing import Dict, Any
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
                # Handle active run cancellation checks before running a new one
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
                # Cancel the active runner for this conversation
                task = active_tasks.get(conversation_id)
                if task and not task.done():
                    logger.info(f"Cancelling active generation run for conversation {conversation_id}")
                    task.cancel()
                    # WebSocket event back to client to clear isGenerating state immediately
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
                # Load selected conversation
                selected_id = int(message_data.get("conversation_id"))
                conversation_id = selected_id
                logger.info(f"User switched to conversation {conversation_id}")
                
                # Retrieve history
                history = await db_manager.get_conversation_history(conversation_id)
                
                # Stream back select success
                await websocket.send_json({
                    "event": "history",
                    "messages": history,
                    "onboardingStatus": onboarding_status,
                    "conversationId": conversation_id
                })

            elif event_type == "new_conversation":
                # Create a new conversation record
                new_id = await db_manager.create_new_conversation(user_id)
                conversation_id = new_id
                logger.info(f"User created new conversation {conversation_id}")
                
                # Seed welcome prompt
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
                
                # Stream new chat and updated conversation list
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
                
                # Cancel task if deleting active
                task = active_tasks.get(del_id)
                if task and not task.done():
                    task.cancel()

                await db_manager.delete_conversation(del_id)
                
                # If deleted active, switch to latest or create new one
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
        # Notify frontend that inference is active
        await websocket.send_json({"event": "generation_started"})

        while loop_count < loop_limit:
            loop_count += 1
            
            history = await db_manager.get_conversation_history(conversation_id)
            
            # Send history to LLM
            content, tool_calls = await llm_manager.get_response(history, tools=WORKSPACE_TOOLS_SCHEMAS)
            
            if tool_calls:
                for tool_call in tool_calls:
                    tool_name = tool_call.function.name
                    tool_args = json.loads(tool_call.function.arguments)
                    
                    logger.info(f"Agent requested tool execution: '{tool_name}'")
                    
                    # Update message logs in DB
                    await db_manager.save_message(
                        conversation_id=conversation_id,
                        role="tool",
                        type_name="tool_call",
                        content=f"Ejecutando {tool_name}...",
                        tool_name=tool_name,
                        tool_input=tool_args
                    )
                    
                    # Clear generic thinking placeholder
                    async with db_manager.pool.acquire() as conn:
                        await conn.execute("DELETE FROM agent_messages WHERE id = $1", current_thinking_id)
                    
                    await stream_current_history(websocket, conversation_id)
                    
                    # Execute tool
                    tool_result = await execute_tool(tool_name, tool_args, user_token)
                    
                    # Save tool output
                    await db_manager.save_message(
                        conversation_id=conversation_id,
                        role="tool",
                        type_name="tool_result",
                        content=json.dumps(tool_result),
                        tool_name=tool_name,
                        tool_output=tool_result
                    )
                    
                    # Seed next loop thinking placeholder
                    current_thinking_id = await db_manager.save_message(
                        conversation_id=conversation_id,
                        role="agent",
                        type_name="thinking",
                        content="Pensando..."
                    )
                    
                    await stream_current_history(websocket, conversation_id)
                    
                # Loop again to feed tool result back
                continue
                
            else:
                # Save final text answer
                if content:
                    await db_manager.save_message(
                        conversation_id=conversation_id,
                        role="agent",
                        type_name="chat",
                        content=content
                    )
                
                # Delete thinking placeholder
                async with db_manager.pool.acquire() as conn:
                    await conn.execute("DELETE FROM agent_messages WHERE id = $1", current_thinking_id)
                    
                await stream_current_history(websocket, conversation_id)
                break

    except asyncio.CancelledError:
        logger.info(f"Run loop canceled for conversation {conversation_id}")
        # Clean up temporary thinking blocks
        try:
            async with db_manager.pool.acquire() as conn:
                await conn.execute("DELETE FROM agent_messages WHERE id = $1", current_thinking_id)
            
            # Save cancellation placeholder message
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
        # Notify frontend that inference ended
        try:
            await websocket.send_json({"event": "generation_stopped"})
        except:
            pass

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
