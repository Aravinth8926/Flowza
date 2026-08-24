# Flowza — Unified Project Setup & Run Guide

This guide provides step-by-step instructions to set up and run the Flowza B2B procurement platform. The project is structured as a monorepo containing a **React (Vite + TypeScript)** frontend and a **FastAPI (SQLAlchemy + SQLite/PostgreSQL)** backend.

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
*   **Node.js** (v18 or higher) — [Download](https://nodejs.org/)
*   **Python** (v3.9 or higher) — [Download](https://www.python.org/downloads/)
*   **Git** — [Download](https://git-scm.com/)

---

## ⚙️ 1. Environment Configuration

### Frontend Environment
Create a `.env` file in the `frontend/` directory:
```env
VITE_API_URL=http://localhost:8000
```

### Backend Environment
Create a `.env` file in the `backend/` directory:
```env
DATABASE_URL=sqlite+aiosqlite:///./flowza.db
SECRET_KEY=flowza-very-secret-signing-key-for-development-purposes
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000
```
*(For production, replace `DATABASE_URL` with your PostgreSQL connection string, e.g., `postgresql+asyncpg://user:pass@localhost:5432/flowza`)*

---

## 🐍 2. Backend Setup & Run

Follow these steps to set up and run the backend server separately:

### Step 1: Navigate to the Backend Directory
```bash
cd backend
```

### Step 2: Create a Virtual Environment
```bash
# Windows
python -m venv venv

# macOS/Linux
python3 -m venv venv
```

### Step 3: Activate the Virtual Environment
```bash
# Windows (PowerShell)
.\venv\Scripts\Activate.ps1

# Windows (Command Prompt)
.\venv\Scripts\activate.bat

# macOS/Linux
source venv/bin/activate
```

### Step 4: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 5: Run Database Migrations
Apply the initial schema and structural updates to your database:
```bash
python -m alembic upgrade head
```

### Step 6: Seed Default Roles & Demo Data
Seed the database with default roles (`admin`, `vendor`, `supplier`), demo accounts, and sample orders:
```bash
python app/database/seed.py
```

### Step 7: Start the Backend Server
```bash
python -m uvicorn app.main:app --port 8000 --reload
```
*   The backend will be available at: **http://localhost:8000**
*   Interactive API docs (Swagger UI): **http://localhost:8000/docs**

---

## ⚛️ 3. Frontend Setup & Run

Follow these steps to set up and run the frontend development server separately:

### Step 1: Navigate to the Frontend Directory
```bash
cd frontend
```

### Step 2: Install Node Dependencies
```bash
npm install
```

### Step 3: Start the Frontend Development Server
```bash
npm run dev
```
*   The frontend will be available at: **http://localhost:5173**

---

## 🧪 4. Verification & Testing

To verify that both the frontend and backend are communicating correctly:

1.  Ensure the backend server is running on port 8000.
2.  In a separate terminal, navigate to the `backend/` directory and run the automated end-to-end test suite:
    ```bash
    # Make sure your virtual environment is activated
    python test_api_flow.py
    ```
3.  If successful, you will see: `✅ ALL END-TO-END TESTS PASSED SUCCESSFULLY!`

---

## 🔑 5. Seeded Demo Credentials

Use these credentials to log in and test different user dashboards:

*   **Admin Dashboard**:
    *   **Email**: `admin@flowza.com`
    *   **Password**: `AdminPassword123!`
*   **Vendor Dashboard**:
    *   **Email**: `vendor@supermarket.com`
    *   **Password**: `Password123!`
*   **Supplier Dashboard**:
    *   **Email**: `abc@distributors.com`
    *   **Password**: `Password123!`
