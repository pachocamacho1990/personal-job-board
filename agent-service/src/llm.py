import logging
from typing import List, Dict, Any, Tuple, Optional
from openai import AsyncOpenAI
from src.config import settings

logger = logging.getLogger(__name__)

class LLMManager:
    def __init__(self):
        # Fall back to standard OpenAI if base_url is not configured
        api_key = settings.llm_api_key or "mock-key"
        base_url = settings.llm_base_url if settings.llm_base_url else None
        
        self.client = AsyncOpenAI(
            api_key=api_key,
            base_url=base_url
        )
        self.model = settings.llm_model
        logger.info(f"Initialized LLM client targeting model '{self.model}' at url: '{base_url or 'default-openai'}'")

    async def get_response(
        self,
        messages: List[Dict[str, Any]],
        tools: Optional[List[Dict[str, Any]]] = None
    ) -> Tuple[Optional[str], Optional[List[Any]]]:
        """
        Requests completion from the LLM. 
        Returns (content, tool_calls).
        """
        try:
            formatted_messages = []
            for msg in messages:
                # Convert our DB format back to OpenAI format
                role = msg.get("role")
                content = msg.get("content", "")
                
                # Standard roles: system, user, assistant, tool
                api_role = "assistant" if role == "agent" else role
                
                formatted_msg = {
                    "role": api_role,
                    "content": content
                }
                
                # If tool_call or tool_result, map them back for LLM contextual awareness
                if role == "tool" and msg.get("type") == "tool_result":
                    formatted_msg["name"] = msg.get("toolName")
                
                formatted_messages.append(formatted_msg)

            # Insert system instructions at the beginning to direct agent persona & task
            system_instruction = (
                "Eres Zenith Agent, un consejero laboral y asistente inteligente para gestionar tableros de empleo.\n"
                "Ayudas al usuario a limpiar, organizar y buscar vacantes en su espacio de trabajo.\n"
                "Tienes acceso a herramientas para listar, actualizar y archivar tarjetas en su Job Board.\n"
                "Sé claro, amable y estructurado en tus respuestas. Escribe en Markdown (usa **negrita** para recalcar)."
            )
            
            # Prepend system instruction if not already present
            if not any(m["role"] == "system" for m in formatted_messages):
                formatted_messages.insert(0, {
                    "role": "system",
                    "content": system_instruction
                })

            params: Dict[str, Any] = {
                "model": self.model,
                "messages": formatted_messages,
                "temperature": 0.3
            }

            if tools:
                params["tools"] = tools
                params["tool_choice"] = "auto"

            logger.info(f"Sending request to LLM '{self.model}' with {len(formatted_messages)} messages")
            response = await self.client.chat.completions.create(**params)
            
            choice = response.choices[0]
            message = choice.message
            
            content = message.content
            tool_calls = message.tool_calls
            
            return content, tool_calls
        except Exception as e:
            logger.error(f"Error calling LLM provider: {e}", exc_info=True)
            return f"Lo siento, ocurrió un error al comunicarme con mi cerebro de IA: {str(e)}", None

llm_manager = LLMManager()
