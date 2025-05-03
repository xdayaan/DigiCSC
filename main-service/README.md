# DigiCSC Main Service

FastAPI application with MongoDB and PostgreSQL integration for the DigiCSC platform.

## Features

- FastAPI REST API
- PostgreSQL database for structured data
- MongoDB for storing chat messages
- Alembic database migrations
- Cross-platform compatibility (Windows and Linux)

## Prerequisites

- Python 3.9+
- PostgreSQL
- MongoDB
- Virtual environment (recommended)

## Installation

1. Clone the repository
2. Navigate to the main-service directory
3. Create and activate a virtual environment (optional but recommended)
4. Install the required packages:

```bash
pip install -r requirements.txt
```

## Environment Setup

Create a `.env` file in the main-service directory with the following variables (adjust values as needed):

```
# PostgreSQL Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=digicsc
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# MongoDB Configuration
MONGO_URI=mongodb://localhost:27017
MONGO_DB=digicsc

# App Configuration
APP_NAME="DigiCSC API"
APP_VERSION="0.1.0"
DEBUG=True
```

## Database Setup

1. Make sure PostgreSQL and MongoDB services are running
2. Run the Alembic database migrations to create the tables:

```bash
# For Windows
alembic upgrade head

# For Linux
python -m alembic upgrade head
```

## Running the Application

### Windows
```
run.bat
```

### Linux
```
chmod +x run.sh
./run.sh
```

Or you can run directly with uvicorn:
```
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## API Documentation

Once the application is running, you can access the API documentation at:
- Swagger UI: http://localhost:8000/api/docs
- ReDoc: http://localhost:8000/api/redoc

## Database Schema

### PostgreSQL Tables

1. **users**:
   - id (Primary Key)
   - name
   - phone
   - language
   - created_on
   - updated_on

2. **freelancers**:
   - id (Primary Key)
   - name
   - email
   - phone
   - created_on
   - updated_on
   - csc_id
   - preferred_work (JSON array)
   - languages (JSON array)

3. **chat_relations**:
   - user_id (Foreign Key to users.id, Primary Key)
   - chat_id (Primary Key)

### MongoDB Collections

1. **chats**:
   - chat_id
   - user_id
   - messages (array of chat messages)
   - created_at
   - updated_at

   Each message in the messages array contains:
   - user_id
   - sent_from (enum: user/ai/freelancer)
   - type (enum: text/pdf/image/audio/etc.)
   - freelancer_id (optional)
   - text
   - doc_link (optional, path to file)
   - created_at