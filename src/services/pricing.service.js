import PricingConfig from "../models/PricingConfig.model.js";
import CartProduct from "../models/Cartproduct.model.js";
import Product from "../models/Product.model.js";
import { getShippingRateForCart } from "./shiprocket.service.js";

/**
 * Retrieves the active PricingConfig from MongoDB or initializes the default configuration if absent.
 */
export const getActivePricingConfig = async () => {
  let config = await PricingConfig.findOne({ key: "default", isActive: true });

  if (!config) {
    config = await PricingConfig.create({
      key: "default",
      currency: "INR",
      isActive: true,
      tax: {
        enabled: true,
        type: "percentage",
        rate: 5, // 5% GST
        includedInPrice: false,
      },
      shippingPolicy: {
        freeShippingThreshold: 999, // Free shipping on orders >= ₹999
        courierSelectionStrategy: "cheapest",
      },
      discounts: {
        enabled: true,
        rules: [
          {
            id: "DEFAULT_10",
            name: "10% Store Discount",
            type: "percentage",
            value: 10,
            minimumCartValue: 0,
            maximumDiscount: 500,
            autoApply: true,
            priority: 1,
            active: true,
            applicablePaymentMethods: ["ALL"],
          },
        ],
      },
      cod: {
        enabled: true,
        fee: 0,
        maxCartValue: 10000,
      },
      packagingDefaults: {
        defaultWeightPerItem: 0.25,
        defaultLength: 10,
        defaultBreadth: 10,
        defaultHeight: 5,
      },
    });
  }

  return config;
};

/**
 * Evaluates active discount rules deterministically and selects the SINGLE highest priority / best discount.
 * Prevents accidental rule stacking.
 *
 * @param {Object} params
 * @param {Array} params.rules - Array of discount rules from PricingConfig
 * @param {number} params.subTotal - Cart subtotal in INR
 * @param {string} params.paymentMethod - "COD" | "ONLINE" | "ALL"
 * @param {string} [params.couponCode] - Optional user-entered coupon code
 * @returns {{ applied: boolean, name?: string, code?: string, amount: number, ruleId?: string }}
 */
export const selectBestDiscountRule = ({ rules = [], subTotal = 0, paymentMethod = "ONLINE", couponCode = "" }) => {
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

    // Coupon matching: if user provided a coupon, match exact code; otherwise match autoApply rules
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

    // Apply maximum discount cap
    const maxCap = rule.maximumDiscount ? Number(rule.maximumDiscount) : subTotal;
    const finalAmount = Math.min(rawDiscount, maxCap, subTotal);

    return {
      rule,
      amount: Math.round(finalAmount * 100) / 100, // 2 decimal precision
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

/**
 * Central Authoritative Order Pricing Calculation Engine.
 * Calculates subtotal, discounts, tax, real-time Shiprocket shipping, COD fee, and grand total.
 *
 * @param {Object} params
 * @param {string} params.userId - User ID
 * @param {Array} [params.cartItems] - Optional populated cart items array (if already loaded in session)
 * @param {Object} [params.address] - Delivery address object with `pincode`, `city`, `state`
 * @param {string} [params.paymentMethod="ONLINE"] - "COD" | "ONLINE"
 * @param {string} [params.couponCode=""] - User-submitted coupon code
 * @param {ClientSession} [params.session] - Optional Mongoose transaction session
 * @returns {Promise<Object>} Complete billing breakdown
 */
export const calculateOrderPricing = async ({
  userId,
  cartItems = null,
  address = null,
  paymentMethod = "ONLINE",
  couponCode = "",
  session = null,
}) => {
  // 1. Fetch active pricing configuration from MongoDB
  const config = await getActivePricingConfig();

  // 2. Fetch cart items with populated active products from database if not supplied
  let items = cartItems;
  if (!items) {
    const query = CartProduct.find({ userId }).populate({
      path: "productId",
      select: "name price sku weight dimensions hsnCode tax images status countInStock",
    });

    if (session) {
      query.session(session);
    }
    items = await query.exec();
  }

  if (!items || !items.length) {
    throw new Error("Cart is empty");
  }

  // 3. Validate stock & live product prices, build order items snapshot
  let subTotal = 0;
  const orderItems = [];

  const defaults = config.packagingDefaults || {
    defaultWeightPerItem: 0.25,
    defaultLength: 10,
    defaultBreadth: 10,
    defaultHeight: 5,
  };

  for (const item of items) {
    const product = item.productId;

    if (!product || product.status === "INACTIVE" || product.status === "ARCHIVED") {
      throw new Error(`Product "${product?.name || "Item"}" is currently unavailable`);
    }

    if (product.countInStock < item.quantity) {
      throw new Error(`Insufficient stock for "${product.name}". Available: ${product.countInStock}`);
    }

    const itemPrice = Number(product.price);
    const itemQuantity = Number(item.quantity);
    const itemTotal = itemPrice * itemQuantity;
    subTotal += itemTotal;

    const itemWeight = Number(product.weight) || defaults.defaultWeightPerItem;
    const itemLength = Number(product.dimensions?.length) || defaults.defaultLength;
    const itemBreadth = Number(product.dimensions?.breadth) || defaults.defaultBreadth;
    const itemHeight = Number(product.dimensions?.height) || defaults.defaultHeight;

    orderItems.push({
      productId: product._id,
      name: product.name,
      image: product.images?.[0] || "",
      sku: product.sku || `SKU-${product._id}`,
      price: itemPrice,
      quantity: itemQuantity,
      total: itemTotal,
      weight: itemWeight,
      length: itemLength,
      breadth: itemBreadth,
      height: itemHeight,
      hsnCode: product.hsnCode || "20081910",
      tax: product.tax || 0,
    });
  }

  subTotal = Math.round(subTotal * 100) / 100;

  // 4. Evaluate Centralized Discount
  let discountResult = { applied: false, amount: 0 };
  if (config.discounts?.enabled) {
    discountResult = selectBestDiscountRule({
      rules: config.discounts.rules || [],
      subTotal,
      paymentMethod,
      couponCode,
    });
  }

  const discountAmount = discountResult.amount || 0;
  const taxableAmount = Math.max(0, Math.round((subTotal - discountAmount) * 100) / 100);

  // 5. Calculate Centralized Tax
  let tax = 0;
  if (config.tax?.enabled) {
    const taxRate = Number(config.tax.rate) || 0;
    tax = Math.round((taxableAmount * (taxRate / 100)));
  }

  // 6. Aggregate Shipment Dimensions & Weight from actual cart items
  const totalWeight = Math.round(
    orderItems.reduce((acc, item) => acc + item.weight * item.quantity, 0) * 100
  ) / 100;

  const maxLength = Math.max(...orderItems.map((i) => i.length || 10), 10);
  const maxBreadth = Math.max(...orderItems.map((i) => i.breadth || 10), 10);
  const totalHeight = orderItems.reduce((acc, i) => acc + (i.height || 5) * i.quantity, 0);

  const shipmentDetails = {
    weight: Math.max(totalWeight, 0.5), // Min 0.5kg for Shiprocket
    length: maxLength,
    breadth: maxBreadth,
    height: totalHeight,
  };

  // 7. Calculate Real-Time Shiprocket Shipping
  let shippingInfo = {
    serviceable: true,
    pincode: address?.pincode || null,
    courier: "Standard Shipping",
    estimatedDelivery: "3-5 days",
    customerCharge: 0,
    actualCost: 0,
    freeShippingApplied: false,
    freeShippingThreshold: config.shippingPolicy?.freeShippingThreshold || 999,
  };

  const isCod = paymentMethod === "COD";
  const freeThreshold = Number(config.shippingPolicy?.freeShippingThreshold) || 999;

  if (address?.pincode) {
    const quote = await getShippingRateForCart({
      deliveryPincode: address.pincode,
      isCod,
      weight: shipmentDetails.weight,
      dimensions: {
        length: shipmentDetails.length,
        breadth: shipmentDetails.breadth,
        height: shipmentDetails.height,
      },
      courierSelectionStrategy: config.shippingPolicy?.courierSelectionStrategy || "cheapest",
      declaredValue: subTotal,
    });

    if (!quote.serviceable) {
      return {
        success: false,
        serviceable: false,
        message: quote.error || `Delivery is not available for pincode ${address.pincode}`,
        items: orderItems,
        pricing: {
          subTotal,
          discount: discountAmount,
          taxableAmount,
          tax,
          customerShipping: 0,
          actualShippingCost: 0,
          shippingAbsorbedByMerchant: 0,
          codCharge: 0,
          grandTotal: 0,
          currency: config.currency || "INR",
        },
        shipping: {
          serviceable: false,
          pincode: address.pincode,
          error: quote.error,
        },
      };
    }

    const actualCost = quote.actualRate;

    // Evaluate Store Free Shipping Policy
    if (taxableAmount >= freeThreshold) {
      shippingInfo = {
        serviceable: true,
        pincode: address.pincode,
        courier: quote.courierName,
        estimatedDelivery: quote.etd,
        customerCharge: 0,
        actualCost,
        freeShippingApplied: true,
        freeShippingThreshold: freeThreshold,
      };
    } else {
      shippingInfo = {
        serviceable: true,
        pincode: address.pincode,
        courier: quote.courierName,
        estimatedDelivery: quote.etd,
        customerCharge: actualCost,
        actualCost,
        freeShippingApplied: false,
        freeShippingThreshold: freeThreshold,
      };
    }
  }

  const customerShipping = shippingInfo.customerCharge || 0;
  const actualShippingCost = shippingInfo.actualCost || 0;
  const shippingAbsorbedByMerchant = Math.max(0, actualShippingCost - customerShipping);

  // 8. Calculate COD Charge if applicable
  let codCharge = 0;
  if (isCod && config.cod?.enabled) {
    codCharge = Number(config.cod.fee) || 0;
  }

  // 9. Grand Total
  const grandTotal = Math.round(taxableAmount + tax + customerShipping + codCharge);

  return {
    success: true,
    serviceable: true,
    items: orderItems,
    shipmentDetails,
    pricing: {
      subTotal,
      discount: discountAmount,
      taxableAmount,
      tax,
      shipping: customerShipping, // Standard snapshot customer field
      actualShippingCost,
      shippingAbsorbedByMerchant,
      codCharge,
      grandTotal,
      currency: config.currency || "INR",
      discountDetails: {
        applied: discountResult.applied,
        name: discountResult.name || "",
        code: discountResult.code || "",
        amount: discountAmount,
      },
    },
    shipping: shippingInfo,
    discount: {
      applied: discountResult.applied,
      name: discountResult.name || "",
      code: discountResult.code || "",
      amount: discountAmount,
    },
    currency: config.currency || "INR",
  };
};
