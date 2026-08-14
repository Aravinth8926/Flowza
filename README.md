# Flowza — B2B Supply Chain & Procurement Platform

Flowza is a secure, GST-compliant B2B procurement platform that connects retail vendors and wholesale suppliers directly, simplifying order coordination and inventory supply chains.

This repository holds **Sprint 1 — Project Foundation & Authentication**. All procurement, inventory, and business logic are mock/placeholder layouts for this sprint.

## 🏗️ Architecture

Flowza is structured as a single workspace containing a React frontend and a FastAPI backend:

```
Vendor-AI-main/
├── src/                  # React + Vite + TypeScript frontend
│   ├── assets/           # Static images & assets
│   ├── components/       # Shared UI primitives (shadcn style) & layouts
│   ├── features/         # Feature modules
│   ├── hooks/            # React hooks
│   ├── layouts/          # Portal layouts
│   ├── pages/            # Public & dashboard pages
│   ├── routes/           # Routing configuration & guards
│   ├── services/         # Axios API services
│   ├── store/            # Zustand global stores (auth, theme, sidebar, user)
│   ├── types/            # TypeScript schemas & typings
│   ├── utils/            # Helper utilities
│   ├── App.tsx           # App configuration
│   └── main.tsx          # React mounter
├── backend/              # FastAPI layered python backend
│   ├── app/
│   │   ├── api/          # API v1 routes & dependencies
│   │   ├── core/         # Configs (Pydantic-Settings), security & exceptions
│   │   ├── database/     # Async connection & base model
│   │   ├── models/       # SQLAlchemy models (User, Role, Company, Address)
│   │   ├── repositories/ # Repo DB helpers
│   │   ├── schemas/      # Pydantic v2 schemas
│   │   ├── services/     # Core business services
│   │   └── utils/        # File saving & helper functions
│   ├── alembic/          # Database migrations versioning
│   ├── uploads/          # Static file uploads (avatars & logos)
│   ├── alembic.ini       # Migration configs
│   └── requirements.txt  # Python requirements
└── package.json          # Root Vite React configurations
```

---

## 🛠️ Setup & Launch Instructions

### Prerequisites
*   Node.js (v18+)
*   Python (3.9+)

### 1. Frontend Setup
Install dependencies and run the Vite server locally (it will start on `http://localhost:5173`):
```bash
# In the root folder (Vendor-AI-main)
npm install
npm run dev
```

The frontend uses environment variables for routing requests to the API server:
Create `.env` in the root:
```env
VITE_API_URL=http://localhost:8000
```

### 2. Backend Setup
Create the virtual environment, install requirements, run migrations, seed initial roles, and launch uvicorn:
```bash
# In backend/ folder
cd backend
python -m venv venv
venv\Scripts\activate   # or source venv/bin/activate on macOS/Linux
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Seed roles (vendor, supplier, admin) & default admin account
python app/database/seed.py

# Launch server on port 8000
uvicorn app.main:app --port 8000
```

### 3. Demo Admin Credentials
*   **Email:** `admin@flowza.com`
*   **Password:** `AdminPassword123!`

---

## 🎨 Technology Stack
*   **Frontend:** React 19, React Router v7, Vite, TypeScript, Tailwind CSS v4, Zustand 5, TanStack Query 5, Axios, React Hook Form, Zod.
*   **Backend:** FastAPI, SQLAlchemy 2.0 (async), SQLite (fallback for local development) / PostgreSQL (asyncpg), Alembic, Pydantic v2, python-jose, passlib.
