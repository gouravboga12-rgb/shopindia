export interface InvoiceOrderData {
  id?: string;
  orderNumber?: string;
  createdAt?: string;
  date?: string;
  status?: string;
  type?: string;
  vertical?: string;
  total: number;
  subtotal?: number;
  tax?: number;
  items?: Array<{
    name?: string;
    product?: {
      id?: string;
      title?: string;
      price?: number;
      category?: string;
      hsn?: string;
      vendor?: {
        id?: string;
        businessName?: string;
        contactName?: string;
        phone?: string;
        email?: string;
        street?: string;
        city?: string;
        state?: string;
        pincode?: string;
        country?: string;
      };
    };
    title?: string;
    price?: number;
    quantity?: number;
    hsn?: string;
  }>;
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  vendor?: {
    id?: string;
    businessName?: string;
    contactName?: string;
    phone?: string;
    email?: string;
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
  };
  sellerName?: string;
  deliveryAddress?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  } | string;
  deliveryLine1?: string;
  deliveryLine2?: string;
  deliveryCity?: string;
  deliveryState?: string;
  deliveryPincode?: string;
}

export function generateAndPrintInvoice(order: InvoiceOrderData) {
  const orderNum = order.orderNumber || order.id || 'OD-' + Math.floor(100000 + Math.random() * 900000);
  const invoiceNum = 'INV-' + orderNum.replace(/^OD-/, '');
  const dateStr = order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }) : order.date || new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  // 1. Resolve Sold By / Shipped From Vendor Details
  const vendorObj = order.vendor || (order.items && order.items[0]?.product?.vendor) || null;
  const vendorBusinessName = vendorObj?.businessName || order.sellerName || (order as any).vendorBusinessName || 'ShopIndia Official Fulfillment Center';
  
  const vendorStreet = vendorObj?.street || 'Central Logistics & Dispatch Hub';
  const vendorCity = vendorObj?.city || 'Bengaluru';
  const vendorState = vendorObj?.state || 'Karnataka';
  const vendorPincode = vendorObj?.pincode ? ` - ${vendorObj.pincode}` : '';
  const vendorCityState = `${vendorCity}, ${vendorState}${vendorPincode}`;
  const vendorPhone = vendorObj?.phone ? `Phone: ${vendorObj.phone}` : '';
  const vendorEmail = vendorObj?.email ? `Email: ${vendorObj.email}` : '';

  // 2. Resolve Customer Billing & Shipping Address
  let addressText = '';
  if (typeof order.deliveryAddress === 'string' && order.deliveryAddress.trim()) {
    addressText = order.deliveryAddress;
  } else if (order.deliveryAddress && typeof order.deliveryAddress === 'object') {
    const d = order.deliveryAddress;
    addressText = [d.street, d.city, d.state ? (d.postalCode ? `${d.state} - ${d.postalCode}` : d.state) : d.postalCode].filter(Boolean).join(', ');
  } else if (order.deliveryLine1 || order.deliveryCity) {
    addressText = [order.deliveryLine1, order.deliveryLine2, order.deliveryCity, order.deliveryState ? (order.deliveryPincode ? `${order.deliveryState} - ${order.deliveryPincode}` : order.deliveryState) : order.deliveryPincode].filter(Boolean).join(', ');
  }
  if (!addressText) {
    addressText = 'HSR Layout Sector 4, Outer Ring Road, Bengaluru, Karnataka - 560102';
  }

  const customerName = order.customer?.name || 'Valued Customer';
  const customerEmail = order.customer?.email || 'customer@shopindia.in';
  const customerPhone = order.customer?.phone || '';

  const custState = (typeof order.deliveryAddress === 'object' && order.deliveryAddress?.state) 
    || order.deliveryState 
    || (addressText.match(/(Karnataka|Maharashtra|Delhi|Tamil Nadu|Telangana|Gujarat|Uttar Pradesh|Kerala|West Bengal|Rajasthan|Punjab|Haryana|Bihar|Madhya Pradesh|Andhra Pradesh|Odisha|Goa)/i)?.[0]) 
    || 'Karnataka';
  const placeOfSupply = `${custState}`;

  // 3. Mathematical & Legal Indian GST Calculations (Tax-Inclusive Pricing)
  // Taxable Value = Item Total / (1 + GST_Rate)
  // Total GST = Item Total - Taxable Value
  const rawItems = order.items && order.items.length > 0
    ? order.items
    : [{ name: 'Order Items (Consolidated)', price: order.total, quantity: 1 }];

  const isInterState = vendorState.trim().toLowerCase() !== custState.trim().toLowerCase() && custState.trim().toLowerCase() !== 'karnataka';

  const items = rawItems.map((item, idx) => {
    const title = item.name || item.product?.title || item.title || `Item #${idx + 1}`;
    const qty = item.quantity || 1;
    const price = item.price || item.product?.price || (order.total / (rawItems.length || 1));
    const itemTotal = price * qty;
    
    // Standard GST rate 18% (9% CGST + 9% SGST)
    const gstRate = 0.18;
    const hsn = item.product?.hsn || item.hsn || (8471 + (idx % 10)).toString();

    const taxableTotal = Number((itemTotal / (1 + gstRate)).toFixed(2));
    const taxTotal = Number((itemTotal - taxableTotal).toFixed(2));
    const taxablePerUnit = Number((price / (1 + gstRate)).toFixed(2));

    return {
      title,
      qty,
      price,
      itemTotal,
      hsn,
      taxablePerUnit,
      taxableTotal,
      taxTotal,
      gstRate,
    };
  });

  const grandTotal = Number((order.total || 0).toFixed(2));
  let subtotal = Number(items.reduce((s, it) => s + it.taxableTotal, 0).toFixed(2));
  let totalTax = Number((grandTotal - subtotal).toFixed(2));

  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (isInterState) {
    igst = totalTax;
  } else {
    cgst = Number((totalTax / 2).toFixed(2));
    sgst = Number((totalTax - cgst).toFixed(2));
  }

  // Exact precision adjustment so subtotal + taxes strictly equal grandTotal
  const sumDiff = Number((grandTotal - (subtotal + (isInterState ? igst : (cgst + sgst)))).toFixed(2));
  if (sumDiff !== 0) {
    subtotal = Number((subtotal + sumDiff).toFixed(2));
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Tax Invoice - ${invoiceNum}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    body { background-color: #f8fafc; color: #1e293b; padding: 32px 16px; }
    .invoice-card { max-width: 840px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.06); padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 24px; border-bottom: 2px solid #0F2C59; }
    .brand-title { font-size: 26px; font-weight: 900; color: #0F2C59; letter-spacing: -0.5px; }
    .brand-title span { color: #F97316; }
    .tax-badge { display: inline-block; background: #0F2C59; color: #ffffff; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 4px; text-transform: uppercase; margin-top: 6px; letter-spacing: 0.5px; }
    .company-info { font-size: 11px; line-height: 1.5; color: #64748b; margin-top: 8px; }
    .invoice-meta { text-align: right; font-size: 12px; }
    .invoice-num { font-size: 18px; font-weight: 800; color: #0F2C59; margin-bottom: 4px; font-family: monospace; }
    .meta-row { margin-bottom: 3px; color: #475569; }
    .meta-row strong { color: #0f172a; }
    
    .addresses { display: flex; justify-content: space-between; gap: 24px; margin: 24px 0; }
    .addr-box { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; font-size: 11.5px; line-height: 1.5; }
    .addr-box h4 { font-size: 11px; text-transform: uppercase; color: #64748b; margin-bottom: 6px; font-weight: 800; letter-spacing: 0.5px; }
    .addr-box .name { font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 2px; }

    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
    thead th { background: #0F2C59; color: #ffffff; padding: 10px 12px; text-align: left; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    thead th.text-right { text-align: right; }
    thead th.text-center { text-align: center; }
    tbody td { padding: 12px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    tbody td.text-right { text-align: right; }
    tbody td.text-center { text-align: center; }
    tbody tr:nth-child(even) { background: #f8fafc; }

    .summary-grid { display: flex; justify-content: flex-end; margin-top: 24px; }
    .summary-table { width: 340px; font-size: 12px; }
    .summary-row { display: flex; justify-content: space-between; padding: 6px 0; color: #475569; }
    .summary-row.total { border-top: 2px solid #0F2C59; margin-top: 6px; padding-top: 10px; font-size: 15px; font-weight: 800; color: #0F2C59; }

    .footer { margin-top: 36px; padding-top: 20px; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-between; align-items: flex-end; font-size: 11px; color: #64748b; }
    .authorized { text-align: right; }
    .sign-box { width: 140px; height: 40px; border-bottom: 1px solid #0f172a; margin-bottom: 4px; display: inline-block; }

    .print-actions { max-width: 840px; margin: 0 auto 16px auto; display: flex; justify-content: flex-end; gap: 10px; }
    .btn { padding: 9px 18px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; border: none; transition: all 0.2s; }
    .btn-print { background: #0F2C59; color: #ffffff; }
    .btn-print:hover { background: #1e3a8a; }
    .btn-close { background: #e2e8f0; color: #334155; }

    @media print {
      body { background: #ffffff; padding: 0; }
      .invoice-card { box-shadow: none; border: none; padding: 0; width: 100%; max-width: 100%; }
      .print-actions { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="print-actions">
    <button class="btn btn-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
    <button class="btn btn-close" onclick="window.close()">Close Window</button>
  </div>

  <div class="invoice-card">
    <div class="header">
      <div>
        <div class="brand-title">SHOP<span>INDIA</span></div>
        <div class="tax-badge">Tax Invoice / Bill of Supply</div>
        <div class="company-info">
          <strong>ShopIndia Internet Private Limited</strong><br>
          Buildings Alyssa, Begonia & Clove Embassy Tech Village,<br>
          Outer Ring Road, Bengaluru, Karnataka, India - 560103
        </div>
      </div>
      <div class="invoice-meta">
        <div class="invoice-num">${invoiceNum}</div>
        <div class="meta-row"><strong>Order ID:</strong> ${orderNum}</div>
        <div class="meta-row"><strong>Date:</strong> ${dateStr}</div>
        <div class="meta-row"><strong>Status:</strong> ${order.status?.toUpperCase() || 'CONFIRMED'}</div>
        <div class="meta-row"><strong>Place of Supply:</strong> ${placeOfSupply}</div>
      </div>
    </div>

    <div class="addresses">
      <div class="addr-box">
        <h4>Sold By (Shipped From)</h4>
        <div class="name">${vendorBusinessName}</div>
        <div>${vendorStreet}</div>
        <div>${vendorCityState}</div>
        ${vendorPhone ? `<div>${vendorPhone}</div>` : ''}
        ${vendorEmail ? `<div>${vendorEmail}</div>` : ''}
      </div>
      <div class="addr-box">
        <h4>Billing & Shipping Address</h4>
        <div class="name">${customerName}</div>
        <div>${addressText}</div>
        ${customerPhone ? `<div>Phone: ${customerPhone}</div>` : ''}
        <div>Email: ${customerEmail}</div>
        <div>State: ${custState}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Description</th>
          <th class="text-center">HSN/SAC</th>
          <th class="text-center">Qty</th>
          <th class="text-right">Unit Price</th>
          <th class="text-right">Taxable Amt</th>
          <th class="text-right">Total (Incl. GST)</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((it, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td><strong>${it.title}</strong></td>
            <td class="text-center font-mono">${it.hsn}</td>
            <td class="text-center">${it.qty}</td>
            <td class="text-right font-mono">₹${it.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="text-right font-mono">₹${it.taxableTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="text-right font-mono">₹${it.itemTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="summary-grid">
      <div class="summary-table">
        <div class="summary-row"><span>Taxable Amount</span><span class="font-mono">₹${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
        ${isInterState ? `
          <div class="summary-row"><span>IGST (18.0%)</span><span class="font-mono">₹${igst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
        ` : `
          <div class="summary-row"><span>CGST (9.0%)</span><span class="font-mono">₹${cgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
          <div class="summary-row"><span>SGST (9.0%)</span><span class="font-mono">₹${sgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
        `}
        <div class="summary-row"><span>Delivery / Shipping Fee</span><span style="color:#16a34a;font-weight:700;">FREE</span></div>
        <div class="summary-row total"><span>Grand Total</span><span class="font-mono">₹${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
      </div>
    </div>

    <div class="footer">
      <div>
        <strong>Terms & Conditions:</strong><br>
        1. Goods once sold are covered under ShopIndia Buyer Protection.<br>
        2. This is a computer generated invoice and requires no physical signature.<br>
        3. For support or returns, visit shopindia.in/support.
      </div>
      <div class="authorized">
        <div class="sign-box"></div>
        <div>Authorized Signatory</div>
        <div style="font-size:10px;color:#94a3b8;">For ShopIndia Internet Pvt. Ltd.</div>
      </div>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(() => {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  } else {
    // If popup blocked, create an invisible iframe to print
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    iframe.contentDocument?.open();
    iframe.contentDocument?.write(html);
    iframe.contentDocument?.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 600);
  }
}
