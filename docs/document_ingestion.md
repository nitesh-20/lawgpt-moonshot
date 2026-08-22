# LawGPT AI OS: Document Ingestion Engine Guide

This document describes the structure, operations, and extension points of the Document Ingestion Engine built for LawGPT AI OS.

---

## 1. Pipeline Flow

The Document Ingestion Engine executes a sequential, asynchronous pipeline to parse legal PDFs and register them in the vector database:

```text
[Manifest Loader]  --> Reads active files from knowledge_manifest.json
       │
       ▼
[Validation Service] --> Verifies existence, readability, and SHA-256 checksums
       │
       ▼
[PDF Parser Service] --> Extracts text using PyMuPDF (with pdfplumber / PyPDF fallbacks)
       │
       ▼
[Text Cleaner]       --> normalizes spacing, filters headers/footers, unicode normalization
       │
       ▼
[Chunking Service]   --> Splits layout into 800-1200 word tokens with 150-200 overlaps
       │
       ▼
[Embedding Service]  --> Generates vector embeddings via get_embedding_provider()
       │
       ▼
[Vector Store]       --> Indexes metadata-wrapped chunks in Firestore/Local storage
```

---

## 2. Pluggable Services

The ingestion engine is built on interface abstractions to decouple business rules from specific API vendors:

### A. Embedding Interface (`BaseEmbeddingProvider`)
Encapsulated inside [`provider.py`](../backend/app/services/embeddings/provider.py). Supports:
- `GeminiEmbeddingProvider`: Production Google GenAI standard (768 dimensions).
- `OpenAIEmbeddingProvider`: Ada-002 model standard (1536 dimensions).
- `VertexAIEmbeddingProvider`: GCP Vertex standard.
- `LocalEmbeddingProvider`: Local offline stub (384 dimensions).

### B. Vector Store Interface (`BaseVectorStore`)
Encapsulated inside [`vector_store.py`](../backend/app/services/rag/vector_store.py). Supports:
- `FirestoreVectorStore`: Default production storage. Includes a local JSON fallback (`local_vector_store.json`) for local development without DB keys.
- `FAISSVectorStore` / `ChromaVectorStore` / `PineconeVectorStore` / `WeaviateVectorStore` stubs.

---

## 3. API Reference

All endpoints are prefix-mounted under `/api/v1/knowledge`:

- **`POST /ingest`**: Initiates ingestion for all active, unindexed documents in the background.
- **`POST /reindex`**: Clears existing indexes and rebuilds the database from scratch.
- **`GET /status`**: Returns real-time status of the ingestion run (processed count, chunks, errors).
- **`GET /statistics`**: Aggregates document sizes, average page counts, active/placeholder breakdown.
- **`GET /documents`**: Returns the complete list of files mapped in the ingestion catalog.

---

## 4. Ingested Vector Schema
Each indexed chunk saved to the database matches the following schema:

```json
{
  "document_id": "code_of_civil_procedure_1908",
  "chunk_id": "code_of_civil_procedure_1908_chunk_42",
  "text": "SECTION 42. Power of transferee Court...",
  "embedding": [0.0, 0.0, "..."],
  "page": 24,
  "section": "SECTION 42. Power of transferee Court",
  "category": "acts/cpc",
  "keywords": ["cpc", "civil procedure", "court"],
  "act_type": "Act",
  "jurisdiction": "India",
  "language": "English",
  "source_path": "backend/data/acts/cpc/Code_of_Civil_Procedure_1908.pdf",
  "checksum": "sha256_hash_here",
  "created_at": "2026-07-25T15:06:38Z"
}
```
