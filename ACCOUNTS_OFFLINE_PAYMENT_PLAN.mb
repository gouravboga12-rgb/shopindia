# 📋 Implementation Plan: Partner Banking Details & Offline Payment Clearance (Super Admin)

## 🎯 Goal
In the **Super Admin Portal → Accounts & Statements** (`/admin` → `AccountsPage.tsx`):
1. **Show Full Partner Bank Account & UPI Details**: Display the verified payout credentials (Account Number, IFSC, Account Holder Name, Bank Name, and UPI ID) submitted by each Vendor, Rider, and Technician, along with convenient **1-click Copy** buttons.
2. **Offline Payment Clearance ("Settle Due / Pay" & "Adjust")**: Allow the super admin to transfer funds offline (via UPI / NetBanking), enter the paid amount and UTR/Reference number, and immediately:
   - Deduct/clear the pending balance.
   - Record an official completed Payout entry with audit trail in the ledger.
   - Update the partner's panel (Vendor, Rider, or Technician) in **real-time (< 1s)** via WebSockets.

---

## 🔍 Current State vs. Proposed Solution

| Feature | Current State | Proposed Solution |
| :--- | :--- | :--- |
| **Bank Account Display** | Masked as `••••3301`, often shows "No bank saved" or truncated text | **Full unmasked** Bank Account Number, Bank Name, IFSC code, Account Holder Name, and UPI ID with **1-click Copy** buttons |
| **Partner Role Identification** | Generic label | Distinct visual badges: 🏪 **Vendor/Merchant**, 🛵 **Delivery Rider**, 👨‍🔧 **Certified Technician** |
| **Adjust Action** | Basic generic modal (Credit/Debit) that only adjusts balance, does not create an official Payout record | Enhanced with a **"Record Offline Payment / Clear Due"** tab + pre-filled pending amount + UTR entry + general Ledger Adjustment |
| **Real-time User Notification** | No WebSocket events fired on manual adjustment | **Real-time push (`wallet:updated` & `payout:updated`)** so the vendor/rider/technician sees their wallet balance and payout history update immediately without page refresh |
| **Passbook & Payout History** | Only writes a generic `MANUAL_ADJUSTMENT` ledger entry | Creates a completed **`PayoutRequest`** with UTR and writes a clear **`PAYOUT`** debit entry in their statement |

---

## 🛠️ Step-by-Step Implementation

### Step 1: Backend — Expose Full Bank & UPI Details (`server/routes/admin/payouts.js`)
**Endpoint:** `GET /api/admin/payouts/accounts`
- Remove account number masking so Super Admins can see the full number needed for wire transfers:
  ```javascript
  bankDetails: {
    accountHolder: v.accountHolder || null,
    accountNumber: v.accountNumber || null, // Full unmasked for admin transfer
    ifsc: v.ifsc || null,
    bankName: v.bankName || null,
    upiId: v.upiId || null,
  }
  ```
- Do the same for riders and technicians in `riders.forEach(...)`.

---

### Step 2: Backend — Support "Offline Settlement / Clear Due" (`server/routes/admin/payouts.js`)
**Endpoint:** `POST /api/admin/payouts/manual-adjustment` (or dedicated `POST /api/admin/payouts/settle-offline`)
- Support an action mode: `isOfflinePayout: true` / `type: 'PAYOUT'` (or `DEBIT`).
- Inputs:
  - `partyType`: `'VENDOR'` | `'RIDER'`
  - `partyId`: UUID
  - `amount`: Float
  - `paymentMode`: `'UPI'` | `'IMPS/NEFT'` | `'CASH'`
  - `utr`: Reference/UTR number (optional, e.g. `UPI/4321987654`)
  - `reason`: Admin settlement remarks
- Database operations in transaction:
  1. Decrement partner `walletBalance` safely (clamped to 0).
  2. Create a completed `PayoutRequest` (and `RiderPayout` for riders) with status `'completed'`, `processedAt: new Date()`, and `razorpayPayoutId: utr`.
  3. Create an immutable `LedgerEntry` (`entryType: 'PAYOUT'`, `type: 'DEBIT'`).
  4. Emit WebSocket notifications:
     - `notifyWalletUpdate(partyType, partyId, newBalance, { amount, utr })`
     - `notifyPayoutStatus(completedPayout)`
     - `notifyTreasuryUpdate(...)`

---

### Step 3: Frontend — Banking & UPI Details Column (`src/admin/pages/AccountsPage.tsx`)
In the table's "Bank & UPI Details" column:
- **UPI Display**:
  - Green Zap icon, UPI ID in bold font-mono, with a small `Copy` button.
- **Bank Account Display**:
  - Bank Name, Account Holder Name, Account Number (with `Copy` button), and IFSC Code (with `Copy` button).
- **"View Details" Quick Popover/Modal**:
  - For quick transfer on mobile/desktop, clicking the bank box opens a clean modal with all details formatted for easy copying to HDFC/SBI/PhonePe/GPay.
- **Role Badges**:
  - 🏪 `Vendor / Merchant` (Emerald)
  - 🛵 `Delivery Rider` (Blue)
  - 👨‍🔧 `Certified Technician` (Teal)

---

### Step 4: Frontend — Enhanced "Settle Due & Adjust" Modal (`src/admin/pages/AccountsPage.tsx`)
When the admin clicks **"Adjust"** (or a dedicated **"Settle Due"** button):
- The modal opens with two tabs:
  1. **Tab 1: 💸 Record Offline Payment / Clear Due (Recommended)**
     - Displays the member's verified Bank / UPI credentials at the top for easy reference while paying.
     - Displays the member's **Current Pending Due** (e.g. ₹510.00).
     - **Quick Amount Button**: `[Clear Full Due (₹510)]` or enter a custom partial amount.
     - **Payment Mode**: Dropdown (`UPI (PhonePe/GPay)`, `IMPS/NEFT Bank Transfer`, `Cash`).
     - **Transaction Reference / UTR Number**: Text input for bank UTR.
     - **Admin Notes**: e.g., "Cleared pending orders payout".
     - Action button: **"Record Payment & Clear Balance"**.
  2. **Tab 2: ⚙️ Custom Ledger Adjustment**
     - For corrections: `CREDIT (+)` or `DEBIT (-)`.
     - Reason field.
     - Action button: **"Post Adjustment"**.

---

### Step 5: Real-time Feedback on User Panels
- **Vendor Panel (`VendorWallet.tsx`)**:
  - Socket event `wallet:updated` and `payout:updated` triggers immediate refresh.
  - The vendor's wallet balance drops from ₹510 to ₹0 (or partial).
  - A new entry appears in the Payouts table: *"Disbursed via UPI (UTR: ...)"* with status **Completed**.
- **Rider / Technician Panel (`RiderWallet.tsx`)**:
  - Socket event `wallet:updated` and `payout:updated` triggers immediate refresh.
  - The rider/technician's balance updates instantly.
  - Their payout history displays the clearance with UTR.

---

## 🔒 Verification & Safety Checks
1. **Permission Check**: Strict `requireRole('super_admin')` on all payout endpoints.
2. **Negative Balance Guard**: Safe clamping ensures ledger balance calculations remain accurate.
3. **Audit Trail**: Every adjustment and offline settlement writes an immutable entry into `ledger_entries` with the super admin's user ID and timestamp.
4. **Copy Feedback**: Micro-interaction shows a green checkmark `✓ Copied` when copying UPI or Account numbers.

