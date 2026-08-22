from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import uuid
from loguru import logger
from app.database.firestore import get_firestore_client

router = APIRouter(prefix="/cases", tags=["cases"])

class Hearing(BaseModel):
    id: str
    case_id: str
    date: str
    type: str
    status: str
    notes: Optional[str] = None
    created_at: str

class HearingInput(BaseModel):
    date: str
    type: str
    status: str
    notes: Optional[str] = None

class Case(BaseModel):
    id: str
    title: str
    client: str
    status: str
    type: str
    priority: str
    court: Optional[str] = None
    jurisdiction: Optional[str] = None
    description: Optional[str] = None
    user_id: str
    created_at: str
    updated_at: str
    hearings: List[Hearing]

class CaseInput(BaseModel):
    title: str
    client: str
    status: str
    type: str
    priority: str
    court: Optional[str] = None
    jurisdiction: Optional[str] = None
    description: Optional[str] = None

# In-memory store fallback when Firestore is unavailable
_LOCAL_CASES: dict[str, dict] = {}

def get_cases_collection():
    try:
        db = get_firestore_client()
        return db.collection("cases")
    except Exception as e:
        logger.warning(f"Firestore not available: {e}")
        return None

@router.get("", response_model=List[Case], status_code=status.HTTP_200_OK)
async def list_cases():
    cases_ref = get_cases_collection()
    if not cases_ref:
        return [Case(**c) for c in _LOCAL_CASES.values()]
    
    docs = cases_ref.get()
    return [Case(**doc.to_dict()) for doc in docs]

@router.get("/{case_id}", response_model=Case, status_code=status.HTTP_200_OK)
async def get_case(case_id: str):
    cases_ref = get_cases_collection()
    if not cases_ref:
        if case_id in _LOCAL_CASES:
            return Case(**_LOCAL_CASES[case_id])
        raise HTTPException(status_code=404, detail="Case not found")
    
    doc = cases_ref.document(case_id).get()
    if doc.exists:
        return Case(**doc.to_dict())
    raise HTTPException(status_code=404, detail="Case not found")

@router.post("", response_model=Case, status_code=status.HTTP_201_CREATED)
async def create_case(case_input: CaseInput):
    cases_ref = get_cases_collection()
    case_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat() + "Z"
    
    new_case = Case(
        **case_input.model_dump(),
        id=case_id,
        user_id="default-user",
        created_at=now,
        updated_at=now,
        hearings=[]
    )
    
    if not cases_ref:
        _LOCAL_CASES[case_id] = new_case.model_dump()
        return new_case
    
    cases_ref.document(case_id).set(new_case.model_dump())
    return new_case

@router.post("/{case_id}/hearings", response_model=Case, status_code=status.HTTP_201_CREATED)
async def add_hearing(case_id: str, hearing_input: HearingInput):
    cases_ref = get_cases_collection()
    now = datetime.utcnow().isoformat() + "Z"
    
    new_hearing = Hearing(
        **hearing_input.model_dump(),
        id=str(uuid.uuid4()),
        case_id=case_id,
        created_at=now
    )

    if not cases_ref:
        if case_id not in _LOCAL_CASES:
            raise HTTPException(status_code=404, detail="Case not found")
        case_data = _LOCAL_CASES[case_id]
        case_data["hearings"].append(new_hearing.model_dump())
        case_data["updated_at"] = now
        _LOCAL_CASES[case_id] = case_data
        return Case(**case_data)
    
    doc_ref = cases_ref.document(case_id)
    doc = doc_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Case not found")
    
    case_data = doc.to_dict()
    case_data["hearings"].append(new_hearing.model_dump())
    case_data["updated_at"] = now
    
    doc_ref.set(case_data)
    return Case(**case_data)

@router.post("/{case_id}/delete", status_code=status.HTTP_200_OK)
async def delete_case(case_id: str):
    cases_ref = get_cases_collection()
    if not cases_ref:
        if case_id in _LOCAL_CASES:
            del _LOCAL_CASES[case_id]
            return {"status": "success", "message": f"Case {case_id} deleted."}
        raise HTTPException(status_code=404, detail="Case not found")
    
    doc_ref = cases_ref.document(case_id)
    if not doc_ref.get().exists:
        raise HTTPException(status_code=404, detail="Case not found")
        
    doc_ref.delete()
    return {"status": "success", "message": f"Case {case_id} deleted."}
