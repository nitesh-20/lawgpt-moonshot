import os
import json
from typing import Any
from fastapi import APIRouter, File, UploadFile, Form, HTTPException, status
from pydantic import BaseModel, Field
from datetime import datetime
import uuid
from loguru import logger
from app.core.config import settings
from app.agents.document_agent.analyzer import DocumentAnalyzer
from app.database.firestore import get_firestore_client

router = APIRouter()
analyzer = DocumentAnalyzer()

# Local fallback manifest for the uploaded-documents list — Firestore is disabled in
# this environment (placeholder project ID), so without this, uploads succeed and
# analyze fine but never show up in the Documents list (no way to find them again).
_DOCUMENTS_MANIFEST_PATH = settings.BASE_DIR / "data" / "local_documents_manifest.json"


def _get_local_documents() -> list[dict[str, Any]]:
    if _DOCUMENTS_MANIFEST_PATH.exists():
        try:
            with open(_DOCUMENTS_MANIFEST_PATH, "r") as f:
                return list(json.load(f).values())
        except Exception as e:
            logger.error(f"Failed to read local documents manifest: {e}")
    return []


def _save_local_document(doc_id: str, doc_metadata: dict[str, Any]) -> None:
    data: dict[str, Any] = {}
    if _DOCUMENTS_MANIFEST_PATH.exists():
        try:
            with open(_DOCUMENTS_MANIFEST_PATH, "r") as f:
                data = json.load(f)
        except Exception:
            data = {}
    data[doc_id] = doc_metadata
    try:
        with open(_DOCUMENTS_MANIFEST_PATH, "w") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        logger.error(f"Failed to write local documents manifest: {e}")


def get_safe_filename(file: UploadFile) -> str:
    if not file or not file.filename:
        content_type = getattr(file, "content_type", "") or ""
        if "pdf" in content_type:
            return "document.pdf"
        elif "word" in content_type or "officedocument" in content_type:
            return "document.docx"
        return "document.txt"
    return file.filename



class StatusResponse(BaseModel):
    document_id: str
    status: str
    created_at: str
    updated_at: str
    results: dict[str, Any] | None = None
    error: str | None = None


@router.post("/document/analyze", status_code=status.HTTP_200_OK)
async def analyze_document(
    file: UploadFile = File(None),
    document_id: str = Form(None),
    file_path: str = Form(None)
):
    """
    Analyzes a legal document. Accepts a direct file upload, a local file path, or an existing document_id.
    Parses structural text, runs semantic chunking, indexes in vector store, and extracts clauses, risks, and entities.
    """
    try:
        if file is not None:
            file_bytes = await file.read()
            file_name = get_safe_filename(file)
            doc_id = document_id or f"doc_{file_name.split('.')[0]}_{int(os.getpid())}"
            results = await analyzer.analyze_document(file_name, file_bytes, document_id=doc_id)
            return {
                "status": "success",
                "document_id": doc_id,
                "message": f"Document '{file_name}' analyzed and indexed successfully.",
                "results": results
            }
        elif file_path is not None:
            if not os.path.exists(file_path):
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Local file not found at path: {file_path}"
                )
            with open(file_path, "rb") as f:
                file_bytes = f.read()
            file_name = os.path.basename(file_path)
            doc_id = document_id or f"doc_{file_name.split('.')[0]}_{int(os.getpid())}"
            results = await analyzer.analyze_document(file_name, file_bytes, document_id=doc_id, file_path=file_path)
            return {
                "status": "success",
                "document_id": doc_id,
                "message": f"Document '{file_name}' from path analyzed successfully.",
                "results": results
            }
        elif document_id is not None:
            # Check status of existing document
            record = await analyzer.get_analysis_status(document_id)
            if not record:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"No analysis record found for document ID: {document_id}"
                )
            return {
                "status": "success",
                "document_id": document_id,
                "results": record.get("results"),
                "analysis_status": record.get("status")
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one of 'file', 'file_path', or 'document_id' must be provided."
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Document analysis failed: {e}"
        )


@router.post("/document/compare", status_code=status.HTTP_200_OK)
async def compare_documents(
    file1: UploadFile = File(None),
    file2: UploadFile = File(None),
    document_id_1: str = Form(None),
    document_id_2: str = Form(None),
    file_path_1: str = Form(None),
    file_path_2: str = Form(None)
):
    """
    Compares two documents (original/base vs modified/target).
    Detects inserted, deleted, and modified clauses, overall legal impact, and risk shifts.
    """
    try:
        bytes1, bytes2 = b"", b""
        name1, name2 = "", ""

        # 1. Resolve Doc 1
        if file1 is not None:
            bytes1 = await file1.read()
            name1 = get_safe_filename(file1)
        elif file_path_1 is not None:
            if not os.path.exists(file_path_1):
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"File 1 not found: {file_path_1}")
            with open(file_path_1, "rb") as f:
                bytes1 = f.read()
            name1 = os.path.basename(file_path_1)
        elif document_id_1 is not None:
            # Fallback to local manifest or files
            from app.services.pdf.validator import ValidationService
            val = ValidationService()
            val_res = await val.validate_document(document_id_1)
            if val_res["valid"]:
                abs_path = val_res["absolute_path"]
                with open(abs_path, "rb") as f:
                    bytes1 = f.read()
                name1 = os.path.basename(str(abs_path))
            else:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Doc 1 failed validation: {val_res['reason']}")
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Document 1 (original) must be specified.")

        # 2. Resolve Doc 2
        if file2 is not None:
            bytes2 = await file2.read()
            name2 = get_safe_filename(file2)
        elif file_path_2 is not None:
            if not os.path.exists(file_path_2):
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"File 2 not found: {file_path_2}")
            with open(file_path_2, "rb") as f:
                bytes2 = f.read()
            name2 = os.path.basename(file_path_2)
        elif document_id_2 is not None:
            from app.services.pdf.validator import ValidationService
            val = ValidationService()
            val_res = await val.validate_document(document_id_2)
            if val_res["valid"]:
                abs_path = val_res["absolute_path"]
                with open(abs_path, "rb") as f:
                    bytes2 = f.read()
                name2 = os.path.basename(str(abs_path))
            else:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Doc 2 failed validation: {val_res['reason']}")
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Document 2 (modified) must be specified.")

        comparison_results = await analyzer.compare_documents(name1, bytes1, name2, bytes2)
        return {
            "status": "success",
            "message": f"Successfully compared {name1} against {name2}.",
            "results": comparison_results
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Document comparison failed: {e}"
        )


@router.post("/document/summarize", status_code=status.HTTP_200_OK)
async def summarize_document(
    file: UploadFile = File(None),
    document_id: str = Form(None),
    file_path: str = Form(None),
    summary_type: str = Form("executive")
):
    """
    Summarizes a legal document. Returns an 'executive' or 'plain_english' summary.
    """
    try:
        # Check if already analyzed
        results = None
        if document_id:
            record = await analyzer.get_analysis_status(document_id)
            if record and record.get("status") == "completed":
                results = record.get("results")

        if not results:
            # Need to run analysis first
            if file is not None:
                file_bytes = await file.read()
                file_name = get_safe_filename(file)
                results = await analyzer.analyze_document(file_name, file_bytes, document_id=document_id)
            elif file_path is not None:
                if not os.path.exists(file_path):
                    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"File not found: {file_path}")
                with open(file_path, "rb") as f:
                    file_bytes = f.read()
                results = await analyzer.analyze_document(os.path.basename(file_path), file_bytes, document_id=document_id, file_path=file_path)
            elif document_id:
                # Retrieve validation and read file
                from app.services.pdf.validator import ValidationService
                val = ValidationService()
                val_res = await val.validate_document(document_id)
                if val_res["valid"]:
                    abs_path = val_res["absolute_path"]
                    with open(abs_path, "rb") as f:
                        file_bytes = f.read()
                    results = await analyzer.analyze_document(os.path.basename(str(abs_path)), file_bytes, document_id=document_id, file_path=str(abs_path))
                else:
                    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Document validation failed: {val_res['reason']}")
            else:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="At least one of 'file', 'file_path', or 'document_id' must be provided.")

        summary_field = "executive_summary" if summary_type == "executive" else "plain_english_summary"
        
        # Check if plain_english is requested, retrieve from key findings if not direct field
        summary_text = results.get(summary_field) or ""
        if not summary_text and summary_type != "executive":
            # Extract plain English explanation block from key findings
            for item in results.get("key_findings", []):
                if "Plain English explanation" in item:
                    summary_text = item.replace("Plain English explanation: ", "")
                    break

        return {
            "status": "success",
            "summary_type": summary_type,
            "summary": summary_text or results.get("executive_summary", "")
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Document summarization failed: {e}"
        )


@router.get("/document/status", response_model=StatusResponse)
async def get_document_status(document_id: str):
    """
    Get the current ingestion/analysis status and results for the specified document ID.
    """
    try:
        record = await analyzer.get_analysis_status(document_id)
        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No analysis record found for document ID: {document_id}"
            )
        return record
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to query document status: {e}"
        )


def get_documents_collection():
    try:
        db = get_firestore_client()
        return db.collection("documents")
    except Exception as e:
        logger.warning(f"Firestore not available: {e}")
        return None

@router.get("/documents", status_code=status.HTTP_200_OK)
async def list_documents():
    """List all uploaded documents."""
    docs_ref = get_documents_collection()
    if docs_ref:
        try:
            docs = docs_ref.get()
            return [d.to_dict() for d in docs]
        except Exception as e:
            logger.warning(f"Firestore document list failed: {e}. Falling back to local manifest.")
    return _get_local_documents()

@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_endpoint(file: UploadFile = File(...)):
    """Uploads, analyzes, chunks, and indexes a legal document into the vector store."""
    try:
        file_bytes = await file.read()
        file_name = get_safe_filename(file)
        doc_id = str(uuid.uuid4())
        
        # This function parses structural text, chunks, embeds in vector DB, and analyzes clauses
        results = await analyzer.analyze_document(file_name, file_bytes, document_id=doc_id)
        
        now = datetime.utcnow().isoformat() + "Z"
        doc_metadata = {
            "id": doc_id,
            "title": file_name,
            "type": file.content_type or "Unknown",
            "lastModified": now,
            "size": f"{len(file_bytes) / 1024:.1f} KB",
            "category": "uploaded",
            "tags": ["Analysis Complete"],
            "results": results
        }
        
        docs_ref = get_documents_collection()
        if docs_ref:
            try:
                docs_ref.document(doc_id).set(doc_metadata)
            except Exception as e:
                logger.warning(f"Firestore document write failed: {e}. Falling back to local manifest.")
                _save_local_document(doc_id, doc_metadata)
        else:
            _save_local_document(doc_id, doc_metadata)

        return {
            "status": "success",
            "message": f"Document '{file_name}' uploaded and processed successfully.",
            "data": doc_metadata
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Document upload failed: {e}"
        )
