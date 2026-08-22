import pytest
from pathlib import Path
from fastapi.testclient import TestClient

from app.main import app
from app.services.pdf.pdf import TextCleaner, PDFService
from app.services.rag.chunker import ChunkingService
from app.services.pdf.validator import ValidationService, ManifestLoader, MetadataLoader
from app.services.embeddings.provider import get_embedding_provider
from app.services.rag.vector_store import get_vector_store
from app.services.rag.indexer import KnowledgeIndexer

client = TestClient(app)


def test_text_cleaner():
    raw_text = "Page 1\nThis is a line. \nDuplicate header signature\nDuplicate header signature\nPage 1 of 5\n\n\nAnother line."
    cleaned = TextCleaner.clean(raw_text)
    assert "Page 1" not in cleaned
    assert "Page 1 of 5" not in cleaned
    # Duplicate lines with length > 5 are deduplicated
    assert cleaned.count("Duplicate header signature") == 1
    assert "This is a line." in cleaned


@pytest.mark.asyncio
async def test_chunking_service():
    chunker = ChunkingService(target_size=10, overlap=2)
    sample_text = "This is paragraph one.\n\nThis is paragraph two. It contains multiple sentences to check splitting logic."
    chunks = await chunker.chunk_document(sample_text)
    assert len(chunks) >= 2
    assert "paragraph one" in chunks[0]


def test_embedding_provider_resolver():
    provider = get_embedding_provider("local")
    assert provider is not None


def test_vector_store_resolver():
    store = get_vector_store("faiss")
    assert store is not None


@pytest.mark.asyncio
async def test_validation_service_invalid_id():
    validator = ValidationService()
    res = await validator.validate_document("nonexistent_id")
    assert not res["valid"]
    assert "Not found" in res["reason"]


def test_knowledge_api_status():
    response = client.get("/api/v1/knowledge/status")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data


def test_knowledge_api_statistics():
    response = client.get("/api/v1/knowledge/statistics")
    assert response.status_code == 200
    data = response.json()
    assert "total_manifest_documents" in data
    assert "active_documents" in data


def test_knowledge_api_documents():
    response = client.get("/api/v1/knowledge/documents")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
