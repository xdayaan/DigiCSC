@echo off
REM Run FastAPI server script for Windows
echo Starting DigiCSC API server...

REM Activate virtual environment if it exists
if exist .\venv\Scripts\activate.bat (
    call .\venv\Scripts\activate.bat
) else (
    echo Virtual environment not found, continuing without it...
)

REM Run FastAPI application
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

REM Deactivate virtual environment
if exist .\venv\Scripts\deactivate.bat (
    call .\venv\Scripts\deactivate.bat
)