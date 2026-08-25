# FLOWZA — SUPABASE POSTGRESQL MIGRATION GUIDE
**Phase 9A: Database Architecture Migration & Verification Manual**

---

## 1. Executive Architecture Summary

Flowza supports a dual database architecture:
- **Local Development & Offline Demos**: SQLite with `aiosqlite` (`sqlite+aiosqlite:///./flowza.db`).
- **Cloud Staging & Production**: Supabase PostgreSQL with `asyncpg` (`postgresql+asyncpg://...`).

The entire migration is zero-touch to business logic:
- Dynamic `DATABASE_URL` normalization in `backend/app/core/config.py`.
- Automated session pooling and prepared statement caching bypass in `backend/app/database/session.py`.
- Dynamic URL resolution in `backend/alembic/env.py`.
- 100% dialect-agnostic Alembic migrations across all 15 operational tables.

---

## 2. Complete Database Table Inventory

Flowza's schema consists of 15 relational tables partitioned across 6 functional domains:

| Domain | Table Name | Purpose | Primary Key | Key Constraints |
| :--- | :--- | :--- | :--- | :--- |
| **Core Identity** | `roles` | RBAC roles (vendor, supplier, admin) | `id` (UUID) | `name` UNIQUE |
| | `users` | User accounts, credentials, contact | `id` (UUID) | `email` UNIQUE, FK to `roles`, FK to `companies` |
| | `companies` | Registered business entities & GSTIN | `id` (UUID) | 15-char GSTIN, FK to `users` |
| | `addresses` | Multi-type billing & shipping locations | `id` (UUID) | FK to `companies` |
| **Catalog & Stock**| `products` | Wholesale catalog SKUs & pricing | `id` (UUID) | `(company_id, sku)` UNIQUE, `price >= 0` |
| | `inventories` | Real-time stock & reorder levels | `id` (UUID) | `product_id` UNIQUE (1:1), `reserved <= on_hand` |
| **Procurement** | `carts` | Supplier-isolated procurement carts | `id` (UUID) | `(vendor_company_id, supplier_company_id)` UNIQUE |
| | `cart_items` | Cart line items & unit price snapshot | `id` (UUID) | `(cart_id, product_id)` UNIQUE, `quantity > 0` |
| **Orders** | `order_requests` | Structured purchase orders | `id` (UUID) | Buyer & Seller FKs, status lifecycle |
| | `order_request_items`| Order line items with SKU snapshot | `id` (UUID) | FK to `order_requests`, FK to `products` |
| | `order_status_history`| Immutable status audit trail | `id` (UUID) | FK to `order_requests`, timestamped |
| **Financials** | `invoices` | Tax-ready sales & purchase invoices | `id` (UUID) | `invoice_number` UNIQUE, `order_request_id` UNIQUE |
| | `invoice_items` | Tax & discount line breakdown | `id` (UUID) | FK to `invoices`, decimal exact amounts |
| | `payment_records` | Payment settlement vouchers | `id` (UUID) | FK to `invoices`, payment method & ref |
| **Notifications** | `notifications` | Persistent event notifications | `id` (UUID) | FK to `users` & `companies`, priority index |
| | `notification_preferences`| User delivery channel preferences | `id` (UUID) | `user_id` UNIQUE |

---

## 3. Step-by-Step Supabase Setup Instructions (For User)

### Step 1: Create Supabase Project
1. Log in to [Supabase Dashboard](https://supabase.com/dashboard).
2. Click **New Project**.
3. Set **Project Name**: `flowza-production` (or preferred name).
4. Set a strong **Database Password** (store this safely).
5. Select the closest geographical **Region** (e.g. `ap-south-1` Mumbai).
6. Click **Create new project** and wait for provisioning (~1-2 minutes).

### Step 2: Obtain Connection String
1. In your Supabase project dashboard, navigate to **Project Settings** (gear icon) -> **Database**.
2. Scroll to the **Connection String** section and select the **URI** tab.
3. Choose one of the following two formats:

#### Option A: Connection Pooler (Port 6543) — **RECOMMENDED for Serverless / Render**
```env
DATABASE_URL=postgresql+asyncpg://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```
> [!NOTE]
> Flowza automatically sets `statement_cache_size: 0` and `prepared_statement_cache_size: 0` for full compatibility with Supabase's transaction pooler (PgBouncer).

#### Option B: Direct Connection (Port 5432)
```env
DATABASE_URL=postgresql+asyncpg://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
```

---

## 4. Migration Execution & Seeding Commands

Once you have set your `DATABASE_URL` in `backend/.env`:

### 1. Run Alembic Migrations Against Supabase
```bash
cd backend
venv\Scripts\activate
alembic upgrade head
```
Expected output:
```
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
INFO  [alembic.runtime.migration] Running upgrade  -> efe73c369836, Initial schema
INFO  [alembic.runtime.migration] Running upgrade efe73c369836 -> e79cefdf04df, move_user_id_to_company_id
INFO  [alembic.runtime.migration] Running upgrade e79cefdf04df -> a1f8c29e4d71, db_architecture_and_er_refactor
INFO  [alembic.runtime.migration] Running upgrade a1f8c29e4d71 -> 550a5de68d31, add_product_inventory_cart_models
INFO  [alembic.runtime.migration] Running upgrade 550a5de68d31 -> b2c3d4e5f6a7, add_order_status_history
INFO  [alembic.runtime.migration] Running upgrade b2c3d4e5f6a7 -> e5f6a7b8c9d0, add_order_status_history_is_deleted
INFO  [alembic.runtime.migration] Running upgrade e5f6a7b8c9d0 -> c3d4e5f6a7b8, add_invoices_and_financial_records
INFO  [alembic.runtime.migration] Running upgrade c3d4e5f6a7b8 -> d4e5f6a7b8c9, add_notifications_and_preferences
```

### 2. Optional: Seed Initial Production Roles & Demo Data
To initialize standard RBAC roles (`vendor`, `supplier`, `admin`):
```bash
python app/database/seed.py
```
> [!IMPORTANT]
> The seed script is completely idempotent: it only creates records if they do not exist and never truncates or drops production data.

---

## 5. Verification & Rollback Strategy

### Verification Checklist
1. **Schema Check**: Open Supabase **Table Editor** to confirm all 15 tables are present.
2. **Architecture Test**: Run `python test_database_architecture.py`.
3. **End-to-End Test**: Run `python test_api_flow.py`.

### Rollback Strategy
If Supabase PostgreSQL connection fails or needs rollback:
1. Revert `backend/.env` `DATABASE_URL` to SQLite:
   ```env
   DATABASE_URL=sqlite+aiosqlite:///./flowza.db
   ```
2. The local development and frozen demo (`Flowza-Demo`) remain completely unaffected and operational.
3. No code modifications or schema rollbacks are required on the application codebase.
