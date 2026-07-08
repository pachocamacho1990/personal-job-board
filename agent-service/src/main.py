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
from pydantic import BaseModel


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

class CopilotRequest(BaseModel):
    user_id: int
    job_id: int
    document_type: str

@app.post("/copilot")
async def generate_copilot_document(req: CopilotRequest):
    try:
        user_id = req.user_id
        job_id = req.job_id
        doc_type = req.document_type

        if doc_type not in ["cover_letter", "resume_bullets"]:
            raise HTTPException(status_code=400, detail="Invalid document type")

        # 1. Fetch job details
        job = await db_manager.get_job_by_id(user_id, job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        # 2. Fetch profile data, strategy, and active memories
        profile_data = await db_manager.get_profile_data(user_id)
        strategy_data = await db_manager.get_career_strategy(user_id)
        memories = await db_manager.get_user_memories(user_id)

        # 3. Assemble context for LLM
        dominant_anchor = strategy_data.get("career_strategy", {}).get("dominant_anchor", "No definido")
        strategy_summary = strategy_data.get("career_strategy", {}).get("strategy_summary", "")

        memories_bullets = "\n".join([f"- {m['content']}" for m in memories if m.get("category") == "preference"])

        system_prompt = (
            "Eres Zenith Agent, un consultor de carrera y headhunter senior de élite.\n"
            "Tu objetivo es redactar o adaptar material de postulación profesional para el usuario.\n"
            "Responde de manera directa, profesional y mantén tu respuesta redactada en español con formato Markdown limpio."
        )

        user_context = (
            f"DATOS PROFESIONALES DEL USUARIO:\n"
            f"- Nombre completo: {profile_data.get('full_name', 'Usuario')}\n"
            f"- Titular profesional: {profile_data.get('headline', '')}\n"
            f"- Ancla de carrera dominante (Schein): {dominant_anchor}\n"
            f"- Estrategia de carrera: {strategy_summary}\n"
            f"- Preferencias y directrices aprendidas:\n{memories_bullets}\n\n"
            f"DATOS DE LA VACANTE OBJETIVO:\n"
            f"- Empresa: {job.get('company')}\n"
            f"- Cargo / Puesto: {job.get('position')}\n"
            f"- Ubicación: {job.get('location', 'No especificado')}\n"
            f"- Salario: {job.get('salary', 'No especificado')}\n"
            f"- Detalles / Descripción de la vacante:\n{job.get('comments', '')}\n\n"
        )

        if doc_type == "cover_letter":
            prompt = (
                f"{user_context}"
                "INSTRUCCIÓN:\n"
                "Redacta una carta de presentación (Cover Letter) adaptada a esta vacante. "
                "Debe ser persuasiva, concisa (máximo 3 párrafos), redactada en español, que destaque las habilidades "
                "relevantes del usuario y se alinee con su ancla de carrera dominante. No uses marcadores de posición [como corchetes], "
                "completa o infiere los datos lógicamente."
            )
        else: # resume_bullets
            prompt = (
                f"{user_context}"
                "INSTRUCCIÓN:\n"
                "Genera entre 3 y 4 viñetas (bullet points) optimizadas para el CV del usuario y adaptadas a esta vacante. "
                "Cada viñeta debe comenzar con un verbo de acción fuerte en español (ej. Lideré, Implementé, Optimicé), "
                "destacar el impacto cuantitativo o cualitativo y conectar las habilidades del usuario con los requisitos del puesto."
            )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ]

        logger.info(f"Generating copilot document {doc_type} for job {job_id} and user {user_id}")
        generated_text, _ = await llm_manager.get_response(messages, tools=None)

        return {"content": generated_text or ""}
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error in /copilot endpoint: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate document")


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
    """Assembles the system prompt in real-time by prepending user preferences, profile data and skills"""
    memories = await db_manager.get_user_memories(user_id)
    skills = await db_manager.get_user_skills(user_id)
    profile_data = await db_manager.get_profile_data(user_id)
    onboarding_status = await db_manager.get_onboarding_status(user_id)
    
    base_instructions = (
        "Eres Zenith Agent, un consultor de carrera y headhunter senior de élite.\n"
        "Puedes interactuar con el espacio de trabajo del usuario (job boards, tarjetas de empleo) "
        "y administrar tus preferencias usando las herramientas suministradas.\n"
        "Sé directo, profesional y mantén tus respuestas concisas en español.\n"
    )
    
    if onboarding_status == "interviewing":
        base_instructions += (
            "\n[MODO ENTREVISTA ACTIVO]\n"
            "Tu objetivo actual es perfilar profesional y motivacionalmente al usuario a través de una entrevista en el chat.\n"
            "1. Utiliza técnicas de Entrevista Motivacional (OARS) para guiar la conversación con empatía y sin respuestas cerradas.\n"
            "2. Valida competencias de su experiencia usando la estructura STAR (Situación, Tarea, Acción, Resultado).\n"
            "3. Identifica sus motivaciones internas y el Ancla de Carrera de Edgar Schein dominante.\n"
            "4. Cuando determines que tienes suficiente información sobre sus roles objetivo, rangos salariales, "
            "modalidades de trabajo, preferencias geográficas y deal-breakers/exclusiones, debes llamar de inmediato a la herramienta "
            "save_career_strategy para guardar la estrategia de búsqueda e inyectar el prompt de búsqueda detallado para Claude for Chrome.\n"
            "Importante: No cierres la entrevista con un simple mensaje de texto; DEBES ejecutar la herramienta save_career_strategy "
            "para que el sistema registre la finalización y cambie el estado a 'ready'. Tu respuesta final debe confirmar al usuario "
            "que has procesado y guardado la estrategia.\n"
        )
    
    profile_section = ""
    if profile_data:
        profile_section = "\n\n## DATOS DEL PERFIL PROFESIONAL DEL USUARIO (Formulario Inicial)\n"
        profile_section += f"- Nombre completo: {profile_data.get('full_name', 'No especificado')}\n"
        profile_section += f"- Titular profesional: {profile_data.get('headline', 'No especificado')}\n"
        profile_section += f"- Ubicación: {profile_data.get('location', 'No especificado')}\n"
        profile_section += f"- Resumen profesional: {profile_data.get('summary', 'No especificado')}\n"
        
        skills_list = profile_data.get("skills", [])
        if skills_list:
            profile_section += f"- Habilidades técnicas: {', '.join(skills_list)}\n"
            
        langs = profile_data.get("languages", [])
        if langs:
            lang_strs = [f"{l.get('language')} ({l.get('level')})" for l in langs]
            profile_section += f"- Idiomas: {', '.join(lang_strs)}\n"
            
        exp = profile_data.get("experience", [])
        if exp:
            profile_section += "- Experiencia laboral:\n"
            for e in exp:
                profile_section += f"  * Cargo: {e.get('role')} en {e.get('company')} ({e.get('start_date')} - {e.get('end_date')})\n"
                if e.get("description"):
                    profile_section += f"    Descripción: {e.get('description')}\n"
                    
        edu = profile_data.get("education", [])
        if edu:
            profile_section += "- Educación:\n"
            for d in edu:
                profile_section += f"  * Título: {d.get('degree')} en {d.get('school')} (Año: {d.get('year')})\n"
                
        profile_section += (
            "\nIMPORTANTE: Utiliza esta información previa de su trayectoria para formular preguntas avanzadas y "
            "específicas. No le vuelvas a preguntar detalles que ya están declarados en esta sección."
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
            
    return base_instructions + profile_section + memories_section + skills_section

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

        # Seed initial message if empty or transition to interview_pending if not prompted yet
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
        elif onboarding_status == "interview_pending":
            # Check if history already has the start_interview action
            has_interview_prompt = any(
                isinstance(m, dict) and m.get("actions") and any(a.get("action") == "start_interview" for a in m["actions"])
                for m in history
            )
            if not has_interview_prompt:
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
            
            if event_type == "profile_saved":
                onboarding_status = await db_manager.get_onboarding_status(user_id)
                await websocket.send_json({
                    "event": "onboarding_status_update",
                    "status": onboarding_status
                })
                if onboarding_status == "interview_pending":
                    history = await db_manager.get_conversation_history(conversation_id)
                    has_interview_prompt = any(
                        isinstance(m, dict) and m.get("actions") and any(a.get("action") == "start_interview" for a in m["actions"])
                        for m in history
                    )
                    if not has_interview_prompt:
                        initial_msg = get_initial_welcome_message(onboarding_status)
                        if initial_msg:
                            await db_manager.save_message(
                                conversation_id=conversation_id,
                                role="agent",
                                type_name=initial_msg["type"],
                                content=initial_msg["content"],
                                actions=initial_msg.get("actions")
                            )
                            await stream_current_history(websocket, conversation_id)
                continue

            if event_type == "message" or event_type == "action":
                if conversation_id in active_tasks:
                    logger.warn(f"Task already active for conversation {conversation_id}. Rejecting new run.")
                    continue

                user_text = ""
                action_name = None
                if event_type == "message":
                    user_text = message_data.get("content", "").strip()
                else:
                    action_name = message_data.get("action")
                    user_text = message_data.get("label", action_name)

                if not user_text and not action_name:
                    continue

                # Fetch current onboarding status
                onboarding_status = await db_manager.get_onboarding_status(user_id)

                # Intercept onboarding actions
                if action_name == "open_profile":
                    await db_manager.save_message(
                        conversation_id=conversation_id,
                        role="user",
                        type_name="chat",
                        content=user_text
                    )
                    await db_manager.save_message(
                        conversation_id=conversation_id,
                        role="agent",
                        type_name="chat",
                        content="¡Perfecto! Te redirijo al formulario de perfil profesional. Completa tu información y cuando guardes, continuaremos con tu entrevista."
                    )
                    await stream_current_history(websocket, conversation_id)
                    # Tell the frontend to navigate to the profile page
                    await websocket.send_json({
                        "event": "navigate",
                        "url": "/jobboard/profile.html"
                    })
                    continue

                elif action_name == "dismiss":
                    await db_manager.save_message(
                        conversation_id=conversation_id,
                        role="user",
                        type_name="chat",
                        content=user_text
                    )
                    await db_manager.save_message(
                        conversation_id=conversation_id,
                        role="agent",
                        type_name="chat",
                        content="Entendido. Cuando estés listo, puedes completar tu perfil profesional desde el menú lateral o hablándome aquí."
                    )
                    await stream_current_history(websocket, conversation_id)
                    continue

                elif action_name == "start_interview":
                    await db_manager.save_message(
                        conversation_id=conversation_id,
                        role="user",
                        type_name="chat",
                        content=user_text
                    )
                    await db_manager.update_onboarding_status(user_id, "interviewing")
                    await websocket.send_json({
                        "event": "onboarding_status_update",
                        "status": "interviewing"
                    })
                    await db_manager.save_message(
                        conversation_id=conversation_id,
                        role="agent",
                        type_name="chat",
                        content="¡Comencemos! 🎤 Primera pregunta: ¿Qué tipo de rol estás buscando prioritariamente (ej. Senior ML Engineer, Tech Lead, Engineering Manager)?"
                    )
                    await stream_current_history(websocket, conversation_id)
                    continue

                elif action_name == "dismiss_interview":
                    await db_manager.save_message(
                        conversation_id=conversation_id,
                        role="user",
                        type_name="chat",
                        content=user_text
                    )
                    await db_manager.save_message(
                        conversation_id=conversation_id,
                        role="agent",
                        type_name="chat",
                        content="Entendido. Estaré disponible aquí cuando estés listo para comenzar tu perfilado profesional."
                    )
                    await stream_current_history(websocket, conversation_id)
                    continue

                # Standard chat processing
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
                
                # Reload onboarding status
                onboarding_status = await db_manager.get_onboarding_status(user_id)
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

class MockFunction:
    def __init__(self, name: str, arguments: str):
        self.name = name
        self.arguments = arguments

class MockToolCall:
    def __init__(self, name: str, arguments_str: str):
        self.id = "mock_call_123"
        self.type = "function"
        self.function = MockFunction(name, arguments_str)

def get_mock_interview_response(history: List[Dict[str, Any]]) -> tuple[str | None, list[Any] | None]:
    user_messages = [m for m in history if m["role"] == "user"]
    user_msg_count = len(user_messages)
    logger.info(f"MOCK INTERVIEW RUNNING: user_msg_count={user_msg_count}")
    for m in history:
        logger.info(f"  MSG: role={m.get('role')} type={m.get('type')} content={m.get('content')[:30] if m.get('content') else ''}")
    if user_msg_count <= 3:
        content = "Entendido. Segunda pregunta: ¿Cuál es tu rango salarial objetivo y qué modalidad prefieres (remoto, híbrido)?"
        return content, None
    elif user_msg_count == 4:
        content = "Perfecto. Última pregunta: ¿Tienes alguna empresa o industria excluida de tu búsqueda?"
        return content, None
    else:
        strategy = {
            "dominant_anchor": "Lifestyle",
            "target_roles": ["Senior Software Engineer", "Tech Lead"],
            "salary_preferences": {
                "target": 100000,
                "minimum": 90000,
                "currency": "EUR"
            },
            "work_mode": {
                "remote": True,
                "hybrid": False,
                "on_site": False
            },
            "geography": {
                "priorities": ["España", "Remoto Europa"],
                "exclusions": []
            },
            "exclusions": {
                "industries": ["Crypto"],
                "companies": ["Acme Corp"]
            },
            "strategy_summary": "Ingeniero de Software Senior enfocado en estabilidad laboral y balance de vida. Prefiere roles 100% remotos en Europa y evita el sector Cripto.",
            "search_prompt": "Eres un agente de búsqueda de empleo automatizado que opera dentro de mi navegador usando Claude for Chrome.\n\nDebes buscar vacantes de Senior Software Engineer o Tech Lead en España o Remoto Europa, evitando Acme Corp y el sector Crypto. Si el salario estimado supera los 90000 EUR, guarda la vacante en Zenith llamando a POST /api/jobs con boardId: {board_id}."
        }
        return None, [MockToolCall("save_career_strategy", json.dumps(strategy))]

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
            onboarding_status = await db_manager.get_onboarding_status(user_id)
            
            # Assemble dynamic system prompt and prepend it to the LLM message payload on EVERY turn (adaptive prompt)
            system_prompt = await get_adaptive_system_prompt(user_id)
            messages_payload = [{"role": "system", "content": system_prompt}] + history
            
            # Send payload to LLM
            if settings.test_mode and onboarding_status == "interviewing":
                logger.info("TEST_MODE active. Intercepting interview flow with mock responses.")
                content, tool_calls = get_mock_interview_response(history)
            else:
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
                    logger.info(f"DEBUG: Calling execute_tool '{tool_name}'...")
                    tool_result = await execute_tool(tool_name, tool_args, user_token, user_id)
                    logger.info(f"DEBUG: execute_tool '{tool_name}' finished: {tool_result}")
                    
                    if tool_name == "save_career_strategy" and tool_result.get("success"):
                        await websocket.send_json({
                            "event": "onboarding_status_update",
                            "status": "ready"
                        })
                        await db_manager.save_message(
                            conversation_id=conversation_id,
                            role="agent",
                            type_name="chat",
                            content="¡Excelente! He analizado tu perfil y he estructurado tu estrategia de carrera. He activado la búsqueda y generado el prompt de búsqueda detallado para tu extensión Claude for Chrome. Puedes copiarlo en el panel superior."
                        )
                        async with db_manager.pool.acquire() as conn:
                            await conn.execute("DELETE FROM agent_messages WHERE id = $1", current_thinking_id)
                        await stream_current_history(websocket, conversation_id)
                        return
                    
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
            "content": "¡Hola! 👋 Soy **Zenith Agent**, tu asistente inteligente de búsqueda laboral.\n\nNoté que aún no tengo contexto de tu perfil profesional. Para comenzar, necesito que completes tu perfil con tu experiencia, habilidades y educación.",
            "actions": [
                { "label": "📋 Completar mi perfil profesional", "action": "open_profile", "variant": "primary" },
                { "label": "⏭ Después", "action": "dismiss", "variant": "secondary" }
            ]
        }
    elif status_str == "interview_pending":
        return {
            "type": "action",
            "content": "Ya tengo tu perfil profesional cargado. ¿Estás listo para comenzar tu entrevista profesional? Consiste en unas pocas preguntas sobre tus expectativas, metas y preferencias.",
            "actions": [
                { "label": "🎤 Sí, empecemos", "action": "start_interview", "variant": "primary" },
                { "label": "⏭ Ahora no", "action": "dismiss_interview", "variant": "secondary" }
            ]
        }
    elif status_str == "interviewing":
        return {
            "type": "chat",
            "content": "¡Comencemos! ¿Qué tipo de rol estás buscando prioritariamente?"
        }
    return {
        "type": "chat",
        "content": "¡Hola! ¿En qué puedo ayudarte hoy con tu espacio de trabajo? Puedes pedirme que liste tus tableros, cree nuevos tableros o mueva/archive tus tarjetas."
    }

# NOTE: simulate_linkedin_investigation and import_profile endpoint removed in Stage 3 cleanup.
# Profile data is now collected via the /api/profile REST endpoint (Express) and the profile.html form.
