from typing import Any


class MemoryRetriever:
    """
    Manages short-term session state, sliding window historical logs, and execution traces.
    """
    def __init__(self, limit: int = 10) -> None:
        self.limit = limit
        self.conversations: dict[str, list[dict[str, str]]] = {}  # session_id -> message list
        self.session_data: dict[str, dict[str, Any]] = {}         # session_id -> properties
        self.summaries: dict[str, str] = {}                      # session_id -> summary string

    async def get_short_term_memory(self, session_id: str) -> list[dict[str, str]]:
        """
        Returns a sliding window slice of the last N conversation messages.
        """
        history = self.conversations.get(session_id, [])
        return history[-self.limit:]

    async def add_message(self, session_id: str, sender: str, text: str) -> None:
        if session_id not in self.conversations:
            self.conversations[session_id] = []
        self.conversations[session_id].append({
            "sender": sender,
            "text": text
        })

    async def get_session_value(self, session_id: str, key: str, default: Any = None) -> Any:
        return self.session_data.get(session_id, {}).get(key, default)

    async def set_session_value(self, session_id: str, key: str, value: Any) -> None:
        if session_id not in self.session_data:
            self.session_data[session_id] = {}
        self.session_data[session_id][key] = value

    async def get_summary(self, session_id: str) -> str:
        return self.summaries.get(session_id, "")

    async def update_summary(self, session_id: str, summary: str) -> None:
        self.summaries[session_id] = summary
