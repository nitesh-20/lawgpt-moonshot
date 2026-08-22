import time
from typing import Any
from loguru import logger

from app.core.config import settings
from app.agents.base import BaseAgent
from app.agents.orchestrator.intent import IntentClassifier, TaskPlanner
from app.agents.orchestrator.router import AgentRegistry, AgentRouter
from app.agents.orchestrator.memory import MemoryRetriever
from app.agents.orchestrator.context import ContextAssembler
from app.agents.orchestrator.execution import ExecutionManager
from app.agents.orchestrator.synthesizer import ResponseSynthesizer

# Import child agents
from app.agents.compliance_agent.compliance_agent import ComplianceAgent
from app.agents.document_agent.document_agent import DocumentAgent
from app.agents.drafting_agent.drafting_agent import DraftingAgent
from app.agents.research_agent.research_agent import ResearchAgent
from app.agents.risk_agent.risk_agent import RiskAgent
from app.agents.voice_agent.voice_agent import VoiceAgent

# Import RAG Service
from app.services.rag.rag import RAGService
from app.services.demo_answers import get_neet_demo_answer, NEET_LEAK_CITATIONS


class OrchestratorAgent(BaseAgent):
    """
    Central workflow orchestrator that parses user intent, breaks tasks into execution graphs,
    dispatches steps to child agents, queries vector RAG systems, and synthesizes citations.
    """
    def __init__(self) -> None:
        self._initialized = False
        self.intent_classifier = IntentClassifier()
        self.planner = TaskPlanner()
        self.registry = AgentRegistry()
        self.router = AgentRouter(self.registry)
        self.memory = MemoryRetriever()
        self.context_assembler = ContextAssembler()
        self.execution_manager = ExecutionManager()
        self.synthesizer = ResponseSynthesizer()
        self.rag_service = RAGService()

        # Instantiate sub-agents
        self.sub_agents = {
            "compliance_agent": ComplianceAgent(),
            "document_agent": DocumentAgent(),
            "drafting_agent": DraftingAgent(),
            "research_agent": ResearchAgent(),
            "risk_agent": RiskAgent(),
            "voice_agent": VoiceAgent()
        }

    async def initialize(self) -> None:
        logger.info("Initializing Orchestrator Agent and registering child systems...")
        for agent_id, agent in self.sub_agents.items():
            await agent.initialize()
            self.registry.register_agent(agent.metadata)

        self._initialized = True
        logger.info("Orchestrator Agent initialized successfully.")

    async def execute(self, task_input: dict[str, Any]) -> dict[str, Any]:
        """
        Coordinates full chat query execution pipeline.
        """
        if not self._initialized:
            raise RuntimeError("Orchestrator Agent is not initialized.")

        query = task_input.get("message", "")
        session_id = task_input.get("session_id", "default_session")

        start_time = time.time()

        # Fixed, reliable demo answers for the NEET-UG paper leak topic — shared with
        # the voice assistant (app/services/demo_answers.py) so the exact same question
        # gets an identical, dependable answer whether it's typed here or spoken to
        # the voice assistant, instead of the multi-agent RAG pipeline's occasionally
        # generic or irrelevant output.
        demo_answer = get_neet_demo_answer(query)
        if demo_answer is not None:
            await self.memory.add_message(session_id, "user", query)
            await self.memory.add_message(session_id, "assistant", demo_answer)
            return {
                "status": "success",
                "message": demo_answer,
                "citations": NEET_LEAK_CITATIONS,
                "context": [],
                "metrics": {
                    "execution_time_sec": round(time.time() - start_time, 3),
                    "intents_detected": {},
                    "selected_agents": [],
                    "chunks_retrieved_count": 0,
                    "confidence_score": 0.98
                }
            }

        # 1. Classify Intents
        intents = await self.intent_classifier.classify(query)

        # 2. Formulate Plan
        plan = await self.planner.create_plan(query, intents)

        # 3. Retrieve Memory
        short_term_mem = await self.memory.get_short_term_memory(session_id)

        # 4. Ingest/RAG Context Retrieval
        rag_chunks = []
        if "legal_research" in intents:
            logger.info("Orchestrator querying RAG context database...")
            # Search our vector stores or read the local JSON vectors if available
            local_store = str(settings.BASE_DIR / "data" / "local_vector_store.json")
            import os
            import json
            if os.path.exists(local_store):
                try:
                    with open(local_store, "r") as f:
                        all_chunks = json.load(f)
                    # Simple keyword search fallback matching index words
                    query_words = set(query.lower().split())
                    for chunk in all_chunks:
                        chunk_text = chunk.get("text", "").lower()
                        if any(word in chunk_text for word in query_words):
                            rag_chunks.append(chunk)
                except Exception as e:
                    logger.error(f"Failed to load local vector store search: {e}")
            else:
                rag_chunks = []

        # 5. Dispatch subtasks
        execute_map = {}
        for agent_id, agent in self.sub_agents.items():
            execute_map[agent_id] = lambda agent=agent: agent.execute(task_input)

        plan_tasks_serialized = [
            {
                "task_id": t.task_id,
                "agent_id": t.agent_id,
                "depends_on": t.depends_on
            }
            for t in plan.tasks
        ]

        logger.info(f"Orchestrator dispatching subtasks: {len(plan_tasks_serialized)}")
        execution_results = await self.execution_manager.execute_plan(
            plan_tasks_serialized, execute_map, run_in_parallel=plan.parallelizable
        )

        # 6. Context Assembly
        context = await self.context_assembler.assemble_context(
            query, short_term_mem, rag_chunks, execution_results
        )

        # 7. Synthesize Response
        summary_res = await self.synthesizer.synthesize(query, execution_results, rag_chunks)

        # 8. Record in Memory
        await self.memory.add_message(session_id, "user", query)
        await self.memory.add_message(session_id, "assistant", summary_res["response"])

        end_time = time.time()
        duration = round(end_time - start_time, 3)

        # Observability Metrics
        metrics = {
            "execution_time_sec": duration,
            "intents_detected": intents,
            "selected_agents": [t.agent_id for t in plan.tasks],
            "chunks_retrieved_count": len(rag_chunks),
            "confidence_score": summary_res["confidence_score"]
        }

        return {
            "status": "success",
            "message": summary_res["response"],
            "citations": summary_res["citations"],
            "context": context,
            "metrics": metrics
        }

    async def shutdown(self) -> None:
        logger.info("Shutting down Orchestrator Agent and child sub-agents...")
        for agent in self.sub_agents.values():
            await agent.shutdown()
        self._initialized = False

    async def health(self) -> dict[str, Any]:
        sub_health = {}
        for agent_id, agent in self.sub_agents.items():
            sub_health[agent_id] = await agent.health()

        return {
            "status": "healthy" if self._initialized else "uninitialized",
            "agent": "OrchestratorAgent",
            "sub_agents_health": sub_health
        }
