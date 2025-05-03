#!/bin/bash
# Run FastAPI server script for Linux
echo "Starting DigiCSC API server..."

# Activate virtual environment if it exists
if [ -f "../vevn/bin/activate" ]; then
    source ../vevn/bin/activate
else
    echo "Virtual environment not found, continuing without it..."
fi

# Run FastAPI application
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Deactivate virtual environment
if [ -f "../vevn/bin/deactivate" ]; then
    deactivate
fi