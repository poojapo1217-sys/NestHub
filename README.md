# Comfort Stay — PG & Hostel Management System

A full-stack, role-based web application for managing **Comfort Stay PG** (10 rooms, 40 beds across Rooms 101–110) with Tenant, Manager, and Owner portals, automated rent & electricity billing, bed allocation, complaint tracking, weekly food menu management, and live financial analytics.

---

## Key Features & Screens

1. **Common Login Page (Screen 1)**
   - Unified sign-in using email or phone number + password with show/hide toggle, Remember Me, Forgot Password modal, and JWT authentication.
2. **Tenant Module (Screens 2–5)**
   - **Tenant Dashboard**: Resident profile, room & bed allocation, monthly rent, room electricity bill, pending dues, payment & complaint summaries, today's meal preview, notifications, and 4 quick actions.
   - **Rent & Electricity Bill**: Itemized rent + electricity share, meter reading breakdown (`Units = Current - Previous`, `Bill = Units × Rate`), payment history, simulated **Demo Payment Workflow** (success & decline simulation), transaction ID, and downloadable HTML receipt.
   - **Complaint Registration**: Category-tagged issue submission generating unique tracking IDs (`CMP-YYYY-NNN`) and live status tracking (`Pending`, `In Progress`, `Resolved`).
   - **Weekly Food Menu**: Monday–Sunday schedule across Breakfast, Lunch, Evening Snacks, and Dinner.
3. **Manager Module (Screens 6–8)**
   - **Manager Dashboard & Electricity Meter Entry**: Live occupancy & complaint KPIs, automatic electricity bill calculator, validation (`current >= previous`), duplicate room-month prevention, and audit-logged authorized corrections.
   - **Complaint Management**: Searchable, status-filterable table with resolution remarks and one-click resolution.
   - **New Tenant Registration**: Complete onboarding form with vacant bed selection (blocks occupied beds), optional ID document upload (stored privately outside public URLs), automatic tenant login creation, edit profile, and transactional check-out (frees bed while preserving payment & deposit history).
4. **Owner Module (Screens 9–10)**
   - **Owner Financial Dashboard**: Real-time database-backed KPIs (`Monthly Rent Collected`, `Pending Rent`, `Security Deposits Held`, `Electricity Collections`, `Total Income`, `Total Expenses`, `Net Income`), 4 interactive Recharts visualizations, month/year selector, expense logging, deposit refund processing, CSV report export, and receipt downloads.
   - **Vacant Bed Management**: 40-bed room-wise availability matrix (`101`–`110`) with color + text status indicators (`Vacant`, `Occupied`, `Maintenance`), room search, availability filters, resident inspection, and bed maintenance toggles.

---

## Project Structure

```text
├── database/
│   ├── schema.sql               # MySQL 8.0+ normalized relational schema (14 tables)
│   └── seed.sql                 # Realistic sample data (1 Owner, 2 Managers, 15 Tenants, 10 Rooms, 40 Beds)
├── server/
│   ├── config/
│   │   ├── db.ts                # Unified MySQL2 + local SQLite fallback database driver
│   │   └── env.ts               # Environment variable configuration
│   ├── controllers/             # Auth, Tenants, Beds, Rent, Electricity, Complaints, Deposits, Menu, Expenses, Dashboards
│   ├── middleware/              # JWT auth, RBAC authorization, Multer secure file upload
│   ├── routes/                  # Express REST API routes (/api/*)
│   ├── services/                # Audit logger, notifications, database seeder
│   ├── validators/              # Input validation helpers
│   └── scripts/
│       ├── seed.ts              # CLI seed script
│       └── verify.ts            # 16-case integration test suite
├── src/
│   ├── components/              # KpiCard, StatusTag, EmptyState, LoadingState
│   ├── context/                 # AuthContext, ToastContext (with confirmation dialogs)
│   ├── layouts/                 # Responsive SaaS DashboardLayout
│   ├── pages/                   # All 10 functional application screens
│   ├── services/                # Typed fetch API client
│   ├── types/                   # TypeScript interfaces
│   └── utils/                   # INR currency, dates, CSV export, receipt download
├── server.ts                    # Express + Vite full-stack entry point (port 3000)
├── .env.example
└── package.json
```

---

## Installation & Local Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

#### Option A: Local Development Database (Zero-Setup Fallback)
By default, if `DB_HOST` is left empty, the server automatically uses Node's built-in persistent SQLite database (`./data/pg_hostel_management.db`) with identical tables, foreign keys, check constraints, and transactions—and automatically seeds Comfort Stay PG on startup.

#### Option B: MySQL 8.0+ Database Setup
1. Open **MySQL Workbench** or the `mysql` CLI.
2. Execute `database/schema.sql` to create the `pg_hostel_management` database and all 14 tables.
3. Execute `database/seed.sql` to populate sample data.
4. Update `.env` with your MySQL credentials:
   ```env
   DB_CLIENT=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=pg_hostel_management
   ```

### 3. Run the Application
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

To reset and re-seed the database manually:
```bash
npm run seed -- --force
```

---

## Demo Login Credentials (Development Only)

> **Security Note:** These sample credentials are for local development and evaluation only. Change all passwords and `JWT_SECRET` before any production deployment.

| Role | Name | Email | Phone | Password |
| :--- | :--- | :--- | :--- | :--- |
| **Owner (Admin)** | Vikramaditya Rao | `owner@comfortstay.in` | `9845010001` | `Owner@123` |
| **Manager** | Suresh Nair | `manager@comfortstay.in` | `9845010002` | `Manager@123` |
| **Manager (Warden)** | Kavitha Deshmukh | `warden@comfortstay.in` | `9845010003` | `Manager@123` |
| **Tenant (Room 101)** | Aarav Sharma | `tenant@comfortstay.in` | `9845020001` | `Tenant@123` |

---

## REST API Documentation

All protected endpoints require `Authorization: Bearer <jwt_token>`.

- **Auth**: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/forgot-password`
- **Dashboards**: `GET /api/dashboard/tenant`, `GET /api/dashboard/manager`, `GET /api/dashboard/owner?month=YYYY-MM`
- **Tenants**: `GET /api/tenants`, `POST /api/tenants` (multipart/form-data or JSON), `GET /api/tenants/:id`, `PUT /api/tenants/:id` (edit or `action: "CHECKOUT"`), `GET /api/tenants/:id/documents/:docId`
- **Beds**: `GET /api/beds`, `GET /api/beds/vacant`, `PUT /api/beds/:id/status`
- **Rent**: `GET /api/rent`, `POST /api/rent` (demo payment, manual payment, or `action: "GENERATE_INVOICES"`), `GET /api/rent/:id`
- **Electricity**: `GET /api/electricity`, `POST /api/electricity`, `PUT /api/electricity/:id` (authorized correction with audit reason), `GET /api/electricity/:id`
- **Complaints**: `GET /api/complaints`, `POST /api/complaints`, `PUT /api/complaints/:id`
- **Deposits**: `GET /api/deposits`, `POST /api/deposits`
- **Food Menu**: `GET /api/menu`, `POST /api/menu`, `PUT /api/menu/:id`
- **Expenses**: `GET /api/expenses`, `POST /api/expenses`

---

## Testing Instructions

Run the automated 16-scenario end-to-end integration test suite (covering logins, invalid passwords, RBAC 403 enforcement, tenant registration, duplicate bed conflict 409, demo rent payment, electricity formula & invalid meter reading 400, complaint lifecycle, tenant checkout & bed release, and owner financial net-income math):

```bash
npx tsx server/scripts/verify.ts
```

Run TypeScript type-checking and production build verification:
```bash
npm run lint
npm run build
```
