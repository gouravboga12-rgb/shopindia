# ShopIndia — Multi-Panel Operations & Dispatch Architecture
## Project Changelog, Architectural Summary & Next-Steps Resume Guide

**File Location:** `PROJECT_CHANGELOG_AND_RESUME_GUIDE.md`  
**Date of Record:** October 22, 2026 (Updated: 01:05 AM IST)  
**Status:** All Web Modules Completed, Fully Built & Deployed to Git & AWS EC2 (0 TypeScript Errors, Production Bundle Verified)

---

## 1. Executive Summary

This document provides a comprehensive, centralized record of the multi-panel dispatch, logistics, and service marketplace architecture built across **ShopIndia**:

1. **Rider & Delivery Partner Portal (`/rider` & `/rider-login`):**
   - Mobile-first responsive web portal featuring real-time radar polling, Web Audio alert chime, 30-second radial countdown order acceptance, atomic concurrency locking (`ALREADY_ASSIGNED` guard), 4-stage turn-by-turn workflow (store pickup checklist ➔ navigation ➔ 4-digit customer OTP completion), instant wallet crediting, and a 10–100 km operational radius slider.
   - **GPS Reverse Geocoding with Clean UI:** Auto-detects Road, Colony/Village, Mandal, District/City, State, Pincode, and Country without exposing raw third-party brand labels or API tokens in the client.
   - **Partner Fleet Specialization & Multi-Select Skills:** Partners choose between `delivery` (Quick Commerce), `service` (Doorstep Service Professional), or `both` (All-Rounder). Technicians can select **any combination or all 13 services** from the website catalog (Electrician, Plumber, AC Repair, Cleaning, Appliance Care, Carpentry, Painting, Salon, Vehicle Care, Foam Wash, Roadside Towing, Battery, Tyres/Brakes).
   - **Independent OTP-Based Password Reset:** Self-contained 6-digit OTP verification via email with separate token handling.
   - **Automatic Account Role Upgrade:** Existing customer accounts registering as partners automatically upgrade to `rider` role and attach their `riderProfile` without data loss.

2. **Regional Admin Portal (`/regional-admin` & `/regional-admin/register`):**
   - Scoped territory command center for zone/hub managers with self-service registration (district/pincode selection), territory metrics (GMV, active deliveries, online fleet), local merchant oversight, one-click rider KYC verification, live radar map, and emergency order re-broadcasting.
   - **Independent Hub Password Reset:** OTP-based reset strictly enforcing `regional_admin` and `branch_manager` roles.
   - **Territory Fleet & Service Network Management:** Filter tabs (`All Partners`, `🚚 Delivery`, `🛠️ Service Pros`, `⚡ All-Rounder`, `⚠️ Pending KYC`), skill badge chips, and experience tags.

3. **Vendor Portal Multi-Channel Dispatch & Service Hiring (`/vendor`):**
   - Intelligent dispatch buttons:
     - `[ 🚀 Broadcast to Nearby Riders ]` for Quick-Commerce orders (10–30 min delivery).
     - `[ 📦 Ship via Shiprocket ]` for Traditional/Normal Delivery (multi-day courier).
   - **Service Professional Discovery:** Endpoint `GET /api/vendor/technicians/partners?skill=:skill` to discover verified platform service professionals for job assignment.

4. **Shiprocket 3PL Logistics Integration:**
   - Master platform credentials architecture with auto-registered vendor pickup locations. Generates AWB tracking numbers, printable shipping labels, and real-time courier tracking timelines without requiring individual vendor Shiprocket accounts.

5. **Super Admin Regional Governance (`/admin`):**
   - Management tab to review, approve, suspend, or reject regional administrator applications and assign operating branches.

> **Note on Platform Scope:** Everything has been developed entirely within the **Web Application** (`shopindia`). No native mobile apps have been modified.

---

## 2. Complete File Inventory

### A. Backend Files Created & Modified

| File Path | Type | Description |
|---|---|---|
| `server/prisma/schema.prisma` | Modified | Added `partnerType String @default("delivery")`, `skills String[] @default([])`, and `experienceYears Int? @default(1)` to `RiderProfile`. Includes all models: `User`, `RiderProfile`, `Delivery`, `ShiprocketShipment`, `RegionalAdminProfile`, `Technician`, `ServiceJob`, `Order`, `Vendor`. |
| `server/routes/rider/auth.js` | Modified | Independent OTP forgot/reset password endpoints; extracts and saves `partnerType`, `skills`, and `experienceYears`; auto-upgrades existing customer accounts to `rider` role. |
| `server/routes/rider/profile.js` | Modified | Live GPS updates, online status toggle, vehicle preferences, 10–100 km radius slider, and `PATCH /` updating `partnerType`, `skills`, `experienceYears`. |
| `server/routes/rider/orders.js` | Created | Radius broadcast queue feed, atomic concurrency claim lock, 4-stage turn-by-turn workflow, and 4-digit customer OTP completion with instant wallet payout credit. |
| `server/routes/rider/wallet.js` | Created | Wallet balance, payout history, and bank withdrawal requests. |
| `server/routes/regional-admin/auth.js` | Modified | Self-service registration for territory managers; independent OTP forgot/reset password endpoints. |
| `server/routes/regional-admin/operations.js` | Created | Regional dashboard KPIs, merchant latency monitoring, regional rider fleet KYC verification, live radar delivery map, emergency order re-broadcast. |
| `server/routes/vendor/technicians.js` | Modified | Added `GET /api/vendor/technicians/partners` to query verified service professionals by skill. |
| `server/routes/vendor/orders.js` | Modified | `POST /api/vendor/orders/:id/broadcast` to create `Delivery` records, generate 4-digit OTPs, and broadcast to active nearby riders. |
| `server/routes/tracking.js` | Created | Real-time order tracking (`GET /api/tracking/order/:orderId`) and backend reverse-geocode service (`GET /api/tracking/reverse-geocode`). |
| `server/lib/shiprocket.js` | Created | Master Shiprocket client with token caching, pickup registration, label generation, and AWB tracking. |
| `server/routes/shiprocket/shipments.js` | Created | Shipment generation, courier tracking, and webhook listener. |
| `server/routes/admin/regionalAdmins.js` | Created | Super Admin API to list, approve, suspend, or reject regional admin applications. |
| `server/index.js` | Modified | Centrally mounted all Rider, Regional Admin, Shiprocket, and Admin Regional routes. |

---

### B. Frontend Files Created & Modified

| File Path | Type | Description |
|---|---|---|
| `src/data/partnerSkills.ts` | **Created** | Shared catalog of 3 partner specialization types and 13 multi-select doorstep service skills with icons, descriptions, and category groupings (Home & Vehicle Care). |
| `src/rider/pages/RiderLogin.tsx` | Modified | Partner onboarding & login with partner specialization selector (Delivery / Service / Both), multi-select skill chips, experience selector, adaptive vehicle requirement, GPS location auto-detect, and "Forgot Password?" trigger modal. |
| `src/rider/pages/RiderProfile.tsx` | Modified | Vehicle info, KYC document badges, 10–100 km operational radius slider, and dedicated **"Partner Specialization & Service Skills"** card with live saving. |
| `src/rider/context/RiderContext.tsx` | Modified | Global rider state provider: dispatch chime, broadcast polling, atomic claims, active trip state, operational radius, and `updatePartnerProfile` handler. |
| `src/regional-admin/pages/RegionalRiders.tsx` | Modified | Fleet supervision with filter tabs (`All Partners`, `🚚 Delivery`, `🛠️ Service Pros`, `⚡ All-Rounder`, `⚠️ Pending KYC`), skill chips, experience badges, and one-click KYC approval. |
| `src/regional-admin/pages/RegionalAdminLogin.tsx` | Modified | Regional admin login with dedicated "Forgot Password?" link triggering the Hub Admin OTP reset modal. |
| `src/components/auth/ForgotPasswordModal.tsx` | Modified | Reusable OTP password reset modal supporting dynamic theming (`orange` for Rider, `indigo` for Regional Admin) and independent API endpoint routing. |
| `src/lib/mapbox.ts` | Modified | Mapbox & reverse-geocoding client utility connecting to backend reverse-geocode service with multi-provider fallback. Clean address parser for Road, Colony/Village, Mandal, District/City, State, Pincode. |
| `src/rider/RiderPortal.tsx` | Created | Dual responsive layout: mobile bottom bar + desktop hub sidebar. |
| `src/rider/components/RiderHeader.tsx` | Created | Sticky header with glowing Online/Offline switch, KYC badge, vehicle info, and wallet balance preview. |
| `src/rider/components/RiderBottomNav.tsx` | Created | Mobile-first bottom navigation bar with live status indicators. |
| `src/rider/components/RiderSidebar.tsx` | Created | Desktop hub navigation sidebar with quick stats and profile information. |
| `src/rider/components/IncomingRadarModal.tsx` | Created | 30-second radial countdown alert modal with audio chime, pickup/dropoff summary, guaranteed fee, and atomic acceptance. |
| `src/rider/components/SlideToConfirm.tsx` | Created | Ergonomic swipe-to-confirm thumb slider designed for delivery partner glove safety. |
| `src/rider/components/RiderMapRoute.tsx` | Created | Interactive routing visualizer with store/customer nodes, animated polyline, and Google Maps button. |
| `src/rider/pages/ActiveDeliveryView.tsx` | Created | 4-stage active trip execution: To Store ➔ Item Checklist ➔ In Transit ➔ 4-digit OTP Verification. |
| `src/rider/pages/RiderDashboard.tsx` | Created | Live radar pulse animation, shift metrics (wallet balance, completed trips, radius, rating), and standby mode. |
| `src/rider/pages/RiderOrders.tsx` | Created | Tabbed deliveries list showing in-progress trip and completed delivery history. |
| `src/rider/pages/RiderWallet.tsx` | Created | Available balance card, instant bank withdrawal form, and withdrawal logs. |
| `src/regional-admin/RegionalAdminPortal.tsx` | Created | Regional Admin shell with sidebar navigation and tab switching. |
| `src/regional-admin/RegionalAdminSidebar.tsx` | Created | Navigation sidebar for regional operations. |
| `src/regional-admin/pages/RegionalAdminRegister.tsx` | Created | Self-service onboarding application for territory managers (district & pincode assignment). |
| `src/regional-admin/pages/RegionalDashboard.tsx` | Created | Live territory pulse: active quick-commerce deliveries, online riders count, regional GMV, recent deliveries. |
| `src/regional-admin/pages/RegionalVendors.tsx` | Created | Local merchant oversight, pending dispatch queues, and store manager phone call shortcuts. |
| `src/regional-admin/pages/RegionalLiveMap.tsx` | Created | Real-time map canvas of active pick-and-drop trips, online riders, emergency order re-broadcast. |
| `src/admin/pages/RegionalAdminsPage.tsx` | Created | Super Admin panel to review regional manager applications (Approve / Suspend / Reject). |
| `src/vendor/pages/VendorOrders.tsx` | Modified | Integrated `[ 🚀 Broadcast to Nearby Riders ]` (Quick-Commerce) and `[ 📦 Ship via Shiprocket ]` (Normal Delivery with AWB display). |

---

## 3. Web URL Routes & User Access

| Route | Target Audience | Primary Function |
|---|---|---|
| `/` | Customers | Public Storefront (Desktop / Mobile web view) |
| `/rider` | Delivery & Service Partners | Radar standby, active bookings, wallet earnings, radius & skills settings |
| `/rider-login` | Delivery & Service Partners | Sign in, register (choose Delivery / Service / Both + Skills), OTP reset |
| `/regional-admin` | Regional Zone Managers | Territory dashboard, merchant oversight, rider verification, live radar, OTP reset |
| `/regional-admin/register` | Regional Applicants | Submit territory application (District, State, Pincodes) |
| `/vendor` | Merchants | Store catalog, order packing, rider broadcast, Shiprocket shipping, technician hiring |
| `/admin` | Super Admin | Platform governance, Regional Admin approvals, platform-wide riders |

---

## 4. Backend REST API Endpoints Reference

### A. Rider & Service Partner APIs (`/api/rider/*`)
- `POST /api/rider/auth/register` — Register partner with role (`delivery`, `service`, `both`), multi-select skills, vehicle info, KYC, and service radius.
- `POST /api/rider/auth/login` — Partner credential authentication & JWT token issuance.
- `POST /api/rider/auth/forgot-password` — Generate & email 6-digit OTP for partner password reset (15-min expiry).
- `POST /api/rider/auth/reset-password` — Validate OTP and update partner password.
- `GET /api/rider/profile` — Fetch authenticated partner profile, specialization, skills, and KYC verification status.
- `PATCH /api/rider/profile` — Update specialization (`partnerType`), `skills`, `experienceYears`, vehicle, address, and radius (10–100 km).
- `PATCH /api/rider/profile/status` — Toggle Online/Offline and update GPS coordinates.
- `GET /api/rider/orders/broadcast-feed` — Fetch unclaimed orders within rider's radius.
- `POST /api/rider/orders/:id/accept` — **Atomic Claim:** Locks order to rider or returns `ALREADY_ASSIGNED`.
- `GET /api/rider/orders/active-job` — Fetch ongoing active delivery trip details.
- `PATCH /api/rider/orders/:id/stage` — Advance stage (`arrived_pickup` ➔ `picked_up` ➔ `arrived_customer`).
- `POST /api/rider/orders/:id/complete` — Validate 4-digit customer OTP, mark delivered, and credit fee to rider's wallet.
- `GET /api/rider/orders/history` — Completed deliveries list with earnings breakdown.
- `GET /api/rider/wallet` — Balance inquiry and payout logs.
- `POST /api/rider/wallet/payout-request` — Request bank withdrawal (Account Number & IFSC).

### B. Regional Admin APIs (`/api/regional-admin/*`)
- `POST /api/regional-admin/auth/register` — Self-service application for territory management.
- `POST /api/regional-admin/auth/login` — Regional manager login (checks `status === 'approved'`).
- `POST /api/regional-admin/auth/forgot-password` — Generate & email 6-digit OTP for regional admin password reset.
- `POST /api/regional-admin/auth/reset-password` — Validate OTP and update regional admin password.
- `GET /api/regional-admin/dashboard` — Scoped metrics: active deliveries, online fleet, regional GMV.
- `GET /api/regional-admin/vendors` — Local vendors list and unfulfilled order counts.
- `GET /api/regional-admin/riders` — Regional fleet supervision with partner types and skill tags.
- `PATCH /api/regional-admin/riders/:id/verify` — Approve or reject rider KYC.
- `GET /api/regional-admin/deliveries/live` — Real-time map feed of active deliveries and online riders.
- `POST /api/regional-admin/deliveries/:id/reassign` — Emergency re-broadcasting of delayed orders.

### C. Vendor Dispatch & Service Partner APIs
- `GET /api/vendor/technicians/partners?skill=:skill` — Query verified service professionals filterable by skill.
- `POST /api/vendor/orders/:id/broadcast` — Initiates Quick-Commerce broadcast to nearby riders with 4-digit OTP.
- `POST /api/shiprocket/create-shipment` — Books shipment via Shiprocket, generates AWB, and creates printable shipping label.
- `GET /api/shiprocket/track/:awb` — Courier tracking timeline.
- `POST /api/shiprocket/webhook` — Receives courier status updates.

### D. Reverse Geocoding & Tracking APIs
- `GET /api/tracking/reverse-geocode?lat=:lat&lng=:lng` — Reverse-geocodes GPS coordinates into clean Road, Colony/Village, Mandal, District/City, State, Pincode.
- `GET /api/tracking/order/:orderId` — Real-time live tracking feed for customers.

---

## 5. Catalog of Doorstep Service Skills & Specializations

Defined in `src/data/partnerSkills.ts`:

### A. Specialization Roles:
1. `delivery` — 🚚 **Delivery Partner** (Quick Commerce Grocery & Hyperlocal Orders)
2. `service` — 🛠️ **Service Professional** (Doorstep Repairs & Maintenance)
3. `both` — ⚡ **All-Rounder Partner** (Both Quick Deliveries & Doorstep Services)

### B. Multi-Select Services (13 Total — Any Combination Allowed):

#### Home & Appliance Services:
1. `electrician` — ⚡ Electrician & Home Wiring
2. `plumbing` — 🔧 Plumber & Sanitary Care
3. `ac_service` — ❄️ AC Repair & Servicing
4. `cleaning` — ✨ Deep House Cleaning & Pest Control
5. `appliance_repair` — 🧺 Appliance Maintenance & Repair (Fridge, Washing Machine, RO, Microwave)
6. `carpentry` — 🪚 Carpentry & Furniture Assembly
7. `painting` — 🎨 Painting & Waterproofing
8. `salon_grooming` — ✂️ Salon & Grooming at Home

#### Vehicle Care & Roadside Assistance:
9. `vehicle_care` — 🛵 Doorstep Vehicle Periodic Service (Car/Bike)
10. `vehicle_wash` — 🚗 Doorstep Foam Wash & Detailing
11. `vehicle_breakdown` — 🚨 Emergency Roadside Towing (24x7)
12. `vehicle_battery` — 🔋 Battery Jumpstart & Replacement
13. `vehicle_tyres` — 🛞 Brakes, Tyres & Wheel Balancing

---

## 6. How to Run & Resume the Project in the Morning

### Step 1: Start the Backend Server (Local Development)
In terminal inside `shopindia/server`:
```powershell
cd "d:\Company Projects\SHOP INDIA\shopindia\server"
node index.js
```
*(Server listens on `http://localhost:5001` and connects to PostgreSQL).*

### Step 2: Start the Frontend Vite Dev Server
In a second terminal inside `shopindia`:
```powershell
cd "d:\Company Projects\SHOP INDIA\shopindia"
npm run dev
```
*(Application opens on `http://localhost:5173`).*

---

### Step 3: Verified Test Accounts & Credentials

| Role | Email | Password | Details |
|---|---|---|---|
| **Partner (All-Rounder)** | `bogagourav10@gmail.com` | `Password123!` | Vehicle: `AP29L0679`, Role: `both`, Skills: `electrician`, `ac_service`, `cleaning`, `plumbing`, Radius: `80 km` |
| **Regional Hub Admin** | `admin.hyderabad@shopindia.com` | `Password123!` | Assigned Territory: Hyderabad / Medchal / Rangareddy |
| **Merchant / Vendor** | `vendor@shopindia.com` | `Password123!` | Multi-channel dispatch & technician hiring |

---

### Step 4: AWS EC2 Cloud Infrastructure & Deployment

- **EC2 Instance IP:** `18.61.145.65`
- **SSH Key Location:** `D:\Company Projects\SHOP INDIA\shopindia\ec2-key.pem`
- **Connect via SSH:**
  ```powershell
  ssh -i "D:\Company Projects\SHOP INDIA\shopindia\ec2-key.pem" ubuntu@18.61.145.65
  ```
- **PM2 Process:** `shopindia-api` running on port `5001`
  ```bash
  pm2 status
  pm2 logs shopindia-api --lines 50
  pm2 restart all
  ```
- **Live APIs:**
  - `http://18.61.145.65/api/health`
  - `https://api.codetechawsurl1.shop/api/health`
- **Live Production Frontend:**
  - `https://shopindia-three.vercel.app`

---

## 7. Next Steps & Morning Agenda

When you resume in the morning, here are the ready next steps:
1. **Doorstep Service Booking Dispatch Flow:**
   - When a customer books a doorstep service (e.g. AC Repair or Electrician) via `/services`, the order automatically broadcasts to service professionals with matching skills within their service radius.
2. **Technician Job Scheduling & Calendar:**
   - In `/rider` (for service partners), display a **"Booked Service Jobs"** tab showing time slots, customer address, and service notes.
3. **Vendor Direct Assignment:**
   - In `/vendor`, add a UI dropdown/modal allowing vendors to directly assign incoming doorstep service jobs to verified platform partners queried via `GET /api/vendor/technicians/partners`.
4. **Partner Document Upload:**
   - Direct S3 upload for Driving License, Aadhaar, and PAN image proofs.

---

*Document updated and saved to `shopindia/PROJECT_CHANGELOG_AND_RESUME_GUIDE.md`.*
