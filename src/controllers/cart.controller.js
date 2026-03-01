import CartProductModel from "../models/Cartproduct.model.js";
import Product from "../models/Product.model.js";

/* ================= ADD TO CART ================= */
export const addToCartItemController = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({ message: "productId is required" });
    }

    // Optional: validate product existence
    const productExists = await Product.findById(productId);
    if (!productExists) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check if product already in cart
    const existingCartItem = await CartProductModel.findOne({
      userId,
      productId,
    });

    if (existingCartItem) {
      existingCartItem.quantity += quantity;
      await existingCartItem.save();

      return res.status(200).json({
        success: true,
        message: "Cart updated",
        cartItem: existingCartItem,
      });
    }

    // Create new cart item
    const cartItem = await CartProductModel.create({
      userId,
      productId,
      quantity,
    });

    res.status(201).json({
      success: true,
      message: "Item added to cart",
      cartItem,
    });
  } catch (error) {
    console.error("ADD TO CART ERROR:", error);
    res.status(500).json({ message: "Failed to add item to cart" });
  }
};

/* ================= GET CART ITEMS ================= */
export const getCartItemController = async (req, res) => {
  try {
    const userId = req.user._id;

    const cartItems = await CartProductModel.find({ userId })
      .populate("productId");

    res.status(200).json({
      success: true,
      cartItems,
    });
  } catch (error) {
    console.error("GET CART ERROR:", error);
    res.status(500).json({ message: "Failed to fetch cart items" });
  }
};

/* ================= UPDATE CART ITEM QTY ================= */
export const updateCartItemQtyController = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId, action } = req.body;

    if (!productId || !action) {
      return res.status(400).json({
        message: "productId and action are required",
      });
    }

    let updateQuery = {};

    if (action === "increase") {
      updateQuery = { $inc: { quantity: 1 } };
    } else if (action === "decrease") {
      updateQuery = { $inc: { quantity: -1 } };
    } else {
      return res.status(400).json({ message: "Invalid action" });
    }

    const cartItem = await CartProductModel.findOneAndUpdate(
      { userId, productId },
      updateQuery,
      { new: true }
    );

    if (!cartItem) {
      return res.status(404).json({ message: "Cart item not found" });
    }

    // Auto delete if qty <= 0 🔥
    if (cartItem.quantity <= 0) {
      await cartItem.deleteOne();
      return res.status(200).json({
        success: true,
        message: "Item removed",
      });
    }

    res.status(200).json({
      success: true,
      message: "Cart updated",
      cartItem,
    });
  } catch (error) {
    console.error("UPDATE CART ERROR:", error);
    res.status(500).json({ message: "Failed to update cart" });
  }
};

/* ================= DELETE CART ITEM ================= */
export const deleteCartItemQtyController = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ message: "productId is required" });
    }

    const deleted = await CartProductModel.findOneAndDelete({
      userId,
      productId,
    });

    if (!deleted) {
      return res.status(404).json({ message: "Cart item not found" });
    }

    res.status(200).json({
      success: true,
      message: "Item removed from cart",
    });
  } catch (error) {
    console.error("DELETE CART ERROR:", error);
    res.status(500).json({ message: "Failed to delete cart item" });
  }
};
