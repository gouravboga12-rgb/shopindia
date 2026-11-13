# Multi-Vendor & Multi-Service Order Splitting Architecture Plan

## Status: Deep Architectural Analysis & Implementation Plan (Pre-Implementation Review)
*Date: November 13, 2026*

---

## 1. Executive Summary & Core Rules

When a customer checks out on ShopIndia:
1. **Customer Front Experience**:
   - The customer can add items from multiple quick dark stores, standard courier vendors, or service verticals into **one single cart**.
   - The customer pays **once** (single Razorpay transaction or single COD order).
2. **Strict Fulfillment Rules (Zero Cross-Store Rider Trips)**:
   - **A single rider NEVER visits multiple stores.**
   - If 3 products come from 3 different stores (Store A, Store B, Store C), **3 separate riders are dispatched independently**.
   - Rider 1 goes only to Store A $\rightarrow$ collects only Store A items $\rightarrow$ delivers to customer with OTP 1.
   - Rider 2 goes only to Store B $\rightarrow$ collects only Store B items $\rightarrow$ delivers to customer with OTP 2.
   - Rider 3 goes only to Store C $\rightarrow$ collects only Store C items $\rightarrow$ delivers to customer with OTP 3.
   - If 1 item comes from Delhi and another from Surat, **2 separate Shiprocket shipments with separate AWBs and pickups** are generated.
   - If 2 services are booked (e.g., AC Repair + Plumbing), **2 distinct technicians** are assigned with independent visit slots and OTPs.
3. **Isolated Cancellation & Partial Refund Rule**:
   - If Store C fails (out of stock, closed, or delivery failed), **only Store C is cancelled and refunded**.
   - Store A and Store B remain active/delivered, their vendors keep their sales, their riders keep their fees, and no refunds are issued for them.

---

## 2. In-Depth Current Codebase Analysis

We conducted an exhaustive audit of the existing codebase to understand how orders, deliveries, riders, Shiprocket, and refunds currently function:

### A. Current Order Creation (`server/routes/orders.js`)
- **Current Behavior**: Line 618 currently takes `resolved[0].vendorId` and assigns it to the single `Order` row:
  ```js
  vendorId: isServiceOrder ? null : (resolved.length ? resolved[0].vendorId : null),
  ```
- **Limitation**: If items in the cart originate from different vendors, only the first vendor is associated with the order. All items are dumped into one order and one `Delivery` record.
- **Why This Must Be Upgraded**: A single `Delivery` record cannot have 3 different pickup locations or 3 different riders.

### B. Current Database Schema (`server/prisma/schema.prisma`)
- `Order` has a **1-to-1 relation** with `Delivery`:
  ```prisma
  delivery Delivery?
  ```
- `Order` has a **1-to-1 relation** with `ShiprocketShipment`:
  ```prisma
  shiprocketShipment ShiprocketShipment?
  ```
- **Key Insight**: The database schema is **already structured for 1-to-1 fulfillment per Order**!
  Each `Order` row is designed to have exactly ONE `Delivery` (1 store pickup $\rightarrow$ 1 customer dropoff $\rightarrow$ 1 rider) and exactly ONE `ShiprocketShipment` (1 warehouse pickup $\rightarrow$ 1 courier AWB).
  Therefore, creating independent Sub-Orders (each with its own `Order` row) is **100% architecturally natural** and requires **zero disruptive restructuring** of the database relations!

### C. Current Rider Dispatch & Execution (`server/routes/rider/orders.js`)
- The rider broadcast feed (`GET /api/rider/broadcast-feed`) queries:
  ```js
  prisma.delivery.findMany({ where: { status: 'broadcasted' }, include: { order: { include: { items, vendor } } } })
  ```
- Rider claim (`POST /api/rider/claim`), OTP verification (`POST /api/rider/verify-otp`), and wallet credit (`recordRiderCredit`) all operate on a **single `deliveryId` and its linked `orderId`**.
- **Crucial Benefit**: Because riders accept and execute a single `Delivery` job, when 3 sub-orders generate 3 `Delivery` records, 3 different riders will naturally pick them up from the broadcast pool with **zero modifications needed to the rider mobile/PWA code**!

### D. Current Shiprocket Integration (`server/routes/shiprocket/shipments.js`)
- `POST /api/shiprocket/create-shipment` takes `{ orderId }`, loads the vendor's warehouse address, and generates the AWB for that specific order.
- **Crucial Benefit**: When orders are split by vendor, each sub-order has only one vendor. Vendor A in Delhi generates Delhi AWB, and Vendor B in Surat generates Surat AWB independently.

### E. Current Super Admin Refunds (`server/routes/admin/orders.js`)
- `POST /api/admin/orders/:id/refund` takes `{ refundAmount, refundReason }`:
  ```js
  const amt = parseFloat(refundAmount) || existing.total || 0;
  const rzpRes = await createRefund(paymentId, amt * 100, { notes: ... });
  await prisma.order.update({ where: { id: existing.id }, data: { status: 'refunded', refundAmount: amt } });
  ```
- **Crucial Benefit**: The refund API **already supports partial refunds**! When an admin refunds Sub-Order C, it sends only Sub-Order C's amount (`existing.total`) to Razorpay. Razorpay refunds that portion back to the customer's UPI/Card, while Sub-Orders A and B remain untouched.

---

## 3. Potential Failure Modes & Safeguards ("Zero-Virus / Zero-Bug" Strategy)

To ensure there are **no bugs, no financial discrepancies, and no runtime crashes**, we identified the key edge cases and their concrete safeguards:

| Risk / Edge Case | What Could Go Wrong | Guaranteed Safeguard |
| :--- | :--- | :--- |
| **Total Mismatch** | Sum of sub-order totals $\neq$ customer paid amount. | Partition items by vendor first, compute each sub-order's subtotal and delivery fee, and enforce: $\sum (\text{subOrder.total}) \equiv \text{masterTotal}$. |
| **Partial Database Failure** | Server crashes halfway through creating 3 sub-orders. | All sub-orders and delivery tasks are wrapped in a single atomic `prisma.$transaction([...])`. If any sub-order fails, all roll back cleanly. |
| **Stock Discrepancy** | Stock decremented multiple times or skipped. | Decrement stock per item inside the same transaction. Stock increments back only for the specific cancelled sub-order upon cancellation. |
| **Online Payment Verification** | Razorpay verification executed multiple times. | Verify Razorpay payment signature once for the master payment, then link `paymentRef` to all sibling sub-orders. |
| **Frontend Type Compatibility** | Customer checkout expects `{ id, orderNumber }` from `POST /api/orders`. | Return the master order number, first sub-order's `id` and `orderNumber` as primary, plus `subOrders: [...]` array. Frontend continues to work seamlessly without crashes. |
| **Duplicate Delivery Broadcasts** | Delivery records created with invalid coordinates. | Validate each store's GPS (`lat, lng`) before broadcasting. If a store has no GPS, fallback to vendor city center coordinates. |
| **Vendor Portal Data Leak** | Vendor A sees Vendor B's items. | Each sub-order has strictly its own `vendorId`. Vendor portal queries `where: { vendorId: currentVendorId }`, maintaining complete data isolation. |
| **COD Money Leak** | Rider collects total order amount instead of their parcel amount. | Each delivery job clearly displays `collectAmount: subOrder.total` on the rider app. Rider collects only their sub-order amount. |

---

## 4. Step-by-Step Implementation Plan

### Phase 1: Database Schema Migration
1. Update `server/prisma/schema.prisma`:
   - In `model Order`:
     ```prisma
     masterOrderNumber String?  // e.g. "MST-9842" — links sibling sub-orders
     parentOrderId     String?  // Optional reference to primary order
     isSubOrder        Boolean  @default(false)
     ```
2. Run `npx prisma db push` on EC2 to update PostgreSQL safely.

### Phase 2: Order Splitter Engine (`server/routes/orders.js`)
1. In `POST /api/orders`:
   - Group `resolved` items by `fulfillmentCategory`:
     - **Quick Commerce**: Grouped strictly by `vendorId` (Store A, Store B, Store C).
     - **Courier (Shop India)**: Grouped strictly by `vendorId` (Warehouse A, Warehouse B).
     - **Glacons Services**: Grouped by service trade / specialist category (`plumbing`, `ac_service`, `cleaning`, etc.).
   - Generate a single `masterOrderNumber` (e.g. `MST-` + timestamp + random code).
   - In a single Prisma transaction `prisma.$transaction`:
     - For each group, create an isolated `Order` row with:
       - Unique `orderNumber`: `OD-` + timestamp + `-` + index (e.g. `OD-7821-1`, `OD-7821-2`).
       - `masterOrderNumber`: Same `MST-7821`.
       - `vendorId`: Specific store ID for that group.
       - `subtotal`, `deliveryFee`, `total`: Computed specifically for that group.
       - `paymentRef`: Shared Razorpay payment ID or `COD`.
       - `items`: Create `OrderItem` records belonging only to this group.
     - For each Quick Commerce sub-order, create an isolated `Delivery` row with the specific store's pickup address, coordinates, and unique customer delivery OTP.
     - For each Glacons Service sub-order, create an isolated `Delivery` and `ServiceJob` row for that specific trade technician.
   - Decrement stock for all ordered items.
   - Return `{ masterOrderNumber, id: subOrders[0].id, orderNumber: subOrders[0].orderNumber, subOrders }`.

### Phase 3: Super Admin Orders Panel & Isolated Refunds (`server/routes/admin/orders.js` & `src/admin/pages/OrdersPage.tsx`)
1. In `server/routes/admin/orders.js`:
   - Ensure `GET /api/admin/orders` selects `masterOrderNumber` and returns sub-orders grouped or badged with their parent.
   - Verify `POST /api/admin/orders/:id/refund` refunds only the specific sub-order's `total` via Razorpay partial refund API.
   - When a sub-order is refunded:
     - Update only this sub-order's `status = 'refunded'`.
     - Reverse ledger entries only for this sub-order's amount.
     - Send an in-app notification to the customer specifying the refunded package name and amount.
2. In `src/admin/pages/OrdersPage.tsx`:
   - Add a "Multi-Store Order" badge for orders sharing a `masterOrderNumber`.
   - Provide independent action buttons (Update Status, Cancel, Refund) per sub-order.

### Phase 4: Customer Orders & Tracking UI (`src/pages/dashboard/Orders.tsx`)
1. In `src/pages/dashboard/Orders.tsx`:
   - Display orders grouped by `masterOrderNumber`.
   - For a multi-store order:
     - Show an overarching header: `Order #MST-7821 • Placed on 13 Nov • Total Paid: ₹950`.
     - Nested Package 1: `Store: Fresh Mart` • Status: `On the way (Rider Ramesh)` • `OTP: 4102`.
     - Nested Package 2: `Store: Daily Bakery` • Status: `Packing at store` • `OTP: 8831`.
     - Nested Package 3: `Store: Pharmacy` • Status: `Cancelled & Refunded (₹300)` • `Refunded to UPI ↩`.

---

## 5. Verification & Testing Checklist Before Deployment
- [ ] Cart with 2 items from the same store $\rightarrow$ Creates 1 Order, 1 Delivery, 1 Rider.
- [ ] Cart with 3 items from 3 different quick stores $\rightarrow$ Creates 3 Orders, 3 Deliveries, 3 separate Rider broadcast jobs.
- [ ] Rider 1 claims Delivery 1 $\rightarrow$ Deliveries 2 and 3 remain available in broadcast pool for other riders.
- [ ] Customer sees 3 independent OTPs for the 3 packages.
- [ ] Super Admin cancels Sub-Order 2 $\rightarrow$ Only Sub-Order 2 is refunded; Sub-Orders 1 and 3 remain active.
- [ ] Vendor 1 logs into `/vendor` $\rightarrow$ Sees only Sub-Order 1.
- [ ] TypeScript build (`tsc -b && vite build`) completes with 0 errors.
- [ ] Production sync on EC2 with `pm2 restart shopindia-api`.
