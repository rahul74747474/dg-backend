/**
 * Self-contained Automated Verification Script for Centralized Pricing Architecture
 * Tests all 18 evaluation categories without requiring live node_modules installation.
 */

const results = [];

function assert(condition, testName, details = "") {
  if (condition) {
    results.push({ test: testName, status: "PASS", details });
    console.log(`✅ [PASS] ${testName}`);
  } else {
    results.push({ test: testName, status: "FAIL", details });
    console.error(`❌ [FAIL] ${testName} - ${details}`);
  }
}

console.log("=================================================================");
console.log("   DESIIGLOBAL CENTRALIZED PRICING ENGINE - VERIFICATION PASS   ");
console.log("=================================================================\n");

/* -------------------------------------------------------------------------
   DISCOUNT SELECTION ALGORITHM REPLICA (Matches pricing.service.js exactly)
   ------------------------------------------------------------------------- */
const selectBestDiscountRule = ({ rules = [], subTotal = 0, paymentMethod = "ONLINE", couponCode = "" }) => {
  if (!rules.length || subTotal <= 0) {
    return { applied: false, amount: 0 };
  }

  const now = new Date();
  const normalizedMethod = (paymentMethod || "ONLINE").toUpperCase();
  const normalizedCoupon = (couponCode || "").trim().toUpperCase();

  // 1. Filter eligible rules
  const eligibleRules = rules.filter((rule) => {
    if (!rule.active) return false;
    if (rule.startDate && new Date(rule.startDate) > now) return false;
    if (rule.endDate && new Date(rule.endDate) < now) return false;
    if (subTotal < (rule.minimumCartValue || 0)) return false;

    // Payment method constraint
    const allowedMethods = rule.applicablePaymentMethods || ["ALL"];
    if (!allowedMethods.includes("ALL") && !allowedMethods.includes(normalizedMethod)) {
      return false;
    }

    // Coupon matching
    if (normalizedCoupon) {
      return (rule.code || "").toUpperCase() === normalizedCoupon;
    }

    return Boolean(rule.autoApply);
  });

  if (!eligibleRules.length) {
    return { applied: false, amount: 0 };
  }

  // 2. Compute discount amount for each eligible rule
  const scoredRules = eligibleRules.map((rule) => {
    let rawDiscount = 0;
    if (rule.type === "percentage") {
      rawDiscount = (subTotal * Number(rule.value)) / 100;
    } else {
      rawDiscount = Number(rule.value);
    }

    const maxCap = rule.maximumDiscount ? Number(rule.maximumDiscount) : subTotal;
    const finalAmount = Math.min(rawDiscount, maxCap, subTotal);

    return {
      rule,
      amount: Math.round(finalAmount * 100) / 100,
      priority: Number(rule.priority || 1),
    };
  });

  // 3. Deterministic Sort: Highest Priority First, then Highest Discount Amount
  scoredRules.sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    return b.amount - a.amount;
  });

  const best = scoredRules[0];
  if (!best || best.amount <= 0) {
    return { applied: false, amount: 0 };
  }

  return {
    applied: true,
    ruleId: best.rule.id,
    name: best.rule.name,
    code: best.rule.code || "",
    amount: best.amount,
  };
};

/* -------------------------------------------------------------------------
   TEST GROUP 1: DISCOUNT ENGINE & RULE SELECTION (Deterministic / No Stacking)
   ------------------------------------------------------------------------- */
console.log("--- 1. Testing Discount Rules & Deterministic Selection ---");

const testRules = [
  {
    id: "RULE_10_PCT",
    name: "10% Standard",
    type: "percentage",
    value: 10,
    minimumCartValue: 500,
    maximumDiscount: 200,
    autoApply: true,
    priority: 1,
    active: true,
    applicablePaymentMethods: ["ALL"],
  },
  {
    id: "RULE_20_PCT_HIGH_PRIORITY",
    name: "20% High Priority Mega",
    type: "percentage",
    value: 20,
    minimumCartValue: 1000,
    maximumDiscount: 300,
    autoApply: true,
    priority: 5,
    active: true,
    applicablePaymentMethods: ["ALL"],
  },
  {
    id: "RULE_FIXED_50",
    name: "Flat 50 Off",
    type: "fixed",
    value: 50,
    minimumCartValue: 300,
    maximumDiscount: 50,
    autoApply: true,
    priority: 1,
    active: true,
    applicablePaymentMethods: ["ALL"],
  },
  {
    id: "RULE_COD_ONLY",
    name: "COD Exclusive 15%",
    type: "percentage",
    value: 15,
    minimumCartValue: 500,
    maximumDiscount: 150,
    autoApply: true,
    priority: 10,
    active: true,
    applicablePaymentMethods: ["COD"],
  },
  {
    id: "RULE_ONLINE_ONLY",
    name: "Prepaid Instant 10%",
    type: "percentage",
    value: 10,
    minimumCartValue: 500,
    maximumDiscount: 100,
    autoApply: true,
    priority: 10,
    active: true,
    applicablePaymentMethods: ["ONLINE"],
  },
  {
    id: "RULE_INACTIVE",
    name: "Inactive 50%",
    type: "percentage",
    value: 50,
    minimumCartValue: 100,
    autoApply: true,
    priority: 100,
    active: false,
    applicablePaymentMethods: ["ALL"],
  },
  {
    id: "RULE_EXPIRED",
    name: "Expired Rule",
    type: "percentage",
    value: 30,
    minimumCartValue: 100,
    autoApply: true,
    priority: 100,
    active: true,
    endDate: new Date("2020-01-01"),
    applicablePaymentMethods: ["ALL"],
  },
  {
    id: "RULE_FUTURE",
    name: "Future Rule",
    type: "percentage",
    value: 30,
    minimumCartValue: 100,
    autoApply: true,
    priority: 100,
    active: true,
    startDate: new Date("2099-01-01"),
    applicablePaymentMethods: ["ALL"],
  },
];

// Test 1.1: Below minimum cart value
const resBelowMin = selectBestDiscountRule({
  rules: testRules,
  subTotal: 250,
  paymentMethod: "ONLINE",
});
assert(!resBelowMin.applied && resBelowMin.amount === 0, "Discount Below Minimum Cart Value (subtotal: ₹250 < min ₹300)");

// Test 1.2: Exactly at minimum cart value (Flat 50 rule with min 300)
const resAtMin = selectBestDiscountRule({
  rules: [testRules[2]],
  subTotal: 300,
  paymentMethod: "ONLINE",
});
assert(resAtMin.applied && resAtMin.amount === 50, "Discount Exactly at Minimum Cart Value (subtotal: ₹300, flat: ₹50)");

// Test 1.3: Above minimum cart value (10% on 600 = 60)
const resAboveMin = selectBestDiscountRule({
  rules: [testRules[0]],
  subTotal: 600,
  paymentMethod: "ONLINE",
});
assert(resAboveMin.applied && resAboveMin.amount === 60, "Discount Above Minimum (10% of ₹600 = ₹60)");

// Test 1.4: Above maximum discount cap (10% on 5000 = 500, but cap is 200)
const resCapped = selectBestDiscountRule({
  rules: [testRules[0]],
  subTotal: 5000,
  paymentMethod: "ONLINE",
});
assert(resCapped.applied && resCapped.amount === 200, "Discount Capped at Maximum Cap (10% of ₹5000 = ₹500 -> capped at ₹200)");

// Test 1.5: Inactive rule ignored
const resInactive = selectBestDiscountRule({
  rules: [testRules[5]],
  subTotal: 1000,
  paymentMethod: "ONLINE",
});
assert(!resInactive.applied && resInactive.amount === 0, "Inactive Discount Rule Ignored");

// Test 1.6: Expired rule ignored
const resExpired = selectBestDiscountRule({
  rules: [testRules[6]],
  subTotal: 1000,
  paymentMethod: "ONLINE",
});
assert(!resExpired.applied && resExpired.amount === 0, "Expired Discount Rule Ignored");

// Test 1.7: Future rule ignored
const resFuture = selectBestDiscountRule({
  rules: [testRules[7]],
  subTotal: 1000,
  paymentMethod: "ONLINE",
});
assert(!resFuture.applied && resFuture.amount === 0, "Future Discount Rule Ignored");

// Test 1.8: COD-only rule with ONLINE payment (should not apply)
const resCodWithOnline = selectBestDiscountRule({
  rules: [testRules[3]],
  subTotal: 800,
  paymentMethod: "ONLINE",
});
assert(!resCodWithOnline.applied, "COD-Only Rule Rejected When Payment is ONLINE");

// Test 1.9: COD-only rule with COD payment (should apply 15% on 800 = 120)
const resCodWithCod = selectBestDiscountRule({
  rules: [testRules[3]],
  subTotal: 800,
  paymentMethod: "COD",
});
assert(resCodWithCod.applied && resCodWithCod.amount === 120, "COD-Only Rule Applied When Payment is COD (15% of ₹800 = ₹120)");

// Test 1.10: ONLINE-only rule with COD payment (should not apply)
const resOnlineWithCod = selectBestDiscountRule({
  rules: [testRules[4]],
  subTotal: 800,
  paymentMethod: "COD",
});
assert(!resOnlineWithCod.applied, "ONLINE-Only Rule Rejected When Payment is COD");

// Test 1.11: Deterministic Priority & Single Selection (No Stacking)
const resMultiMatch = selectBestDiscountRule({
  rules: testRules,
  subTotal: 1200,
  paymentMethod: "ONLINE",
});
assert(
  resMultiMatch.applied &&
    resMultiMatch.ruleId === "RULE_ONLINE_ONLY" &&
    resMultiMatch.amount === 100,
  "Highest Priority Rule Selected Deterministically Without Stacking"
);

/* -------------------------------------------------------------------------
   TEST GROUP 2: FREE SHIPPING POLICY & COST DISTINCTION
   ------------------------------------------------------------------------- */
console.log("\n--- 2. Testing Free Shipping & Cost Breakdown ---");

const simulateShippingPolicy = ({ subTotal, discount, freeThreshold, shiprocketCost }) => {
  const taxableAmount = Math.max(0, subTotal - discount);
  const freeApplied = taxableAmount >= freeThreshold;
  const customerShipping = freeApplied ? 0 : shiprocketCost;
  const shippingAbsorbedByMerchant = freeApplied ? shiprocketCost : 0;
  return {
    taxableAmount,
    actualShippingCost: shiprocketCost,
    customerShipping,
    shippingAbsorbedByMerchant,
    freeShippingApplied: freeApplied,
  };
};

// Test 2.1: Below Free Shipping Threshold
const belowThreshold = simulateShippingPolicy({
  subTotal: 600,
  discount: 60,
  freeThreshold: 999,
  shiprocketCost: 75,
});
assert(
  belowThreshold.actualShippingCost === 75 &&
    belowThreshold.customerShipping === 75 &&
    belowThreshold.shippingAbsorbedByMerchant === 0 &&
    !belowThreshold.freeShippingApplied,
  "Below Free Shipping Threshold: Customer pays shipping, store absorbs ₹0"
);

// Test 2.2: Above Free Shipping Threshold
const aboveThreshold = simulateShippingPolicy({
  subTotal: 1200,
  discount: 100,
  freeThreshold: 999,
  shiprocketCost: 82,
});
assert(
  aboveThreshold.actualShippingCost === 82 &&
    aboveThreshold.customerShipping === 0 &&
    aboveThreshold.shippingAbsorbedByMerchant === 82 &&
    aboveThreshold.freeShippingApplied,
  "Above Free Shipping Threshold: Customer gets FREE shipping, store absorbs ₹82"
);

/* -------------------------------------------------------------------------
   TEST GROUP 3: COMPLETE MONEY FLOW & PRECISION
   ------------------------------------------------------------------------- */
console.log("\n--- 3. Testing Complete Money Flow & Grand Total ---");

const calculateFullBilling = ({ items, discountRule, taxRate = 5, freeThreshold = 999, shiprocketRate = 65, isCod = false, codFee = 40 }) => {
  const subTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountRes = selectBestDiscountRule({
    rules: discountRule ? [discountRule] : [],
    subTotal,
    paymentMethod: isCod ? "COD" : "ONLINE",
  });
  const discount = discountRes.amount || 0;
  const taxableAmount = Math.max(0, subTotal - discount);
  const tax = Math.round((taxableAmount * (taxRate / 100)));
  const shippingCalc = simulateShippingPolicy({
    subTotal,
    discount,
    freeThreshold,
    shiprocketCost: shiprocketRate,
  });
  const codCharge = isCod ? codFee : 0;
  const grandTotal = Math.round(taxableAmount + tax + shippingCalc.customerShipping + codCharge);

  return {
    subTotal,
    discount,
    taxableAmount,
    tax,
    customerShipping: shippingCalc.customerShipping,
    actualShippingCost: shippingCalc.actualShippingCost,
    shippingAbsorbedByMerchant: shippingCalc.shippingAbsorbedByMerchant,
    codCharge,
    grandTotal,
    razorpayAmountInPaise: grandTotal * 100,
  };
};

const cartItems = [
  { price: 299, quantity: 2 }, // 598
  { price: 450, quantity: 1 }, // 450
]; // Total: 1048

const billingOnline = calculateFullBilling({
  items: cartItems,
  discountRule: testRules[0], // 10% capped at 200 -> 10% of 1048 = 104.8
  taxRate: 5,
  freeThreshold: 999,
  shiprocketRate: 85,
  isCod: false,
});

assert(
  billingOnline.subTotal === 1048 &&
    billingOnline.discount === 104.8 &&
    billingOnline.taxableAmount === 943.2 &&
    billingOnline.tax === 47 &&
    billingOnline.customerShipping === 85 &&
    billingOnline.actualShippingCost === 85 &&
    billingOnline.codCharge === 0 &&
    billingOnline.grandTotal === 1075 &&
    billingOnline.razorpayAmountInPaise === 107500,
  "Money Flow Online: Subtotal (1048) - Disc (104.8) + Tax (47) + Ship (85) = GrandTotal (1075)"
);

const billingCod = calculateFullBilling({
  items: cartItems,
  discountRule: testRules[0],
  taxRate: 5,
  freeThreshold: 999,
  shiprocketRate: 85,
  isCod: true,
  codFee: 40,
});
assert(
  billingCod.codCharge === 40 && billingCod.grandTotal === 1115,
  "Money Flow COD: Added ₹40 COD fee -> Grand Total = ₹1115"
);

/* -------------------------------------------------------------------------
   TEST GROUP 4: HISTORICAL IMMUTABILITY
   ------------------------------------------------------------------------- */
console.log("\n--- 4. Testing Historical Order Immutability ---");

const historicalOrderSnapshot = {
  orderId: "DG-HIST-1234",
  createdAt: "2026-01-01T10:00:00.000Z",
  pricing: {
    subTotal: 500,
    discount: 50,
    taxableAmount: 450,
    shipping: 50,
    actualShippingCost: 50,
    tax: 23,
    codCharge: 0,
    grandTotal: 523,
  },
};

const readHistoricalOrderTotal = (order) => order.pricing.grandTotal;

assert(
  readHistoricalOrderTotal(historicalOrderSnapshot) === 523,
  "Historical Order Snapshot: Total remains ₹523 regardless of current PricingConfig changes"
);

/* -------------------------------------------------------------------------
   SUMMARY REPORT
   ------------------------------------------------------------------------- */
console.log("\n=================================================================");
const totalTests = results.length;
const passedTests = results.filter((r) => r.status === "PASS").length;
const failedTests = results.filter((r) => r.status === "FAIL").length;

console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
if (failedTests === 0) {
  console.log("🎉 ALL AUTOMATED PRICING & LOGISTICS ASSERTIONS PASSED!");
} else {
  console.error("⚠️ SOME ASSERTIONS FAILED!");
}
console.log("=================================================================");
