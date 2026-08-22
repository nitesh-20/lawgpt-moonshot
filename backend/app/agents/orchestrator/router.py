from typing import Any
from loguru import logger


class AgentRegistry:
    """
    Manages registry database of child agents, versions, capabilities, health states, and priorities.
    """
    def __init__(self) -> None:
        self.agents = {}

    def register_agent(self, agent_metadata: dict[str, Any]) -> None:
        agent_id = agent_metadata["id"]
        self.agents[agent_id] = agent_metadata
        logger.info(f"Registered child agent in Orchestrator registry: {agent_id}")

    def get_agent_metadata(self, agent_id: str) -> dict[str, Any] | None:
        return self.agents.get(agent_id)

    def list_agents(self) -> list[dict[str, Any]]:
        return list(self.agents.values())


class AgentRouter:
    """
    Evaluates subtask intents and routes query inputs to the most qualified agent.
    """
    def __init__(self, registry: AgentRegistry) -> None:
        self.registry = registry

    async def route(self, intent: str) -> str | None:
        """
        Dynamically finds the best matching agent by priority and capability tags.
        """
        candidates = []
        for agent_id, meta in self.registry.agents.items():
            if intent in meta.get("supported_intents", []):
                candidates.append(meta)

        if not candidates:
            return None

        # Sort candidates by priority (highest priority first)
        candidates.sort(key=lambda x: x.get("priority", 0), reverse=True)
        return candidates[0]["id"]
