# ShopIndia — Comprehensive Technical Audit & Developer Handover Report

> **Prepared For:** Incoming Engineering Lead / Developer  
> **Project Name:** ShopIndia (Multi-Vendor E-Commerce, Quick Commerce & HVAC Marketplace)  
> **Repository:** `shopindia`  
> **Date:** September 2026  
> **Build Status:** ✅ Production Build Passing (`tsc -b && vite build` — 0 errors)  
> **Lint Status:** ✅ Passing (`npm run lint` — 0 errors, 48 minor warnings)

---

## Table of Contents
1. [Executive Summary & Project Overview](#1-executive-summary--project-overview)
2. [Three Core Business Verticals](#2-three-core-business-verticals)
3. [Architecture & Technology Stack](#3-architecture--technology-stack)
4. [Directory & Repository Structure](#4-directory--repository-structure)
5. [Database Architecture & Data Models (Prisma + RDS)](#5-database-architecture--data-models-prisma--rds)
6. [Authentication & Authorization (RBAC & Cognito)](#6-authentication--authorization-rbac--cognito)
7. [Environment Variables, API Keys & Cloud Services](#7-environment-variables-api-keys--cloud-services)
8. [Complete API Endpoints Directory](#8-complete-api-endpoints-directory)
9. [Frontend Shells & UI Design](#9-frontend-shells--ui-design)
10. [Critical Security Audit & Code Findings](#10-critical-security-audit--code-findings)
11. [Setup, Execution & Deployment Guide](#11-setup-execution--deployment-guide)
12. [Immediate Next Steps for the Incoming Developer](#12-immediate-next-steps-for-the-incoming-developer)

---

## 1. Executive Summary & Project Overview

**ShopIndia** is an enterprise-scale, multi-vendor marketplace platform operating across **E-Commerce**, **Quick Commerce (10–30 min instant delivery)**, and **HVAC Services & Installation**. 

The platform supports **6 distinct user roles**:
1. **Super Admin** — Full platform oversight, vendor approval/KYC, commission configuration, service areas, user management, and dispute resolution.
2. **Branch Manager** — Local hub management, local riders, inventory oversight, and order fulfillment.
3. **Support Executive** — Customer support ticketing, live assistance, complaint management, and refund processing.
4. **Vendor** — Catalog management, inventory, orders fulfillment, financial wallet/withdrawals, technician dispatch.
5. **Delivery Rider** — Last-mile dispatch, status updates, live delivery tracking.
6. **Customer** — Browsing, filtering, cart management, payments, order tracking, returns, reviews, address book, and live support.

### Current Implementation Status
- **Frontend:** 100% responsive desktop & mobile shells with hash-based routing (`#/` for customer storefront + 15-tab customer dashboard, `#/admin` for 18-tab Admin Portal, `#/vendor` for 8-tab Vendor Portal).
- **Backend:** Node.js Express REST API connected to AWS RDS PostgreSQL via Prisma ORM with 36 relational models.
- **Data Migration:** Completed transition from initial MongoDB prototype to native PostgreSQL on Amazon RDS.
- **Auth:** Hybrid Cognito JWT verification + native fallback with email OTP password reset via Nodemailer.

---

## 2. Three Core Business Verticals

The frontend and backend dynamically support 3 distinct verticals via `currentVertical` in `AppContext`:

| Vertical Key | Vertical Name | Fulfillment Model | Target Products / Services |
|---|---|---|---|
| `shop` | **Traditional E-Commerce** | National / Courier Logistics (Shiprocket, Delhivery, Blue Dart) | Electronics, Mobiles, Fashion, Kitchen Appliances, Large AC units |
| `quick` | **Quick Commerce** | Hyperlocal Dark Store / Nearby Rider (10–30 mins) | Groceries, Fresh Produce, Food Delivery, Pharmacy Medicines |
| `services` | **HVAC & Home/Auto Services** | Doorstep Certified Technicians | AC Cleaning/Repair, AMC Plans, Deep Cleaning, Auto Spa, 24/7 Roadside Towing |

---

## 3. Architecture & Technology Stack

### 3.1 Frontend (`/src`)
- **Core:** React 19.2.7, TypeScript 6.0.2, Vite 8.1.1
- **Styling:** Tailwind CSS 3.4.19, PostCSS, Autoprefixer
- **Animations & UI:** Framer Motion 12.42.2, Embla Carousel React 8.6.0, Lucide React 1.24.0
- **Linting:** Oxlint (high-performance Rust linter)
- **Routing:** Hash-based SPA routing (`window.location.hash`) for deployment flexibility without requiring complex web-server rewrites.
- **State Management:** React Context API (`AppContext`, `CustomerContext`, `AuthContext`).

### 3.2 Backend (`/server`)
- **Runtime:** Node.js (CommonJS module format)
- **Server Framework:** Express 4.19.2
- **Database & ORM:** PostgreSQL on Amazon RDS via Prisma ORM 5.16.0
- **Cloud Integrations:** AWS SDK v3 (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `aws-jwt-verify`)
- **Security & Utilities:** `bcryptjs` (password hashing), `jsonwebtoken` (app JWTs), `express-rate-limit` (2000 req/15min), `cors`, `dotenv`, `multer` (multipart upload buffer), `nodemailer` (SMTP notifications/OTP).

---

## 4. Directory & Repository Structure

```
shopindia/
├── .env                              # Frontend Vite environment configuration
├── .env.example                      # Sample frontend env template
├── .gitignore                        # Git ignore rules
├── ec2-key.pem                       # ⚠️ AWS EC2 SSH Private Key (See Security Section)
├── package.json                      # Frontend dependencies and scripts
├── vite.config.ts                    # Vite build configuration
├── tailwind.config.js                # Custom brand theme and palette definitions
├── docs/
│   ├── PRD.md                        # Complete 639-line Master PRD (v2.0)
│   └── PROJECT_HANDOVER_AUDIT_REPORT.md  # This comprehensive handover document
├── server/
│   ├── .env                          # ⚠️ Live backend environment variables
│   ├── .env.example                  # Backend env template
│   ├── index.js                      # Express app entry point & route mounting
│   ├── package.json                  # Backend dependencies and scripts
│   ├── lib/
│   │   ├── prisma.js                 # Prisma client singleton instance
│   │   ├── s3.js                     # S3 upload & presigned URL generator
│   │   └── mailer.js                 # Nodemailer transporter & OTP email templates
│   ├── middleware/
│   │   ├── auth.js                   # Dual Cognito / App JWT verification middleware
│   │   ├── customerAuth.js           # Customer role JWT guard
│   │   └── rbac.js                   # requireRole & requirePermission RBAC guards
│   ├── prisma/
│   │   ├── schema.prisma             # 828-line relational PostgreSQL schema
│   │   └── migrations/               # Applied SQL migration history
│   ├── routes/
│   │   ├── auth.js                   # Admin & general user authentication + OTP
│   │   ├── customer-auth.js          # Customer register, login, profile, password reset
│   │   ├── products.js               # Public product listing, filtering & details
│   │   ├── categories.js             # Public hierarchical category retrieval
│   │   ├── banners.js                # Promotional banner fetch
│   │   ├── orders.js                 # Cart checkout & customer order creation
│   │   ├── support.js                # Smart bot FAQs & support ticket lifecycle
│   │   ├── admin/                    # 17 admin sub-routes (users, vendors, rbac, etc.)
│   │   ├── customer/                 # 10 customer dashboard sub-routes (addresses, cart, etc.)
│   │   └── vendor/                   # 8 vendor portal sub-routes (products, wallet, etc.)
│   └── scripts/
│       ├── seed.js                   # Seeds system roles, Super Admin & Demo Vendor
│       ├── seed-products.js          # Seeds 24 demo items across all 6 sub-verticals
│       ├── sync-category-verticals.js
│       └── sync-order-types.js
└── src/
    ├── App.tsx                       # App router (splits #/admin, #/vendor, storefront)
    ├── admin/                        # Super Admin Portal (18 modules & views)
    ├── vendor/                       # Vendor Portal (8 modules & views)
    ├── components/
    │   ├── desktop/                  # Desktop header, footer, 3 vertical pages
    │   ├── mobile/                   # Mobile app shell, drawer, bottom navigation
    │   ├── common/                   # Shared UI modals (Location, Quick Support, etc.)
    │   └── dashboard/                # Shared customer dashboard components
    ├── context/
    │   ├── AppContext.tsx            # Global state: cart, vertical, location, orders
    │   ├── AuthContext.tsx           # Admin/Vendor authentication state & RBAC
    │   └── CustomerContext.tsx       # Customer session, addresses, wishlist, reviews
    ├── lib/
    │   ├── api.ts                    # Main API fetch wrapper with token injection
    │   ├── customerApi.ts            # Customer-specific API wrapper & event tracking
    │   └── customerAuth.ts           # Customer token helpers & auth endpoints
    └── pages/
        ├── Cart.tsx                  # Cart checkout page
        ├── Categories.tsx            # Full category grid view
        ├── Orders.tsx                # Customer orders list
        ├── ProductDetail.tsx         # Rich product detail page
        ├── Profile.tsx               # Customer profile overview
        ├── Search.tsx                # Instant search with price/rating filters
        └── dashboard/                # 15 Customer Dashboard sub-views
```

---

## 5. Database Architecture & Data Models (Prisma + RDS)

The database runs on **Amazon RDS PostgreSQL** (`db.t3.micro`/`db.t4g.micro` in `ap-south-2`). The schema contains **36 models** structured into the following domains:

```
                  ┌───────────────────────┐
                  │         User          │
                  └──────────┬────────────┘
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
   ┌───────────┐       ┌───────────┐       ┌───────────┐
   │  Vendor   │       │ Customer  │       │   Rider   │
   └─────┬─────┘       └─────┬─────┘       └─────┬─────┘
         │                   │                   │
         ├► Products         ├► Orders ◄─────────┘
         ├► Technicians      ├► Addresses
         ├► Wallet/Payouts   ├► Wishlist / Cart
         └► Documents        └► Support Tickets
```

### Core Relational Models Summary
1. **Users & RBAC:** `User`, `Role`, `RolePermission`, `BranchStaff`
2. **Vendors & KYC:** `Vendor`, `VendorDocument` (with approval statuses: `pending, approved, rejected, suspended`)
3. **Products & Inventory:** `Product`, `ProductVariant`, `ProductImage`, `Category`
4. **Orders & Deliveries:** `Order`, `OrderItem`, `Delivery`, `RiderProfile`
5. **Customer Experience:** `Cart`, `CartItem`, `Wishlist`, `WishlistItem`, `Address`, `PaymentMethod`, `Transaction`, `Reward`, `Review`, `UserNotification`, `UserActivity`
6. **Support & Operations:** `Ticket`, `TicketMessage`, `Branch`, `ServiceArea`, `ServiceAreaPincode`, `Coupon`, `Banner`, `NotificationTemplate`, `NotificationLog`
7. **HVAC & Services Vertical:** `Technician`, `ServiceJob`

---

## 6. Authentication & Authorization (RBAC & Cognito)

The authentication system employs a **dual-pipeline verification strategy** implemented in `server/middleware/auth.js`:

```
Incoming Request (Authorization: Bearer <token>)
                   │
                   ▼
       Is Cognito Verifier active?
          /                \
        Yes                 No
        /                     \
  Verify via JWKS        Verify with JWT_SECRET
   (AWS Cognito)          (App-issued Token)
        │                       │
        ▼                       ▼
  Sets req.user           Sets req.user
  (role from Cognito)     (role from DB/Token)
```

1. **Cognito Token Verification:** Uses `aws-jwt-verify` against the Cognito User Pool public keys (JWKS). Extracts user ID (`sub`) and role groups (`cognito:groups`).
2. **App-Issued Token Fallback:** Allows standard email/password authentication signed with `process.env.JWT_SECRET`.
3. **Role-Based Access Control (`rbac.js`):**
   - `requireRole(...roles)` ensures the user's role matches.
   - `requirePermission(...perms)` checks both in-token permissions and dynamically queries the PostgreSQL `role_permissions` table.
4. **Email OTP Verification:**
   - Password reset triggers `sendPasswordResetEmail()` via Nodemailer.
   - Generated 6-digit OTP is hashed in the database with a 15-minute expiration timestamp.

---

## 7. Environment Variables, API Keys & Cloud Services

### 7.1 Frontend (`.env`)
| Variable | Current Value / Purpose |
|---|---|
| `VITE_API_URL` | `/api` (or `http://localhost:5002` during standalone dev) |
| `VITE_COGNITO_USER_POOL_ID` | `ap-south-2_3jD9LwGJE` |
| `VITE_COGNITO_CLIENT_ID` | `4l415vk8d3ghf38pmpie4thdp` |
| `VITE_AWS_REGION` | `ap-south-2` |
| `VITE_CLOUDFRONT_URL` | `https://d12345example.cloudfront.net` (CDN for static images) |

### 7.2 Backend (`server/.env`)
| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection URI on Amazon RDS (`ap-south-2`) |
| `PORT` | API server listen port (configured as `5002`) |
| `FRONTEND_URL` | CORS allowed origin (`http://localhost:5173`) |
| `JWT_SECRET` | Secret key used to sign and verify app-issued JWT tokens |
| `JWT_EXPIRES` | Session expiry window (`24h`) |
| `COGNITO_USER_POOL_ID` | AWS Cognito User Pool identifier |
| `COGNITO_CLIENT_ID` | AWS Cognito App Client ID |
| `AWS_REGION` | AWS infrastructure region (`ap-south-2`) |
| `AWS_S3_BUCKET` | S3 asset storage bucket (`shopindia-assets`) |
| `AWS_ACCESS_KEY_ID` | AWS IAM credentials for S3 uploads |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret key |
| `EMAIL_USER` | Gmail address for system notifications (`shopindia36@gmail.com`) |
| `EMAIL_PASS` | Google 16-character App Password for SMTP relay |
| `EMAIL_FROM` | RFC-compliant from header |

---

## 8. Complete API Endpoints Directory

### 8.1 Storefront & Common APIs
- `GET /api/health` — Service health check and database engine confirmation.
- `GET /api/products` — Filter products by vertical, category, query, price range.
- `GET /api/products/:id` — Single product details with variants, images, and reviews.
- `GET /api/categories` — Category hierarchy.
- `GET /api/banners` — Active marketing banners.
- `POST /api/orders` — Create new order (supports both authenticated customer and guest).
- `GET /api/orders` — Customer order list.
- `GET /api/support/faqs` — Retrieve intelligent FAQ knowledge base.
- `POST /api/support/tickets` — Submit a new customer support ticket.
- `GET /api/support/tickets/:id` — Get ticket details and conversation thread.
- `POST /api/support/tickets/:id/messages` — Add customer response to ticket.

### 8.2 Customer Authentication & Dashboard
- `POST /api/customer/register` — Customer account creation.
- `POST /api/customer/login` — Customer email/password authentication.
- `POST /api/customer/forgot-password` — Generate and email OTP code.
- `POST /api/customer/reset-password` — Validate OTP and update password.
- `GET /api/customer/profile` & `PUT /api/customer/profile` — Profile management.
- `GET/POST/DELETE /api/customer/addresses` — Saved shipping addresses.
- `GET/POST/DELETE /api/customer/wishlist` — Wishlist items.
- `GET/POST/DELETE /api/customer/cart` — Cart synchronization.
- `GET/POST/DELETE /api/customer/payments` — Saved cards / UPI accounts.
- `GET /api/customer/reviews` & `POST /api/customer/reviews` — Customer product reviews.
- `GET /api/customer/coupons` — Available discount vouchers and reward points.
- `POST /api/customer/orders/:id/cancel` — Order cancellation.
- `POST /api/customer/orders/:id/return` — Request return.
- `POST /api/customer/orders/:id/exchange` — Request product replacement.

### 8.3 Super Admin Portal (`/api/admin/*`)
- `/api/admin/dashboard` — High-level KPI metrics, GMV, orders count, vertical breakdown.
- `/api/admin/vendors` — Vendor list, KYC document verification, approve/reject/suspend.
- `/api/admin/users` — Staff, rider, customer management, account status changes.
- `/api/admin/products` — Catalog moderation, inventory overrides, status controls.
- `/api/admin/orders` — Global order stream, manual fulfillment override, shipment updates.
- `/api/admin/branches` — Physical fulfillment dark stores and hub assignments.
- `/api/admin/rbac` — Custom roles definition and granular route permission matrix.
- `/api/admin/service-areas` — Pincode geo-fencing for Quick Commerce delivery radius.
- `/api/admin/support` — Administrative ticket resolution queue and live chat agent response.
- `/api/admin/commissions` — Platform take-rate and vendor payout settlements.
- `/api/admin/riders` — Delivery rider onboarding, duty status, cash-on-delivery tracking.
- `/api/admin/reports` — Sales, revenue, commission, and cancellation CSV/PDF exports.
- `/api/admin/offers` & `/api/admin/promotions` — Platform coupons and banner deals.

### 8.4 Vendor Portal (`/api/vendor/*`)
- `POST /api/vendor/auth/register` & `/login` — Vendor onboarding and authentication.
- `GET/POST/PUT/DELETE /api/vendor/products` — Product management with S3 image upload.
- `GET/PUT /api/vendor/orders` — Inbound orders, packing status, dispatch marking.
- `GET /api/vendor/analytics` — Vendor sales graphs, revenue breakdowns, top items.
- `GET/POST /api/vendor/wallet` — Earnings ledger, withdrawal requests to bank accounts.
- `GET /api/vendor/reviews` — Product rating feedback and customer remarks.

---

## 9. Frontend Shells & UI Design

- **Responsive Split:** `src/App.tsx` detects mobile viewport (`max-width: 768px`) using `useIsMobile()` and switches between `<DesktopApp />` and `<MobileApp />`.
- **Desktop Shell (`src/components/desktop`):**
  - High-visibility header with vertical switcher (E-Commerce, Quick Commerce, Services), delivery pincode selector, auto-suggest search bar, cart flyout, and account navigation.
  - Three distinct homepage feeds (`VerticalShop`, `VerticalQuickCommerce`, `VerticalServices`).
- **Mobile Shell (`src/components/mobile`):**
  - Native app feel with smart scroll-hiding top bar, bottom navigation bar, swipeable category carousels, and bottom sheets.
- **Portals Architecture:**
  - `AdminPortal` and `VendorPortal` are isolated applications rendered conditionally when `window.location.hash` begins with `#/admin` or `#/vendor`.
  - Both portals provide separate authentication contexts, responsive sidebars, table views, and modal drawers.

---

## 10. Critical Security Audit & Code Findings

### ⚠️ Priority 1: Exposed EC2 Private Key in Git
- **Finding:** A file named `ec2-key.pem` is located in the project root directory and is **currently tracked by git**.
- **Risk:** Anyone with repository read access can obtain this key and gain root SSH access to the AWS EC2 instance.
- **Action Required:**
  1. Remove the key from git tracking: `git rm --cached ec2-key.pem`.
  2. Update `.gitignore` to strictly include `*.pem` and `ec2-key.pem`.
  3. Rotate the SSH keypair on AWS EC2 console immediately.

### ⚠️ Priority 2: Unmounted Vendor Route Files
- **Finding:** In `server/routes/vendor/`, two route files exist: `service-jobs.js` and `technicians.js`. However, they are **not mounted** in `server/index.js`.
- **Impact:** Vendor technicians management and HVAC service job dispatch endpoints will return `404 Not Found` if invoked.
- **Action Required:** Mount both routes in `server/index.js`:
  ```javascript
  app.use('/api/vendor/technicians', require('./routes/vendor/technicians'));
  app.use('/api/vendor/service-jobs', require('./routes/vendor/service-jobs'));
  ```

### ⚠️ Priority 3: Production Secrets Rotation
- **Finding:** Live RDS credentials, AWS Access Keys, and Gmail App Passwords currently exist in `server/.env`.
- **Action Required:** Store these variables in **AWS Systems Manager Parameter Store** or **AWS Secrets Manager** when deploying the EC2 backend, ensuring they are never logged or stored in version control.

---

## 11. Setup, Execution & Deployment Guide

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0

### Step 1: Install Dependencies
```bash
# In project root (Frontend)
npm install

# In server directory (Backend)
cd server
npm install
cd ..
```

### Step 2: Environment Configuration
Ensure `.env` in the root and `server/.env` are populated as described in Section 7.

### Step 3: Run Seed Scripts (Optional / Initial Setup)
```bash
# Run from within the server directory:
cd server
node scripts/seed.js            # Seeds Super Admin & Demo Vendor
node scripts/seed-products.js   # Seeds 24 catalog products across verticals
cd ..
```

### Step 4: Launch Development Servers
```bash
# Terminal 1: Backend API (runs on http://localhost:5002)
cd server
npm run dev

# Terminal 2: Frontend Client (runs on http://localhost:5173)
npm run dev
```

### Demo Login Credentials
| Portal | URL | Email | Password | Role |
|---|---|---|---|---|
| **Super Admin** | `http://localhost:5173/#/admin` | `admin@shopindia.in` | `Admin@1234` | Super Admin |
| **Vendor Portal** | `http://localhost:5173/#/vendor` | `vendor@demo.in` | `Vendor@1234` | Approved Vendor |
| **Customer Store** | `http://localhost:5173/#/` | *(Self register or login)* | *(User set)* | Customer |

---

## 12. Immediate Next Steps for the Incoming Developer

1. **Fix Git Tracking of SSH Key:** Untrack `ec2-key.pem` and verify `.gitignore`.
2. **Mount Missing Vendor Routes:** Add `technicians.js` and `service-jobs.js` to `server/index.js`.
3. **Payment Gateway Integration:** The order checkout flow currently simulates payments. Complete the real webhook integration with **Razorpay** or **Cashfree** using the existing `PaymentMethod` and `Transaction` models.
4. **Delivery Rider App Integration:** The schema and admin panel for riders (`RiderProfile`, `Delivery`) are established; integrate the rider location updates and push notifications.
5. **Code Splitting (Vite Build):** Use dynamic `React.lazy()` / `import()` for `AdminPortal` and `VendorPortal` to reduce the main bundle size from 939 kB.

---
*Report compiled automatically for engineering handover. For additional product specs, refer to `docs/PRD.md` and `AWS_Migration_PRD_Addendum.md`.*
