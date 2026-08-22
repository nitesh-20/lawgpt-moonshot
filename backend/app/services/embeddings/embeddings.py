from app.services.embeddings.provider import BaseEmbeddingProvider, get_embedding_provider


class EmbeddingService:
    """
    Embedding service for generating text embeddings to feed vector stores.
    Routes dynamically through configured BaseEmbeddingProvider.
    """

    def __init__(self, provider: BaseEmbeddingProvider = None) -> None:
        self.provider = provider or get_embedding_provider()

    async def get_embedding(self, text: str) -> list[float]:
        """
        Generate vector representation of a single string.
        """
        return await self.provider.get_embedding(text)

    async def get_embeddings(self, texts: list[str]) -> list[list[float]]:
        """
        Batch generate vector representations for multiple strings.
        """
        return await self.provider.get_embeddings(texts)
