import re
from typing import Any


class IntentClassifier:
    """
    Classifies user message intent into one or more legal tasks.
    """
    INTENT_KEYWORDS = {
        "legal_research": ["search", "find", "case law", "judgment", "ruling", "cite", "citation", "section", "article"],
        "document_analysis": ["analyze pdf", "read document", "extract text", "parse table", "outline", "document structure"],
        "draft_contract": ["draft", "write agreement", "contract template", "generate clause", "legal letter"],
        "compliance_check": ["compliance", "sebi", "fema", "labor code", "audit", "calendar", "regulations"],
        "legal_explanation": ["explain", "what does", "define", "clarify", "legal meaning"],
        "risk_assessment": ["risk", "exposure", "unfavorable", "hidden clause", "indemnity", "liability"],
        "summarization": ["summarize", "summary", "brief", "short version"],
        "translation": ["translate", "hindi", "tamil", "telugu", "indic", "language"],
        "voice_query": ["voice", "speak", "speech", "transcribe", "audio"]
    }

    async def classify(self, message: str) -> dict[str, float]:
        if not message:
            return {"general_conversation": 1.0}

        message_lower = message.lower()
        scores = {}
        for intent, keywords in self.INTENT_KEYWORDS.items():
            matches = sum(1 for kw in keywords if kw in message_lower)
            if matches > 0:
                scores[intent] = min(1.0, 0.4 + (matches * 0.2))

        if not scores:
            scores["general_conversation"] = 1.0

        return scores


class Task:
    """
    A single granular instruction planned for agent execution.
    """
    def __init__(self, task_id: str, agent_id: str, input_payload: dict[str, Any], depends_on: list[str] = None) -> None:
        self.task_id = task_id
        self.agent_id = agent_id
        self.input_payload = input_payload
        self.depends_on = depends_on or []


class TaskPlan:
    """
    Structured execution graph containing list of subtasks and dependency patterns.
    """
    def __init__(self, tasks: list[Task], parallelizable: bool = False) -> None:
        self.tasks = tasks
        self.parallelizable = parallelizable


class TaskPlanner:
    """
    Deconstructs classified intents into a sequence of agent execution blocks.
    """
    async def create_plan(self, query: str, intents: dict[str, float]) -> TaskPlan:
        tasks = []

        # Mapping intent keys to child agent IDs
        intent_to_agent = {
            "legal_research": "research_agent",
            "document_analysis": "document_agent",
            "draft_contract": "drafting_agent",
            "compliance_check": "compliance_agent",
            "risk_assessment": "risk_agent",
            "voice_query": "voice_agent"
        }

        for intent in intents:
            if intent in intent_to_agent:
                agent_id = intent_to_agent[intent]
                tasks.append(Task(
                    task_id=f"subtask_{intent}",
                    agent_id=agent_id,
                    input_payload={"query": query}
                ))

        # Default to general chat if no agent matches
        if not tasks:
            tasks.append(Task(
                task_id="subtask_general",
                agent_id="orchestrator",
                input_payload={"query": query}
            ))

        has_drafting = any(t.agent_id == "drafting_agent" for t in tasks)

        if has_drafting and len(tasks) > 1:
            non_drafting_tasks = [t for t in tasks if t.agent_id != "drafting_agent"]
            drafting_task = next(t for t in tasks if t.agent_id == "drafting_agent")
            drafting_task.depends_on = [t.task_id for t in non_drafting_tasks]
            return TaskPlan(tasks=tasks, parallelizable=False)

        return TaskPlan(tasks=tasks, parallelizable=True)
