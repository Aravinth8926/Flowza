# 🚀 Flowza Production Deployment & Architecture Guide

This document provides the definitive, end-to-end blueprint for deploying the **Flowza B2B Procurement & Supply Chain Management Platform** to production.

---

## 1. Production Architecture Overview

```
                      ┌────────────────────────────────────────┐
                      │            Flowza Frontend             │
                      │          (Vercel / React+Vite)         │
                      │       https://<your-app>.vercel.app    │
                      └───────────────────┬────────────────────┘
                                          │ HTTPS / WSS
                                          ▼
                      ┌────────────────────────────────────────┐
                      │          Flowza Backend API            │
                      │        (Render Web Service)            │
                      │    https://flowza-ri8d.onrender.com    │
                      │  - FastAPI + Python 3.11.9 ($PORT)     │
                      │  - WebSockets (/ws/{token})            │
                      │  - In-Memory ReportLab PDF Invoicing   │
                      │  - Agentic AI Business Assistant       │
                      └───────────────────┬────────────────────┘
                                          │ postgresql+asyncpg://
                                          ▼
                      ┌────────────────────────────────────────┐
                      │          Supabase PostgreSQL           │
                      │        (AWS Mumbai ap-south-1)         │
                      │  - 17 Relational Tables & Enums        │
                      │  - PgBouncer Pooled Connection (5432)  │
                      └────────────────────────────────────────┘
```

---

## 2. Production Service Endpoints

| Service | Protocol | Production URL / Endpoint |
|---|---|---|
| **Backend REST API** | HTTPS | `https://flowza-ri8d.onrender.com` |
| **Health Check** | HTTPS | `https://flowza-ri8d.onrender.com/health` |
| **Interactive API Docs** | HTTPS | `https://flowza-ri8d.onrender.com/docs` |
| **WebSockets** | WSS | `wss://flowza-ri8d.onrender.com/ws/{token}` |
| **Frontend UI** | HTTPS | `https://<assigned-vercel-domain>.vercel.app` |

---

## 3. Environment Variables Specification

### A. Backend (`Render`)
Configured in the Render Dashboard (**Environment** tab for `flowza-backend`):

| Variable Name | Description | Value / Production Setting |
| :--- | :--- | :--- |
| `PYTHON_VERSION` | Python runtime version | `3.11.9` |
| `ENVIRONMENT` | Deployment stage | `production` |
| `DATABASE_URL` | Supabase Async PostgreSQL Connection String | `postgresql+asyncpg://postgres.fudgthjvyewjuxlydlyc:[ENCODED_PW]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres` |
| `SECRET_KEY` | High-entropy 64-char cryptographic secret for JWTs | *(Auto-generated)* |
| `ALGORITHM` | JWT signing algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES`| Access token lifespan | `1440` (24 hours) |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token lifespan | `7` (7 days) |
| `FRONTEND_URL` | Deployed Vercel Frontend URL | `https://<assigned-vercel-domain>.vercel.app` |
| `CORS_ORIGINS` | Comma-separated allowed origins | `http://localhost:5173,http://localhost:3000,https://flowza.vercel.app` |
| `AI_PROVIDER` | AI Engine Provider | `gemini` |
| `GEMINI_API_KEY` | Google AI Studio API key | `AIzaSy...` (from Google AI Studio) |
| `GEMINI_MODELS` | Ordered fallback hierarchy | `gemini-3.6-flash,gemini-3.5-flash,gemini-3.5-flash-lite,gemini-3-flash-preview,gemini-3.7-flash` |
| `AI_TIMEOUT` | Max timeout per model in seconds | `25` |
| `AI_MAX_TOOL_CALLS` | Max reasoning iterations per query | `5` |

### B. Frontend (`Vercel`)
Configured in the Vercel Dashboard (**Project Settings $\to$ Environment Variables**):

| Variable Name | Description | Value / Production Setting |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Public Render backend HTTPS URL | `https://flowza-ri8d.onrender.com` |
| `VITE_WS_URL` *(Optional)* | WebSocket URL (Auto-derived if omitted) | `wss://flowza-ri8d.onrender.com` |

> [!CAUTION]
> **Zero Frontend Secrets Rule**: Never add `DATABASE_URL`, `SECRET_KEY`, or `GEMINI_API_KEY` to Vercel. Vite bundles are public client-side JavaScript.

---

## 4. Vercel Frontend Deployment Steps

### Step 1: Connect Repository to Vercel
1. Log in to [Vercel Dashboard](https://vercel.com).
2. Click **Add New...** $\to$ **Project**.
3. Select your GitHub repository (`Aravinth8926/Flowza` or your active fork).

### Step 2: Configure Project Build Settings
Configure the project parameters:
- **Framework Preset**: `Vite`
- **Root Directory**: `frontend`
- **Build Command**: `npm run build` (or `tsc && vite build`)
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### Step 3: Add Environment Variables
Add the following key:
- **Key**: `VITE_API_BASE_URL`
- **Value**: `https://flowza-ri8d.onrender.com`

### Step 4: Deploy
Click **Deploy**. Vercel will run `tsc` and `vite build`, publishing your React SPA to a live `.vercel.app` domain.

### Step 5: Update Render CORS with Live Vercel Domain
Once your Vercel domain is assigned (e.g. `https://flowza-xyz.vercel.app`):
1. In Render Dashboard $\to$ `flowza-backend` $\to$ **Environment**.
2. Update `FRONTEND_URL` and `CORS_ORIGINS` with the final Vercel domain.
3. Flowza's backend regex `r"^(https?://(localhost|127\.0\.0\.1)(:\d+)?|https://.*\.vercel\.app)$"` already permits all `*.vercel.app` domains automatically.

---

## 5. Production Verification & Smoke Test Checklist

Execute this 10-point production verification checklist on the live Vercel frontend:

| # | Verification Item | Test Procedure | Expected Result |
|---|---|---|---|
| 1 | **Health Endpoint** | `GET /health` | Status 200: `{"status":"ok", "database":"connected", ...}` |
| 2 | **SPA Routing** | Directly refresh `/dashboard/vendor`, `/invoices`, `/ai` | Pages render immediately without Vercel 404 (`vercel.json` rewrites) |
| 3 | **Authentication** | Log in with Supplier (`abc@distributors.com` / `Password123!`) | JWT access token issued; redirect to `/dashboard/supplier` |
| 4 | **Supplier Catalog** | Browse catalog as Vendor (`vendor@supermarket.com`) | Products and inventory load from live Supabase PostgreSQL |
| 5 | **Cart & Checkout** | Add items $\to$ Checkout PO | Purchase order generated and state transitioned to `pending` |
| 6 | **Real-Time WebSockets**| Keep Supplier dashboard open while placing order | Live desktop & in-app notification fires instantly via WSS |
| 7 | **Order Lifecycle** | Supplier accepts $\to$ packed $\to$ shipped $\to$ delivered | Status timeline transitions with inventory reservation & deduction |
| 8 | **Invoices & PDF** | Generate invoice & download PDF | Binary PDF streams in-memory with `%PDF-` header |
| 9 | **Flowza AI Assistant** | Ask *"Which products are available in the catalog?"* | Gemini returns structured analysis + tool data chips in <3s |
| 10 | **Security Review** | Inspect network & bundle | Zero database credentials or backend secrets exposed in frontend |

---

## 6. Rollback & Troubleshooting Guide

### Issue A: CORS Error on Login / API Calls
- **Symptom**: Browser console displays `Blocked by CORS policy: No 'Access-Control-Allow-Origin' header`.
- **Resolution**: Check `CORS_ORIGINS` in Render. Ensure the protocol matches exactly (`https://`, no trailing slash). Note: Flowza's backend already includes regex allowing all `*.vercel.app` subdomains.

### Issue B: WebSocket Disconnects on HTTPS
- **Symptom**: `WebSocket connection failed: wss://...`.
- **Resolution**: Verify `useWebSocket.ts` is using `wss://` protocol on production. Confirm Render instance is active and not sleeping.

### Issue C: AI Assistant Fallback
- **Symptom**: Assistant outputs fallback summary instead of LLM text.
- **Resolution**: Check `GEMINI_API_KEY` in Render environment variables. The built-in 5-model hierarchy (`gemini-3.6-flash` $\to$ `gemini-3.5-flash` $\dots$) will automatically absorb quota constraints. If the key is exhausted or missing, the local `MockAIProvider` guarantees 100% platform uptime.

---

## 7. Protected Demonstration Environment

> [!IMPORTANT]
> **`Flowza-Demo`** is the frozen mentor demonstration copy (SQLite + DB Browser) and is never touched, modified, or migrated. All production deployment work is isolated exclusively to **`Flowza-Main`**.
