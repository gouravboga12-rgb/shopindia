/**
 * Central Pricing Engine — ShopIndia Platform
 * 
 * Hierarchy: Product > Vendor > Category > Vertical > Global
 * Models supported:
 *   - ADD_ON (Default): Customer Price = Vendor Price + Platform Commission + Gateway Buffer
 *   - DEDUCT (Legacy): Vendor Receives = Customer Price - Platform Commission
 * 
 * Also handles:
 *   - Pan-India (Shiprocket) shipping calculation (Standard fee + Free shipping threshold)
 *   - Quick-commerce distance-based delivery pay & customer delivery fee
 *   - 2% + 18% GST (2.36%) Razorpay gateway fee buffer & safety margin
 */

const prisma = require('./prisma');

// In-memory cache for pricing rules & settings (TTL: 60s)
let _ruleCache = null;
let _settingsCache = null;
let _cacheTimestamp = 0;
const CACHE_TTL_MS = 60 * 1000;

function invalidatePricingCache() {
  _ruleCache = null;
  _settingsCache = null;
  _cacheTimestamp = 0;
}

/**
 * Fetch and cache all active pricing rules, delivery pay rules, and platform settings.
 */
async function getCachedRules() {
  const now = Date.now();
  if (_ruleCache && _settingsCache && (now - _cacheTimestamp < CACHE_TTL_MS)) {
    return { rules: _ruleCache, settings: _settingsCache };
  }

  try {
    const [pricingRules, deliveryRules, settings] = await Promise.all([
      prisma.pricingRule.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.deliveryPayRule.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.appSetting.findMany()
    ]);

    const settingsMap = {};
    settings.forEach(s => {
      settingsMap[s.key] = s.value;
    });

    _ruleCache = { pricingRules, deliveryRules };
    _settingsCache = settingsMap;
    _cacheTimestamp = now;

    return { rules: _ruleCache, settings: _settingsCache };
  } catch (err) {
    console.warn('[PricingEngine] Failed to load rules from DB, using defaults:', err.message);
    return {
      rules: { pricingRules: [], deliveryRules: [] },
      settings: {}
    };
  }
}

/**
 * Resolve the most specific pricing rule for a given context.
 * Priority: Product > Vendor > Category > Vertical > Global
 */
async function resolvePricingRule({ productId, vendorId, categoryId, vertical = 'shop' } = {}) {
  const { rules } = await getCachedRules();
  const list = rules.pricingRules || [];

  // 1. Product level
  if (productId) {
    const r = list.find(r => r.scope === 'product' && r.scopeId === productId);
    if (r) return r;
  }

  // 2. Vendor level
  if (vendorId) {
    const r = list.find(r => r.scope === 'vendor' && r.scopeId === vendorId);
    if (r) return r;
  }

  // 3. Category level
  if (categoryId) {
    const r = list.find(r => r.scope === 'category' && r.scopeId === categoryId);
    if (r) return r;
  }

  // 4. Vertical level ('shop' | 'quick' | 'services')
  if (vertical) {
    const r = list.find(r => r.scope === 'vertical' && r.vertical === vertical);
    if (r) return r;
    const { settings } = await getCachedRules();
    if (vertical === 'services' && settings && settings['service_commission_pct']) {
      return {
        id: 'settings_services',
        scope: 'vertical',
        vertical: 'services',
        commissionPct: parseFloat(settings['service_commission_pct']),
        includeGateway: true,
        isActive: true
      };
    }
  }

  // 5. Global level
  const globalRule = list.find(r => r.scope === 'global');
  if (globalRule) return globalRule;

  // Fallback default rule
  return {
    id: 'default_global',
    scope: 'global',
    commissionPct: 10.00,
    includeGateway: true,
    deliveryFeeRules: null,
    isActive: true
  };
}

/**
 * Calculate item price breakdown.
 * @param {Object} params
 * @param {number} params.vendorPrice - Base payout the vendor receives per unit
 * @param {number} [params.basePrice] - Existing customer-facing price (for legacy deduct model)
 * @param {number} [params.mrp] - Maximum Retail Price (customer price cannot exceed this)
 * @param {Object} [params.rule] - Resolved PricingRule
 * @param {string} [params.model] - 'ADD_ON' or 'DEDUCT'
 */
async function calculateItemPricing({
  vendorPrice,
  basePrice,
  mrp = null,
  rule = null,
  context = {}
} = {}) {
  const resolvedRule = rule || await resolvePricingRule(context);
  const commissionPct = parseFloat(resolvedRule.commissionPct || 10.00);
  const includeGateway = resolvedRule.includeGateway !== false;

  // Gateway fee buffer: Razorpay 2% + 18% GST = 2.36%
  const GATEWAY_FEE_PCT = 2.36;

  // Case 1: ADD_ON model (vendor provides vendorPrice)
  if (vendorPrice != null && Number(vendorPrice) > 0) {
    const vPrice = Number(vendorPrice);
    const commissionAmount = Math.round((vPrice * (commissionPct / 100)) * 100) / 100;
    
    // Gateway buffer: if includeGateway is true, buffer is calculated to avoid loss
    let gatewayBuffer = 0;
    if (includeGateway) {
      // (vPrice + commissionAmount) * 2.36% / (1 - 2.36%) approx
      gatewayBuffer = Math.round(((vPrice + commissionAmount) * (GATEWAY_FEE_PCT / 100)) * 100) / 100;
    }

    const platformFee = Math.round((commissionAmount + gatewayBuffer) * 100) / 100;
    let customerPrice = Math.round(vPrice + platformFee);

    // MRP compliance check: customerPrice cannot exceed MRP
    let isCappedAtMrp = false;
    let mrpExceeded = false;
    if (mrp && mrp > 0) {
      if (customerPrice > mrp) {
        mrpExceeded = true;
        // Cap customer price at MRP
        customerPrice = mrp;
        isCappedAtMrp = true;
      }
    }

    return {
      model: 'ADD_ON',
      vendorPrice: vPrice,
      commissionPct,
      commissionAmount,
      gatewayBuffer,
      platformFee,
      customerPrice,
      mrp: mrp || null,
      isCappedAtMrp,
      mrpExceeded,
      ruleId: resolvedRule.id
    };
  }

  // Case 2: DEDUCT model (Legacy or when vendor specifies target customer basePrice)
  const cPrice = Number(basePrice || 0);
  const commissionAmount = Math.round((cPrice * (commissionPct / 100)) * 100) / 100;
  const gatewayBuffer = includeGateway ? Math.round((cPrice * (GATEWAY_FEE_PCT / 100)) * 100) / 100 : 0;
  const platformFee = commissionAmount;
  const computedVendorPrice = Math.max(0, Math.round((cPrice - platformFee) * 100) / 100);

  return {
    model: 'DEDUCT',
    vendorPrice: computedVendorPrice,
    commissionPct,
    commissionAmount,
    gatewayBuffer,
    platformFee,
    customerPrice: cPrice,
    mrp: mrp || null,
    isCappedAtMrp: false,
    mrpExceeded: false,
    ruleId: resolvedRule.id
  };
}

/**
 * Calculate delivery fee for customer and payout for courier/rider.
 * @param {Object} opts
 * @param {string} opts.fulfillmentType - 'traditional' | 'quick_commerce' | 'hvac_service'
 * @param {number} opts.subtotal - Total price of items in cart
 * @param {number} [opts.distanceKm=3.5] - Delivery distance
 * @param {string} [opts.zoneId] - Regional zone or branch ID
 */
async function calculateDeliveryPricing({
  fulfillmentType = 'traditional',
  subtotal = 0,
  distanceKm = 3.5,
  zoneId = null
} = {}) {
  const { rules, settings } = await getCachedRules();

  // 1. Traditional Pan-India Delivery via Shiprocket 3PL
  if (fulfillmentType === 'traditional' || fulfillmentType === 'shop') {
    const baseFee = parseFloat(settings['shiprocket_base_fee'] || 49);
    const freeThreshold = parseFloat(settings['shiprocket_free_threshold'] || 499);
    const estimatedCourierCost = parseFloat(settings['shiprocket_estimated_cost'] || 45);

    const isFreeDelivery = subtotal >= freeThreshold;
    const customerDeliveryFee = isFreeDelivery ? 0 : baseFee;

    return {
      type: 'shiprocket',
      fulfillmentType: 'traditional',
      customerDeliveryFee,
      riderPay: 0, // No local rider; handled by 3PL courier
      isFreeDelivery,
      freeThreshold,
      baseFee,
      estimatedCourierCost,
      adminMargin: isFreeDelivery ? -estimatedCourierCost : (customerDeliveryFee - estimatedCourierCost)
    };
  }

  // 2. Quick Commerce Delivery via Local Rider Fleet
  if (fulfillmentType === 'quick_commerce' || fulfillmentType === 'quick') {
    const deliveryRules = rules.deliveryRules || [];
    // Find zone-specific rule or global
    let payRule = deliveryRules.find(r => r.scope === 'zone' && r.scopeId === zoneId);
    if (!payRule) {
      payRule = deliveryRules.find(r => r.scope === 'global') || {
        basePayPerOrder: 30,
        payPerKm: 5,
        maxDistanceKm: 15
      };
    }

    const dist = Math.max(0.5, Number(distanceKm) || 3.5);
    const basePay = parseFloat(payRule.basePayPerOrder || 30);
    const perKm = parseFloat(payRule.payPerKm || 5);
    const extraKm = Math.max(0, dist - 2); // First 2 km covered by base
    
    // Rider payout guaranteed
    const riderPay = Math.round(basePay + (extraKm * perKm));

    // Customer quick delivery charge: configured or matches base + perKm
    const customerBase = parseFloat(settings['quick_customer_base_fee'] || 35);
    const customerPerKm = parseFloat(settings['quick_customer_per_km'] || 7);
    const customerFreeThreshold = parseFloat(settings['quick_free_threshold'] || 999);

    let customerDeliveryFee = Math.round(customerBase + (extraKm * customerPerKm));
    let isFreeDelivery = false;
    if (subtotal >= customerFreeThreshold && customerFreeThreshold > 0) {
      customerDeliveryFee = 0;
      isFreeDelivery = true;
    }

    return {
      type: 'rider',
      fulfillmentType: 'quick_commerce',
      customerDeliveryFee,
      riderPay,
      distanceKm: dist,
      isFreeDelivery,
      freeThreshold: customerFreeThreshold,
      adminMargin: customerDeliveryFee - riderPay
    };
  }

  // 3. Service Jobs (HVAC / Doorstep Services)
  const visitCharge = parseFloat(settings['service_visit_charge'] || 199);
  const minTechnicianPay = parseFloat(settings['service_technician_min_pay'] || 149);

  return {
    type: 'technician',
    fulfillmentType: 'hvac_service',
    customerDeliveryFee: visitCharge,
    riderPay: minTechnicianPay,
    isFreeDelivery: false,
    adminMargin: visitCharge - minTechnicianPay
  };
}

/**
 * Calculate full checkout breakdown for a cart / order.
 */
async function calculateCartTotals({
  items = [],
  fulfillmentType = 'traditional',
  distanceKm = 3.5,
  zoneId = null,
  couponDiscount = 0
} = {}) {
  let subtotal = 0;
  let totalVendorPayout = 0;
  let totalPlatformCommission = 0;
  let totalGatewayBuffer = 0;
  const processedItems = [];

  for (const item of items) {
    const qty = Number(item.quantity) || 1;
    const itemPricing = await calculateItemPricing({
      vendorPrice: item.vendorPrice,
      basePrice: item.price || item.basePrice,
      mrp: item.mrp,
      context: {
        productId: item.productId,
        vendorId: item.vendorId,
        categoryId: item.categoryId
      }
    });

    const itemSubtotal = itemPricing.customerPrice * qty;
    const itemVendorTotal = itemPricing.vendorPrice * qty;
    const itemPlatformTotal = itemPricing.platformFee * qty;

    subtotal += itemSubtotal;
    totalVendorPayout += itemVendorTotal;
    totalPlatformCommission += (itemPricing.commissionAmount * qty);
    totalGatewayBuffer += (itemPricing.gatewayBuffer * qty);

    processedItems.push({
      ...item,
      quantity: qty,
      customerUnitPrice: itemPricing.customerPrice,
      vendorUnitPrice: itemPricing.vendorPrice,
      platformFeePerUnit: itemPricing.platformFee,
      commissionAmountPerUnit: itemPricing.commissionAmount,
      gatewayBufferPerUnit: itemPricing.gatewayBuffer,
      itemSubtotal,
      itemVendorTotal
    });
  }

  // Delivery Pricing
  const delivery = await calculateDeliveryPricing({
    fulfillmentType,
    subtotal,
    distanceKm,
    zoneId
  });

  const discount = Math.min(subtotal, Math.max(0, Number(couponDiscount) || 0));
  const finalCustomerTotal = Math.max(0, Math.round((subtotal - discount + delivery.customerDeliveryFee) * 100) / 100);

  // Exact Gateway Fee Estimate: Razorpay standard 2% + 18% GST (2.36%) on gross collected
  const estimatedGatewayFee = Math.round((finalCustomerTotal * 0.0236) * 100) / 100;

  // Platform Net Profit
  // Profit = Commission + (Customer Delivery Fee - Rider Pay/Courier Cost) - Discount absorbed - Gateway Fee
  const deliveryMargin = delivery.adminMargin || 0;
  const platformNetProfit = Math.round(
    (totalPlatformCommission + deliveryMargin - estimatedGatewayFee) * 100
  ) / 100;

  return {
    items: processedItems,
    subtotal,
    delivery,
    discount,
    finalCustomerTotal,
    totalVendorPayout,
    totalRiderPayout: delivery.riderPay,
    totalPlatformCommission,
    totalGatewayBuffer,
    estimatedGatewayFee,
    platformNetProfit
  };
}

/**
 * Simulator function for the Admin Live Profit/Loss Calculator.
 */
async function simulatePricing({
  vendorPrice = 100,
  mrp = 150,
  commissionPct = 10,
  includeGateway = true,
  fulfillmentType = 'traditional',
  distanceKm = 3.5,
  shippingFee = 49,
  freeShippingAbove = 499,
  riderBasePay = 30,
  riderPayPerKm = 5
} = {}) {
  const vPrice = parseFloat(vendorPrice) || 0;
  const commPct = parseFloat(commissionPct) || 10;
  const GATEWAY_FEE_PCT = 2.36;

  // 1. Commission amount
  const commissionAmount = Math.round((vPrice * (commPct / 100)) * 100) / 100;
  
  // 2. Gateway buffer
  const gatewayBuffer = includeGateway ? Math.round(((vPrice + commissionAmount) * (GATEWAY_FEE_PCT / 100)) * 100) / 100 : 0;
  const platformFee = Math.round((commissionAmount + gatewayBuffer) * 100) / 100;
  
  // 3. Customer price
  let customerPrice = Math.round(vPrice + platformFee);
  let isCappedAtMrp = false;
  if (mrp && mrp > 0 && customerPrice > mrp) {
    customerPrice = mrp;
    isCappedAtMrp = true;
  }

  // 4. Delivery calculations
  let customerDelivery = 0;
  let deliveryCost = 0;
  let deliveryMargin = 0;

  if (fulfillmentType === 'traditional' || fulfillmentType === 'shop') {
    const isFree = customerPrice >= freeShippingAbove;
    customerDelivery = isFree ? 0 : parseFloat(shippingFee);
    deliveryCost = 45; // Estimated Shiprocket courier cost
    deliveryMargin = customerDelivery - deliveryCost;
  } else if (fulfillmentType === 'services' || fulfillmentType === 'hvac_service') {
    // Doorstep Services & Repairs
    customerDelivery = parseFloat(shippingFee) >= 0 ? parseFloat(shippingFee) : 199; // Visit charge paid by customer
    deliveryCost = parseFloat(riderBasePay) >= 0 ? parseFloat(riderBasePay) : 149; // Guaranteed minimum pay credited to technician
    deliveryMargin = customerDelivery - deliveryCost;
  } else {
    // Quick commerce
    const dist = Math.max(0.5, parseFloat(distanceKm) || 3.5);
    const extraKm = Math.max(0, dist - 2);
    const riderPay = Math.round(parseFloat(riderBasePay) + (extraKm * parseFloat(riderPayPerKm)));
    customerDelivery = Math.round(35 + (extraKm * 7));
    deliveryCost = riderPay;
    deliveryMargin = customerDelivery - deliveryCost;
  }

  const grossTotal = customerPrice + customerDelivery;
  const gatewayFeeActual = Math.round((grossTotal * (GATEWAY_FEE_PCT / 100)) * 100) / 100;

  // Net Profit to Super Admin
  const netProfit = Math.round(
    (commissionAmount + (includeGateway ? gatewayBuffer : 0) + deliveryMargin - gatewayFeeActual) * 100
  ) / 100;

  return {
    vendorPrice: vPrice,
    mrp: mrp || null,
    commissionPct: commPct,
    commissionAmount,
    gatewayBuffer,
    platformFee,
    customerPrice,
    isCappedAtMrp,
    customerDelivery,
    deliveryCost,
    deliveryMargin,
    grossTotal,
    gatewayFeeActual,
    netProfit,
    isProfitable: netProfit >= 0
  };
}

module.exports = {
  resolvePricingRule,
  calculateItemPricing,
  calculateDeliveryPricing,
  calculateCartTotals,
  simulatePricing,
  invalidatePricingCache,
  getCachedRules
};
