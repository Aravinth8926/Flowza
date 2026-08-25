# 🚀 Flowza Frontend — Vercel Deployment Guide (Phase 9C)

This document provides step-by-step instructions for deploying the **Flowza React + Vite Frontend** to **Vercel** connected to the live **Render FastAPI Backend** and **Supabase PostgreSQL** database.

---

## 🏗️ Architecture

```
                    ┌────────────────────────────────────────┐
                    │            Flowza Frontend             │
                    │       (Vercel / React 19 + Vite 6)     │
                    │        https://<your-app>.vercel.app   │
                    └───────────────────┬────────────────────┘
                                        │ HTTPS / WSS
                                        ▼
                    ┌────────────────────────────────────────┐
                    │          Flowza Backend API            │
                    │      (Render Web Service / Python)     │
                    │    https://flowza-ri8d.onrender.com    │
                    └───────────────────┬────────────────────┘
                                        │ PostgreSQL (asyncpg)
                                        ▼
                    ┌────────────────────────────────────────┐
                    │          Supabase PostgreSQL           │
                    │        (AWS Mumbai ap-south-1)         │
                    └────────────────────────────────────────┘
```

---

## 📋 Vercel Project Setup Steps

### 1. Import Repository to Vercel
1. Navigate to [Vercel Dashboard](https://vercel.com/new).
2. Connect your GitHub account and import `Aravinth8926/Flowza` (or your active repository).

### 2. Configure Project Settings
In the Vercel project configuration screen:

| Setting | Value |
|---|---|
| **Framework Preset** | `Vite` |
| **Root Directory** | `frontend` |
| **Build Command** | `npm run build` *(or `tsc && vite build`)* |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |

### 3. Set Environment Variables
Under **Environment Variables** in Vercel:

| Key | Value | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `https://flowza-ri8d.onrender.com` | Live Render backend HTTPS URL |

> [!CAUTION]
> **No Backend Secrets**: Do **NOT** add `DATABASE_URL`, `SECRET_KEY`, or `GEMINI_API_KEY` to Vercel. Frontend bundles are public client-side JavaScript.

### 4. Deploy
Click **Deploy**. Vercel will:
1. Run `npm install`
2. Run `tsc` (0 TypeScript errors)
3. Run `vite build`
4. Deploy the single-page application with automatic SPA rewrites via [`frontend/vercel.json`](file:///c:/Users/EMMANUEL%20JOSHUA/Documents/Emman-Code/FLOWZA/Flowza/frontend/vercel.json).

---

## 🔍 Post-Deployment Verification

Once deployed to your live `.vercel.app` domain:

### 1. SPA Routing Test
Refresh directly on any nested route:
- `https://<your-app>.vercel.app/login`
- `https://<your-app>.vercel.app/dashboard/vendor`
- `https://<your-app>.vercel.app/dashboard/supplier`
- `https://<your-app>.vercel.app/dashboard/admin`
- `https://<your-app>.vercel.app/invoices`
- `https://<your-app>.vercel.app/ai`

Confirm no 404 errors occur (handled by `vercel.json` rewrite rule).

### 2. Live Demo Accounts

| Role | Email | Password | Dashboard URL |
|---|---|---|---|
| **Supplier** | `abc@distributors.com` | `Password123!` | `/dashboard/supplier` |
| **Vendor** | `vendor@supermarket.com` | `Password123!` | `/dashboard/vendor` |
| **Admin** | `admin@flowza.com` | `AdminPassword123!` | `/dashboard/admin` |

---

## 🛡️ Rollback Procedure

If you ever need to rollback a frontend deployment:
1. Go to **Vercel Dashboard** $\to$ Your Project $\to$ **Deployments**.
2. Find the previous stable deployment.
3. Click the three dots `...` $\to$ **Promote to Production**.
4. The rollback completes instantly (0s downtime).

The Render backend (`https://flowza-ri8d.onrender.com`) and Supabase PostgreSQL database remain untouched and online during frontend deployments and rollbacks.
