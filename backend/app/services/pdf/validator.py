import hashlib
import json
import os
from pathlib import Path
from typing import Any
from loguru import logger

from app.core.config import settings


class ManifestLoader:
    """
    Loads document ingestion parameters from the knowledge manifest.
    """
    @staticmethod
    def load(manifest_path: str = str(settings.BASE_DIR / "data" / "knowledge_manifest.json")) -> list[dict[str, Any]]:
        path = Path(manifest_path)
        if not path.exists():
            logger.warning(f"Manifest file not found: {manifest_path}")
            return []
        try:
            with open(path, "r") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error reading manifest {manifest_path}: {e}")
            return []


class MetadataLoader:
    """
    Loads legal metadata attributes from the metadata registry.
    """
    @staticmethod
    def load(metadata_path: str = str(settings.BASE_DIR / "data" / "document_metadata.json")) -> list[dict[str, Any]]:
        path = Path(metadata_path)
        if not path.exists():
            logger.warning(f"Metadata registry not found: {metadata_path}")
            return []
        try:
            with open(path, "r") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error reading metadata {metadata_path}: {e}")
            return []


class ValidationService:
    """
    Validates document eligibility before pipeline indexing.
    """
    def __init__(self, manifest_path: str = None, metadata_path: str = None) -> None:
        self.manifest_path = manifest_path or str(settings.BASE_DIR / "data" / "knowledge_manifest.json")
        self.metadata_path = metadata_path or str(settings.BASE_DIR / "data" / "document_metadata.json")

    def calculate_sha256(self, file_path: Path) -> str:
        hash_sha = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_sha.update(chunk)
        return hash_sha.hexdigest()

    async def validate_document(self, doc_id: str) -> dict[str, Any]:
        """
        Validate active status, physical existence, readability, and checksum matching.
        """
        manifest = ManifestLoader.load(self.manifest_path)
        metadata = MetadataLoader.load(self.metadata_path)

        # 1. Find in manifest
        manifest_item = next((item for item in manifest if item["id"] == doc_id), None)
        if not manifest_item:
            return {"valid": False, "reason": "Not found in manifest."}

        # 2. Check active status
        if manifest_item.get("status") != "active":
            return {"valid": False, "reason": f"Document status is '{manifest_item.get('status')}', expected 'active'."}

        # 3. Find metadata record
        meta_item = next((item for item in metadata if item["id"] == doc_id), None)
        if not meta_item:
            return {"valid": False, "reason": "Not found in metadata registry."}

        # 4. Check physical existence
        rel_path = manifest_item["path"]
        abs_path = settings.BASE_DIR.parent / rel_path
        if not abs_path.exists():
            return {"valid": False, "reason": f"File does not exist physically at path: {rel_path}"}

        # 5. Check readability
        if not os.access(abs_path, os.R_OK):
            return {"valid": False, "reason": f"File is not readable: {rel_path}"}

        # 6. Validate checksum
        try:
            expected_checksum = meta_item["checksum"]
            calculated_checksum = self.calculate_sha256(abs_path)
            if expected_checksum != calculated_checksum:
                return {
                    "valid": False,
                    "reason": f"Checksum mismatch. Expected: {expected_checksum[:10]}..., Got: {calculated_checksum[:10]}..."
                }
        except Exception as e:
            return {"valid": False, "reason": f"Failed checksum calculation: {e}"}

        return {
            "valid": True,
            "manifest_item": manifest_item,
            "metadata_item": meta_item,
            "absolute_path": abs_path
        }
