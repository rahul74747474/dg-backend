import mongoose from "mongoose";

const discountRuleSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    code: { type: String, trim: true, uppercase: true }, // Optional coupon code or auto-applied
    type: {
      type: String,
      enum: ["percentage", "fixed"],
      default: "percentage",
    },
    value: { type: Number, required: true, min: 0 }, // e.g. 10 for 10% or 100 for ₹100
    minimumCartValue: { type: Number, default: 0, min: 0 },
    maximumDiscount: { type: Number, default: 500, min: 0 }, // Cap on discount amount
    autoApply: { type: Boolean, default: true },
    priority: { type: Number, default: 1 }, // Higher number = higher priority
    active: { type: Boolean, default: true },
    startDate: { type: Date },
    endDate: { type: Date },
    applicablePaymentMethods: {
      type: [String],
      enum: ["ALL", "COD", "ONLINE"],
      default: ["ALL"],
    },
  },
  { _id: false }
);

const pricingConfigSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "default",
      index: true,
    },
    currency: { type: String, default: "INR" },
    isActive: { type: Boolean, default: true },

    // Pure commercial tax rule
    tax: {
      enabled: { type: Boolean, default: true },
      type: {
        type: String,
        enum: ["percentage", "fixed"],
        default: "percentage",
      },
      rate: { type: Number, default: 5, min: 0 }, // 5% GST
      includedInPrice: { type: Boolean, default: false },
    },

    // Pure commercial shipping policy (free shipping threshold, policy)
    shippingPolicy: {
      freeShippingThreshold: { type: Number, default: 999, min: 0 }, // Free delivery if taxableAmount >= 999
      courierSelectionStrategy: {
        type: String,
        enum: ["cheapest", "recommended"],
        default: "cheapest",
      },
    },

    // Centralized Discount rules
    discounts: {
      enabled: { type: Boolean, default: true },
      rules: [discountRuleSchema],
    },

    // Cash on Delivery policy
    cod: {
      enabled: { type: Boolean, default: true },
      fee: { type: Number, default: 0, min: 0 }, // Extra COD fee if any
      maxCartValue: { type: Number, default: 10000 },
    },

    // Default packaging assumptions if product weight/dimensions are omitted
    packagingDefaults: {
      defaultWeightPerItem: { type: Number, default: 0.25 }, // kg
      defaultLength: { type: Number, default: 10 }, // cm
      defaultBreadth: { type: Number, default: 10 },
      defaultHeight: { type: Number, default: 5 },
    },
  },
  { timestamps: true }
);

const PricingConfig = mongoose.model("PricingConfig", pricingConfigSchema);

export default PricingConfig;
