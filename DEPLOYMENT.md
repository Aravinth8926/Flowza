# Flowza Production Deployment & Architecture Guide

This document provides the definitive, end-to-end blueprint for deploying the **Flowza B2B Procurement & Supply Chain Management Platform** to production.

---

## 1. System Architecture Overview

```
                         ┌─────────────────────────────────┐
                         │             VERCEL              │
                         │    React 19 + Vite 6 Frontend   │
                         │      (HTTPS / Single Page App)  │
                         └───────────────┬─────────────────┘
                                         │
                                         │ HTTPS / WSS
                                         ▼
                         ┌─────────────────────────────────┐
                         │             RENDER              │
                         │    FastAPI + Python 3.11        │
                         │  - Async REST API               │
                         │  - Native WebSockets            │
                         │  - Agentic AI Business Assistant│
                         │  - ReportLab PDF Generation     │
                         └───────────────┬─────────────────┘
                                         │
                                         │ postgresql+asyncpg://
                                         ▼
                         ┌─────────────────────────────────┐
                         │            SUPABASE             │
                         │       Hosted PostgreSQL 15+     │
                         │  - Alembic Schema Migrations    │
                         │  - Row-level Tenant Isolation   │
                         └─────────────────────────────────┘
```

---

## 2. Environment Variables Specification

### A. Backend (`Render`)
Configure these environment variables in the Render Dashboard (**Environment** tab):

| Variable Name | Description | Example / Production Setting |
| :--- | :--- | :--- |
| `ENVIRONMENT` | Deployment stage | `production` |
| `DATABASE_URL` | Supabase Async PostgreSQL Connection String | `postgresql+asyncpg://postgres:[PASS]@db.[REF].supabase.co:5432/postgres` |
| `SECRET_KEY` | High-entropy 32+ byte cryptographic secret for JWTs | `generate via: openssl rand -hex 32` |
| `ALGORITHM` | JWT signing algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES`| Access token lifespan | `1440` (24 hours) |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token lifespan | `7` (7 days) |
| `FRONTEND_URL` | Deployed Vercel Frontend URL | `https://flowza.vercel.app` |
| `CORS_ORIGINS` | Comma-separated allowed origins | `https://flowza.vercel.app,https://flowza-*.vercel.app` |
| `AI_PROVIDER` | AI Engine Provider | `gemini` (or `openai`, `mock`) |
| `GEMINI_API_KEY` | Google AI Studio API key | `AIzaSy...` (from Google AI Studio) |
| `GEMINI_MODELS` | Ordered fallback hierarchy | `gemini-3.6-flash,gemini-3.5-flash,gemini-3.5-flash-lite,gemini-3-flash-preview,gemini-3.7-flash` |
| `AI_TIMEOUT` | Max timeout per model in seconds | `25` |
| `AI_MAX_TOOL_CALLS` | Max reasoning iterations per query | `5` |

### B. Frontend (`Vercel`)
Configure these environment variables in the Vercel Dashboard (**Project Settings $\to$ Environment Variables**):

| Variable Name | Description | Example / Production Setting |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Public Render backend HTTPS URL | `https://flowza-backend.onrender.com` |
| `VITE_WS_URL` *(Optional)* | WebSocket URL (Auto-derived if omitted) | `wss://flowza-backend.onrender.com` |

> [!CAUTION]
> **Zero Frontend Secrets Rule**: Never add `DATABASE_URL`, `SECRET_KEY`, or `GEMINI_API_KEY` to Vercel. Vite bundles are public client-side JavaScript.

---

## 3. Step-by-Step Production Deployment Sequence

### Step 1: Create Supabase PostgreSQL Database
1. Log in to [Supabase](https://supabase.com) and click **New Project**.
2. Name the project `flowza-production`, choose your primary region, and set a secure database password.
3. In **Project Settings $\to$ Database**, copy the **URI connection string**.
4. Convert the URI prefix to use SQLAlchemy's async driver:
   $$\text{postgresql://} \longrightarrow \mathbf{postgresql+asyncpg://}$$
   *Example:*
   `postgresql+asyncpg://postgres.xyz:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres`

### Step 2: Run Alembic Database Migrations
Run the migration suite from your local machine targeting the Supabase connection string:
```bash
# In backend/ directory
export DATABASE_URL="postgresql+asyncpg://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres"
alembic upgrade head
```
*Expected Output:*
`Running upgrade -> efe73c369836 -> 550a5de68d31 -> a1f8c29e4d71 -> e79cefdf04df -> b2c3d4e5f6a7 -> e5f6a7b8c9d0 -> c3d4e5f6a7b8 -> d4e5f6a7b8c9`

### Step 3: Seed Initial Demo / Admin Data
```bash
# In backend/ directory
python seed_data.py
```

### Step 4: Deploy FastAPI Backend on Render
1. Go to [Render Dashboard](https://dashboard.render.com) and click **New $\to$ Web Service**.
2. Connect your Git repository.
3. Configure the service:
   - **Name**: `flowza-backend`
   - **Root Directory**: *(leave blank or set to root)*
   - **Runtime**: `Python`
   - **Build Command**: `cd backend && pip install -r requirements.txt`
   - **Start Command**: `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path**: `/health`
4. Add all environment variables listed in Section 2A.
5. Click **Deploy Web Service**.

### Step 5: Verify Backend Health & WebSockets
Once deployed, test the live backend in your terminal or browser:
```bash
curl https://flowza-backend.onrender.com/health
# Response: {"status":"ok","app":"Flowza B2B Backend"}
```

### Step 6: Deploy React Frontend on Vercel
1. Go to [Vercel Dashboard](https://vercel.com) and click **Add New $\to$ Project**.
2. Select your Flowza repository.
3. Configure the project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add the environment variable:
   - `VITE_API_BASE_URL`: `https://flowza-backend.onrender.com`
5. Click **Deploy**.

### Step 7: Update Render CORS with Final Vercel URL
1. Copy your assigned Vercel URL (e.g. `https://flowza.vercel.app`).
2. In the Render Dashboard for `flowza-backend`, update:
   - `FRONTEND_URL`: `https://flowza.vercel.app`
   - `CORS_ORIGINS`: `https://flowza.vercel.app,https://flowza-*.vercel.app`
3. Save changes (Render will perform a zero-downtime hot reload).

---

## 4. Production Smoke Test & Verification Checklist

Once both services are deployed, execute this 10-point production verification checklist:

| Verification Item | Test Procedure | Expected Result |
| :--- | :--- | :--- |
| **1. Health Endpoint** | `GET /health` | Status 200: `{"status":"ok", ...}` |
| **2. SPA Routing** | Directly refresh `/dashboard/vendor` or `/assistant` | Pages render immediately without Vercel 404 |
| **3. Authentication** | Log in with Vendor credentials | JWT access & refresh tokens issued; redirect to `/dashboard/vendor` |
| **4. Supplier Catalog** | Browse catalog as Vendor | Products, categories, and prices load with live database values |
| **5. Cart & Checkout** | Add items $\to$ Checkout PO | Purchase order generated and state transitioned to `pending` |
| **6. Real-Time WebSockets**| Keep Supplier dashboard open while placing order | Live desktop & in-app notification fires instantly via WSS |
| **7. Order Lifecycle** | Supplier accepts/ships order | Order status transitions to `accepted` / `shipped`; history logged |
| **8. Invoices & PDF** | Download invoice PDF | Binary PDF downloads with `%PDF-` header and exact Decimal calculations |
| **9. Flowza AI Assistant** | Ask *"Which products are low in stock?"* | Gemini returns conversational analysis + live data chips in <3s |
| **10. Prompt Injection Test**| Enter adversarial jailbreak prompt | System rejects unauthorized privilege escalation; role isolation intact |

---

## 5. Rollback & Troubleshooting Guide

### Issue A: CORS Error on Login / API Calls
- **Symptom**: Browser console displays `Blocked by CORS policy: No 'Access-Control-Allow-Origin' header`.
- **Resolution**: Check `CORS_ORIGINS` in Render. Ensure the protocol matches exactly (`https://`, no trailing slash).

### Issue B: WebSocket Disconnects on HTTPS
- **Symptom**: `WebSocket connection failed: wss://...`.
- **Resolution**: Verify `useWebSocket.ts` is using `wss://` protocol on production. Confirm Render instance is active and not sleeping.

### Issue C: AI Assistant Fallback
- **Symptom**: Assistant outputs fallback summary instead of LLM text.
- **Resolution**: Check `GEMINI_API_KEY` in Render environment variables. The built-in 5-model hierarchy (`gemini-3.6-flash` $\to$ `gemini-3.5-flash` $\dots$) will automatically absorb quota constraints. If the key is exhausted or missing, the local `MockAIProvider` guarantees 100% platform uptime.
