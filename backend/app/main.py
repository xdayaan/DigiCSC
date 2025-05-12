from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import os
from datetime import datetime

from .api.routes import router as api_router
from .config import settings
from .utils.gemini_ai import init_gemini

import time

# Create FastAPI app
app = FastAPI(title="DigiCSC API")

# Initialize Gemini AI if API key is provided
if settings.GEMINI_API_KEY:
    try:
        init_gemini()
    except Exception as e:
        print(f"Error initializing Gemini AI: {str(e)}")

# Configure CORS - Allow all origins during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # In development, allow all origins for testing
    allow_credentials=True,
    allow_methods=["*"],   # Allow all methods
    allow_headers=["*"],   # Allow all headers
    expose_headers=["Content-Disposition", "Location"],
    max_age=86400,         # Cache preflight requests for 24 hours
)

@app.get("/")
def root():
    return {"message": "Welcome to DigiCSC API"}

@app.get("/api/debug/cors")
async def debug_cors():
    """
    Debug endpoint to test CORS configuration
    """
    return {
        "message": "CORS test successful",
        "timestamp": str(datetime.now())
    }



# Mount the uploads directory as a static file directory
# This allows access to uploaded files through URLs
uploads_dir = settings.UPLOAD_DIR
if os.path.exists(uploads_dir):
    app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# Include API routes
app.include_router(api_router, prefix="/api")
