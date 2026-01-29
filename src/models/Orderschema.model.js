import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },

    /* ---------- ORDER ITEMS ---------- */
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "product",
          required: true,
        },

        name: String,
        image: String,

        price: Number,      // snapshot price
        quantity: Number,

        total: Number,
      },
    ],

    /* ---------- PRICING ---------- */
    pricing: {
      subTotal: Number,
      shipping: Number,
      tax: Number,
      grandTotal: Number,
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
      },

      transactionId: String,
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
    },
  },
  { timestamps: true }
);

const OrderModel = mongoose.model("order", orderSchema);
export default OrderModel;
