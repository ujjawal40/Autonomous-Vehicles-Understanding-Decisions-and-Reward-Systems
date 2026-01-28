"""
Main FastAPI Application

Entry point for the Autonomous Decision Visualizer API server.
"""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.database import get_db, Database
from src.api.training_api import router as training_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    print("Starting Autonomous Decision Visualizer API...")
    db = get_db()

    if db.check_connection():
        print("Database connection successful")
    else:
        print("Warning: Database connection failed")

    yield

    # Shutdown
    print("Shutting down...")
    db.close()


# Create FastAPI app
app = FastAPI(
    title="Autonomous Decision Visualizer",
    description="API for training and visualizing autonomous vehicle navigation agents",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",  # Alternative dev port
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(training_router)


# ============================================
# HEALTH CHECK
# ============================================

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    db = get_db()
    db_healthy = db.check_connection()

    return {
        "status": "healthy" if db_healthy else "degraded",
        "database": "connected" if db_healthy else "disconnected",
        "version": "1.0.0",
    }


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "Autonomous Decision Visualizer",
        "version": "1.0.0",
        "docs": "/docs",
    }


# ============================================
# RUN SERVER
# ============================================

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "src.api.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=["src"],
    )
