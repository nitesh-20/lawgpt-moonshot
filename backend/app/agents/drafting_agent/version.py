import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List
from loguru import logger
from app.database.firestore import get_firestore_client
from app.core.config import settings


class VersionManager:
    """
    Manages document revisions, tracking historical drafts in Firestore
    or falling back to a local files store.
    """
    def __init__(self, data_dir: Path | None = None) -> None:
        self.data_dir = data_dir or settings.BASE_DIR / "data" / "versions"
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.collection_name = "drafting_versions"

    async def save_version(self, doc_id: str, text: str, meta: Dict[str, Any]) -> int:
        """
        Saves a new draft version. Increments the version number automatically.
        """
        versions = await self.get_versions(doc_id)
        next_ver = len(versions) + 1

        record = {
            "document_id": doc_id,
            "version": next_ver,
            "text": text,
            "metadata": meta,
            "timestamp": datetime.now(timezone.utc).isoformat() + "Z"
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
                logger.info(f"Version {next_ver} for document {doc_id} saved to Firestore.")
                return next_ver
            except Exception as e:
                logger.warning(f"Firestore save version failed: {e}. Falling back to local.")

        # 2. Local File Write
        try:
            doc_file = self.data_dir / f"{doc_id}.json"
            all_records = []
            if doc_file.exists():
                with open(doc_file, "r") as f:
                    all_records = json.load(f)
            all_records.append(record)
            with open(doc_file, "w") as f:
                json.dump(all_records, f, indent=2)
            logger.info(f"Version {next_ver} for document {doc_id} saved locally.")
            return next_ver
        except Exception as ex:
            logger.error(f"Failed to write version locally: {ex}")
            return next_ver

    async def get_versions(self, doc_id: str) -> List[Dict[str, Any]]:
        """
        Retrieves all historical versions of a document.
        """
        # 1. Firestore Read
        client = None
        try:
            client = get_firestore_client()
        except Exception:
            client = None

        if client is not None:
            try:
                docs = (
                    client.collection(self.collection_name)
                    .where("document_id", "==", doc_id)
                    .order_by("version")
                    .stream()
                )
                records = [d.to_dict() for d in docs]
                if records:
                    return records
            except Exception as e:
                logger.warning(f"Firestore read versions failed: {e}. Trying local.")

        # 2. Local File Read
        doc_file = self.data_dir / f"{doc_id}.json"
        if doc_file.exists():
            try:
                with open(doc_file, "r") as f:
                    return json.load(f)
            except Exception:
                pass
        return []

    async def get_latest_version(self, doc_id: str) -> Dict[str, Any] | None:
        """
        Gets the latest version of a document.
        """
        versions = await self.get_versions(doc_id)
        if versions:
            return versions[-1]
        return None
