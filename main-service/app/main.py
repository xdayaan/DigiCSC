from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from app.core.config import settings
from app.api.api import api_router
from app.db.postgres import engine, Base
from app.db.mongodb import connect_to_mongo, close_mongo_connection

# Create the FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

# Set up CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize PostgreSQL models
Base.metadata.create_all(bind=engine)

# Include API router
app.include_router(api_router, prefix="/api")

# MongoDB connection event handlers
@app.on_event("startup")
async def startup_db_client():
    await connect_to_mongo()

@app.on_event("shutdown")
async def shutdown_db_client():
    await close_mongo_connection()

# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "Welcome to the DigiCSC API",
        "version": settings.APP_VERSION,
        "docs_url": "/api/docs"
    }

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)