import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    /* ---------- USER ---------- */
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    /* ---------- ORDER ITEMS ---------- */
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "product",
          required: true,
        },

        name: {
          type: String,
          required: true,
        },

        image: String,

        sku: {
          type: String,
          required: true, // 🔥 important for Shiprocket
        },

        price: {
          type: Number,
          required: true,
        },

        quantity: {
          type: Number,
          required: true,
        },

        total: {
          type: Number,
          required: true,
        },

        /* 🔥 SNAPSHOT SHIPPING DATA */
        weight: Number, // kg
        length: Number, // cm
        breadth: Number,
        height: Number,
        hsnCode: String,
        tax: Number,
      },
    ],

    /* ---------- PRICING ---------- */
    pricing: {
      subTotal: { type: Number, required: true },
      shipping: { type: Number, required: true },
      tax: { type: Number, required: true },
      grandTotal: { type: Number, required: true },
    },

    /* ---------- DELIVERY ---------- */
    delivery_address: {
      name: String,
      mobile: String,
      address_line: String,
      city: String,
      state: String,
      pincode: String,
      country: String,
    },

    /* ---------- PAYMENT ---------- */
    payment: {
      method: {
        type: String,
        enum: ["COD", "ONLINE"],
        default: "COD",
      },

      status: {
        type: String,
        enum: ["PENDING", "SUCCESS", "FAILED"],
        default: "PENDING",
        index: true,
      },

      transactionId: {
        type: String,
        unique: true,
        sparse: true,
      },
    },

    /* ---------- SHIPMENT DETAILS ---------- */
    shipmentDetails: {
      weight: { type: Number, required: true }, // total kg
      length: { type: Number, required: true },
      breadth: { type: Number, required: true },
      height: { type: Number, required: true },
    },

    /* ---------- COURIER DETAILS ---------- */
    shipping: {
      courierName: String,
      awbCode: String,
      shipmentId: String,
      trackingUrl: String,
      pickupScheduled: {
        type: Boolean,
        default: false,
      },
    },

    /* ---------- ORDER STATUS ---------- */
    orderStatus: {
      type: String,
      enum: [
        "PLACED",
        "CONFIRMED",
        "SHIPPED",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
        "CANCELLED",
        "RETURNED",
      ],
      default: "PLACED",
      index: true,
    },

    /* ---------- STATUS HISTORY ---------- */
    statusHistory: [
      {
        status: String,
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

/* ---------- INDEXES ---------- */
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ "payment.transactionId": 1 });

const OrderModel = mongoose.model("Order", orderSchema);


export default OrderModel;