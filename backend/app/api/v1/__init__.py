from fastapi import APIRouter

from app.api.v1.agents import router as agents_router
from app.api.v1.chat import router as chat_router
from app.api.v1.compliance import router as compliance_router
from app.api.v1.documents import router as docs_router
from app.api.v1.drafting import router as drafting_router
from app.api.v1.health import router as health_router
from app.api.v1.research import router as research_router
from app.api.v1.voice import router as voice_router
from app.api.v1.knowledge import router as knowledge_router
from app.api.v1.orchestrator import router as orchestrator_router
from app.api.v1.cases import router as cases_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.dependencies import get_current_user
from fastapi import Depends

api_router = APIRouter()

# Register core health endpoints
api_router.include_router(health_router, tags=["System Health"])

# Register agent info endpoints
api_router.include_router(agents_router, tags=["Agents"], dependencies=[Depends(get_current_user)])

# Register modular operations
api_router.include_router(chat_router, tags=["Chat Interface"], dependencies=[Depends(get_current_user)])
api_router.include_router(docs_router, tags=["Document Operations"], dependencies=[Depends(get_current_user)])
api_router.include_router(research_router, tags=["Legal Research"], dependencies=[Depends(get_current_user)])
api_router.include_router(compliance_router, tags=["Regulatory Compliance"], dependencies=[Depends(get_current_user)])
api_router.include_router(drafting_router, prefix="/drafting", tags=["Contract Drafting"], dependencies=[Depends(get_current_user)])
api_router.include_router(voice_router, prefix="/voice", tags=["Voice Interface"], dependencies=[Depends(get_current_user)])
api_router.include_router(knowledge_router, tags=["Knowledge Base Ingestion"], dependencies=[Depends(get_current_user)])
api_router.include_router(orchestrator_router, tags=["Orchestrator Agent"], dependencies=[Depends(get_current_user)])
api_router.include_router(cases_router, dependencies=[Depends(get_current_user)])
api_router.include_router(dashboard_router, dependencies=[Depends(get_current_user)])
