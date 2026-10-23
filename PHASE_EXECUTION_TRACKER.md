# ShopIndia — Multi-Phase Implementation & Resume Tracker
> **Purpose:** This file acts as the persistent, single source of truth across all Antigravity context compactions, token limit resets, and AI model switches (Claude ↔ Gemini Flash). Any new agent session reads this file first to resume execution seamlessly without duplicate work or confusion.

---

## 🎯 Master Execution Checklist

| Phase | Description | Status | Commit / Milestone |
| :---: | :--- | :---: | :--- |
| **Phase 1** | Database Foundation (Prisma Additive Schema) & Support Endpoint Security Fix | ✅ COMPLETED | Schema valid, client generated, support.js secured |
| **Phase 2** | Money Ledger Engine (`server/lib/ledger.js`) & Universal Order Delivery Hook | ✅ COMPLETED | ledger.js created; rider & vendor delivery hooks wired |
| **Phase 2b**| Razorpay Backend Integration & Gateway Fee/Tax Ledger Tracking | ✅ COMPLETED | lib/razorpay.js, routes/payments.js, webhooks/razorpay.js created |
| **Phase 3** | Pricing Engine (`server/lib/pricing.js`) & Admin Dynamic Settings with Live Calculator | ✅ COMPLETED | lib/pricing.js, routes/admin/pricing.js, PricingSettingsPage.tsx created |
| **Phase 4** | 3-Tier Support Queue (Vendor → Regional Admin → Super Admin) & SLA Timers | ✅ COMPLETED | support routes, slaEscalation.js, VendorSupport, RegionalSupport, SupportPage upgraded |
| **Phase 5** | Vendor Store Settings (`VendorSettings.tsx`), Mapbox GPS & Hyper-Local Quick-Commerce Filtering | ⚪ NOT STARTED | Pending |
| **Phase 6** | Unified 3-Queue Payout Center (`PayoutRequest`) & Master Finance Dashboard (`/admin/finance`) | ⚪ NOT STARTED | Pending |
| **Phase 7** | COD Dynamic Clearance (QR vs Cash), Remittance & Rapido-Style Doorstep Service Adjustment | ⚪ NOT STARTED | Pending |

---

## 📌 Phase 1: Database Foundation & Support Security Fix

### 1.1 Objective
- Update `server/prisma/schema.prisma` with all new additive models (`LedgerEntry`, `PayoutRequest`, `PricingRule`, `DeliveryPayRule`, `SettingsAuditLog`, `PaymentRecord`, `GatewaySettlement`) and additive fields on `Vendor`, `Product`, `OrderItem`, `Delivery`, `ServiceJob`, `Ticket`, and `Coupon`.
- Secure `server/routes/support.js`:
  - Require authentication or verified `email` + `ticketNumber` on `GET /api/support/tickets`.
  - Block unauthorized replies on `POST /api/support/tickets/:id/reply`.
  - Support `orderId` association during ticket creation with auto-resolution of `vendorId` and `region`.
- Validate Prisma schema (`npx prisma validate`), generate client (`npx prisma generate`), and prepare migration.

### 1.2 File Targets
- `server/prisma/schema.prisma`
- `server/routes/support.js`

### 1.3 Execution Status & Verification
- **Status:** Pending
- **Verification Commands:** `npx prisma validate`, `npm run build`
- **Resume Point:** When Phase 1 completes, update this section with migration details, git commit hash, and toggle Status to ✅ COMPLETED.

---

## 📌 Phase 2: Money Ledger Engine & Order Completion Hook

### 2.1 Objective
- Create `server/lib/ledger.js` providing `postLedgerEntries(entries, tx)`.
- Hook order completion (`status: 'delivered'`) across vendor, rider, and admin routes to:
  - Credit vendor wallet strictly for their specific items using item-level rates.
  - Credit rider wallet for delivery fee.
  - Create immutable `LedgerEntry` records in the exact same DB transaction.
- Create script/routine to initialize existing balances as `OPENING_BALANCE` entries.

### 2.2 File Targets
- `server/lib/ledger.js` (NEW)
- `server/routes/vendor/orders.js`
- `server/routes/rider/orders.js`
- `server/routes/admin/orders.js`
- `server/routes/orders.js`

### 2.3 Execution Status & Verification
- **Status:** Not Started
- **Resume Point:** Await Phase 1 completion before starting Phase 2.

---

## 📌 Phase 2b: Razorpay Integration & Gateway Fee Tracking

### 2.1 Objective
- Implement server-side Razorpay order generation, signature verification, and webhook handlers (`payment.captured`, `refund.processed`, `settlement.processed`).
- Extract and record exact Razorpay `fee` and `tax` into the ledger as `GATEWAY_FEE` and `GATEWAY_TAX`.
- Track lost gateway fees upon customer refunds.

### 2.2 File Targets
- `server/lib/razorpay.js` (NEW)
- `server/routes/payments.js` (NEW)
- `server/routes/webhooks/razorpay.js` (NEW)
- `server/jobs/settlementSync.js` (NEW)

### 2.3 Execution Status & Verification
- **Status:** Not Started

---

## 📌 Phase 3: Pricing Engine & Admin Dynamic Controls

### 3.1 Objective
- Implement `server/lib/pricing.js` for add-on customer pricing (Vendor gets exact base price; platform adds commission on top).
- Rule hierarchy: Product → Vendor → Category → Vertical → Global.
- Build Super Admin **Pricing & Payout Settings** page with live profit/loss calculator.
- Update Vendor product creation/editing form with "Your Price (You Receive)" and customer price preview with MRP validation.

### 3.2 File Targets
- `server/lib/pricing.js` (NEW)
- `server/routes/admin/pricing.js` (NEW)
- `src/admin/pages/PricingSettingsPage.tsx` (NEW)
- `src/admin/AdminSidebar.tsx`
- `src/vendor/pages/VendorProducts.tsx`
- `src/admin/pages/ProductsPage.tsx`

### 3.3 Execution Status & Verification
- **Status:** ✅ COMPLETED
- **Verification Commands:** `npm run build` (passed 0 errors), node tests for `pricing.js` and `simulatePricing` (passed 0 errors).
- **Details:**
  - `server/lib/pricing.js`: Full pricing engine with Add-On & Deduct models, Product > Vendor > Category > Vertical > Global rule hierarchy, Shiprocket shipping + Quick-commerce delivery fees, Razorpay 2.36% buffer, and live simulator function.
  - `server/routes/admin/pricing.js`: Super Admin APIs for commission rules, delivery pay rules, key-value settings, audit logging, and live simulation.
  - `server/routes/vendor/products.js` & `server/routes/admin/products.js`: Added `/preview-price` endpoint and automatic customer price calculation from vendor base payout with MRP cap validation.
  - `server/routes/orders.js`: Saves immutable `vendorPrice`, `platformFee`, `gatewayFeeShare` on every `OrderItem`, and applies dynamic delivery pricing.
  - `src/admin/pages/PricingSettingsPage.tsx`: Full Super Admin management dashboard with 5 tabs (Product Commissions, Delivery & Logistics, Services & Technicians, Razorpay Gateway & Buffer, Settings Change History) and Interactive Live Profit/Loss Calculator Simulator.
  - `src/vendor/pages/VendorProducts.tsx`: Upgraded product form with "Your Payout (Base Price ₹)", "MRP (₹)", and real-time customer price preview with MRP compliance warning.

---

## 📌 Phase 4: 3-Tier Support Queue

### 4.1 Objective
- Build `/vendor/support` and `/regional-admin/support` pages.
- Upgrade `/admin` Support page with dedicated tabs (*All, Refund Requests, Escalated, SLA Breached*).
- Support internal notes tab, vendor/regional call & WhatsApp cards.
- Implement background SLA escalation job (`server/jobs/slaEscalation.js`) running every 5 minutes.
- Enforce: Only Super Admin can approve refunds, automatically debiting the at-fault party's ledger.

### 4.2 File Targets
- `server/routes/vendor/support.js` (NEW)
- `server/routes/regional-admin/support.js` (NEW)
- `server/routes/admin/support.js`
- `server/jobs/slaEscalation.js` (NEW)
- `src/vendor/pages/VendorSupport.tsx` (NEW)
- `src/regional-admin/pages/RegionalSupport.tsx` (NEW)
- `src/admin/pages/SupportPage.tsx`
- `src/vendor/VendorSidebar.tsx`
- `src/regional-admin/RegionalAdminSidebar.tsx`

### 4.3 Execution Status & Verification
- **Status:** ✅ COMPLETED
- **Verification Commands:** `npm run build` (passed, 0 errors), node tests for support routes and SLA job (passed, 0 errors).
- **Details:**
  - `server/routes/support.js`: Auto-links tickets with orders, resolves `vendorId` and `regionId` (via pincode), sets initial handling tier (1: Vendor, 2: Regional, 3: Super Admin), and computes SLA response deadlines based on priority.
  - `server/jobs/slaEscalation.js`: Background SLA job that detects overdue tickets and escalates Tier 1 ➔ Tier 2 ➔ Tier 3 with automated system notification messages. Initialized in `server/index.js`.
  - `server/routes/vendor/support.js`: Dedicated vendor dispute queue with live SLA countdowns, customer chat, private internal notes, and refund forwarding.
  - `server/routes/regional-admin/support.js`: Territory manager support queue with territory pincode matching, rider contact cards, and escalation to Super Admin.
  - `server/routes/admin/support.js`: Upgraded Super Admin queue with multi-tab filters (`All`, `SLA Breached`, `Escalated`, `Refund Requests`) and 1-click refund approval with automatic `REFUND_DEBIT` ledger postings against the at-fault merchant or delivery rider.
  - `src/vendor/pages/VendorSupport.tsx`: Merchant dispute UI mounted in `VendorPortal.tsx` and `VendorSidebar.tsx`.
  - `src/regional-admin/pages/RegionalSupport.tsx`: Territory support UI mounted in `RegionalAdminPortal.tsx`, `RegionalAdminSidebar.tsx`, and `RegionalAdminBottomNav.tsx`.
  - `src/admin/pages/SupportPage.tsx`: Upgraded with queue tabs, SLA countdown timers, and at-fault ledger refund debit modal.

---

## 📌 Phase 5: Vendor Settings, Analytics & Hyper-Local Quick Commerce

### 5.1 Objective
- Build `VendorSettings.tsx` with Mapbox GPS detection, street address, delivery radius, Bank details, and UPI ID.
- Fix `/api/vendor/analytics/summary` to group items by `vendorId` and accurately calculate revenue and sales metrics without timezone drift.
- Filter `/quick` storefront strictly by customer location (Mapbox GPS / city / pincode) against vendor `deliveryRadiusKm`. Traditional products remain Pan-India.

### 5.2 File Targets
- `server/routes/vendor/settings.js` (NEW)
- `server/routes/vendor/analytics.js`
- `server/routes/products.js`
- `src/vendor/pages/VendorSettings.tsx` (NEW)
- `src/vendor/VendorSidebar.tsx`
- `src/vendor/pages/VendorAnalytics.tsx`
- `src/components/desktop/VerticalQuickCommerce.tsx`
- `src/components/mobile/VerticalQuickCommerceMobile.tsx`

### 5.3 Execution Status & Verification
- **Status:** Not Started

---

## 📌 Phase 6: Unified Payout Center & Master Finance Dashboard

### 6.1 Objective
- Consolidate all partner payouts into `PayoutRequest` model.
- Build 3-queue payout review in Super Admin (*Vendors, Technicians, Delivery Riders*).
- Build Regional Admin payout verification & forwarding tab.
- Build Super Admin Master Finance Overview (`Customer Paid`, `Gateway Fees`, `Net Received`, `To Be Cleared`, `Platform Net Profit`).
- Build individual Account Statement / Passbook with 1-click payout action.

### 6.2 File Targets
- `server/routes/admin/finance.js` (NEW)
- `server/routes/admin/payouts.js` (NEW)
- `server/routes/regional-admin/payouts.js` (NEW)
- `src/admin/pages/FinancePage.tsx` (NEW)
- `src/admin/pages/AccountsPage.tsx` (NEW)
- `src/admin/pages/AccountStatementPage.tsx` (NEW)
- `src/admin/pages/PayoutsPage.tsx` (NEW)
- `src/regional-admin/pages/RegionalPayouts.tsx` (NEW)

### 6.3 Execution Status & Verification
- **Status:** Not Started

---

## 📌 Phase 7: COD Clearance Engine & Doorstep Services

### 7.1 Objective
- Super Admin COD Settings page (`/admin/cod-settings`) with deadline rules (End-of-Day or next 2-3 orders) and ₹3,000 float limit.
- Rider dynamic doorstep payment screen (Dynamic Razorpay QR vs Offline Cash).
- Rider cash clearance: in-app Razorpay deposit OR Regional Admin physical submission.
- Regional Admin cash remittance to Super Admin via Razorpay.
- Rapido-style service bill adjustment with customer in-app approval & 1-tap Google Maps store navigation for riders.

### 7.2 File Targets
- `server/routes/admin/cod-settings.js` (NEW)
- `server/routes/rider/service-jobs.js` (NEW)
- `src/admin/pages/CODSettingsPage.tsx` (NEW)
- `src/rider/pages/ActiveDeliveryView.tsx`
- `src/rider/pages/ActiveServiceJobView.tsx` (NEW)

### 7.3 Execution Status & Verification
- **Status:** Not Started

---

## 🔄 Emergency Model Switch / Anti-Gravity Resume Protocol
If execution is interrupted at any moment:
1. Open this file: `PHASE_EXECUTION_TRACKER.md`.
2. Inspect the **Master Execution Checklist** at the top.
3. Identify the current active phase marked `🟡 IN PROGRESS`.
4. Check the **Execution Status & Verification** notes for the last modified file and line.
5. Immediately resume work on the next pending file without repeating prior phases.
