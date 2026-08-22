from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional, Any
from datetime import datetime, timedelta
import uuid
from loguru import logger
from app.database.firestore import get_firestore_client

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

class DashboardStat(BaseModel):
    title: str
    value: str
    change: str
    trend: str
    icon: str

class DashboardNotification(BaseModel):
    id: str
    title: str
    message: str
    time: str
    read: bool
    type: str

class TaskCompletion(BaseModel):
    name: str
    completed: int
    pending: int

class CaseStatusCount(BaseModel):
    name: str
    count: int
    fill: str

class TeamMetric(BaseModel):
    name: str
    cases: int
    hours: int

def get_collection(name: str):
    try:
        db = get_firestore_client()
        return db.collection(name)
    except Exception as e:
        logger.warning(f"Firestore not available: {e}")
        return None

@router.get("/stats", response_model=List[DashboardStat], status_code=status.HTTP_200_OK)
async def get_dashboard_stats():
    cases_ref = get_collection("cases")
    if not cases_ref:
        return []
        
    docs = cases_ref.get()
    total_cases = len(docs)
    open_cases = sum(1 for d in docs if d.to_dict().get("status") == "open")
    
    return [
        DashboardStat(title="Total Cases", value=str(total_cases), change="+2", trend="up", icon="Briefcase"),
        DashboardStat(title="Open Cases", value=str(open_cases), change="-1", trend="down", icon="FolderOpen"),
        DashboardStat(title="Documents Analyzed", value="0", change="0", trend="neutral", icon="FileText"),
        DashboardStat(title="Tasks Completed", value="0", change="0", trend="neutral", icon="CheckSquare")
    ]

@router.get("/notifications", response_model=List[DashboardNotification], status_code=status.HTTP_200_OK)
async def get_dashboard_notifications():
    notif_ref = get_collection("notifications")
    if not notif_ref:
        return []
        
    docs = notif_ref.get()
    if not docs:
        # Seed a welcome notification if empty
        now = datetime.utcnow().isoformat() + "Z"
        welcome = {
            "id": str(uuid.uuid4()),
            "title": "Welcome to LawGPT AI OS",
            "message": "Your system is live and fully synchronized with the FastAPI backend.",
            "time": now,
            "read": False,
            "type": "success"
        }
        notif_ref.document(welcome["id"]).set(welcome)
        return [DashboardNotification(**welcome)]
        
    return [DashboardNotification(**doc.to_dict()) for doc in docs]

@router.get("/task-completion", response_model=List[TaskCompletion], status_code=status.HTTP_200_OK)
async def get_task_completion():
    return [
        TaskCompletion(name="Mon", completed=0, pending=0),
        TaskCompletion(name="Tue", completed=0, pending=0),
        TaskCompletion(name="Wed", completed=0, pending=0),
        TaskCompletion(name="Thu", completed=0, pending=0),
        TaskCompletion(name="Fri", completed=0, pending=0),
    ]

@router.get("/case-status", response_model=List[CaseStatusCount], status_code=status.HTTP_200_OK)
async def get_case_status():
    cases_ref = get_collection("cases")
    if not cases_ref:
        return []
        
    docs = cases_ref.get()
    open_c = sum(1 for d in docs if d.to_dict().get("status") == "open")
    closed_c = sum(1 for d in docs if d.to_dict().get("status") == "closed")
    pending_c = sum(1 for d in docs if d.to_dict().get("status") == "pending")
    
    return [
        CaseStatusCount(name="Open", count=open_c, fill="hsl(var(--chart-1))"),
        CaseStatusCount(name="Closed", count=closed_c, fill="hsl(var(--chart-2))"),
        CaseStatusCount(name="Pending", count=pending_c, fill="hsl(var(--chart-3))")
    ]

@router.get("/team-activity", response_model=List[TeamMetric], status_code=status.HTTP_200_OK)
async def get_team_activity():
    return [
        TeamMetric(name="Alice", cases=0, hours=0),
        TeamMetric(name="Bob", cases=0, hours=0),
        TeamMetric(name="Charlie", cases=0, hours=0)
    ]
