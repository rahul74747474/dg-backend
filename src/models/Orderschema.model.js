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

        image: {
          type: String,
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
        sparse: true, // 🔥 allows null for COD but enforces uniqueness for online
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

    /* ---------- STATUS TRACKING ---------- */
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

const OrderModel = mongoose.model("Order", orderSchema);

export default OrderModel;