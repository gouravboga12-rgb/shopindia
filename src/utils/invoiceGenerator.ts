export interface InvoiceOrderData {
  id?: string;
  orderNumber?: string;
  createdAt?: string;
  status?: string;
  type?: string;
  vertical?: string;
  total: number;
  items?: Array<{
    name?: string;
    product?: {
      title?: string;
      price?: number;
      category?: string;
    };
    title?: string;
    price?: number;
    quantity?: number;
  }>;
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  vendor?: {
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
  deliveryAddress?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  } | string;
}

export function generateAndPrintInvoice(order: InvoiceOrderData) {
  const orderNum = order.orderNumber || order.id || 'OD-' + Math.floor(100000 + Math.random() * 900000);
  const invoiceNum = 'INV-' + orderNum.replace(/^OD-/, '');
  const dateStr = order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }) : new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const rawItems = order.items && order.items.length > 0
    ? order.items
    : [{ name: 'Order Items (Consolidated)', price: order.total, quantity: 1 }];

  // Standard Indian GST for Retail & E-Commerce: 18% (9.0% CGST + 9.0% SGST)
  // Store prices are inclusive of GST.
  // Formula: Taxable Value = Line Total / (1 + GST_RATE)
  const GST_RATE = 0.18;
  const CGST_RATE = 0.09;

  const items = rawItems.map((item, idx) => {
    const title = item.name || item.product?.title || item.title || `Item #${idx + 1}`;
    const qty = Number(item.quantity) || 1;
    const price = Number(item.price || item.product?.price || 0) || Math.round((order.total || 0) / (rawItems.length || 1));
    const lineTotal = price * qty;
    const hsn = 8471 + (idx % 10);
    
    // Taxable amount before GST
    const taxableTotal = Math.round((lineTotal / (1 + GST_RATE)) * 100) / 100;
    const taxTotal = Math.round((lineTotal - taxableTotal) * 100) / 100;

    return {
      title,
      qty,
      price,
      lineTotal,
      hsn,
      taxableTotal,
      taxTotal,
    };
  });

  const grandTotal = Number(order.total) || items.reduce((s, it) => s + it.lineTotal, 0);
  const totalTaxable = Math.round(items.reduce((s, it) => s + it.taxableTotal, 0) * 100) / 100;
  const totalTax = Math.round((grandTotal - totalTaxable) * 100) / 100;
  
  // Exact 9.0% CGST and 9.0% SGST
  const cgst = Math.round((totalTaxable * CGST_RATE) * 100) / 100;
  const sgst = Math.round((totalTax - cgst) * 100) / 100;

  const addressText = typeof order.deliveryAddress === 'string'
    ? order.deliveryAddress
    : order.deliveryAddress
    ? `${order.deliveryAddress.street || 'HSR Layout'}, ${order.deliveryAddress.city || 'Bengaluru'}, ${order.deliveryAddress.state || 'Karnataka'} - ${order.deliveryAddress.postalCode || '560102'}`
    : 'HSR Layout Sector 4, Outer Ring Road, Bengaluru, Karnataka - 560102';

  const customerName = order.customer?.name || 'Valued Customer';
  const customerEmail = order.customer?.email || 'customer@shopindia.in';
  const customerPhone = order.customer?.phone || '';

  // Vendor Shipped-From Details
  const vendor = order.vendor || {};
  const vendorName = vendor.businessName || 'ShopIndia Official Fulfilment Partner';
  const vendorStreet = vendor.street || 'Plot No. 44, Electronic City Phase 1, Hosur Road';
  const vendorCity = vendor.city || 'Bengaluru';
  const vendorState = vendor.state || 'Karnataka';
  const vendorPincode = vendor.pincode ? ` - ${vendor.pincode}` : ' - 560100';
  const vendorLocation = `${vendorCity}, ${vendorState}${vendorPincode}`;
  const vendorContact = vendor.phone ? `Phone: ${vendor.phone}` : (vendor.email ? `Email: ${vendor.email}` : '');

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

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
        <div class="meta-row"><strong>Place of Supply:</strong> Karnataka (29)</div>
      </div>
    </div>

    <div class="addresses">
      <div class="addr-box">
        <h4>Sold By (Shipped From)</h4>
        <div class="name">${vendorName}</div>
        <div>${vendorStreet}</div>
        <div>${vendorLocation}</div>
        ${vendorContact ? `<div>${vendorContact}</div>` : ''}
        <div>State: ${vendorState}</div>
      </div>
      <div class="addr-box">
        <h4>Billing & Shipping Address</h4>
        <div class="name">${customerName}</div>
        <div>${addressText}</div>
        <div>Email: ${customerEmail}</div>
        ${customerPhone ? `<div>Phone: ${customerPhone}</div>` : ''}
        <div>State: Karnataka (29)</div>
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
            <td class="text-right font-mono">₹${formatCurrency(it.price)}</td>
            <td class="text-right font-mono">₹${formatCurrency(it.taxableTotal)}</td>
            <td class="text-right font-mono">₹${formatCurrency(it.lineTotal)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="summary-grid">
      <div class="summary-table">
        <div class="summary-row"><span>Taxable Amount</span><span>₹${formatCurrency(totalTaxable)}</span></div>
        <div class="summary-row"><span>CGST (9.0%)</span><span>₹${formatCurrency(cgst)}</span></div>
        <div class="summary-row"><span>SGST (9.0%)</span><span>₹${formatCurrency(sgst)}</span></div>
        <div class="summary-row"><span>Delivery / Shipping Fee</span><span style="color:#16a34a;font-weight:700;">FREE</span></div>
        <div class="summary-row total"><span>Grand Total</span><span>₹${formatCurrency(grandTotal)}</span></div>
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
        <div style="font-size:10px;color:#94a3b8;">For ${vendorName}</div>
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
