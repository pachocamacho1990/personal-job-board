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
        "Sé directo, profesional y mantén tus respuestas concisas en español.\n\n"
        "## ESTRUCTURA DE NAVEGACIÓN Y PÁGINAS DE LA APLICACIÓN\n"
        "Puedes redirigir automáticamente al usuario llamando a la herramienta 'navigate_to' con una de las siguientes opciones según lo que pida:\n"
        "- 'dashboard' (/jobboard/index.html): Muestra el resumen de actividad, el radar de anclas de carrera y la configuración del prompt de búsqueda (Claude).\n"
        "- 'jobs' (/jobboard/jobs.html): El tablero Kanban de vacantes y oportunidades. Aquí los usuarios organizan y editan tarjetas de empleo, y pueden usar el Copiloto IA de postulación (cartas de presentación/CVs ATS).\n"
        "- 'business' (/jobboard/business.html): El tablero Kanban para contactos de negocios, inversionistas, VCs o aceleradoras.\n"
        "- 'profile' (/jobboard/profile.html): Pantalla donde el usuario edita o completa sus datos personales, titular, resumen, educación y EXPERIENCIA LABORAL.\n"
        "- 'docs' (/jobboard/docs.html): Documentación y manuales del sistema.\n"
        "Si el usuario dice algo como 'llévame a ver mi perfil', 'cómo modifico mi experiencia laboral' o 'dónde edito mis datos', debes indicarle la sección y llamar a 'navigate_to' inmediatamente.\n"
    )
    
    if onboarding_status == "interviewing":
        base_instructions += (
            "\n[MODO ENTREVISTA ACTIVO]\n"
            "Tu objetivo actual es perfilar profesional y motivacionalmente al usuario a través de una entrevista inteligente.\n"
            "REGLA CRÍTICA DE CONTEXTO: Antes de hacer cualquier pregunta, lee detenidamente la sección '## DATOS DEL PERFIL PROFESIONAL DEL USUARIO' más abajo.\n"
            "- Si el usuario ya tiene cargados datos de su experiencia (ej: cargos anteriores, habilidades, educación, etc.), NO le hagas preguntas básicas o redundantes como '¿En qué has trabajado?' o '¿Qué estudiaste?'.\n"
            "- Utiliza los datos existentes para profundizar de manera inteligente. Ejemplo: 'Veo en tu perfil que fuiste Tech Lead en X. ¿Qué tipo de desafíos de escala te gustaría liderar ahora?' o 'Veo que tienes experiencia en React y Python. ¿Prefieres un rol full-stack balanceado o especializarte más en una de estas áreas?'.\n"
            "- Haz preguntas progresivas enfocándote en lo que falta (Drivers, Expectativa Salarial, Modalidad, Exclusiones de empresas y Ancla de Schein dominante).\n"
            "1. Utiliza técnicas de Entrevista Motivacional (OARS) para guiar la conversación con empatía y sin respuestas cerradas.\n"
            "2. Valida competencias de su experiencia usando la estructura STAR (Situación, Tarea, Acción, Resultado).\n"
            "3. Identifica sus motivaciones internas y el Ancla de Carrera de Edgar Schein dominante.\n"
            "4. Cuando determines que tienes suficiente información sobre sus roles objetivo, rangos salariales, "
            "modalidades de trabajo, preferencias geográficas y deal-breakers/exclusiones, debes llamar de inmediato a la herramienta "
            "save_career_strategy para guardar la estrategia de búsqueda e inyectar el prompt de búsqueda detallado para Claude for Chrome. "
            "Además, asegúrate de calcular e inyectar puntajes (0-100) para las 8 anclas de carrera de Schein ('anchor_scores') y "
            "mapear las competencias, rasgos y drivers de Korn Ferry ('kf_competencies', 'kf_traits', 'kf_drivers') en el payload de la herramienta.\n"
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

            if event_type == "edit_message":
                msg_id = int(message_data.get("messageId"))
                new_content = message_data.get("content", "").strip()
                if not new_content:
                    continue

                if conversation_id in active_tasks:
                    logger.info(f"Cancelling active generation run for conversation {conversation_id} due to edit")
                    task = active_tasks.get(conversation_id)
                    if task and not task.done():
                        task.cancel()
                    active_tasks.pop(conversation_id, None)

                # Update message content in database
                await db_manager.update_message_content(msg_id, new_content)

                # Delete subsequent messages
                async with db_manager.pool.acquire() as conn:
                    await conn.execute(
                        "DELETE FROM agent_messages WHERE conversation_id = $1 AND id > $2",
                        conversation_id, msg_id
                    )

                await stream_current_history(websocket, conversation_id)

                # Create placeholder thinking block
                thinking_msg_id = await db_manager.save_message(
                    conversation_id=conversation_id,
                    role="agent",
                    type_name="thinking",
                    content="Analizando tu consulta..."
                )
                
                await stream_current_history(websocket, conversation_id)

                # Spawn standard loop runner
                task = asyncio.create_task(
                    run_agent_loop(websocket, conversation_id, user_id, token, thinking_msg_id)
                )
                active_tasks[conversation_id] = task
                
                def make_cleanup(cid):
                    return lambda t: active_tasks.pop(cid, None)
                task.add_done_callback(make_cleanup(conversation_id))
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
                    content="Analizando tu consulta..."
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

def get_mock_interview_response(history: List[Dict[str, Any]], profile_data: Dict[str, Any] = None) -> tuple[str | None, list[Any] | None]:
    if profile_data is None:
        profile_data = {}
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
        import re
        # Determine dominant anchor based on headline, summary, and skills
        headline_lower = profile_data.get("headline", "").lower()
        summary_lower = profile_data.get("summary", "").lower()
        skills_list = profile_data.get("skills", [])
        skills_str = " ".join(skills_list).lower()
        
        dominant_anchor = "Técnica/Funcional"
        if any(w in headline_lower or w in summary_lower for w in ["manager", "director", "lead", "jefe", "gerente", "principal"]):
            dominant_anchor = "Dirección General"
        elif any(w in headline_lower or w in summary_lower for w in ["entrepreneur", "founder", "fundador", "startup", "creador"]):
            dominant_anchor = "Creatividad Emprendedora"
        elif any(w in headline_lower or w in summary_lower for w in ["freelance", "independent", "consultor independiente", "autónomo"]):
            dominant_anchor = "Autonomía/Independencia"
        elif any(w in headline_lower or w in summary_lower for w in ["lifestyle", "balance", "vida", "remoto", "flexibilidad"]):
            dominant_anchor = "Estilo de vida"
        elif any(w in headline_lower or w in summary_lower for w in ["security", "stability", "seguridad", "estabilidad"]):
            dominant_anchor = "Seguridad/Estabilidad"
        elif any(w in headline_lower or w in summary_lower for w in ["service", "dedication", "causa", "servicio", "impacto"]):
            dominant_anchor = "Servicio/Dedicación a una causa"
        elif any(w in headline_lower or w in summary_lower for w in ["challenge", "desafío", "dificultad", "competencia"]):
            dominant_anchor = "Desafío Puro"

        # Determine target roles
        headline = profile_data.get("headline")
        if headline:
            target_roles = [headline]
        else:
            # Check experience roles
            exp_roles = [e.get("role") for e in profile_data.get("experience", []) if e.get("role")]
            if exp_roles:
                target_roles = list(set(exp_roles))[:2]
            else:
                target_roles = ["Senior Software Engineer", "Tech Lead"]

        # Determine location / geography priorities
        location = profile_data.get("location")
        priorities = [location] if location else ["España", "Remoto Europa"]

        # Parse user's responses for salary and exclusions if possible
        salary_target = 100000
        salary_min = 90000
        salary_currency = "EUR"
        
        for msg in user_messages:
            content_lower = msg.get("content", "").lower()
            numbers = re.findall(r'\b\d+k?\b', content_lower)
            if numbers:
                parsed_nums = []
                for n in numbers:
                    val = n.replace('k', '')
                    try:
                        parsed_nums.append(int(val) * (1000 if 'k' in n or int(val) < 1000 else 1))
                    except:
                        pass
                if len(parsed_nums) >= 2:
                    salary_min = min(parsed_nums)
                    salary_target = max(parsed_nums)
                elif len(parsed_nums) == 1:
                    salary_min = int(parsed_nums[0] * 0.9)
                    salary_target = parsed_nums[0]
            
            if '$' in content_lower or 'usd' in content_lower:
                salary_currency = "USD"
            elif 'cop' in content_lower or 'pesos' in content_lower:
                salary_currency = "COP"

        # Exclusions parsing
        excl_companies = ["Acme Corp"]
        excl_industries = ["Crypto"]
        if len(user_messages) >= 4:
            excl_text = user_messages[3].get("content", "")
            if not any(w in excl_text.lower() for w in ["no", "ninguna", "nada", "tengo"]):
                words = [w.strip(".,;:?!") for w in excl_text.split() if len(w) > 4]
                if words:
                    excl_companies = [words[0]]
                    if len(words) > 1:
                        excl_industries = [words[1]]

        skills_text = f" con habilidades en {', '.join(skills_list[:3])}" if skills_list else ""
        strategy_summary = f"{target_roles[0]} enfocado en {dominant_anchor}{skills_text}. Prefiere roles alineados con sus metas en {', '.join(priorities)}."
        
        roles_text = " o ".join(target_roles)
        search_prompt = (
            f"Eres un copiloto de búsqueda de empleo que opera en mi navegador a través de Claude for Chrome.\n"
            f"Tu misión es buscar vacantes de {roles_text} en {', '.join(priorities)} alineadas con mi perfil y motivaciones.\n\n"
            f"## Criterios de Selección:\n"
            f"- **Roles Objetivo**: {roles_text}\n"
            f"- **Ubicación & Modalidad**: {', '.join(priorities)}\n"
            f"- **Filtros de Exclusión (Deal-breakers)**: Evitar {', '.join(excl_companies)} y el sector {', '.join(excl_industries)}.\n"
            f"- **Salario Mínimo**: {salary_min} {salary_currency}.\n\n"
            f"## Instrucciones para Guardar Vacantes en mi Tablero:\n"
            f"Cuando encuentres una vacante que cumpla estos criterios, regístrala de forma automatizada usando una de las siguientes vías:\n\n"
            f"### Vía 1: Llamar a la API REST (Recomendado)\n"
            f"Haz un POST request a: `http://localhost/jobboard/api/jobs` e incluye la cabecera `Authorization: Bearer <token>`.\n"
            f"Cuerpo del JSON a enviar:\n"
            f"```json\n"
            f"{{\n"
            f"  \"boardId\": {{board_id}},\n"
            f"  \"type\": \"job\",\n"
            f"  \"status\": \"interested\",\n"
            f"  \"origin\": \"agent\",\n"
            f"  \"company\": \"Nombre de la empresa\",\n"
            f"  \"position\": \"Título de la vacante\",\n"
            f"  \"location\": \"Ubicación (ej: 'Remote')\",\n"
            f"  \"salary\": \"Salario (ej: '$100k')\",\n"
            f"  \"url\": \"URL directo de la oferta de trabajo o publicación (ej. de LinkedIn, Indeed, etc.)\",\n"
            f"  \"comments\": \"Resumen ejecutivo de la vacante y por qué se ajusta al perfil del candidato.\"\n"
            f"}}\n"
            f"```\n\n"
            f"### Vía 2: Automatización DOM de la Interfaz\n"
            f"1. Navega a `http://localhost/jobboard/jobs.html`.\n"
            f"2. Abre el tablero correspondiente y haz clic en el botón de agregar tarjeta con ID `#addJobBtn`.\n"
            f"3. Rellena los campos del formulario:\n"
            f"   - Empresa: `#company`\n"
            f"   - Cargo/Posición: `#position`\n"
            f"   - Ubicación: `#location`\n"
            f"   - Salario: `#salary`\n"
            f"   - Enlace/URL de la vacante: `#jobUrl`\n"
            f"   - Comentarios: `#comments`\n"
            f"4. Presiona el botón de guardar del formulario.\n\n"
            f"IMPORTANTE: Siempre incluye el campo 'url' con la URL directa de la vacante para que el candidato pueda consultarla e iniciar su postulación."
        )

        anchor_mapping = {
            "Estilo de vida": "Lifestyle",
            "Autonomía/Independencia": "Autonomía",
            "Técnica/Funcional": "Technical/Functional",
            "Desafío Puro": "Pure Challenge",
            "Creatividad Emprendedora": "Entrepreneurial",
            "Seguridad/Estabilidad": "Security/Stability",
            "Servicio/Dedicación a una causa": "Service/Dedication",
            "Dirección General": "General Managerial"
        }
        
        anchor_key = anchor_mapping.get(dominant_anchor, "Technical/Functional")
        
        anchor_scores = {
            "Lifestyle": 95 if anchor_key == "Lifestyle" else 75,
            "Autonomía": 95 if anchor_key == "Autonomía" else 70,
            "Technical/Functional": 95 if anchor_key == "Technical/Functional" else 65,
            "Pure Challenge": 95 if anchor_key == "Pure Challenge" else 60,
            "Entrepreneurial": 95 if anchor_key == "Entrepreneurial" else 45,
            "Security/Stability": 95 if anchor_key == "Security/Stability" else 40,
            "Service/Dedication": 95 if anchor_key == "Service/Dedication" else 35,
            "General Managerial": 95 if anchor_key == "General Managerial" else 20
        }

        strategy = {
            "dominant_anchor": dominant_anchor,
            "target_roles": target_roles,
            "salary_preferences": {
                "target": salary_target,
                "minimum": salary_min,
                "currency": salary_currency
            },
            "work_mode": {
                "remote": True,
                "hybrid": False,
                "on_site": False
            },
            "geography": {
                "priorities": priorities,
                "exclusions": []
            },
            "exclusions": {
                "industries": excl_industries,
                "companies": excl_companies
            },
            "strategy_summary": strategy_summary,
            "search_prompt": search_prompt,
            "anchor_scores": anchor_scores,
            "kf_competencies": ["Diseño de Arquitectura", "Sistemas Distribuidos", "AI Agent Development"],
            "kf_traits": ["Resiliencia ante la ambigüedad", "Curiosidad de aprendizaje"],
            "kf_drivers": ["Autonomía laboral", "Liderazgo técnico"]
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
                profile_data = await db_manager.get_profile_data(user_id)
                content, tool_calls = get_mock_interview_response(history, profile_data)
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
                    
                    if tool_name == "navigate_to" and tool_result.get("success"):
                        await websocket.send_json({
                            "event": "navigate",
                            "url": tool_result.get("url")
                        })
                        # Also save a tool message in database
                        await db_manager.save_message(
                            conversation_id=conversation_id,
                            role="tool",
                            type_name="tool_result",
                            content=json.dumps(tool_result),
                            tool_name=tool_name,
                            tool_output=tool_result
                        )
                        # Remove thinking status and send navigation confirmation chat
                        async with db_manager.pool.acquire() as conn:
                            await conn.execute("DELETE FROM agent_messages WHERE id = $1", current_thinking_id)
                        await db_manager.save_message(
                            conversation_id=conversation_id,
                            role="agent",
                            type_name="chat",
                            content=f"Te he redirigido a la sección de **{tool_args.get('destination')}**."
                        )
                        await stream_current_history(websocket, conversation_id)
                        return

                    if tool_name == "save_career_strategy" and tool_result.get("success"):
                        await websocket.send_json({
                            "event": "onboarding_status_update",
                            "status": "ready"
                        })
                        await db_manager.save_message(
                            conversation_id=conversation_id,
                            role="agent",
                            type_name="chat",
                            content="¡Excelente! He analizado tu perfil y he estructurado tu estrategia de carrera. He activado la búsqueda y generado el prompt de búsqueda detallado para tu extensión Claude for Chrome. Haz clic en la pestaña **Búsqueda Activa (Claude)** en tu dashboard principal para copiar o editar tu prompt."
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
                    
                    # Determine dynamic progress step content
                    thinking_content = "Procesando resultados y formulando respuesta..."
                    if tool_name in ["list_jobs", "create_job_card", "update_job_status", "archive_job", "delete_job"]:
                        thinking_content = f"Procesando resultados de la acción en tu tablero de empleos..."
                    elif tool_name in ["save_preference", "delete_preference"]:
                        thinking_content = "Consolidando preferencias en tu memoria a largo plazo..."
                    elif tool_name == "navigate_to":
                        thinking_content = "Confirmando redirección de pantalla..."
                    
                    current_thinking_id = await db_manager.save_message(
                        conversation_id=conversation_id,
                        role="agent",
                        type_name="thinking",
                        content=thinking_content
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
