# SaudiMart ERP

A complete, production-ready Saudi Grocery ERP system with POS, Inventory, Procurement, HR, Finance/ZATCA, and Developer panels.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15.2 (App Router, TypeScript) |
| Styling | Tailwind CSS v3 + custom dark theme |
| UI Components | Radix UI + Lucide icons |
| Database | MongoDB + Mongoose ODM |
| Auth | JWT via `jose` + session storage |
| Real-time | Server-Sent Events (SSE) |
| ZATCA | Phase 2 TLV-encoded QR codes |
| i18n | Arabic / English with RTL toggle |

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and fill in your values:

```env
MONGODB_URI=mongodb://localhost:27017/saudimart
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
ZATCA_VAT_NUMBER=300012345600003
ZATCA_SELLER_NAME=SaudiMart Grocery Store
```

### 3. Seed the database

```bash
npm run seed
```

This creates:
- 1 branch (Main Branch - Riyadh)
- 5 users with roles: `super_admin`, `developer`, `inventory_manager`, `cashier`, `accountant`
- 8 sample products (rice, chicken, milk, tomatoes, etc.)
- 7 inventory batches (including 1 expired)
- 3 vendors
- 4 employees
- 1 sample invoice

**Default password for all seed users: `Admin@1234`**

| Role | Email |
|------|-------|
| super_admin | admin@saudimart.sa |
| developer | dev@saudimart.sa |
| inventory_manager | inventory@saudimart.sa |
| cashier | cashier@saudimart.sa |
| accountant | accounts@saudimart.sa |

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Features

### POS Billing
- Barcode / SKU / name search
- Cart with quantity adjustments and per-line discounts
- VAT 15% auto-calculation
- Cash, Card, and Split payment modes
- Numpad for cash tendered / change calculation
- Hold & resume bills
- ZATCA Phase 2 QR code on receipt
- Print receipt

### Inventory
- FEFO-managed batch tracking
- Expiry alerts (30-day and 7-day warnings)
- Add batches with full metadata
- Wastage logging with reason codes
- Real-time SSE sync across sessions

### Procurement
- Purchase Order creation with line items
- Vendor management
- Receive PO → auto-creates inventory batches
- Status workflow: draft → sent → received / partial / cancelled

### HR
- Employee profiles with Iqama / Passport tracking
- 60-day Iqama expiry alerts
- Clock-in / Clock-out attendance recording
- Salary management

### Finance / ZATCA
- Monthly VAT reports with date range filter
- Fatoora invoice history with QR codes
- CSV export for accounting
- ZATCA Phase 2 TLV-encoded QR on every invoice
- Gross sales, VAT, net breakdown

### Developer Panel
- Full audit log viewer (all user actions)
- User management with enable/disable
- RBAC role matrix
- System health check (MongoDB + SSE status)
- Environment variable reference

---

## Role-Based Access Control

| Permission | developer | super_admin | admin | inventory_manager | cashier | accountant |
|-----------|:---------:|:-----------:|:-----:|:-----------------:|:-------:|:----------:|
| POS | ✓ | ✓ | ✓ | | ✓ | |
| Inventory | ✓ | ✓ | ✓ | ✓ | | |
| Procurement | ✓ | ✓ | ✓ | ✓ | | |
| HR | ✓ | ✓ | ✓ | | | |
| Finance | ✓ | ✓ | | | | ✓ |
| Developer | ✓ | | | | | |

---

## Folder Structure

```
├── app/
│   ├── (auth)/login/         # Login page
│   ├── (dashboard)/          # All dashboard pages
│   │   ├── page.tsx          # Home / stats
│   │   ├── pos/              # POS billing
│   │   ├── inventory/        # Inventory & batches
│   │   ├── procurement/      # Purchase orders
│   │   ├── hr/               # Human resources
│   │   ├── finance/          # Finance & ZATCA
│   │   └── developer/        # Developer panel
│   ├── api/                  # All API routes
│   └── globals.css           # Global styles
├── components/               # Shared components
│   ├── Sidebar.tsx
│   └── CommandPalette.tsx
├── contexts/                 # React contexts
│   └── LanguageContext.tsx
├── hooks/                    # Custom hooks
│   ├── useAuth.ts
│   └── useSSE.ts
├── lib/                      # Utilities & DB
│   ├── db.ts
│   ├── utils.ts
│   └── zatca.ts
├── models/                   # Mongoose models
├── scripts/                  # Scripts
│   └── seed.ts
└── types/                    # TypeScript types
    └── index.ts
```

---

## API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Authenticate user |
| GET/POST | `/api/products` | List / create products |
| GET/PUT/DELETE | `/api/products/[id]` | Single product CRUD |
| GET/POST | `/api/batches` | List / create batches |
| GET/POST | `/api/invoices` | List / create invoices |
| GET/POST | `/api/purchase-orders` | List / create POs |
| PUT | `/api/purchase-orders/[id]` | Update PO status |
| GET/POST | `/api/vendors` | List / create vendors |
| GET/POST | `/api/employees` | List / create employees |
| GET/PUT/DELETE | `/api/employees/[id]` | Single employee CRUD |
| GET/POST | `/api/attendance` | Attendance records |
| GET/POST | `/api/wastage` | Wastage logs |
| GET | `/api/audit-logs` | Audit log viewer |
| GET | `/api/zatca` | ZATCA invoice summary |
| GET | `/api/dashboard/stats` | Dashboard statistics |
| GET | `/api/sse` | Real-time SSE stream |
| GET | `/api/health` | System health check |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Open Command Palette |
| `Escape` | Close modals / palette |
| `↑ ↓` | Navigate palette results |
| `Enter` | Execute palette action |

---

## Production Build

```bash
npm run build
npm start
```

Make sure `MONGODB_URI` and `JWT_SECRET` are set as real environment variables in production (not just `.env.local`).
