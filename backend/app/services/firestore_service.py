from typing import Any

from loguru import logger


class FirestoreService:
    """
    Wraps Firestore client queries and document management operations.
    """

    def __init__(self) -> None:
        pass

    async def get_document(self, collection: str, doc_id: str) -> dict[str, Any] | None:
        logger.info(f"Firestore get_document: {collection}/{doc_id}")
        return None

    async def create_document(
        self, collection: str, doc_id: str, data: dict[str, Any]
    ) -> None:
        logger.info(f"Firestore create_document: {collection}/{doc_id}")

    async def update_document(
        self, collection: str, doc_id: str, data: dict[str, Any]
    ) -> None:
        logger.info(f"Firestore update_document: {collection}/{doc_id}")
