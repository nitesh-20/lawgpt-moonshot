import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List
from loguru import logger

from app.agents.base import BaseAgent
from app.database.firestore import get_firestore_client

# Sub-module imports
from app.agents.drafting_agent.templates import TemplateManager
from app.agents.drafting_agent.clauses import ClauseLibrary
from app.agents.drafting_agent.selector import ClauseSelector
from app.agents.drafting_agent.generator import DraftGenerator
from app.agents.drafting_agent.reviewer import DocumentReviewer
from app.agents.drafting_agent.redline import RedlineEngine
from app.agents.drafting_agent.version import VersionManager
from app.agents.drafting_agent.quality import QualityChecker
from app.core.config import settings


class DraftingAgent(BaseAgent):
    """
    Drafting Agent drafts customized legal documents, reviews/improves uploaded drafts,
    generates redlines/comparisons, and tracks document revisions.
    """

    def __init__(self) -> None:
        self._initialized = False
        self.template_manager = TemplateManager()
        self.clause_library = ClauseLibrary()
        self.clause_selector = ClauseSelector(self.clause_library)
        self.generator = DraftGenerator()
        self.reviewer = DocumentReviewer()
        self.redline_engine = RedlineEngine()
        self.version_manager = VersionManager()
        self.quality_checker = QualityChecker()
        
        self.history_file = settings.BASE_DIR / "data" / "drafting_history.json"
        self.collection_name = "drafting_history"

    @property
    def metadata(self) -> dict[str, Any]:
        return {
            "id": "drafting_agent",
            "name": "Legal Drafting Agent",
            "description": "Generates, reviews, improves, and redlines legal contracts, policies, and letters.",
            "supported_intents": ["draft_contract", "review_contract", "redline_contract", "improve_contract"],
            "priority": 4,
            "health": "healthy" if self._initialized else "uninitialized",
            "version": "1.1.0",
            "capabilities": [
                "NDA drafting",
                "Employment agreement generation",
                "Offer letter formulation",
                "Lease contract detailing",
                "Service agreement review",
                "Vendor agreement redlining",
                "Privacy Policy & Terms compliance",
                "Quality scoring and placeholder checks",
                "Plain-English explanation generation"
            ]
        }

    async def initialize(self) -> None:
        logger.info("Initializing Legal Drafting Agent...")
        self._initialized = True
        logger.info("Legal Drafting Agent initialized successfully.")

    async def execute(self, task_input: dict[str, Any]) -> dict[str, Any]:
        """
        Executes Legal Drafting Agent tasks.

        Inputs:
            task_input (dict): Must contain 'action'. Supported values:
                - 'generate': Generate draft from template and variables
                - 'review': Analyze a draft for quality, missing sections, and risks
                - 'redline': Compare original and revised drafts
                - 'improve': Improve an existing draft or rewrite clauses
                - 'templates': List all available document templates
        """
        if not self._initialized:
            raise RuntimeError("Drafting Agent is not initialized.")

        action = task_input.get("action", "").lower()
        logger.info(f"Drafting Agent executing action: '{action}'")
        
        start_time = time.time()
        result_data = {}

        try:
            if action == "generate":
                result_data = await self._handle_generate(task_input)
            elif action == "review":
                result_data = await self._handle_review(task_input)
            elif action == "redline":
                result_data = await self._handle_redline(task_input)
            elif action == "improve":
                result_data = await self._handle_improve(task_input)
            elif action == "templates":
                result_data = {"templates": self.template_manager.list_templates()}
            else:
                # Default/Fallback action if none matches: try template generation or error
                doc_type = task_input.get("doc_type")
                if doc_type:
                    logger.info("No action provided; defaulting to 'generate' action.")
                    result_data = await self._handle_generate(task_input)
                else:
                    return {
                        "status": "error",
                        "message": f"Unsupported or missing action: '{action}'.",
                        "agent": "DraftingAgent",
                        "data": {}
                    }

            duration = round(time.time() - start_time, 3)
            
            output_data = {
                "status": "success",
                "message": f"Drafting action '{action}' completed successfully.",
                "agent": "DraftingAgent",
                "action": action,
                "data": result_data,
                "metrics": {
                    "execution_time_sec": duration,
                    "confidence_score": result_data.get("confidence_score", 0.9)
                }
            }

            # Save operation run to history log
            await self._save_history(output_data)
            return output_data

        except Exception as e:
            logger.exception(f"Drafting Agent failed during action '{action}'")
            return {
                "status": "error",
                "message": f"Drafting action '{action}' failed: {e}",
                "agent": "DraftingAgent",
                "data": {}
            }

    async def _handle_generate(self, task_input: dict[str, Any]) -> dict[str, Any]:
        """
        Handles document generation.
        """
        doc_type = task_input.get("doc_type", "nda")
        variables = task_input.get("variables", {})
        custom_clauses = task_input.get("custom_clauses", {})
        user_instructions = task_input.get("user_instructions", "")
        document_id = task_input.get("document_id", f"draft_{int(time.time())}")

        template = self.template_manager.get_template(doc_type)
        if not template:
            raise ValueError(f"No legal template found for document type: '{doc_type}'")

        # 1. Clause Selection
        recommended = template.get("recommended_clauses", [])
        selected = self.clause_selector.select_clauses(recommended, custom_clauses)

        # 2. Generation (uses Gemini or Fallback)
        report = await self.generator.generate(
            template=template,
            variables=variables,
            selected_clauses=selected,
            user_instructions=user_instructions
        )

        # 3. Quality & Formatting check
        quality_report = self.quality_checker.check_quality(report["generated_draft"])
        report["generated_draft"] = self.quality_checker.improve_grammar(report["generated_draft"])
        
        # Merge quality checks into report
        report["quality_checks"] = quality_report
        report["confidence_score"] = quality_report["confidence_score"]

        # 4. Revision tracking
        version = await self.version_manager.save_version(
            doc_id=document_id,
            text=report["generated_draft"],
            meta={
                "doc_type": doc_type,
                "variables": variables,
                "confidence_score": report["confidence_score"]
            }
        )
        report["version"] = version
        report["document_id"] = document_id

        return report

    async def _handle_review(self, task_input: dict[str, Any]) -> dict[str, Any]:
        """
        Handles draft document review checks.
        """
        text = task_input.get("text", "")
        doc_type = task_input.get("doc_type", "general_contract")
        
        if not text:
            raise ValueError("No document text was provided for review.")

        template = self.template_manager.get_template(doc_type)
        required = template.get("recommended_clauses") if template else None

        review_report = await self.reviewer.review(text, doc_type, required)
        quality_report = self.quality_checker.check_quality(text)
        
        return {
            "review_analysis": review_report,
            "quality_checks": quality_report,
            "confidence_score": quality_report["confidence_score"]
        }

    async def _handle_redline(self, task_input: dict[str, Any]) -> dict[str, Any]:
        """
        Handles document version comparisons.
        """
        original = task_input.get("original_text", "")
        revised = task_input.get("revised_text", "")
        
        if not original or not revised:
            raise ValueError("Both 'original_text' and 'revised_text' must be provided for redlining.")

        redlines = await self.redline_engine.generate_redline(original, revised)
        return redlines

    async def _handle_improve(self, task_input: dict[str, Any]) -> dict[str, Any]:
        """
        Improves/rewrites existing drafts or clauses.
        """
        text = task_input.get("text", "")
        instructions = task_input.get("instructions", "Rewrite to make it client-friendly and clear.")
        doc_type = task_input.get("doc_type", "general_contract")
        
        if not text:
            raise ValueError("No text was provided for improvement.")

        # Re-use our generator/Gemini setup to improve the contract/clause
        dummy_template = {
            "name": doc_type,
            "boilerplate": text
        }

        improved_report = await self.generator.generate(
            template=dummy_template,
            variables={},
            selected_clauses={},
            user_instructions=instructions
        )

        quality_report = self.quality_checker.check_quality(improved_report["generated_draft"])
        improved_report["quality_checks"] = quality_report
        improved_report["confidence_score"] = quality_report["confidence_score"]

        return improved_report

    async def _save_history(self, output_data: dict[str, Any]) -> None:
        """
        Saves drafting executions to Firestore or a local JSON file.
        """
        record = {
            "timestamp": datetime.now(timezone.utc).isoformat() + "Z",
            "action": output_data["action"],
            "metrics": output_data["metrics"],
            "data": {k: v for k, v in output_data["data"].items() if k != "generated_draft"}
        }

        # 1. Firestore Write
        client = None
        try:
            client = get_firestore_client()
        except Exception:
            client = None

        if client is not None:
            try:
                client.collection(self.collection_name).add(record)
                logger.info("Drafting audit record saved to Firestore.")
                return
            except Exception as e:
                logger.warning(f"Firestore history write failed: {e}. Falling back to local.")

        # 2. Local File Write
        try:
            self.history_file.parent.mkdir(parents=True, exist_ok=True)
            history = []
            if self.history_file.exists():
                try:
                    with open(self.history_file, "r") as f:
                        history = json.load(f)
                except Exception:
                    history = []

            history.append(record)
            with open(self.history_file, "w") as f:
                json.dump(history, f, indent=2)
            logger.info("Drafting run record saved to local JSON store.")
        except Exception as ex:
            logger.error(f"Failed to write local history log: {ex}")

    async def shutdown(self) -> None:
        logger.info("Shutting down Legal Drafting Agent...")
        self._initialized = False
        logger.info("Legal Drafting Agent shut down.")

    async def health(self) -> dict[str, Any]:
        return {
            "status": "healthy" if self._initialized else "uninitialized",
            "agent": "DraftingAgent",
            "metadata": self.metadata
        }
