import json
import jwt
import logging
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

# CORS middleware for standalone local access if needed
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

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    """
    WebSocket endpoint handling real-time agent communications and tool executions.
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

        # 2. Get onboarding status and conversation
        onboarding_status = await db_manager.get_onboarding_status(user_id)
        conversation_id = await db_manager.get_or_create_conversation(user_id)
        logger.info(f"Using conversation {conversation_id} for user {user_id}")

        # If conversation is empty, save the initial action prompt
        history = await db_manager.get_conversation_history(conversation_id)
        if not history:
            # We seed the DB with the initial message based on onboarding status
            initial_msg = get_initial_welcome_message(onboarding_status)
            if initial_msg:
                msg_id = await db_manager.save_message(
                    conversation_id=conversation_id,
                    role="agent",
                    type_name=initial_msg["type"],
                    content=initial_msg["content"],
                    actions=initial_msg.get("actions")
                )
                history = await db_manager.get_conversation_history(conversation_id)

        # 3. Stream history back to the client immediately
        await websocket.send_json({
            "event": "history",
            "messages": history,
            "onboardingStatus": onboarding_status
        })

        # 4. Message Loop
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            event_type = message_data.get("event")
            
            if event_type == "message":
                user_text = message_data.get("content", "").strip()
                if not user_text:
                    continue

                logger.info(f"Received message from user {user_id}: '{user_text}'")
                
                # Save user message to PostgreSQL
                await db_manager.save_message(
                    conversation_id=conversation_id,
                    role="user",
                    type_name="chat",
                    content=user_text
                )
                
                # Notify client about incoming user message save (to synch states if needed)
                # and send a 'thinking' state back to frontend
                thinking_msg_id = await db_manager.save_message(
                    conversation_id=conversation_id,
                    role="agent",
                    type_name="thinking",
                    content="Procesando solicitud..."
                )
                
                await stream_current_history(websocket, conversation_id)
                
                # Run the Agent Reasoning Loop
                await run_agent_loop(websocket, conversation_id, user_id, token, thinking_msg_id)

            elif event_type == "action":
                # Handle inline action buttons
                action_name = message_data.get("action")
                logger.info(f"Received action click from user {user_id}: '{action_name}'")
                
                # Convert action click into a simulated user response
                action_label = message_data.get("label", action_name)
                
                # Save user action as message
                await db_manager.save_message(
                    conversation_id=conversation_id,
                    role="user",
                    type_name="chat",
                    content=action_label
                )
                
                # Create thinking message
                thinking_msg_id = await db_manager.save_message(
                    conversation_id=conversation_id,
                    role="agent",
                    type_name="thinking",
                    content="Procesando acción..."
                )
                
                await stream_current_history(websocket, conversation_id)
                
                # Run the Agent Reasoning Loop (can check actions)
                await run_agent_loop(websocket, conversation_id, user_id, token, thinking_msg_id)

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
    Core reasoning loop:
    1. Query LLM with history and available workspace tools.
    2. If it returns text, overwrite the 'thinking' block with the final response.
    3. If it calls a tool:
       - Update 'thinking' to 'tool_call' to log the event.
       - Execute HTTP requests using user credentials.
       - Save 'tool_result' and loop again.
    """
    loop_limit = 5
    loop_count = 0
    
    current_thinking_id = thinking_msg_id

    while loop_count < loop_limit:
        loop_count += 1
        
        # Load conversation history up to this point
        history = await db_manager.get_conversation_history(conversation_id)
        
        # Send history to LLM
        content, tool_calls = await llm_manager.get_response(history, tools=WORKSPACE_TOOLS_SCHEMAS)
        
        if tool_calls:
            for tool_call in tool_calls:
                tool_name = tool_call.function.name
                tool_args = json.loads(tool_call.function.arguments)
                
                logger.info(f"Agent requested tool execution: '{tool_name}' with arguments {tool_args}")
                
                # Update the thinking block to be a tool call block in DB
                # This changes the visual layout on the client instantly!
                await db_manager.save_message(
                    conversation_id=conversation_id,
                    role="tool",
                    type_name="tool_call",
                    content=f"Ejecutando {tool_name}...",
                    tool_name=tool_name,
                    tool_input=tool_args
                )
                
                # Remove the generic thinking bubble once tool call starts
                async with db_manager.pool.acquire() as conn:
                    await conn.execute("DELETE FROM agent_messages WHERE id = $1", current_thinking_id)
                
                await stream_current_history(websocket, conversation_id)
                
                # Execute the tool
                tool_result = await execute_tool(tool_name, tool_args, user_token)
                
                # Save tool result in DB
                await db_manager.save_message(
                    conversation_id=conversation_id,
                    role="tool",
                    type_name="tool_result",
                    content=json.dumps(tool_result),
                    tool_name=tool_name,
                    tool_output=tool_result
                )
                
                # Create a new placeholder thinking block for the next loop iteration
                current_thinking_id = await db_manager.save_message(
                    conversation_id=conversation_id,
                    role="agent",
                    type_name="thinking",
                    content="Pensando..."
                )
                
                await stream_current_history(websocket, conversation_id)
                
            # Loop again to give the LLM the tool output context
            continue
            
        else:
            # Overwrite the thinking block with the final response
            if content:
                await db_manager.save_message(
                    conversation_id=conversation_id,
                    role="agent",
                    type_name="chat",
                    content=content
                )
            
            # Delete the temporary thinking block
            async with db_manager.pool.acquire() as conn:
                await conn.execute("DELETE FROM agent_messages WHERE id = $1", current_thinking_id)
                
            await stream_current_history(websocket, conversation_id)
            break

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
        "content": "¡Hola! ¿En qué puedo ayudarte hoy con tu espacio de trabajo? Puedes pedirme que liste tus empleos, mueva tarjetas o archive procesos viejos."
    }
