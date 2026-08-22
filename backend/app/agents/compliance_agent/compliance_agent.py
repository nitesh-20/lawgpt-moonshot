import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from loguru import logger

from app.agents.base import BaseAgent
from app.agents.compliance_agent.engine import ComplianceEngine
from app.database.firestore import get_firestore_client
from app.core.config import settings


class ComplianceAgent(BaseAgent):
    """
    Compliance Agent performs automated regulatory compliance audits on documents,
    operational workflows, or policies against acts (like SEBI, FEMA, labor codes, IT Act, DPDP).
    """

    def __init__(self) -> None:
        self._initialized = False
        self.engine: ComplianceEngine | None = None
        self.history_file = settings.BASE_DIR / "data" / "compliance_history.json"
        self.collection_name = "compliance_history"

    @property
    def metadata(self) -> dict[str, Any]:
        return {
            "id": "compliance_agent",
            "name": "Compliance Agent",
            "description": "Audits operational procedures and documents against acts (DPDP, SEBI, GST, Labour, RBI) and reports compliance gaps.",
            "supported_intents": ["compliance_check"],
            "priority": 4,
            "health": "healthy" if self._initialized else "uninitialized",
            "version": "1.1.0",
            "capabilities": [
                "DPDP Act privacy audit", 
                "IT Act security standards audit", 
                "GST billing & invoicing checks",
                "SEBI insider trading & LODR reviews",
                "CERT-In incident reporting timeline audit",
                "RBI payment localization verification"
            ]
        }

    async def initialize(self) -> None:
        logger.info("Initializing Compliance Agent...")
        self.engine = ComplianceEngine()
        self._initialized = True
        logger.info("Compliance Agent initialized successfully.")

    async def execute(self, task_input: dict[str, Any]) -> dict[str, Any]:
        logger.info(f"Compliance Agent executing audit. Input: {task_input}")
        if not self._initialized or self.engine is None:
            raise RuntimeError("Compliance Agent is not initialized.")

        raw_query = task_input.get("query")
        if raw_query is None:
            raw_query = task_input.get("message")
        query = str(raw_query) if raw_query is not None else ""
        document_id = task_input.get("document_id")
        file_path = task_input.get("file_path")
        regulation_ids = task_input.get("regulation_ids")

        # Parse regulation_ids if passed as a string or raw list
        if isinstance(regulation_ids, str):
            try:
                regulation_ids = json.loads(regulation_ids)
            except Exception:  # noqa: BLE001
                regulation_ids = [r.strip() for r in regulation_ids.split(",") if r.strip()]

        start_time = time.time()

        try:
            # Execute compliance engine
            report = await self.engine.run_compliance_audit(
                text=query if not (document_id or file_path) else "",
                query=query,
                document_id=document_id,
                file_path=file_path,
                regulation_ids=regulation_ids
            )

            duration = round(time.time() - start_time, 3)

            output_data = {
                "status": "success",
                "message": report["executive_summary"],
                "agent": "ComplianceAgent",
                "data": report,
                "metrics": {
                    "execution_time_sec": duration,
                    "overall_compliance_score": report["metrics"]["overall_compliance_score"],
                    "risk_level": report["metrics"]["risk_level"],
                    "passed_checks_count": report["metrics"]["passed_checks_count"],
                    "failed_checks_count": report["metrics"]["failed_checks_count"]
                }
            }

            # Log to Firestore and local JSON history
            await self._save_history(output_data)

            return output_data

        except Exception as e:  # noqa: BLE001
            logger.exception("Compliance audit execution failed.")
            return {
                "status": "error",
                "message": f"Compliance audit failed: {e}",
                "agent": "ComplianceAgent",
                "data": {}
            }

    async def _save_history(self, output_data: dict[str, Any]) -> None:
        """
        Saves compliance audits to Firestore with local JSON fallback.
        """
        audit_record = {
            "timestamp": datetime.now(timezone.utc).isoformat() + "Z",
            "metrics": output_data["metrics"],
            "report": output_data["data"]
        }

        # 1. Firestore Write
        client = None
        try:
            client = get_firestore_client()
        except Exception:  # noqa: BLE001
            client = None

        if client is not None:
            try:
                client.collection(self.collection_name).add(audit_record)
                logger.info("Compliance audit record saved to Firestore.")
                return
            except Exception as e:  # noqa: BLE001
                logger.warning(f"Firestore compliance history write failed: {e}. Falling back to local.")

        # 2. Local JSON Fallback
        try:
            self.history_file.parent.mkdir(parents=True, exist_ok=True)
            history = []
            if self.history_file.exists():
                try:
                    with open(self.history_file, "r") as f:  # noqa: ASYNC230
                        history = json.load(f)
                except Exception:  # noqa: BLE001
                    history = []

            history.append(audit_record)

            with open(self.history_file, "w") as f:  # noqa: ASYNC230
                json.dump(history, f, indent=2)
            logger.info("Compliance audit record saved to local JSON store.")
        except Exception as ex:  # noqa: BLE001
            logger.error(f"Failed to write compliance local history fallback: {ex}")

    async def shutdown(self) -> None:
        logger.info("Shutting down Compliance Agent...")
        self._initialized = False
        logger.info("Compliance Agent shut down.")

    async def health(self) -> dict[str, Any]:
        return {
            "status": "healthy" if self._initialized else "uninitialized",
            "agent": "ComplianceAgent",
            "metadata": self.metadata
        }
