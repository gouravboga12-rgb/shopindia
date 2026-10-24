# ShopIndia — Multi-Panel Operations & Dispatch Architecture
## Project Changelog, Architectural Summary & Next-Steps Resume Guide

**File Location:** `PROJECT_CHANGELOG_AND_RESUME_GUIDE.md`  
**Date of Record:** October 25, 2026 (Updated: 01:15 AM IST)  
**Status:** Full Multi-Channel Dispatch, Rapido 2-Leg Route Breakdown, Services & Repairs Catalog with Doorstep Visit Charge & Technician Guaranteed Pay, Vendor Rider Contact Cards, and Rider COD Remittance Deployed. Pushed to `main` (Commits: `0fb24c7`, `4d16b54`). Live on AWS EC2 (`pm2 status online`) & Vercel. 0 TypeScript Errors.

---

## 1. Executive Summary

This document provides a comprehensive, centralized record of the multi-panel dispatch, logistics, customer tracking, and service marketplace architecture built across **ShopIndia**:

1. **Customer Live Tracking Activation & Direct Doorstep Route:**
   - **Post-Pickup Activation:** Live street GPS radar on the customer order tracking screen (`/orders`) remains hidden during the preparatory stages (`placed`, `confirmed`, `packing`, `broadcasted`, `assigned`, `arrived_pickup`).
   - **Standby Preparation Card:** Prior to store pickup, customers are shown a clean, dedicated "Awaiting Store Handover / Order in Preparation" card with assigned partner details, vehicle number, and current standby status.
   - **Direct Rider-to-Doorstep Routing:** Once the partner collects the order (`picked_up`, `on_the_way`, `in_transit`, `arrived_customer`), the street map mounts. For customer privacy and clarity, the store pin is hidden, and the OSRM real-world polyline connects directly from the **Rider's live GPS coordinates ➔ Customer Doorstep**.

2. **GST Math & Transparent Fee Itemization Invoices:**
   - **Root Cause Fixed:** Addressed a critical calculation bug where fees were deducted from the grand total and erroneously dumped into SGST, producing unequal taxes (e.g. SGST ₹51.04 vs CGST ₹5.03).
   - **Strict GST Equality:** For intra-state supply, CGST (9.0%) and SGST (9.0%) are now strictly equal and calculated directly from the item taxable amount.
   - **Full Fee Itemization:** Explicitly breaks down **Platform Convenience Fee** and **Delivery / Shipping Fee** in the summary table so the math matches the grand total to the exact paisa.
   - **Vertical-Specific Customization:** Automatically adapts branding, invoice badges, and terms across:
     - ⚡ **10-Min Fast Delivery Tax Invoice** (Quick Commerce)
     - 🛠️ **Glacons Service & Maintenance Tax Invoice** (Doorstep Services)
     - 📦 **E-Commerce Retail Tax Invoice** (Traditional Delivery)

3. **Rider & Delivery Partner Portal (`/rider` & `/rider-login`):**
   - **Mobile-First Responsive Theme:** Clean White & Orange ergonomic layout with sticky header, glowing Online/Offline switch, wallet preview, and mobile bottom navigation bar (`RiderBottomNav.tsx`).
   - **Radar Broadcast & Atomic Acceptance:** Real-time polling, Web Audio alert chime, 30-second radial countdown order acceptance, and atomic concurrency locking (`ALREADY_ASSIGNED` guard).
   - **4-Stage Execution:** Store pickup checklist ➔ navigation ➔ 4-digit customer OTP completion with instant wallet credit.
   - **Partner Specialization & 13 Multi-Select Skills:** Partners choose between `delivery` (Quick Commerce), `service` (Doorstep Professional), or `both` (All-Rounder). Technicians can select any combination of the 13 platform services (Electrician, Plumber, AC Repair, Cleaning, Appliance Care, Carpentry, Painting, Salon, Vehicle Care, Foam Wash, Roadside Towing, Battery, Tyres/Brakes).
   - **Dynamic Radius Slider:** Partner operational radius adjustable from 10 km to 100 km.
   - **GPS Reverse Geocoding:** Auto-detects Road, Colony/Village, Mandal, District/City, State, Pincode without exposing raw API keys or vendor tags.
   - **Independent OTP Password Reset:** 6-digit OTP verification via email with dedicated rider role isolation.
   - **Automatic Role Upgrade:** Customer accounts registering as partners automatically upgrade to `rider` role and attach their `riderProfile` without data loss.

4. **Regional Admin Portal (`/regional-admin` & `/regional-admin/register`):**
   - **Mobile-First Responsive Theme:** Clean White & Blue theme, sticky top header (`RegionalAdminHeader.tsx`), bottom navigation bar (`RegionalAdminBottomNav.tsx`), and slide-over account drawer.
   - **Territory Operations:** Scoped district/pincode supervision, live radar map of active deliveries, merchant oversight, one-click partner KYC verification, and emergency order re-broadcasting.
   - **Partner Fleet Filters:** Filter by `All Partners`, `🚚 Delivery`, `🛠️ Service Pros`, `⚡ All-Rounder`, and `⚠️ Pending KYC`.
   - **Independent Hub Password Reset:** OTP-based reset enforcing regional manager permissions.

5. **Vendor Portal Multi-Channel Dispatch (`/vendor`):**
   - `[ 🚀 Broadcast to Nearby Riders ]` for Quick-Commerce orders (10–30 min delivery).
   - `[ 📦 Ship via Shiprocket ]` for Traditional/Normal Delivery (multi-day courier).
   - `GET /api/vendor/technicians/partners?skill=:skill` to discover verified platform service professionals for job assignment.

6. **Shiprocket 3PL Logistics Integration:**
   - Master platform credentials architecture with auto-registered vendor pickup locations, AWB generation, printable labels, and tracking timelines.

7. **Super Admin Governance (`/admin`):**
   - Approval, suspension, and territory assignment for regional administrators.

> **Note on Platform Scope:** All features have been developed entirely within the **Web Application** (`shopindia`). No native mobile apps have been modified.

---

## 2. Complete File Inventory

### A. Backend Files Created & Modified

| File Path | Type | Description |
|---|---|---|
| `server/routes/orders.js` | **Modified** | Enriched `GET /api/orders` to extract and return `subtotal`, `discount`, `deliveryFee`, and `platformFee` from AWS RDS PostgreSQL. |
| `server/prisma/schema.prisma` | Modified | Added `partnerType String @default("delivery")`, `skills String[] @default([])`, and `experienceYears Int? @default(1)` to `RiderProfile`. |
| `server/routes/rider/auth.js` | Modified | Independent OTP forgot/reset password; saves `partnerType`, `skills`, and `experienceYears`; auto-upgrades existing customer accounts to `rider` role. |
| `server/routes/rider/profile.js` | Modified | Live GPS updates, online status toggle, vehicle preferences, 10–100 km radius slider, and `PATCH /` updating specialization and skills. |
| `server/routes/rider/orders.js` | Created | Radius broadcast queue feed, atomic concurrency claim lock, 4-stage turn-by-turn workflow, and 4-digit customer OTP completion with instant wallet payout credit. |
| `server/routes/rider/wallet.js` | Created | Wallet balance, payout history, and bank withdrawal requests. |
| `server/routes/regional-admin/auth.js` | Modified | Self-service registration for territory managers; independent OTP forgot/reset password endpoints. |
| `server/routes/regional-admin/operations.js` | Created | Regional dashboard KPIs, merchant latency monitoring, regional rider fleet KYC verification, live radar delivery map, emergency order re-broadcast. |
| `server/routes/vendor/technicians.js` | Modified | Added `GET /api/vendor/technicians/partners` to query verified service professionals by skill. |
| `server/routes/vendor/orders.js` | Modified | `POST /api/vendor/orders/:id/broadcast` to create `Delivery` records, generate 4-digit OTPs, and broadcast to active nearby riders. |
| `server/routes/tracking.js` | Created | Real-time order tracking (`GET /api/tracking/order/:orderId`) and backend reverse-geocode service (`GET /api/tracking/reverse-geocode`). |
| `server/lib/shiprocket.js` | Created | Master Shiprocket client with token caching, pickup registration, label generation, and AWB tracking. |
| `server/routes/shiprocket/shipments.js` | Created | Shipment generation, courier tracking, and webhook listener. |
| `server/routes/payments.js` | **Modified** | Added `POST /api/payments/create-intent` for atomic pre-order payment intent creation without premature DB order booking. |
| `server/routes/orders.js` | **Modified** | Enforced COD restriction on `shop` vertical; atomically verified Razorpay HMAC SHA-256 signatures before creating paid orders; saved customer GPS coordinates; fixed `channel: 'IN_APP'`. |
| `server/routes/customer/addresses.js` | **Modified** | Added `latitude` and `longitude` coordinate fields to customer address CRUD operations. |
| `server/routes/vendor/orders.js` | **Modified** | Dispatches deliveries with exact customer GPS coordinates (`deliveryLat`/`deliveryLng`) instead of estimated offset. |
| `server/prisma/schema.prisma` | **Modified** | Added `latitude Float?` & `longitude Float?` to `Address`, and `deliveryLat Float?` & `deliveryLng Float?` to `Order`. |
| `server/index.js` | Modified | Centrally mounted all Rider, Regional Admin, Shiprocket, and Admin Regional routes. |

---

### B. Frontend Files Created & Modified

| File Path | Type | Description |
|---|---|---|
| `src/utils/invoiceGenerator.ts` | **Modified** | Complete GST math rewrite (CGST = SGST = 9.0%), Platform Fee & Delivery Fee itemization, and vertical-specific templates (Quick Commerce, Services, E-Commerce). |
| `src/components/common/InlineOrderTracking.tsx` | **Modified** | Standby preparation card prior to store pickup; mounts live map strictly once order status is `picked_up`, `on_the_way`, `in_transit`, or `arrived_customer`. |
| `src/components/common/RealWorldMap.tsx` | **Modified** | Hides vendor store pin in customer view (`viewerRole === 'customer'`); routes OSRM directly from Rider GPS ➔ Customer Doorstep with auto-fit bounds. |
| `src/pages/dashboard/Orders.tsx` | **Modified** | Passes order vertical attribute (`quick_commerce`, `services`, `ecommerce`) to invoice generator. |
| `src/data/partnerSkills.ts` | **Created** | Shared catalog of 3 partner specialization types and 13 multi-select doorstep service skills with icons, descriptions, and category groupings (Home & Vehicle Care). |
| `src/rider/pages/RiderLogin.tsx` | Modified | Partner onboarding & login with partner specialization selector (Delivery / Service / Both), multi-select skill chips, experience selector, adaptive vehicle requirement, GPS location auto-detect, and "Forgot Password?" trigger modal. |
| `src/rider/pages/RiderProfile.tsx` | Modified | Vehicle info, KYC document badges, 10–100 km operational radius slider, and dedicated **"Partner Specialization & Service Skills"** card with live saving. |
| `src/rider/context/RiderContext.tsx` | Modified | Global rider state provider: dispatch chime, broadcast polling, atomic claims, active trip state, operational radius, and `updatePartnerProfile` handler. |
| `src/regional-admin/pages/RegionalRiders.tsx` | Modified | Fleet supervision with filter tabs (`All Partners`, `🚚 Delivery`, `🛠️ Service Pros`, `⚡ All-Rounder`, `⚠️ Pending KYC`), skill chips, experience badges, and one-click KYC approval. |
| `src/regional-admin/pages/RegionalAdminLogin.tsx` | Modified | Regional admin login with dedicated "Forgot Password?" link triggering the Hub Admin OTP reset modal. |
| `src/components/auth/ForgotPasswordModal.tsx` | Modified | Reusable OTP password reset modal supporting dynamic theming (`orange` for Rider, `indigo` for Regional Admin) and independent API endpoint routing. |
| `src/lib/mapbox.ts` | Modified | Mapbox & reverse-geocoding client utility connecting to backend reverse-geocode service with multi-provider fallback. Clean address parser for Road, Colony/Village, Mandal, District/City, State, Pincode. |
| `src/rider/RiderPortal.tsx` | Created | Dual responsive layout: mobile bottom bar + desktop hub sidebar in White & Orange theme. |
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
| `src/regional-admin/components/RegionalAdminHeader.tsx` | **Created** | Sticky mobile/tablet top header with zone branding, manager name, live pulse sync, and account slide-over drawer. |
| `src/regional-admin/components/RegionalAdminBottomNav.tsx` | **Created** | Mobile ergonomic bottom navigation bar (Dashboard, Radar Map, Merchants, Fleet & KYC). |
| `src/regional-admin/RegionalAdminPortal.tsx` | Modified | Responsive shell with White & Blue theme, mobile header, desktop sidebar, and mobile bottom nav. |
| `src/regional-admin/RegionalAdminSidebar.tsx` | Modified | White & Blue theme, hidden on mobile screens (`hidden lg:flex`). |
| `src/regional-admin/pages/RegionalAdminRegister.tsx` | Modified | White & Blue theme application form with GPS territory auto-detection. |
| `src/regional-admin/pages/RegionalDashboard.tsx` | Modified | White & Blue KPI cards, responsive grid (1-col mobile, 2-col tablet, 4-col desktop), and clean deliveries table. |
| `src/regional-admin/pages/RegionalVendors.tsx` | Modified | White & Blue territory merchant cards with one-tap store manager phone dialing. |
| `src/regional-admin/pages/RegionalLiveMap.tsx` | Modified | White & Blue live radar map canvas and emergency order re-broadcast queue. |
| `src/admin/pages/RegionalAdminsPage.tsx` | Created | Super Admin panel to review regional manager applications (Approve / Suspend / Reject). |
| `src/vendor/pages/VendorOrders.tsx` | Modified | Integrated `[ 🚀 Broadcast to Nearby Riders ]` (Quick-Commerce) and `[ 📦 Ship via Shiprocket ]` (Normal Delivery with AWB display). |

---

## 3. Web URL Routes & User Access

| Route | Target Audience | Primary Function |
|---|---|---|
| `/` | Customers | Public Storefront (Desktop / Mobile web view) |
| `/orders` | Customers | Order History, Status Timeline, Standby Preparation Card, Live Rider Tracking (Post-Pickup), and Multi-Vertical Tax Invoices |
| `/rider` | Delivery & Service Partners | Radar standby, active bookings, wallet earnings, radius & skills settings (White & Orange Theme) |
| `/rider-login` | Delivery & Service Partners | Sign in, register (choose Delivery / Service / Both + Skills), OTP reset |
| `/regional-admin` | Regional Zone Managers | Territory dashboard, merchant oversight, rider verification, live radar, OTP reset (White & Blue Theme) |
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

### C. Orders, Tracking & Reverse Geocoding APIs
- `GET /api/orders` — Enriched customer orders list including `subtotal`, `discount`, `deliveryFee`, and `platformFee`.
- `GET /api/tracking/order/:orderId` — Real-time live tracking feed for customers with current stage and telemetry.
- `GET /api/tracking/reverse-geocode?lat=:lat&lng=:lng` — Reverse-geocodes GPS coordinates into clean Road, Colony/Village, Mandal, District/City, State, Pincode.

### D. Vendor Dispatch & Service Partner APIs
- `GET /api/vendor/technicians/partners?skill=:skill` — Query verified service professionals filterable by skill.
- `POST /api/vendor/orders/:id/broadcast` — Initiates Quick-Commerce broadcast to nearby riders with 4-digit OTP.
- `POST /api/shiprocket/create-shipment` — Books shipment via Shiprocket, generates AWB, and creates printable shipping label.
- `GET /api/shiprocket/track/:awb` — Courier tracking timeline.
- `POST /api/shiprocket/webhook` — Receives courier status updates.

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
*(Server listens on `http://localhost:5001` and connects to AWS RDS PostgreSQL).*

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
| **Customer** | `customer@shopindia.com` | `Password123!` | Customer order tracking & invoice generation |

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
- **Latest Production Commit:** `fe566ca` (`feat(payments): integrate official Razorpay gateway keys across checkout, orders, and rider doorstep handover; remove dummy QR and mock payments`)

---

## 7. Next Steps & Tomorrow Morning Agenda

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

## 8. Support Center: Order Linking & In-App Alert Notifications (Recommendation 2)

### Summary of Enhancements:
1. **Order Linking Dropdown in Customer Support Form (`src/pages/dashboard/Support.tsx`):**
   - Direct integration with `orders` from `useApp()`.
   - Customers can link any recent order (`#OD-XXXXXX`) with one tap when raising a support ticket.
   - Automatically pre-fills the issue subject (e.g. `Issue with Order #OD-123456`) and sets category to `order_issue`.
   - Displays live order summary card with item names, status pill, and total amount.
   - Provides an inline "Clear Order" button if the customer prefers a general inquiry.
   - In ticket conversation and "My Tickets" list, displays clickable badges showing the linked order number and details.
2. **In-App Alert Notifications across All Platform Panels:**
   - **Ticket Creation:** Emits instant in-app alerts and writes to PostgreSQL `user_notifications` (`category: 'order'`, `channel: 'IN_APP'`) for the customer.
   - **Super Admin Reply (`/api/admin/support/tickets/:id/reply`):** Dispatches customer notification `Support Specialist Replied #TKT-XXXXXX 💬` with message preview.
   - **Regional Admin Reply (`/api/regional-admin/support/tickets/:id/reply`):** Dispatches customer notification `Regional Support Replied #TKT-XXXXXX 💬`.
   - **Vendor / Merchant Reply (`/api/vendor/support/tickets/:id/reply`):** Dispatches customer notification `Merchant Replied on #TKT-XXXXXX 💬`.
   - **Refund Approvals & Rejections:** Emits in-app alerts informing the customer of the refund status and at-fault ledger resolution.
   - **Real-Time Client Polling:** When viewing an active ticket, client polls every 3 seconds; newly received staff replies immediately trigger `addNotification` to badge the customer's header alert bell in real time.
3. **External Notifications:**
   - External SMS/WhatsApp notifications deferred to future app development as requested.

---

## 9. Location & Radius-Based Store Availability & Vendor Onboarding Architecture (Phases 1–5 Complete)

### Summary of Enhancements:
1. **Multi-Vertical Availability Rules:**
   - **ShopIndia (Traditional E-Commerce):** Pan-India fulfillment (nationwide via 3PL like Shiprocket/Delhivery). Exempt from local distance checks; all products universally visible nationwide.
   - **Quick Shopping (Hyperlocal Products):** Vendor-controlled delivery radius (from 5 km to 100 km). In registration and settings, vendors set their store address, auto-detect GPS coordinates, and set their radius slider. Catalog query computes Haversine distance against customer coordinates. Shows dynamic prepTime (`10-15 min`, `25-35 min`, `45-60 min`, `Same-Day Express`) or an out-of-service banner if no store serves that area with an instant button to switch to the Pan-India store.
   - **Glacons (Doorstep Services - Technicians/Mechanics):** Real-time service availability based on active, approved `RiderProfile` technicians with matching skills within their service radius of the customer's coordinates. If no technician is nearby, the service card displays *"Service Not Available in Your Locality Yet"* with a 1-tap **`[🔔 Notify Me When Available]`** demand-capture button.
2. **Customer Location Coordinates in State (`AppContext.tsx`, `LocationModal.tsx`, `useProducts.ts`):**
   - Coordinates (`lat`, `lng`, `city`, `pincode`) stored in `AppContext` state and persisted to `localStorage` (`shopindia_user_coords`).
   - `LocationModal.tsx` provides live GPS capture and pre-configured popular city coordinates.
   - `useProducts` hook dynamically appends user coordinates to `/api/products` query and re-fetches upon location change.
3. **Glacons Demand Lead Capture (`ServiceDemandLead`):**
   - Added `ServiceDemandLead` model in `schema.prisma`.
   - Endpoint `POST /api/products/demand-lead` captures customer requests for unserved localities.
   - Displays in-app confirmation alert and updates button to *"Notification Set ✓"*.
4. **Regional Admin & Super Admin Intelligence:**
   - **Regional Admin (`/regional-admin`):** Added `Unserved Service Demand Leads` table widget on `RegionalDashboard.tsx` scoped to assigned pincodes.
   - **Super Admin (`/admin/service-areas`):** Added tabs for *"Active Service Zones"* and *"Unserved Locality Demand Leads"* with customer contact, service requested, and timestamp.

---

## 10. Multi-Channel Dispatch, Services & Repairs Catalog, Dynamic Routing & COD Remittance Architecture (October 24–25, 2026 Session)

### 10.1 Overview of Implemented Systems

During this session, six major operational pillars were implemented, unified across all five panels (Customer, Vendor, Rider, Regional Admin, Super Admin), and deployed live to AWS EC2 & Vercel:

1. **Dedicated Services & Repairs Catalog (`ServicesManagementPage.tsx`):**
   - **Separation of Concerns:** Physical products and doorstep repair services were decoupled in the Super Admin panel.
   - **Doorstep Rate Architecture:**
     - **Standard Doorstep Visit Charge (₹)** (`basePrice`): Customer-facing fee billed at booking.
     - **Technician Guaranteed Pay (₹)** (`vendorPrice`): Guaranteed amount credited to the technician partner wallet upon customer 4-digit OTP completion.
     - **Platform Net Margin (₹ / %)**: Calculated in real-time as `Doorstep Visit Charge - Technician Guaranteed Pay`.
     - **MRP / Strike Price (₹)**: Reference crossed-out rate for customer discount optics.
     - **Live Economics Preview:** Interactive calculation card inside the Add/Edit modal alerting the administrator to negative margins before publishing.
   - **Time Slot & Duration Controls:** Configurable duration estimates (e.g., `45 mins`, `60 mins`, `2 hours`) and interactive multi-select appointment time slots (`08:00 - 10:00 AM`, `10:00 - 12:00 PM`, etc.).
   - **Backend Price Integrity (`server/routes/admin/products.js`):** Updated `POST /api/admin/products` and `PUT /api/admin/products/:id` so that when both `basePrice` and `vendorPrice` are explicitly supplied by an administrator, both are preserved in PostgreSQL RDS without automated markup overrides.
   - **Navigation:** Added to `AdminSidebar.tsx` and wired under `case 'services'` in `AdminPortal.tsx`.

2. **Physical Products Catalog Optimization & Demand Badges (`ProductsPage.tsx`):**
   - Restricted strictly to physical goods (`vertical=products`).
   - **Sales Velocity Demand Badges:** Automatically calculated from order volume:
     - 🔥 **High Demand** (≥ 15 orders): Green/orange highlight.
     - ⚡ **Steady Demand** (5–14 orders): Electric blue highlight.
     - 💤 **Low Demand** (< 5 orders): Slate highlight for slow inventory.
   - **Fulfillment Filters:** Filter catalog by All, ⚡ Quick Commerce (10-30 min), or 📦 Traditional (Pan-India 3PL).

3. **Rider Radar Dispatch Modal UX & Timer Fix (`IncomingRadarModal.tsx` & `RiderContext.tsx`):**
   - **Countdown Reset Bug Fixed:** The 30-second timer was previously resetting back to 30 every 6 seconds due to polling state object churn in `RiderContext.tsx`. Resolved by maintaining referential equality (`if (candidate && prev?.id === candidate.id) return prev;`) and locking the countdown strictly to `incomingBroadcast.id`.
   - **Rapido/Swiggy 2-Leg Route Breakdown:**
     - **Leg 1 (Pickup):** Rider Current GPS ➔ Merchant Store (pickup distance in km + est. time in mins).
     - **Leg 2 (Dropoff):** Merchant Store ➔ Customer Doorstep (drop distance in km + est. time in mins).
     - **Total Trip:** Combined distance & estimated trip duration.
   - **Dynamic Haversine Calculation (`server/routes/vendor/orders.js`):** Replaced hardcoded `4.2 km` with dynamic Haversine formula between merchant store coordinates `[lat, lng]` and customer doorstep coordinates `[deliveryLat, deliveryLng]`.
   - **Package Items Chip Overview:** Riders see package item counts and item labels (`📦 3 Items: Milk, Bread, etc.`) directly on the incoming modal before accepting.

4. **Prominent Rider COD Float & Remittance ("Pay to Admin"):**
   - **Header & Dashboard Visibility:** High-visibility COD cash-in-hand float card added to `RiderDashboard.tsx` and top bar `RiderHeader.tsx` (`COD Cash: ₹X [PAY]`).
   - **Direct Clearance Actions:**
     - `[Pay Online via UPI / Razorpay]`: Instant online clearance.
     - `[Handover to Regional Hub OTP]`: Generates verified 4-digit OTP for physical handover to regional administrator.
   - **Razorpay SDK Unification (`server/lib/razorpay.js`):** Created flexible `createRazorpayOrder` supporting both object options `{ amount, currency, receipt, notes }` (in INR Rupees) and positional arguments `(amountInPaise, receipt, notes)`, fixing previous `TypeError` on remittance creation.

5. **Vendor Direct Rider Visibility (`VendorOrders.tsx`):**
   - When an order is assigned or in delivery, vendor order cards now display the assigned delivery rider's Name, clickable Phone (`tel:...`), Vehicle Type badge, and direct `Track GPS` button.
   - Backend updated to include full rider profile relations (`delivery: { include: { riderProfile: { include: { user: true } } } }`).

6. **Admin Fleet Governance (`RidersPage.tsx` & `server/routes/admin/riders.js`):**
   - Added columns for **Operating City & Hub**, **Partner Specialization** (`Delivery`, `Service Technician`, `Both`), and **COD Float Held** with warning badges when exceeding limits.
   - Added dropdown filters for **City** and **Partner Specialization Role**.

---

### 10.2 Session File Modification Summary

| File Path | Scope | Changes Made |
|---|---|---|
| `src/admin/pages/ServicesManagementPage.tsx` | Frontend (**Created**) | Dedicated Services & Repairs catalog; doorstep visit charge, technician guaranteed pay, live economics card, slot chips, category filters. |
| `src/admin/AdminSidebar.tsx` | Frontend | Added `Services & Repairs` navigation item with `Wrench` icon. |
| `src/admin/AdminPortal.tsx` | Frontend | Wired `case 'services': return <ServicesManagementPage />;`. |
| `src/admin/pages/ProductsPage.tsx` | Frontend | Restricted to physical goods; added sales velocity Demand Badges (🔥 High, ⚡ Steady, 💤 Low); fulfillment filter. |
| `src/admin/pages/RidersPage.tsx` | Frontend | Added Operating City & Hub, Partner Specialization, COD Float Held with limit warnings, and city/role filters. |
| `src/rider/context/RiderContext.tsx` | Frontend | Fixed polling object reference churn; added pickup/dropoff coordinates to `BroadcastDelivery`. |
| `src/rider/components/IncomingRadarModal.tsx` | Frontend | Timer countdown locked to broadcast ID; Rapido 2-leg route breakdown; package item chips overview. |
| `src/rider/components/RiderHeader.tsx` | Frontend | Added prominent glowing `COD Cash: ₹X [PAY]` pill with direct navigation. |
| `src/rider/pages/RiderDashboard.tsx` | Frontend | Added high-visibility COD Cash float in hand widget with one-tap Razorpay & Hub OTP buttons. |
| `src/vendor/pages/VendorOrders.tsx` | Frontend | Added assigned rider contact card (Name, clickable Phone, Vehicle, Track GPS) on order rows. |
| `server/routes/admin/products.js` | Backend | Added `vertical=services` query filter; preserved explicit `basePrice` and `vendorPrice`; auto-assigned platform vendor. |
| `server/routes/admin/riders.js` | Backend | Included `branch` and `riderProfile.branch` in fleet query. |
| `server/routes/vendor/orders.js` | Backend | Dynamic Haversine distance replacing hardcoded `4.2 km`; included rider user contact relations in orders list. |
| `server/lib/razorpay.js` | Backend | Exported flexible `createRazorpayOrder` supporting object options for COD cash float remittances. |

---

### 10.3 Verification & Deployment Record

- **TypeScript Compilation:** Passed with 0 errors (`npm run build`).
- **Vite Bundle:** Successfully generated (`dist/assets/index-n2ctnKe9.js`).
- **Git Commits on `main`:**
  - `0fb24c7`: *feat: complete services & repairs catalog with doorstep visit charge and technician guaranteed pay, wire admin portal, fix rider countdown loop, 2-leg route breakdown, and prominent COD remittance*
  - `4d16b54`: *fix: export createRazorpayOrder in razorpay.js for rider and regional admin COD remittance*
- **AWS EC2 Production Server:**
  - IP: `18.61.145.65` (User: `ubuntu`)
  - PM2 Process: `shopindia-api` restarted (Process ID: 0, status: `online`).
  - API Health Check: `http://localhost:5001/api/health` returned `{"status":"ok","engine":"PostgreSQL/RDS"}`.

---

## 11. Quick-Start Guide to Resume Tomorrow

When resuming work tomorrow, follow these quick check steps:

1. **Local Development:**
   ```bash
   cd "d:\Company Projects\SHOP INDIA\shopindia"
   npm run dev
   ```
2. **Check AWS EC2 Backend Status:**
   ```bash
   ssh -i "ec2-key.pem" ubuntu@18.61.145.65 "pm2 status"
   ```
3. **Super Admin URLs to Test:**
   - `/admin` ➔ Click **Services & Repairs** on the sidebar to view the Doorstep Visit Charges, Technician Guaranteed Pays, and Net Margins.
   - `/admin` ➔ Click **Products Catalog** to view physical products with 🔥 High / ⚡ Steady / 💤 Low Demand Badges.
   - `/admin` ➔ Click **Riders & Fleets** to view Operating City, Partner Roles, and COD Floats.
4. **Rider Portal to Test:**
   - `/rider` ➔ Observe the COD Cash pill in header and prominent Pay Online / Hub Handover cards on the dashboard.
   - Broadcast an order from `/vendor` and observe the Rapido 2-leg route card on `/rider` with non-resetting 30s countdown.

---

*Document updated and saved to `shopindia/PROJECT_CHANGELOG_AND_RESUME_GUIDE.md`.*


