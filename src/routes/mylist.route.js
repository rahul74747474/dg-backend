import { Router } from "express";
import protect from "../middlewares/protect.js";

import {
  addToMyList,
  getMyList,
  removeFromMyList,
  clearMyList,
} from "../controllers/mylist.controller.js";

const myListRouter = Router();

/**
 * @route   POST /api/wishlist
 * @desc    Add product to wishlist
 * @access  Private
 */
myListRouter.post("/", protect, addToMyList);

/**
 * @route   GET /api/wishlist
 * @desc    Get user's wishlist
 * @access  Private
 */
myListRouter.get("/", protect, getMyList);

/**
 * @route   DELETE /api/wishlist/:productId
 * @desc    Remove product from wishlist
 * @access  Private
 */
myListRouter.delete("/:productId", protect, removeFromMyList);

/**
 * @route   DELETE /api/wishlist
 * @desc    Clear wishlist
 * @access  Private
 */
myListRouter.delete("/", protect, clearMyList);

export default myListRouter;
