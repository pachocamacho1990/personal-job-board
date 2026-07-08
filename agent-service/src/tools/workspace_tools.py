import logging
import httpx
from typing import Dict, Any, List, Optional
from src.config import settings
from src.db import db_manager

logger = logging.getLogger(__name__)

# ── 1. Tool Schemas (Sent to LLM) ───────────────────────

WORKSPACE_TOOLS_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "list_boards",
            "description": "Obtiene la lista de todos los tableros (boards) creados por el usuario, mostrando sus IDs, nombres y número de tarjetas en cada uno.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_board",
            "description": "Crea un nuevo tablero (board) con un nombre específico en el espacio de trabajo del usuario.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "El nombre del nuevo tablero a crear"
                    }
                },
                "required": ["name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_jobs",
            "description": "Obtiene la lista de tarjetas de empleo (job cards) de un tablero específico del usuario. Permite filtrar por columna/status o por término de búsqueda.",
            "parameters": {
                "type": "object",
                "properties": {
                    "board_id": {
                        "type": "integer",
                        "description": "El ID del tablero a consultar. Recomendado: listar los tableros con list_boards primero para saber sus IDs."
                    },
                    "status": {
                        "type": "string",
                        "description": "Columna/estado a filtrar: interested, applied, forgotten, interview, pending, offer, rejected, archived",
                        "enum": ["interested", "applied", "forgotten", "interview", "pending", "offer", "rejected", "archived"]
                    },
                    "query": {
                        "type": "string",
                        "description": "Término de búsqueda para filtrar por compañía o posición"
                    }
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_job_card",
            "description": "Crea una nueva tarjeta de empleo (job card) en un tablero específico del usuario.",
            "parameters": {
                "type": "object",
                "properties": {
                    "board_id": {
                        "type": "integer",
                        "description": "El ID numérico del tablero de destino donde se creará la tarjeta"
                    },
                    "company": {
                        "type": "string",
                        "description": "Nombre de la empresa"
                    },
                    "position": {
                        "type": "string",
                        "description": "Cargo/posición"
                    },
                    "status": {
                        "type": "string",
                        "description": "Columna/estado inicial de la tarjeta",
                        "enum": ["interested", "applied", "forgotten", "interview", "pending", "offer", "rejected"]
                    },
                    "salary": {
                        "type": "string",
                        "description": "Información del salario (ej: '$80,000 USD')"
                    },
                    "location": {
                        "type": "string",
                        "description": "Ubicación (ej: 'Remote', 'New York, NY')"
                    },
                    "url": {
                        "type": "string",
                        "description": "URL del anuncio o publicación de la vacante (ej: 'https://linkedin.com/jobs/...')"
                    }
                },
                "required": ["board_id", "company", "position", "status"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "update_job_status",
            "description": "Mueve una tarjeta de empleo a una columna o estado diferente (ej: mover de interested a applied, o a interview).",
            "parameters": {
                "type": "object",
                "properties": {
                    "job_id": {
                        "type": "integer",
                        "description": "El ID numérico de la tarjeta de empleo"
                    },
                    "status": {
                        "type": "string",
                        "description": "El nuevo estado/columna de destino",
                        "enum": ["interested", "applied", "forgotten", "interview", "pending", "offer", "rejected", "archived"]
                    }
                },
                "required": ["job_id", "status"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "archive_job",
            "description": "Archiva una tarjeta de empleo para ocultarla del tablero Kanban principal sin eliminarla.",
            "parameters": {
                "type": "object",
                "properties": {
                    "job_id": {
                        "type": "integer",
                        "description": "El ID numérico de la tarjeta de empleo a archivar"
                    }
                },
                "required": ["job_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "delete_job",
            "description": "Elimina de forma permanente una tarjeta de empleo del sistema.",
            "parameters": {
                "type": "object",
                "properties": {
                    "job_id": {
                        "type": "integer",
                        "description": "El ID numérico de la tarjeta de empleo a eliminar"
                    }
                },
                "required": ["job_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "save_preference",
            "description": "Guarda de forma permanente una preferencia o regla del usuario (ej: 'Prefiero roles remotos', 'No aplicar a Acme Corp') para personalizar las futuras respuestas de la IA.",
            "parameters": {
                "type": "object",
                "properties": {
                    "category": {
                        "type": "string",
                        "description": "Categoría de la memoria: 'preference' (criterios, filtros) o 'fact' (hechos, datos del entorno)",
                        "enum": ["preference", "fact"]
                    },
                    "content": {
                        "type": "string",
                        "description": "El contenido descriptivo de la preferencia o regla a guardar"
                    }
                },
                "required": ["category", "content"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "delete_preference",
            "description": "Elimina de la memoria del agente una preferencia o regla del usuario usando su ID.",
            "parameters": {
                "type": "object",
                "properties": {
                    "preference_id": {
                        "type": "integer",
                        "description": "El ID numérico de la preferencia a eliminar"
                    }
                },
                "required": ["preference_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "save_skill",
            "description": "Registra una nueva receta o habilidad aprendida (skill) para que el agente pueda automatizar tareas repetitivas en el futuro.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "Nombre de la habilidad (ej: 'clean_board')"
                    },
                    "description": {
                        "type": "string",
                        "description": "Explicación de lo que realiza esta habilidad"
                    },
                    "recipe": {
                        "type": "object",
                        "description": "La secuencia de acciones en formato estructurado JSON"
                    }
                },
                "required": ["name", "description", "recipe"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "save_career_strategy",
            "description": "Guarda la estrategia de búsqueda laboral y el prompt personalizado para Claude for Chrome al finalizar la entrevista.",
            "parameters": {
                "type": "object",
                "properties": {
                    "dominant_anchor": { "type": "string", "description": "El Ancla de Carrera identificada según Schein (ej. Lifestyle, Autonomía)." },
                    "target_roles": { "type": "array", "items": { "type": "string" }, "description": "Lista de títulos de roles objetivo." },
                    "salary_preferences": {
                        "type": "object",
                        "properties": {
                            "target": { "type": "integer" },
                            "minimum": { "type": "integer" },
                            "currency": { "type": "string" }
                        }
                    },
                    "work_mode": {
                        "type": "object",
                        "properties": {
                            "remote": { "type": "boolean" },
                            "hybrid": { "type": "boolean" },
                            "on_site": { "type": "boolean" }
                        }
                    },
                    "geography": {
                        "type": "object",
                        "properties": {
                            "priorities": { "type": "array", "items": { "type": "string" } },
                            "exclusions": { "type": "array", "items": { "type": "string" } }
                        }
                    },
                    "exclusions": {
                        "type": "object",
                        "properties": {
                            "industries": { "type": "array", "items": { "type": "string" } },
                            "companies": { "type": "array", "items": { "type": "string" } }
                        }
                    },
                    "strategy_summary": { "type": "string", "description": "Resumen narrativo de la estrategia de carrera recomendada." },
                    "search_prompt": { "type": "string", "description": "El prompt de instrucciones ultra-detallado para Claude for Chrome." }
                },
                "required": ["dominant_anchor", "target_roles", "strategy_summary", "search_prompt"]
            }
        }
    }
]

# ── 2. Tool Execution Functions (Called locally) ─────────

async def list_boards(user_token: str) -> Dict[str, Any]:
    """Fetch boards list from Express API on behalf of the user"""
    url = f"{settings.express_api_url}/boards"
    headers = {"Authorization": f"Bearer {user_token}"}

    async with httpx.AsyncClient() as client:
        try:
            logger.info(f"Executing list_boards on API: {url}")
            resp = await client.get(url, headers=headers, timeout=10.0)
            if resp.status_code == 200:
                boards = resp.json()
                return {"success": True, "boards": boards, "count": len(boards)}
            return {"success": False, "error": f"API returned status {resp.status_code}", "detail": resp.text}
        except Exception as e:
            logger.error(f"Error executing list_boards API request: {e}")
            return {"success": False, "error": str(e)}

async def create_board(user_token: str, name: str) -> Dict[str, Any]:
    """Create a new board in Express API on behalf of the user"""
    url = f"{settings.express_api_url}/boards"
    headers = {"Authorization": f"Bearer {user_token}"}
    payload = {"name": name}

    async with httpx.AsyncClient() as client:
        try:
            logger.info(f"Executing create_board with name '{name}'")
            resp = await client.post(url, headers=headers, json=payload, timeout=10.0)
            if resp.status_code == 201:
                return {"success": True, "message": f"Tablero '{name}' creado exitosamente.", "board": resp.json()}
            return {"success": False, "error": f"API returned status {resp.status_code}", "detail": resp.text}
        except Exception as e:
            logger.error(f"Error executing create_board API request: {e}")
            return {"success": False, "error": str(e)}

async def list_jobs(
    user_token: str, 
    board_id: Optional[int] = None, 
    status: Optional[str] = None, 
    query: Optional[str] = None
) -> Dict[str, Any]:
    """Fetch jobs list from Express API on behalf of the user, optionally filtering by board_id"""
    url = f"{settings.express_api_url}/jobs"
    headers = {"Authorization": f"Bearer {user_token}"}
    params = {}
    if board_id is not None:
        params["boardId"] = board_id
    if status:
        params["status"] = status
    if query:
        params["search"] = query

    async with httpx.AsyncClient() as client:
        try:
            logger.info(f"Executing list_jobs on API: {url} with params {params}")
            resp = await client.get(url, headers=headers, params=params, timeout=10.0)
            if resp.status_code == 200:
                jobs = resp.json()
                simplified_jobs = []
                for j in jobs:
                    simplified_jobs.append({
                        "id": j.get("id"),
                        "company": j.get("company"),
                        "position": j.get("position"),
                        "status": j.get("status"),
                        "salary": j.get("salary"),
                        "url": j.get("url")
                    })
                return {"success": True, "jobs": simplified_jobs, "count": len(simplified_jobs)}
            return {"success": False, "error": f"API returned status {resp.status_code}", "detail": resp.text}
        except Exception as e:
            logger.error(f"Error executing list_jobs API request: {e}")
            return {"success": False, "error": str(e)}

async def create_job_card(
    user_token: str,
    board_id: int,
    company: str,
    position: str,
    status: str,
    salary: Optional[str] = None,
    location: Optional[str] = None,
    job_url: Optional[str] = None
) -> Dict[str, Any]:
    """Create a new job card on a specific board via Express POST endpoint"""
    url = f"{settings.express_api_url}/jobs"
    headers = {"Authorization": f"Bearer {user_token}"}
    payload = {
        "boardId": board_id,
        "company": company,
        "position": position,
        "status": status,
        "origin": "agent"
    }
    if salary:
        payload["salary"] = salary
    if location:
        payload["location"] = location
    if job_url:
        payload["url"] = job_url

    async with httpx.AsyncClient() as client:
        try:
            logger.info(f"Executing create_job_card on board {board_id} for '{company}'")
            resp = await client.post(url, headers=headers, json=payload, timeout=10.0)
            if resp.status_code == 201:
                return {"success": True, "message": f"Tarjeta de empleo para '{company}' creada exitosamente.", "job": resp.json()}
            return {"success": False, "error": f"API returned status {resp.status_code}", "detail": resp.text}
        except Exception as e:
            logger.error(f"Error executing create_job_card API request: {e}")
            return {"success": False, "error": str(e)}

async def update_job_status(user_token: str, job_id: int, status: str) -> Dict[str, Any]:
    """Move job card status/column via Express PUT endpoint"""
    url = f"{settings.express_api_url}/jobs/{job_id}"
    headers = {"Authorization": f"Bearer {user_token}"}
    payload = {"status": status}

    async with httpx.AsyncClient() as client:
        try:
            logger.info(f"Executing update_job_status on ID {job_id} to status '{status}'")
            resp = await client.put(url, headers=headers, json=payload, timeout=10.0)
            if resp.status_code == 200:
                return {"success": True, "message": f"Tarjeta {job_id} movida a '{status}' correctamente.", "job": resp.json()}
            return {"success": False, "error": f"API returned status {resp.status_code}", "detail": resp.text}
        except Exception as e:
            logger.error(f"Error executing update_job_status API request: {e}")
            return {"success": False, "error": str(e)}

async def archive_job(user_token: str, job_id: int) -> Dict[str, Any]:
    """Archive job card (updates status to 'archived')"""
    return await update_job_status(user_token, job_id, "archived")

async def delete_job(user_token: str, job_id: int) -> Dict[str, Any]:
    """Delete job card via Express DELETE endpoint"""
    url = f"{settings.express_api_url}/jobs/{job_id}"
    headers = {"Authorization": f"Bearer {user_token}"}

    async with httpx.AsyncClient() as client:
        try:
            logger.info(f"Executing delete_job on ID {job_id}")
            resp = await client.delete(url, headers=headers, timeout=10.0)
            if resp.status_code == 200:
                return {"success": True, "message": f"Tarjeta {job_id} eliminada permanentemente del tablero."}
            return {"success": False, "error": f"API returned status {resp.status_code}", "detail": resp.text}
        except Exception as e:
            logger.error(f"Error executing delete_job API request: {e}")
            return {"success": False, "error": str(e)}


# ── 3. Tool Dispatcher ───────────────────────────────────

async def execute_tool(name: str, arguments: Dict[str, Any], user_token: str, user_id: int) -> Dict[str, Any]:
    """
    Executes a workspace or memory tool requested by the LLM on behalf of the user.
    """
    try:
        if name == "list_boards":
            return await list_boards(user_token)
            
        elif name == "create_board":
            board_name = arguments.get("name")
            return await create_board(user_token, board_name)
            
        elif name == "list_jobs":
            board_id = arguments.get("board_id")
            if board_id is not None:
                board_id = int(board_id)
            status = arguments.get("status")
            query = arguments.get("query")
            return await list_jobs(user_token, board_id, status, query)
            
        elif name == "create_job_card":
            board_id = int(arguments.get("board_id"))
            company = arguments.get("company")
            position = arguments.get("position")
            status = arguments.get("status")
            salary = arguments.get("salary")
            location = arguments.get("location")
            job_url = arguments.get("url")
            return await create_job_card(user_token, board_id, company, position, status, salary, location, job_url)
            
        elif name == "update_job_status":
            job_id = int(arguments.get("job_id"))
            status = arguments.get("status")
            return await update_job_status(user_token, job_id, status)
            
        elif name == "archive_job":
            job_id = int(arguments.get("job_id"))
            return await archive_job(user_token, job_id)
            
        elif name == "delete_job":
            job_id = int(arguments.get("job_id"))
            return await delete_job(user_token, job_id)

        # ── Memory & Skills Tools ──
        elif name == "save_preference":
            category = arguments.get("category", "preference")
            content = arguments.get("content")
            mem_id = await db_manager.save_user_memory(user_id, category, content)
            return {"success": True, "message": f"Preferencia guardada con ID {mem_id}.", "memory": {"id": mem_id, "category": category, "content": content}}

        elif name == "delete_preference":
            pref_id = int(arguments.get("preference_id"))
            await db_manager.delete_user_memory(user_id, pref_id)
            return {"success": True, "message": f"Preferencia {pref_id} eliminada correctamente de la memoria."}

        elif name == "save_skill":
            skill_name = arguments.get("name")
            description = arguments.get("description")
            recipe = arguments.get("recipe", {})
            skill_id = await db_manager.save_user_skill(user_id, skill_name, description, recipe)
            return {"success": True, "message": f"Skill '{skill_name}' guardada y aprendida con ID {skill_id}."}
            
        elif name == "save_career_strategy":
            strategy = {
                "dominant_anchor": arguments.get("dominant_anchor"),
                "target_roles": arguments.get("target_roles"),
                "salary_preferences": arguments.get("salary_preferences"),
                "work_mode": arguments.get("work_mode"),
                "geography": arguments.get("geography"),
                "exclusions": arguments.get("exclusions"),
                "strategy_summary": arguments.get("strategy_summary")
            }
            search_prompt = arguments.get("search_prompt")
            await db_manager.update_career_strategy(user_id, strategy, search_prompt)
            return {"success": True, "message": "Estrategia de carrera y prompt de búsqueda guardados correctamente."}
            
        else:
            return {"success": False, "error": f"Herramienta '{name}' no disponible."}
    except Exception as e:
        logger.error(f"Error dispatching tool execution for '{name}': {e}", exc_info=True)
        return {"success": False, "error": f"Error ejecutando herramienta: {str(e)}"}
