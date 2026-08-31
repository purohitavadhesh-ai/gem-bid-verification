from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import APP_TITLE, APP_VERSION
from app.database import engine, Base
import app.models
from app.routers import (
    tenders_router, bidders_router, documents_router,
    verdicts_router, dashboard_router, audit_router,
    auth_router, reports_router
)

# Create SQLite database tables if they do not exist
Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(
    title=APP_TITLE,
    version=APP_VERSION,
    description="FastAPI Backend for AI-Powered GeM Procurement Bid Compliance Verification Platform",
    lifespan=lifespan
)

# Configure CORS for local development and React Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all feature routers
app.include_router(auth_router)
app.include_router(dashboard_router)
app.include_router(tenders_router)
app.include_router(bidders_router)
app.include_router(documents_router)
app.include_router(verdicts_router)
app.include_router(reports_router)
app.include_router(audit_router)

@app.get("/", tags=["Health"])
def root():
    return {
        "app": APP_TITLE,
        "version": APP_VERSION,
        "status": "online",
        "docs_url": "/docs"
    }

@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy"}
