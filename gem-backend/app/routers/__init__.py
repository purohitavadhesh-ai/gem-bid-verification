from app.routers.tenders import router as tenders_router
from app.routers.bidders import router as bidders_router
from app.routers.documents import router as documents_router
from app.routers.verdicts import router as verdicts_router
from app.routers.dashboard import router as dashboard_router
from app.routers.audit import router as audit_router
from app.routers.auth import router as auth_router
from app.routers.reports import router as reports_router

__all__ = [
    "tenders_router", "bidders_router", "documents_router",
    "verdicts_router", "dashboard_router", "audit_router",
    "auth_router", "reports_router"
]
