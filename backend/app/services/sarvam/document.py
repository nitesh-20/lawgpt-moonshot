from typing import Any, Dict
from loguru import logger
from app.services.sarvam.client import SarvamClient
from app.services.sarvam.config import SarvamConfig

class DocumentIntelligenceManager:
    """Manages Document Parsing and OCR using Sarvam APIs."""
    
    @classmethod
    async def extract_document(cls, file_bytes: bytes, filename: str) -> Dict[str, Any]:
        """
        Uploads document to Sarvam for parsing, OCR, and structure extraction.
        """
        if not SarvamConfig.is_enabled():
            return {"status": "error", "content": "", "message": "Sarvam Document Intelligence is disabled."}
            
        logger.info(f"Sarvam Document: Extracting text from {filename} ({len(file_bytes)} bytes)")
        
        # Try Sarvam MCP first
        try:
            from app.services.sarvam.mcp.service import SarvamService
            mcp_service = SarvamService.get_instance()
            parsed_doc = await mcp_service.extract_document(file_bytes, filename)
            extracted_text = parsed_doc.get("text") or parsed_doc.get("content") if parsed_doc else None
            if extracted_text:
                return {
                    "status": "success",
                    "content": extracted_text,
                    "structured_data": parsed_doc.get("structured_data") or parsed_doc
                }
            if parsed_doc:
                # The vision-extract tool runs as an async job (job_id/job_state) rather
                # than returning inline text — this codebase doesn't yet poll the job or
                # fetch its stored result, so there's no real content to use here.
                # Previously this fell through to `str(parsed_doc)`, treating the raw
                # job-status dict as if it were the document's extracted text.
                logger.warning(
                    f"Sarvam document intelligence returned a job status "
                    f"({parsed_doc.get('job_state', 'unknown')}) with no inline text — "
                    "job result polling isn't implemented, falling back."
                )
        except Exception as e:
            logger.error(f"Sarvam MCP Document Intelligence failure: {e}. Falling back to REST API.")
            
        # Sarvam document parse endpoint
        endpoint = "/document/parse" # Hypothetical mapping or similar structure endpoint
        
        files = {
            "file": (filename, file_bytes, "application/pdf")
        }
        
        data = {
            "extract_tables": "true",
            "ocr_enabled": "true"
        }
        
        response = await SarvamClient.post(endpoint, data=data, files=files)
        
        if response.get("status") == "error":
            # If the specific endpoint doesn't exist or we don't have access,
            # we gracefully fail so the caller (RAG indexer) falls back to PyMuPDF.
            return response
            
        # Parse Sarvam Document response
        # Assume it returns 'text' and 'structured_data' (tables/headings)
        extracted_text = response.get("text", "")
        structured_data = response.get("structured_data", {})
        
        return {
            "status": "success",
            "content": extracted_text,
            "structured_data": structured_data,
            "raw_response": response
        }
