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
        # Helper to resolve document bytes and name
        async def _resolve_doc(file_obj, path_val, doc_id_val, default_label):
            if file_obj is not None:
                content = await file_obj.read()
                return content, get_safe_filename(file_obj)
            if path_val and os.path.exists(path_val):
                with open(path_val, "rb") as f:
                    return f.read(), os.path.basename(path_val)
            if doc_id_val:
                local_docs = {d["id"]: d for d in _get_local_documents()}
                if doc_id_val in local_docs:
                    d_meta = local_docs[doc_id_val]
                    d_name = d_meta.get("title", f"doc_{doc_id_val}.txt")
                    if d_meta.get("file_path") and os.path.exists(d_meta["file_path"]):
                        with open(d_meta["file_path"], "rb") as f:
                            return f.read(), d_name
                    # Try text content from results
                    res = d_meta.get("results", {})
                    exec_summary = res.get("executive_summary", "")
                    key_findings = "\n".join(res.get("key_findings", []))
                    clauses_text = "\n".join([c.get("clause_text", "") for c in res.get("clause_breakdown", [])])
                    synthetic_text = f"{d_name}\n\nSummary:\n{exec_summary}\n\nKey Provisions:\n{key_findings}\n\nClauses:\n{clauses_text}"
                    return synthetic_text.encode("utf-8"), d_name
                from app.services.pdf.validator import ValidationService
                val = ValidationService()
                val_res = await val.validate_document(doc_id_val)
                if val_res.get("valid") and val_res.get("absolute_path"):
                    abs_p = val_res["absolute_path"]
                    with open(abs_p, "rb") as f:
                        return f.read(), os.path.basename(str(abs_p))
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"{default_label} must be specified.")

        bytes1, name1 = await _resolve_doc(file1, file_path_1, document_id_1, "Document 1 (Original)")
        bytes2, name2 = await _resolve_doc(file2, file_path_2, document_id_2, "Document 2 (Updated)")

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

def _delete_local_document(doc_id: str) -> bool:
    if _DOCUMENTS_MANIFEST_PATH.exists():
        try:
            with open(_DOCUMENTS_MANIFEST_PATH, "r") as f:
                data = json.load(f)
            if doc_id in data:
                del data[doc_id]
                with open(_DOCUMENTS_MANIFEST_PATH, "w") as f:
                    json.dump(data, f, indent=2)
                return True
        except Exception as e:
            logger.error(f"Failed to delete local document {doc_id}: {e}")
    return False


def _rename_local_document(doc_id: str, new_title: str) -> dict[str, Any] | None:
    if _DOCUMENTS_MANIFEST_PATH.exists():
        try:
            with open(_DOCUMENTS_MANIFEST_PATH, "r") as f:
                data = json.load(f)
            if doc_id in data:
                data[doc_id]["title"] = new_title
                with open(_DOCUMENTS_MANIFEST_PATH, "w") as f:
                    json.dump(data, f, indent=2)
                return data[doc_id]
        except Exception as e:
            logger.error(f"Failed to rename local document {doc_id}: {e}")
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


@router.delete("/documents/{doc_id}", status_code=status.HTTP_200_OK)
async def delete_document(doc_id: str):
    """Delete a document by ID."""
    docs_ref = get_documents_collection()
    if docs_ref:
        try:
            docs_ref.document(doc_id).delete()
        except Exception as e:
            logger.warning(f"Firestore delete failed: {e}")
    success = _delete_local_document(doc_id)
    return {"status": "success", "message": f"Document {doc_id} deleted."}


class RenameRequest(BaseModel):
    title: str


@router.patch("/documents/{doc_id}", status_code=status.HTTP_200_OK)
async def rename_document(doc_id: str, req: RenameRequest):
    """Rename a document title."""
    updated = _rename_local_document(doc_id, req.title)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return {"status": "success", "data": updated}


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_endpoint(file: UploadFile = File(...)):
    """Uploads, analyzes, chunks, and indexes a legal document into the vector store."""
    try:
        file_bytes = await file.read()
        file_name = get_safe_filename(file)
        doc_id = str(uuid.uuid4())
        
        # Save file to disk in data/uploads for comparison & persistent extraction
        upload_dir = settings.BASE_DIR / "data" / "uploads"
        upload_dir.mkdir(parents=True, exist_ok=True)
        saved_file_path = upload_dir / f"{doc_id}_{file_name}"
        with open(saved_file_path, "wb") as f:
            f.write(file_bytes)

        # This function parses structural text, chunks, embeds in vector DB, and analyzes clauses
        results = await analyzer.analyze_document(file_name, file_bytes, document_id=doc_id, file_path=str(saved_file_path))
        
        now = datetime.utcnow().isoformat() + "Z"
        doc_metadata = {
            "id": doc_id,
            "title": file_name,
            "type": file.content_type or "application/pdf" if file_name.endswith(".pdf") else "text/plain",
            "lastModified": now,
            "size": f"{len(file_bytes) / 1024:.1f} KB" if len(file_bytes) < 1024 * 1024 else f"{len(file_bytes) / (1024 * 1024):.1f} MB",
            "category": "uploaded",
            "file_path": str(saved_file_path),
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
        logger.exception(f"Document upload error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Document upload failed: {e}"
        )
