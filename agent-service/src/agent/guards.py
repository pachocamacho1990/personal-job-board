import logging

logger = logging.getLogger("agent.guards")

class ActionNotAllowedError(Exception):
    pass

class SafetyGuards:
    def __init__(self, allowed_actions: list = None, denied_actions: list = None):
        self.allowed_actions = allowed_actions or ["click", "type", "navigate", "extract", "scroll", "open_tab"]
        self.denied_actions = denied_actions or ["payment", "checkout", "delete_account", "change_password", "transfer_funds"]

    def is_allowed_action(self, action_name: str) -> bool:
        if action_name in self.denied_actions:
            return False
        return action_name in self.allowed_actions

    def require_confirmation(self, action_name: str, details: str = "") -> bool:
        """
        Safety hook for critical actions. In a CLI context, it prompts stdin.
        In a microservice context, it can pause or wait for WebSocket input.
        """
        logger.warning(f"CRITICAL ACTION DETECTED: {action_name}. Details: {details}")
        print(f"\n⚠️  [SEGURIDAD] Acción crítica requerida: {action_name} ({details})")
        try:
            user_input = input("¿Deseas permitir esta acción? (s/n): ").strip().lower()
            return user_input == 's'
        except Exception:
            # Non-interactive terminal
            return False
