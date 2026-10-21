# ShopIndia — Multi-Panel Operations & Dispatch Architecture
## Project Changelog, Architectural Summary & Next-Steps Resume Guide

**File Location:** `PROJECT_CHANGELOG_AND_RESUME_GUIDE.md`  
**Date of Record:** October 21, 2026  
**Status:** All Web Modules Completed, Fully Built & Verified (0 TypeScript Errors, Production Bundle Verified)

---

## 1. Executive Summary

This document records all changes made across the **ShopIndia** codebase covering:
1. **Rider & Delivery Partner Portal (`/rider` & `/rider-login`):** Mobile-first responsive web portal featuring real-time radar polling, Web Audio alert chime, 30-second radial countdown order acceptance, atomic concurrency locking, a 4-stage turn-by-turn workflow (store pickup checklist ➔ navigation ➔ 4-digit customer OTP completion), instant wallet crediting, and a 10–100 km operational radius slider.
2. **Regional Admin Portal (`/regional-admin` & `/regional-admin/register`):** Scoped territory command center for zone/hub managers with self-service registration (district/pincode selection), territory metrics (GMV, active deliveries, online fleet), local merchant oversight, one-click rider KYC verification, live radar map, and emergency order re-broadcasting.
3. **Shiprocket 3PL Logistics Integration:** Master platform credentials architecture with auto-registered vendor pickup locations. Generates AWB tracking numbers, printable shipping labels, and real-time courier tracking timelines without requiring individual vendor Shiprocket accounts.
4. **Vendor Portal Multi-Channel Dispatch (`/vendor`):** Intelligent action buttons:
   - `[ 🚀 Broadcast to Nearby Riders ]` for Quick-Commerce orders (10–30 min delivery).
   - `[ 📦 Ship via Shiprocket ]` for Traditional/Normal Delivery (multi-day courier).
5. **Super Admin Regional Governance (`/admin`):** Management tab to review, approve, suspend, or reject regional administrator applications and assign operating branches.

> **Note on Platform Scope:** Everything has been developed entirely within the **Web Application** (`shopindia`). No native mobile apps have been modified yet.

---

## 2. Complete File Inventory

### A. Backend Files Created & Modified

| File Path | Type | Description |
|---|---|---|
| `server/prisma/schema.prisma` | Modified | Added `DeliveryStatus`, `RegionalAdminStatus`, `RegionalAdminProfile`, `RiderProfile`, `Delivery`, `ShiprocketShipment`, and `RiderPayout` models. Added `regional_admin` to `UserRole`. |
| `server/lib/shiprocket.js` | **Created** | Master Shiprocket client with token caching, vendor pickup location registration, ad-hoc shipment creation, label generation, and AWB tracking. |
| `server/routes/rider/auth.js` | **Created** | Rider registration with vehicle and KYC details (DL, RC, Aadhaar, PAN), JWT authentication, and SMTP verification. |
| `server/routes/rider/profile.js` | **Created** | Live GPS location updates, online/offline status toggle, vehicle preferences, and 10–100 km service radius preference. |
| `server/routes/rider/orders.js` | **Created** | Broadcast queue feed within rider radius, atomic concurrency claim lock (`ALREADY_ASSIGNED` check), 4-stage turn-by-turn workflow updates, and 4-digit customer OTP validation with instant wallet payout credit. |
| `server/routes/rider/wallet.js` | **Created** | Wallet balance check, payout transaction history, and bank account withdrawal requests. |
| `server/routes/regional-admin/auth.js` | **Created** | Self-service registration for territory managers (sets `pending_approval`) and login with status checks. |
| `server/routes/regional-admin/operations.js` | **Created** | Regional dashboard KPIs, local vendor latency monitoring, regional rider fleet KYC verification, live radar delivery map, and emergency order re-broadcast. |
| `server/routes/shiprocket/shipments.js` | **Created** | Vendor/Admin shipment generation (`/create-shipment`), live courier tracking (`/track/:awb`), and webhook listener (`/webhook`). |
| `server/routes/admin/regionalAdmins.js` | **Created** | Super Admin API to list, approve, suspend, or reject regional admin applications and assign branch territories. |
| `server/routes/vendor/orders.js` | Modified | Added `POST /api/vendor/orders/:id/broadcast` to create `Delivery` records, generate 4-digit OTPs, and broadcast to active nearby riders. |
| `server/index.js` | Modified | Centrally mounted all Rider, Regional Admin, Shiprocket, and Admin Regional routes. |

---

### B. Frontend Files Created & Modified

| File Path | Type | Description |
|---|---|---|
| `src/context/AuthContext.tsx` | Modified | Added `'regional_admin'` to `UserRole`. Added support for `rider` and `regional_admin` local storage token prefixes. |
| `src/App.tsx` | Modified | Configured clean URL routing for `/rider`, `/rider-login`, and `/regional-admin`. |
| `src/rider/RiderPortal.tsx` | **Created** | Main shell with dual responsive layouts: mobile bottom bar navigation + desktop hub sidebar. |
| `src/rider/context/RiderContext.tsx` | **Created** | Global rider state provider: Web Audio API dispatch chime, 6-second broadcast polling, atomic claims, active trip state, and radius settings. |
| `src/rider/components/RiderHeader.tsx` | **Created** | Sticky header with glowing Online/Offline switch, KYC badge, vehicle info, and live wallet balance preview. |
| `src/rider/components/RiderBottomNav.tsx` | **Created** | Mobile-first bottom navigation bar with live status indicators. |
| `src/rider/components/RiderSidebar.tsx` | **Created** | Desktop hub navigation sidebar with quick stats and profile information. |
| `src/rider/components/IncomingRadarModal.tsx` | **Created** | 30-second radial countdown alert modal with audio chime, pickup/dropoff summary, guaranteed fee, and atomic acceptance button. |
| `src/rider/components/SlideToConfirm.tsx` | **Created** | Ergonomic swipe-to-confirm thumb slider designed for delivery partner glove safety. |
| `src/rider/components/RiderMapRoute.tsx` | **Created** | Interactive routing visualizer with store/customer nodes, animated polyline, and direct Google Maps navigation button. |
| `src/rider/pages/RiderLogin.tsx` | **Created** | Login and onboarding registration with GPS location auto-detect, vehicle selection, and KYC input fields. |
| `src/rider/pages/ActiveDeliveryView.tsx` | **Created** | 4-stage active trip execution: Stage 1 (To Store) ➔ Stage 2 (Store Item Verification Checklist) ➔ Stage 3 (In Transit to Customer) ➔ Stage 4 (4-digit Customer OTP Verification & Instant Wallet Credit). |
| `src/rider/pages/RiderDashboard.tsx` | **Created** | Live radar pulse animation, shift metrics (wallet balance, completed trips, radius, rating), and standby mode. |
| `src/rider/pages/RiderOrders.tsx` | **Created** | Tabbed deliveries list showing in-progress trip and completed delivery history. |
| `src/rider/pages/RiderWallet.tsx` | **Created** | Available balance card, instant bank withdrawal form (Account No, IFSC, Amount), and withdrawal logs. |
| `src/rider/pages/RiderProfile.tsx` | **Created** | Vehicle info, KYC document badges, and interactive 10–100 km operational radius slider. |
| `src/regional-admin/RegionalAdminPortal.tsx` | **Created** | Regional Admin shell with sidebar navigation and tab switching. |
| `src/regional-admin/RegionalAdminSidebar.tsx` | **Created** | Navigation sidebar for regional operations. |
| `src/regional-admin/pages/RegionalAdminLogin.tsx` | **Created** | Authentication for approved regional administrators. |
| `src/regional-admin/pages/RegionalAdminRegister.tsx` | **Created** | Self-service onboarding application for territory managers (district & pincode assignment). |
| `src/regional-admin/pages/RegionalDashboard.tsx` | **Created** | Live territory pulse: active quick-commerce deliveries, online riders count, regional GMV, and recent deliveries table. |
| `src/regional-admin/pages/RegionalVendors.tsx` | **Created** | Local merchant oversight, pending dispatch queues, and store manager phone call shortcuts. |
| `src/regional-admin/pages/RegionalRiders.tsx` | **Created** | Fleet supervision and pending KYC queue with one-click Approve / Reject buttons. |
| `src/regional-admin/pages/RegionalLiveMap.tsx` | **Created** | Real-time map canvas of active pick-and-drop trips, online riders, and emergency order re-broadcast. |
| `src/admin/pages/RegionalAdminsPage.tsx` | **Created** | Super Admin panel to review regional manager applications (Approve / Suspend / Reject). |
| `src/admin/AdminSidebar.tsx` | Modified | Added `Regional Admins` navigation link with globe icon. |
| `src/admin/AdminPortal.tsx` | Modified | Wired `regional-admins` tab to render `RegionalAdminsPage`. |
| `src/vendor/pages/VendorOrders.tsx` | Modified | Integrated `[ 🚀 Broadcast to Nearby Riders ]` (Quick-Commerce) and `[ 📦 Ship via Shiprocket ]` (Normal Delivery with AWB display). |

---

## 3. Web URL Routes & User Access

| Route | Target Audience | Primary Function |
|---|---|---|
| `/` | Customers | Public Storefront (Desktop / Mobile web view) |
| `/rider` | Delivery Partners | Radar standby, active deliveries, wallet earnings, radius settings |
| `/rider-login` | Delivery Partners | Sign in or register with vehicle info and KYC documents |
| `/regional-admin` | Regional Zone Managers | Territory dashboard, merchant oversight, rider verification, live radar |
| `/regional-admin/register` | Regional Applicants | Submit territory application (District, State, Pincodes) |
| `/vendor` | Merchants | Store catalog, order packing, rider broadcast, Shiprocket shipping |
| `/admin` | Super Admin | Platform governance, Regional Admin approvals, platform-wide riders |

---

## 4. Backend REST API Endpoints Reference

### Rider APIs (`/api/rider/*`)
- `POST /api/rider/auth/register` — Register rider, vehicle, KYC docs, and service radius.
- `POST /api/rider/auth/login` — Partner credential authentication & JWT token issuance.
- `GET /api/rider/profile` — Fetch authenticated rider profile & KYC verification status.
- `PATCH /api/rider/profile` — Update vehicle, address, and radius slider (10–100 km).
- `PATCH /api/rider/profile/status` — Toggle Online/Offline and update GPS coordinates.
- `GET /api/rider/orders/broadcast-feed` — Fetch unclaimed orders within rider's radius.
- `POST /api/rider/orders/:id/accept` — **Atomic Claim:** Locks order to rider or returns `ALREADY_ASSIGNED`.
- `GET /api/rider/orders/active-job` — Fetch ongoing active delivery trip details.
- `PATCH /api/rider/orders/:id/stage` — Advance stage (`arrived_pickup` ➔ `picked_up` ➔ `arrived_customer`).
- `POST /api/rider/orders/:id/complete` — Validate 4-digit customer OTP, mark delivered, and credit fee to rider's wallet.
- `GET /api/rider/orders/history` — Completed deliveries list with earnings breakdown.
- `GET /api/rider/wallet` — Balance inquiry and payout logs.
- `POST /api/rider/wallet/payout-request` — Request bank withdrawal (Account Number & IFSC).

### Regional Admin APIs (`/api/regional-admin/*`)
- `POST /api/regional-admin/auth/register` — Self-service application for territory management.
- `POST /api/regional-admin/auth/login` — Regional manager login (checks `status === 'approved'`).
- `GET /api/regional-admin/dashboard` — Scoped metrics: active deliveries, online fleet, regional GMV.
- `GET /api/regional-admin/vendors` — Local vendors list and unfulfilled order counts.
- `GET /api/regional-admin/riders` — Regional rider fleet and pending KYC queue.
- `PATCH /api/regional-admin/riders/:id/verify` — Approve or reject rider KYC.
- `GET /api/regional-admin/deliveries/live` — Real-time map feed of active deliveries and online riders.
- `POST /api/regional-admin/deliveries/:id/reassign` — Emergency re-broadcasting of delayed orders.

### Shiprocket & Dispatch APIs
- `POST /api/shiprocket/create-shipment` — Books shipment via Shiprocket, generates AWB, and creates printable shipping label.
- `GET /api/shiprocket/track/:awb` — Courier tracking timeline.
- `POST /api/shiprocket/webhook` — Receives courier status updates (In Transit, Out for Delivery, Delivered).
- `POST /api/vendor/orders/:id/broadcast` — Initiates Quick-Commerce broadcast to nearby riders with 4-digit OTP.

### Super Admin Regional Management
- `GET /api/admin/regional-admins` — List all regional administrators and territory applications.
- `PATCH /api/admin/regional-admins/:id/status` — Approve, suspend, or reject regional admin.

---

## 5. Verification & Build Health

1. **TypeScript Check:**  
   Ran `npx tsc --noEmit` across the entire project. **0 errors found.**
2. **Vite Production Bundle:**  
   Ran `npx vite build`. **2,284 modules compiled and transformed successfully into `/dist`.**
3. **Database Schema:**  
   Prisma client generated with all 7 new operational models.

---

## 6. How to Run & Resume the Project Tomorrow

### Step 1: Start the Backend Server
In a terminal inside `shopindia/server`:
```powershell
cd "d:\Company Projects\SHOP INDIA\shopindia\server"
node index.js
```
*(The server listens on `http://localhost:5001` and connects to PostgreSQL/RDS via Prisma).*

### Step 2: Start the Frontend Vite Dev Server
In a second terminal inside `shopindia`:
```powershell
cd "d:\Company Projects\SHOP INDIA\shopindia"
npm run dev
```
*(Opens the application on `http://localhost:5173`).*

### Step 3: Test the Workflows
1. **Rider Workflow:**
   - Navigate to `http://localhost:5173/rider-login`.
   - Register a new delivery partner (enter vehicle and KYC info).
   - Once logged in, tap **"GO ONLINE"** to enter standby radar mode.
   - Adjust operational radius via the 10–100 km slider in Profile.
2. **Vendor Dispatch:**
   - Log in at `http://localhost:5173/vendor`.
   - On an order in Orders, click **`[ 🚀 Broadcast to Riders ]`** (for Quick Commerce) or **`[ 📦 Ship via Shiprocket ]`** (for Normal Delivery).
   - The online rider hears the audio chime and receives the 30s countdown card.
   - Rider accepts ➔ executes the 4-stage delivery ➔ enters 4-digit OTP ➔ wallet is credited!
3. **Regional Admin Hub:**
   - Navigate to `http://localhost:5173/regional-admin/register` to submit a territory manager application.
   - In `http://localhost:5173/admin` (Super Admin), go to **Regional Admins** tab and click **Approve**.
   - Log in at `http://localhost:5173/regional-admin` to access the live radar map, merchant monitoring, and fleet KYC approvals.

---

*Document generated and saved to `shopindia/PROJECT_CHANGELOG_AND_RESUME_GUIDE.md`.*
