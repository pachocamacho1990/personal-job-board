import json
import logging
import asyncpg
from typing import List, Dict, Any, Optional
from src.config import settings

logger = logging.getLogger(__name__)

class DatabaseManager:
    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None

    async def connect(self):
        try:
            self.pool = await asyncpg.create_pool(
                dsn=settings.database_url,
                min_size=2,
                max_size=10
            )
            logger.info("✓ Connected to PostgreSQL database pool from Python Agent")
        except Exception as e:
            logger.error(f"Failed to connect to PostgreSQL: {e}")
            raise e

    async def disconnect(self):
        if self.pool:
            await self.pool.close()
            logger.info("Disconnected from PostgreSQL database pool")

    async def get_or_create_conversation(self, user_id: int) -> int:
        async with self.pool.acquire() as conn:
            # Check if there is an existing conversation
            row = await conn.fetchrow(
                "SELECT id FROM agent_conversations WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1",
                user_id
            )
            if row:
                return row["id"]
            
            # Create a new one
            conv_id = await conn.fetchval(
                "INSERT INTO agent_conversations (user_id) VALUES ($1) RETURNING id",
                user_id
            )
            return conv_id

    async def get_user_conversations(self, user_id: int) -> List[Dict[str, Any]]:
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT c.id, c.title, c.created_at AS "createdAt",
                       (SELECT m.content FROM agent_messages m WHERE m.conversation_id = c.id ORDER BY m.timestamp DESC LIMIT 1) AS "lastMessage",
                       (SELECT m.timestamp FROM agent_messages m WHERE m.conversation_id = c.id ORDER BY m.timestamp DESC LIMIT 1) AS "lastActive"
                FROM agent_conversations c
                WHERE c.user_id = $1
                ORDER BY COALESCE(
                    (SELECT m.timestamp FROM agent_messages m WHERE m.conversation_id = c.id ORDER BY m.timestamp DESC LIMIT 1), 
                    c.created_at
                ) DESC
                """,
                user_id
            )
            
            conversations = []
            for r in rows:
                conversations.append({
                    "id": r["id"],
                    "title": r["title"] or "Nueva Conversación",
                    "createdAt": r["createdAt"].isoformat() if r["createdAt"] else None,
                    "lastMessage": r["lastMessage"] or "",
                    "lastActive": r["lastActive"].isoformat() if r["lastActive"] else None
                })
            return conversations

    async def create_new_conversation(self, user_id: int, title: str = "Nueva Conversación") -> int:
        async with self.pool.acquire() as conn:
            conv_id = await conn.fetchval(
                "INSERT INTO agent_conversations (user_id, title) VALUES ($1, $2) RETURNING id",
                user_id, title
            )
            return conv_id

    async def delete_conversation(self, conversation_id: int):
        async with self.pool.acquire() as conn:
            # Cascades and deletes messages automatically
            await conn.execute("DELETE FROM agent_conversations WHERE id = $1", conversation_id)

    async def update_conversation_title(self, conversation_id: int, title: str):
        async with self.pool.acquire() as conn:
            await conn.execute(
                "UPDATE agent_conversations SET title = $1 WHERE id = $2",
                title, conversation_id
            )

    async def get_conversation_history(self, conversation_id: int) -> List[Dict[str, Any]]:
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT id, role, type, content, tool_name, tool_input, tool_output, 
                       progress_pct, progress_steps, actions, timestamp 
                FROM agent_messages 
                WHERE conversation_id = $1 
                ORDER BY timestamp ASC
                """,
                conversation_id
            )
            
            history = []
            for r in rows:
                history.append({
                    "id": str(r["id"]),
                    "role": r["role"],
                    "type": r["type"],
                    "content": r["content"],
                    "toolName": r["tool_name"],
                    "toolInput": json.loads(r["tool_input"]) if r["tool_input"] else None,
                    "toolOutput": json.loads(r["tool_output"]) if r["tool_output"] else None,
                    "progressPct": r["progress_pct"],
                    "progressSteps": json.loads(r["progress_steps"]) if r["progress_steps"] else None,
                    "actions": json.loads(r["actions"]) if r["actions"] else None,
                    "timestamp": r["timestamp"].isoformat() if r["timestamp"] else None
                })
            return history

    async def save_message(
        self,
        conversation_id: int,
        role: str,
        type_name: str,
        content: str,
        tool_name: Optional[str] = None,
        tool_input: Optional[Dict[str, Any]] = None,
        tool_output: Optional[Dict[str, Any]] = None,
        progress_pct: Optional[int] = None,
        progress_steps: Optional[List[Dict[str, Any]]] = None,
        actions: Optional[List[Dict[str, Any]]] = None
    ) -> int:
        async with self.pool.acquire() as conn:
            input_json = json.dumps(tool_input) if tool_input else None
            output_json = json.dumps(tool_output) if tool_output else None
            steps_json = json.dumps(progress_steps) if progress_steps else None
            actions_json = json.dumps(actions) if actions else None

            msg_id = await conn.fetchval(
                """
                INSERT INTO agent_messages (
                    conversation_id, role, type, content, tool_name, tool_input, 
                    tool_output, progress_pct, progress_steps, actions
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING id
                """,
                conversation_id, role, type_name, content, tool_name, input_json,
                output_json, progress_pct, steps_json, actions_json
            )
            return msg_id

    async def update_message_content(self, message_id: int, content: str):
        async with self.pool.acquire() as conn:
            await conn.execute(
                "UPDATE agent_messages SET content = $1 WHERE id = $2",
                content, message_id
            )

    async def update_message_progress(
        self,
        message_id: int,
        progress_pct: int,
        progress_steps: List[Dict[str, Any]]
    ):
        async with self.pool.acquire() as conn:
            steps_json = json.dumps(progress_steps)
            await conn.execute(
                """
                UPDATE agent_messages 
                SET progress_pct = $1, progress_steps = $2 
                WHERE id = $3
                """,
                progress_pct, steps_json, message_id
            )

    async def get_onboarding_status(self, user_id: int) -> str:
        async with self.pool.acquire() as conn:
            status = await conn.fetchval(
                "SELECT onboarding_status FROM agent_profiles WHERE user_id = $1",
                user_id
            )
            if status is None:
                # Initialize profile
                await conn.execute(
                    "INSERT INTO agent_profiles (user_id, onboarding_status) VALUES ($1, 'uninitialized')",
                    user_id
                )
                return "uninitialized"
            return status

    async def update_onboarding_status(self, user_id: int, status: str):
        async with self.pool.acquire() as conn:
            await conn.execute(
                "UPDATE agent_profiles SET onboarding_status = $1, updated_at = NOW() WHERE user_id = $2",
                status, user_id
            )

    async def update_profile_data(self, user_id: int, data: Dict[str, Any]):
        async with self.pool.acquire() as conn:
            await conn.execute(
                "UPDATE agent_profiles SET profile_data = $1, updated_at = NOW() WHERE user_id = $2",
                json.dumps(data), user_id
            )

    async def get_profile_data(self, user_id: int) -> Dict[str, Any]:
        async with self.pool.acquire() as conn:
            data = await conn.fetchval(
                "SELECT profile_data FROM agent_profiles WHERE user_id = $1",
                user_id
            )
            if data is None:
                return {}
            return json.loads(data) if isinstance(data, str) else data

    async def get_user_memories(self, user_id: int) -> List[Dict[str, Any]]:
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT id, category, content, created_at FROM agent_memories WHERE user_id = $1 ORDER BY created_at ASC",
                user_id
            )
            return [{"id": r["id"], "category": r["category"], "content": r["content"], "createdAt": r["created_at"].isoformat() if r["created_at"] else None} for r in rows]

    async def save_user_memory(self, user_id: int, category: str, content: str) -> int:
        async with self.pool.acquire() as conn:
            mem_id = await conn.fetchval(
                "INSERT INTO agent_memories (user_id, category, content) VALUES ($1, $2, $3) RETURNING id",
                user_id, category, content
            )
            return mem_id

    async def delete_user_memory(self, user_id: int, memory_id: int):
        async with self.pool.acquire() as conn:
            await conn.execute("DELETE FROM agent_memories WHERE id = $1 AND user_id = $2", memory_id, user_id)

    async def get_user_skills(self, user_id: int) -> List[Dict[str, Any]]:
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT id, name, description, recipe FROM agent_skills WHERE user_id = $1 ORDER BY name ASC",
                user_id
            )
            return [{"id": r["id"], "name": r["name"], "description": r["description"], "recipe": json.loads(r["recipe"]) if r["recipe"] else {}} for r in rows]

    async def save_user_skill(self, user_id: int, name: str, description: str, recipe: Dict[str, Any]) -> int:
        async with self.pool.acquire() as conn:
            skill_id = await conn.fetchval(
                "INSERT INTO agent_skills (user_id, name, description, recipe) VALUES ($1, $2, $3, $4) RETURNING id",
                user_id, name, description, json.dumps(recipe)
            )
            return skill_id

    async def delete_user_skill(self, user_id: int, skill_id: int):
        async with self.pool.acquire() as conn:
            await conn.execute("DELETE FROM agent_skills WHERE id = $1 AND user_id = $2", skill_id, user_id)

db_manager = DatabaseManager()
