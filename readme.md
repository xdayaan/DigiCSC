# DigiCSC Project - Initialization Guide

## Overview
DigiCSC is a platform that integrates a FastAPI backend with PostgreSQL and MongoDB databases, along with planned frontend components and an automation service. This guide walks you through initializing the entire project.

## Prerequisites
- Python 3.9+
- Docker and Docker Compose
- Git
- Node.js and npm (for frontend, future implementation)
- Java SDK (for automation service, future implementation)

## Step 1: Clone the Repository
```
git clone <repository-url>
cd digiCSC
```

## Step 2: Environment Setup

### 2.1: Set up Python Virtual Environment
```
# Create a virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On Linux/Mac:
source venv/bin/activate
```

### 2.2: Configure Environment Variables
Create a `.env` file in the main-service directory:

```
# PostgreSQL Configuration
POSTGRES_USER=digicsc
POSTGRES_PASSWORD=digicsc_password
POSTGRES_DB=digicsc_db
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# MongoDB Configuration
MONGO_URI=mongodb://digicsc:digicsc_password@localhost:27017/digicsc_db
MONGO_DB=digicsc_db

# App Configuration
APP_NAME="DigiCSC API"
APP_VERSION="0.1.0"
DEBUG=True
```

## Step 3: Start Database Services

The project uses Docker Compose to run PostgreSQL and MongoDB services:

```
docker-compose up -d
```

This will start:
- PostgreSQL on port 5432
- MongoDB on port 27017

Both databases will use the credentials specified in your environment variables.

## Step 4: Install Dependencies for Main Service

```
cd main-service
pip install -r requirements.txt
```

The main dependencies include:
- FastAPI and Uvicorn for the API server
- SQLAlchemy and Psycopg2 for PostgreSQL interaction
- PyMongo and Motor for MongoDB integration
- Alembic for database migrations
- Pydantic for data validation
- Python-dotenv for environment variable management

## Step 5: Database Initialization

Run Alembic migrations to create the database schema:

```
# While in the main-service directory
alembic upgrade head
```

## Step 6: Start the Main Service

### On Windows:
```
run.bat
```

### On Linux:
```
chmod +x run.sh
./run.sh
```

Or directly with Uvicorn:
```
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at http://localhost:8000

## Step 7: API Documentation Access

Once the application is running, you can access:
- Swagger UI: http://localhost:8000/api/docs
- ReDoc: http://localhost:8000/api/redoc

## Database Structure

### PostgreSQL Tables:
- **users**: Stores user information (id, name, phone, language)
- **freelancers**: Stores freelancer details (id, name, email, phone, csc_id, preferred_work, languages)
- **chat_relations**: Links users to their chat sessions

### MongoDB Collections:
- **chats**: Stores chat messages with message content, types, and metadata

## Project Components

### Main Service (FastAPI Backend)
Located in the `main-service/` directory, contains the API endpoints, database models, and business logic.

### Frontend (Planned)
The frontend code will be implemented in the `frontend/` directory.

### Automation Service (Planned)
Java Selenium code will be implemented in the `automation-service/` directory.

## Troubleshooting

### Database Connection Issues
- Ensure Docker services are running: `docker-compose ps`
- Check container logs: `docker-compose logs postgres` or `docker-compose logs mongodb`
- Verify credentials in the `.env` file match those in `docker-compose.yml`

### Application Startup Problems
- Check for Python dependency issues: `pip check`
- Ensure virtual environment is activated
- Verify that ports 8000, 5432, and 27017 are not in use by other applications

### Database Migration Errors
- Reset migrations: `alembic downgrade base`
- Recreate migrations: `alembic revision --autogenerate -m "reset migrations"`
- Apply migrations: `alembic upgrade head`

## Development Workflow

1. Activate the virtual environment
2. Ensure databases are running via docker-compose
3. Start the API server with auto-reload for development
4. Use the API documentation to interact with endpoints