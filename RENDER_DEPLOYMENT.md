# 🚀 Flowza Backend — Render Deployment Guide (Phase 9B)

This guide provides step-by-step instructions for deploying the **Flowza FastAPI Backend** to **Render** connected to the live **Supabase PostgreSQL** database.

---

## 🏗️ Architecture Overview

```
                      ┌────────────────────────────────────────┐
                      │            Flowza Frontend             │
                      │          (Vercel / React+Vite)         │
                      └───────────────────┬────────────────────┘
                                          │ HTTPS / WSS
                                          ▼
                      ┌────────────────────────────────────────┐
                      │          Flowza Backend API            │
                      │       (Render Web Service / ASGI)      │
                      │  - FastAPI + Uvicorn ($PORT)           │
                      │  - WebSockets (/ws/{token})            │
                      │  - In-Memory ReportLab PDF Invoicing   │
                      │  - Agentic AI Business Assistant       │
                      └───────────────────┬────────────────────┘
                                          │ asyncpg (Port 5432)
                                          ▼
                      ┌────────────────────────────────────────┐
                      │          Supabase PostgreSQL           │
                      │        (AWS Mumbai ap-south-1)         │
                      │  - 17 Relational Tables & Enums        │
                      │  - PgBouncer Pooled Connection         │
                      └────────────────────────────────────────┘
```

---

## 📋 Pre-Deployment Checklist

- [x] **Supabase Database Live**: All 8 Alembic revisions executed (`alembic upgrade head`), 17 tables active.
- [x] **Database Seeded**: System roles (`admin`, `supplier`, `vendor`), demo accounts, catalog, and invoices populated.
- [x] **PgBouncer Compatibility**: `prepared_statement_name_func: lambda: None` configured in `app/database/session.py`.
- [x] **Health Check Configured**: `GET /health` tests database connectivity without leaking credentials.
- [x] **Port Binding Verified**: Production command binds to `0.0.0.0:$PORT`.
- [x] **In-Memory PDF Generation**: ReportLab uses `io.BytesIO()`; no ephemeral filesystem persistence needed.
- [x] **WebSockets Ready**: ASGI real-time connection `/ws/{token}` with ping-pong keepalive.
- [x] **CORS Middleware Active**: Permissive regex matches `localhost:*` and `https://*.vercel.app` with credentials.

---

## 🛠️ Step 1: Create Web Service on Render

### Option A: Via Render Dashboard (Recommended)

1. Log in to [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** → **Web Service**.
3. Connect your GitHub repository (`Aravinth8926/Flowza` or your active fork).
4. Configure the Web Service settings:

| Setting | Value |
|---|---|
| **Name** | `flowza-backend` |
| **Region** | `Singapore` or nearest to your Supabase region (`ap-south-1`) |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Runtime** | `Python 3` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| **Instance Type** | `Free` or `Starter` |

> [!NOTE]
> If you leave **Root Directory** empty (repository root), use:
> - **Build Command**: `cd backend && pip install -r requirements.txt`
> - **Start Command**: `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT`

5. Under **Advanced Settings**:
   - **Health Check Path**: `/health`
   - **Auto-Deploy**: `Yes`

---

### Option B: Via Render Blueprint (`render.yaml`)

Render will automatically discover `render.yaml` at the root of the repository:
1. Click **New +** → **Blueprint**.
2. Select the repository.
3. Render parses `render.yaml` and pre-populates all service configurations and environment variable prompts.

---

## 🔐 Step 2: Configure Environment Variables on Render

In the Render Web Service settings, navigate to **Environment** and add the following keys:

| Environment Variable | Value / Description | Example |
|---|---|---|
| `PYTHON_VERSION` | `3.11.9` | `3.11.9` |
| `ENVIRONMENT` | `production` | `production` |
| `DATABASE_URL` | Supabase asyncpg Session Pooler URL | `postgresql+asyncpg://postgres.fudgthjvyewjuxlydlyc:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres` |
| `SECRET_KEY` | 64-character random hex string for JWT | *(Click "Generate" on Render or paste your key)* |
| `ALGORITHM` | `HS256` | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token validity in minutes | `1440` (24 hours) |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token validity in days | `7` |
| `FRONTEND_URL` | Production Frontend URL | `https://flowza.vercel.app` |
| `CORS_ORIGINS` | Allowed origins (comma-separated) | `http://localhost:5173,http://localhost:3000,https://flowza.vercel.app` |
| `AI_PROVIDER` | `gemini` | `gemini` |
| `GEMINI_API_KEY` | Google Gemini AI Studio API Key | `AIzaSy...` |
| `GEMINI_MODELS` | Multi-model fallback list | `gemini-3.6-flash,gemini-3.5-flash,gemini-3.5-flash-lite,gemini-3-flash-preview,gemini-3.7-flash` |
| `AI_TIMEOUT` | AI request timeout in seconds | `25` |
| `AI_MAX_TOOL_CALLS` | Maximum tool execution depth | `5` |

> [!IMPORTANT]
> - Ensure special characters (like `@`) in your `DATABASE_URL` password are URL-encoded (`@` → `%40`). Flowza's `config.py` also automatically applies URL-encoding safety.
> - Use the **Session Mode** pooler on Port `5432` (`aws-0-ap-south-1.pooler.supabase.com:5432`).

---

## 🔍 Step 3: Verify Render Live Deployment

Once the deployment completes and Render marks the service as **Live** (`https://flowza-backend.onrender.com`):

### 1. Health Check Test
```bash
curl -i https://flowza-backend.onrender.com/health
```
**Expected Response:**
```json
{
  "status": "ok",
  "database": "connected",
  "app": "Flowza B2B Backend",
  "version": "1.0.0",
  "environment": "production"
}
```

---

### 2. Root API Welcome Test
```bash
curl -i https://flowza-backend.onrender.com/
```
**Expected Response:**
```json
{
  "status": "online",
  "message": "Welcome to Flowza B2B Supply Chain & Procurement API",
  "version": "1.0.0",
  "docs": "/docs",
  "health": "/health"
}
```

---

### 3. Interactive Swagger Documentation
Open in browser:
```
https://flowza-backend.onrender.com/docs
```
Confirm all 12 API tag groups load with interactive "Try it out" capabilities.

---

### 4. Supplier Authentication Test
```bash
curl -X POST https://flowza-backend.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "abc@distributors.com", "password": "Password123!"}'
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGci...",
    "refresh_token": "eyJhbGci...",
    "token_type": "bearer",
    "user": {
      "email": "abc@distributors.com",
      "full_name": "ABC Distributors",
      "role": "supplier"
    }
  }
}
```

---

### 5. AI Business Assistant Smoke Test
```bash
curl -X POST https://flowza-backend.onrender.com/api/v1/ai/chat \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"message": "What is our current inventory summary?"}'
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "conversation_id": "...",
    "message": "...",
    "sources": ["Inventory"],
    "suggested_actions": []
  }
}
```

---

## 🛡️ Production Safety Rules Summary

1. **Database Migrations on Render**: Do **NOT** add `alembic upgrade head` to Render's Build or Start commands. Migrations have already been executed safely.
2. **Database Seeding on Render**: Do **NOT** run `seed.py` on Render start. Seeding has already been completed.
3. **Demo Copy Isolation**: `Flowza-Demo` remains untouched and runs locally on SQLite for mentor demonstrations.

---

**Phase 9B Render Backend Deployment is fully prepared and verified!**
