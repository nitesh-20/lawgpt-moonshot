from typing import Any
from fastapi import APIRouter, BackgroundTasks, HTTPException, status
from app.services.rag.indexer import KnowledgeIndexer
from app.services.pdf.validator import ManifestLoader, MetadataLoader

router = APIRouter(prefix="/knowledge")
indexer = KnowledgeIndexer()


@router.post("/ingest", status_code=status.HTTP_202_ACCEPTED)
async def trigger_ingest() -> dict[str, Any]:
    """
    Trigger the ingestion pipeline for any unindexed active documents in the background.
    """
    res = await indexer.trigger_ingestion(reindex_all=False)
    if res.get("status") == "already_running":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=res["message"]
        )
    return res


@router.post("/reindex", status_code=status.HTTP_202_ACCEPTED)
async def trigger_reindex() -> dict[str, Any]:
    """
    Clear the vector store indices and rebuild the knowledge base from scratch.
    """
    res = await indexer.trigger_ingestion(reindex_all=True)
    if res.get("status") == "already_running":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=res["message"]
        )
    return res


@router.get("/status")
async def get_status() -> dict[str, Any]:
    """
    Get the status of the current or most recent background ingestion run.
    """
    return await indexer.get_indexing_status()


@router.get("/statistics")
async def get_statistics() -> dict[str, Any]:
    """
    Retrieve global metrics of the legal knowledge base.
    """
    manifest = ManifestLoader.load()
    metadata = MetadataLoader.load()
    status_data = await indexer.get_indexing_status()

    active_docs = [item for item in manifest if item.get("status") == "active"]
    placeholder_docs = [item for item in manifest if item.get("status") == "placeholder"]

    total_pages = sum(item.get("total_pages", 0) for item in metadata)
    avg_pages = round(total_pages / len(metadata), 1) if metadata else 0.0

    return {
        "total_manifest_documents": len(manifest),
        "active_documents": len(active_docs),
        "placeholder_documents": len(placeholder_docs),
        "processed_documents_count": status_data.get("documents_processed", 0),
        "chunks_indexed": status_data.get("chunks_generated", 0),
        "avg_pages_per_document": avg_pages,
        "total_page_count": total_pages,
        "failures_count": len(status_data.get("failures", [])),
        "warnings_count": len(status_data.get("warnings", []))
    }


@router.get("/documents")
async def get_documents() -> list[dict[str, Any]]:
    """
    Get a list of all documents currently tracked in the manifest, with their status and parameters.
    """
    return ManifestLoader.load()
