# Multi-Vendor & Multi-Service Order Splitting Plan

## Status: Approved Plan — Ready for Implementation in Next Session
*Date Logged: November 10, 2026*

---

## 1. Executive Summary & User Goal
When a customer browses and checks out on ShopIndia, the customer does not know (and should not need to know) which vendor, warehouse, dark store, or technician provides each item:
- **Customer Experience**: The customer adds any combination of products or services to the cart and pays **once** (single checkout and payment via Razorpay or COD).
- **Backend Fulfillment**: The system automatically detects when items or services originate from different fulfillment entities and **splits the checkout into separate Sub-Orders**:
  1. **Quick Shopping**: Separate orders $\rightarrow$ Separate `Delivery` jobs $\rightarrow$ **Separate riders dispatched** to each store.
  2. **Shop India Courier**: Separate orders $\rightarrow$ Separate Shiprocket pickups from each vendor's warehouse $\rightarrow$ **Separate courier AWBs** (e.g. Delhivery from Delhi, BlueDart from Bengaluru).
  3. **Glacons Services**: Separate service jobs $\rightarrow$ Dispatched to distinct specialized technicians (e.g., AC tech vs. Plumber vs. Electrician) with their respective appointment slots and verification OTPs.

---

## 2. Fulfillment Flow Diagram

```
[ Customer Cart Checkout (Single Razorpay Payment / COD) ]
                          │
            [ Intelligent Order Splitter ]
                          │
  ┌───────────────────────┼────────────────────────┐
  ▼                       ▼                        ▼
[ Quick Shopping ]     [ Shop India Courier ]   [ Glacons Services ]
  ├─ Sub-Order 1          ├─ Sub-Order 1           ├─ Service Job 1: AC
  │  └─ Delivery A        │  └─ Shiprocket Delhi   │  └─ AC Technician
  │     └─ Rider 1        │     └─ Delhivery AWB   │     └─ Slot & OTP 1
  │                       │                        │
  └─ Sub-Order 2          └─ Sub-Order 2           ├─ Service Job 2: Plumber
     └─ Delivery B           └─ Shiprocket Blr     │  └─ Plumber Technician
        └─ Rider 2              └─ BlueDart AWB    │     └─ Slot & OTP 2
                                                   │
                                                   └─ Service Job 3: Electrician
                                                      └─ Electrician Technician
                                                         └─ Slot & OTP 3
```

---

## 3. Detailed Technical Blueprint

### A. Quick Shopping (`quick_commerce`)
1. **Grouping Logic**: Cart items are partitioned by `vendorId`.
2. **Order Records**: For each distinct `vendorId`, an independent `Order` record is created with:
   - Unique `orderNumber` (e.g., `OD-MWAJ1`, `OD-MWAJ2`)
   - Shared `masterOrderNumber` (e.g., `MST-MWAJ`)
   - Shared `paymentRef` (Razorpay payment ID)
3. **Delivery Dispatch**:
   - Each sub-order generates its own `Delivery` record pointing to that vendor's pickup address and GPS coordinates.
   - Independent riders are broadcasted and assigned to each store.
   - Rider 1 goes to Store 1 $\rightarrow$ picks up Store 1 items $\rightarrow$ delivers to customer.
   - Rider 2 goes to Store 2 $\rightarrow$ picks up Store 2 items $\rightarrow$ delivers to customer.
4. **Customer Live Tracking**:
   - Customer tracking view shows multi-trip progress simultaneously:
     - 📦 *Store 1 (Daily Grocery)*: Rider Ramesh on way to store (OTP: 1234)
     - 📦 *Store 2 (Bakery)*: Rider Suresh picked up order (OTP: 1234)

---

### B. Shop India Courier (`traditional`)
1. **Grouping Logic**: Physical products partitioned by `vendorId` (warehouses in different cities).
2. **Vendor Portal Isolation**:
   - Vendor A logs into `/vendor` $\rightarrow$ sees only their items in Order 1.
   - Vendor B logs into `/vendor` $\rightarrow$ sees only their items in Order 2.
3. **Shiprocket 3PL Execution**:
   - Vendor A generates a Shiprocket label with Delhi pickup $\rightarrow$ Delhivery courier truck dispatched.
   - Vendor B generates a Shiprocket label with Bengaluru pickup $\rightarrow$ BlueDart courier truck dispatched.
4. **Customer Tracking**:
   - Customer receives 2 separate tracking numbers/AWBs and expected delivery dates for each package.

---

### C. Glacons Services (`hvac_service`)
1. **Skillset Partitioning**:
   - When a customer books 2 or 3 services in advance (e.g., AC Servicing + Deep House Cleaning + Electrical Switchboard Repair):
   - The system partitions the items by `categoryId` / service category.
2. **Specialized Technician Jobs**:
   - Job 1: AC Specialist technician dispatched for the AC time slot.
   - Job 2: Cleaning team dispatched for the cleaning time slot.
   - Job 3: Certified electrician dispatched for the electrical time slot.
3. **OTP & Pay Integrity**:
   - Each technician has their own arrival OTP and job completion flow.
   - Doorstep visit charges and technician guaranteed pay credit strictly to the technician who executed that specific job.

---

## 4. Financial & Wallet Reconciliation
- **Customer Payment**: 1 single Razorpay payment captures the combined total.
- **Vendor Wallets**: Vendor 1's wallet balance increases only when Store 1's order is delivered. Vendor 2's wallet balance increases only when Store 2's order is delivered.
- **Rider & Technician Wallets**: Rider 1 receives Fee 1, Rider 2 receives Fee 2.
- **Super Admin Finance Center**: Net admin margin and 3% Razorpay gateway fee calculate accurately per sub-order without double counting.

---

## 5. Files to Update When Resuming
1. `server/prisma/schema.prisma`:
   - Add `masterOrderNumber String?` and `parentOrderId String?` to `model Order`.
2. `server/routes/orders.js`:
   - Refactor `POST /api/orders` to partition items by `vendorId` / service category inside a single database transaction.
   - Generate independent `Delivery` and `ServiceJob` records per partition.
3. `server/routes/shiprocket/shipments.js`:
   - Verify each sub-order generates its own AWB cleanly with the specific vendor's warehouse address.
4. `src/pages/Orders.tsx` / `Dashboard`:
   - Group sub-orders sharing `masterOrderNumber` under one unified visual card for the customer with multi-package tracking pills.

