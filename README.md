# ShoreAI Monorepo

This project contains the source code for the ShoreAI application, featuring a React frontend and a FastAPI backend.

## Structure

- **frontend/**: React application (Vite).
- **backend/**: Python FastAPI application.
- **docker-compose.yml**: Orchestration for development.

## Getting Started

### Prerequisites

- Docker & Docker Compose
- Node.js (for local frontend dev)
- Python 3.12 (for local backend dev)

### Quick Start (Docker)

1.  Ensure `.env` is populated (see `.env.example` or use the provided sensitive envs).
2.  Run:
    ```bash
    docker-compose up --build
    ```
3.  Access Frontend: `http://localhost:3000`
4.  Access Backend Docs: `http://localhost:8000/docs`

### Development

#### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

Ensure `.env` contains:
```
GEMINI_API_KEY=...
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_BUCKET_NAME=...
...
```
