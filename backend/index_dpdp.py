import asyncio
import json
from loguru import logger
from app.services.rag.indexer import KnowledgeIndexer

async def index_dpdp():
    logger.info("Starting targeted ingestion...")
    indexer = KnowledgeIndexer()
    
    # We will modify the status to trick the indexer into running
    status = indexer._get_status()
    if status.get("status") == "processing":
        status["status"] = "failed"
        indexer._save_status(status)
        
    # Run the pipeline without reindexing everything, but we will temporarily modify the manifest
    # to ONLY include DPDP acts so it's fast!
    with open("data/knowledge_manifest.json", "r") as f:
        manifest = json.load(f)
        
    original_manifest = list(manifest)
    
    # Disable everything except DPDP
    for item in manifest:
        if "dpdp" not in item.get("category", ""):
            item["status"] = "inactive"
            
    with open("data/knowledge_manifest.json", "w") as f:
        json.dump(manifest, f, indent=2)
        
    try:
        await indexer._run_ingestion_pipeline(reindex_all=False)
        logger.info("DPDP indexing complete.")
    finally:
        # Restore manifest
        with open("data/knowledge_manifest.json", "w") as f:
            json.dump(original_manifest, f, indent=2)

if __name__ == "__main__":
    asyncio.run(index_dpdp())
