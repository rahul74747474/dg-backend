import { Router } from "express";
import protect from "../middlewares/protect.js";

import {
  addToCartItemController,
  getCartItemController,
  updateCartItemQtyController,
  deleteCartItemQtyController,
} from "../controllers/cart.controller.js";

const cartRouter = Router();

/**
 * @route   POST /api/cart/add
 * @desc    Add product to cart
 * @access  Private
 */
cartRouter.post("/add", protect, addToCartItemController);

/**
 * @route   GET /api/cart
 * @desc    Get all cart items for logged-in user
 * @access  Private
 */
cartRouter.get("/", protect, getCartItemController);

/**
 * @route   PUT /api/cart/update
 * @desc    Update cart item quantity
 * @access  Private
 */
cartRouter.put("/update", protect, updateCartItemQtyController);

/**
 * @route   DELETE /api/cart/remove
 * @desc    Remove item from cart
 * @access  Private
 */
cartRouter.delete("/remove", protect, deleteCartItemQtyController);

export default cartRouter;
