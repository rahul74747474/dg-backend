import mongoose from "mongoose";

const cartProductSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.ObjectId,
      ref: "product",
    },

    quantity: {
      type: Number,
      default: 1,
    },

    userId: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);
cartProductSchema.index({ userId: 1, productId: 1 }, { unique: true });
const CartProductModel = mongoose.model(
  "cartProduct",
  cartProductSchema
);

export default CartProductModel;
