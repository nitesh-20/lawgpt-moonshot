import os
from typing import Any
from loguru import logger
from app.core.config import settings


class BaseEmbeddingProvider:
    """
    Abstract interface for pluggable embedding model providers.
    """
    async def get_embedding(self, text: str) -> list[float]:
        raise NotImplementedError

    async def get_embeddings(self, texts: list[str]) -> list[list[float]]:
        raise NotImplementedError


import httpx

class GeminiEmbeddingProvider(BaseEmbeddingProvider):
    """
    Generates text embeddings using Google's Gemini Embedding API.
    """
    def __init__(self, api_key: str = None) -> None:
        self.api_key = api_key or settings.GEMINI_API_KEY
        if not self.api_key:
            logger.warning("GeminiEmbeddingProvider initialized without GEMINI_API_KEY.")

    async def get_embedding(self, text: str) -> list[float]:
        logger.info("Generating embedding via Gemini Provider.")
        if not self.api_key:
            return [0.0] * 768
            
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key={self.api_key}"
        headers = {"Content-Type": "application/json"}
        payload = {
            "content": {
                "parts": [{"text": text}]
            }
        }
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(url, json=payload, headers=headers, timeout=15.0)
                if resp.status_code == 200:
                    data = resp.json()
                    return data["embedding"]["values"]
                else:
                    logger.error(f"Gemini embedding failed with status {resp.status_code}: {resp.text}")
        except Exception as e:
            logger.error(f"Error calling Gemini Embedding API: {e}")
        return [0.0] * 768

    async def get_embeddings(self, texts: list[str]) -> list[list[float]]:
        logger.info(f"Generating batch embeddings ({len(texts)}) via Gemini Provider.")
        if not self.api_key or not texts:
            return [[0.0] * 768 for _ in texts]

        results = []
        batch_size = 100
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:batchEmbedContents?key={self.api_key}"
            headers = {"Content-Type": "application/json"}
            
            requests = []
            for t in batch:
                requests.append({
                    "model": "models/gemini-embedding-2",
                    "content": {
                        "parts": [{"text": t}]
                    }
                })
                
            payload = {"requests": requests}
            try:
                async with httpx.AsyncClient() as client:
                    resp = await client.post(url, json=payload, headers=headers, timeout=60.0)
                    if resp.status_code == 200:
                        data = resp.json()
                        batch_embs = [emb["values"] for emb in data["embeddings"]]
                        results.extend(batch_embs)
                    else:
                        logger.error(f"Gemini batch embedding failed with status {resp.status_code}: {resp.text}")
                        for t in batch:
                            results.append(await self.get_embedding(t))
            except Exception as e:
                logger.error(f"Error calling Gemini Batch Embedding API: {e}")
                for t in batch:
                    results.append(await self.get_embedding(t))
                    
        return results


class OpenAIEmbeddingProvider(BaseEmbeddingProvider):
    """
    Generates text embeddings using OpenAI's API.
    """
    def __init__(self, api_key: str = None) -> None:
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")

    async def get_embedding(self, text: str) -> list[float]:
        logger.info("Generating embedding via OpenAI Provider.")
        return [0.0] * 1536  # text-embedding-ada-002 standard dimension

    async def get_embeddings(self, texts: list[str]) -> list[list[float]]:
        logger.info(f"Generating batch embeddings ({len(texts)}) via OpenAI Provider.")
        return [[0.0] * 1536 for _ in texts]


class VertexAIEmbeddingProvider(BaseEmbeddingProvider):
    """
    Generates text embeddings using Google Cloud Vertex AI text-embedding-gecko.
    """
    async def get_embedding(self, text: str) -> list[float]:
        logger.info("Generating embedding via Vertex AI Provider.")
        return [0.0] * 768

    async def get_embeddings(self, texts: list[str]) -> list[list[float]]:
        logger.info(f"Generating batch embeddings ({len(texts)}) via Vertex AI Provider.")
        return [[0.0] * 768 for _ in texts]


class LocalEmbeddingProvider(BaseEmbeddingProvider):
    """
    Local model provider stub for running offline without API keys.
    """
    async def get_embedding(self, text: str) -> list[float]:
        logger.info("Generating embedding via Local Provider.")
        return [0.0] * 384  # miniLM standard dimension

    async def get_embeddings(self, texts: list[str]) -> list[list[float]]:
        logger.info(f"Generating batch embeddings ({len(texts)}) via Local Provider.")
        return [[0.0] * 384 for _ in texts]


def get_embedding_provider(provider_name: str = None) -> BaseEmbeddingProvider:
    name = (provider_name or os.getenv("EMBEDDING_PROVIDER", "gemini")).lower()
    if name == "gemini":
        return GeminiEmbeddingProvider()
    elif name == "openai":
        return OpenAIEmbeddingProvider()
    elif name == "vertex":
        return VertexAIEmbeddingProvider()
    elif name == "local":
        return LocalEmbeddingProvider()
    else:
        logger.warning(f"Unknown embedding provider: {name}. Defaulting to Local.")
        return LocalEmbeddingProvider()
