import logging
import httpx
from typing import Dict, Any, List, Optional
from src.config import settings

logger = logging.getLogger(__name__)

# ── 1. Tool Schemas (Sent to LLM) ───────────────────────

WORKSPACE_TOOLS_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "list_jobs",
            "description": "Obtiene la lista de tarjetas de empleo (job cards) del usuario. Permite filtrar por columna/status o por término de búsqueda.",
            "parameters": {
                "type": "object",
                "properties": {
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
    }
]

# ── 2. Tool Execution Functions (Called locally) ─────────

async def list_jobs(user_token: str, status: Optional[str] = None, query: Optional[str] = None) -> Dict[str, Any]:
    """Fetch jobs list from Express API on behalf of the user"""
    url = f"{settings.express_api_url}/jobs"
    headers = {"Authorization": f"Bearer {user_token}"}
    params = {}
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
                # Format to give a cleaner, truncated layout to the LLM to save token context window space
                simplified_jobs = []
                for j in jobs:
                    simplified_jobs.append({
                        "id": j.get("id"),
                        "company": j.get("company"),
                        "position": j.get("position"),
                        "status": j.get("status"),
                        "salary": j.get("salary")
                    })
                return {"success": True, "jobs": simplified_jobs, "count": len(simplified_jobs)}
            return {"success": False, "error": f"API returned status {resp.status_code}", "detail": resp.text}
        except Exception as e:
            logger.error(f"Error executing list_jobs API request: {e}")
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

async def execute_tool(name: str, arguments: Dict[str, Any], user_token: str) -> Dict[str, Any]:
    """
    Executes a workspace tool requested by the LLM on behalf of the user.
    """
    try:
        if name == "list_jobs":
            status = arguments.get("status")
            query = arguments.get("query")
            return await list_jobs(user_token, status, query)
            
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
            
        else:
            return {"success": False, "error": f"Herramienta '{name}' no disponible."}
    except Exception as e:
        logger.error(f"Error dispatching tool execution for '{name}': {e}", exc_info=True)
        return {"success": False, "error": f"Error ejecutando herramienta: {str(e)}"}
