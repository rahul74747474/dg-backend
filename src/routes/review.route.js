import { Router } from "express";
import protect from "../middlewares/protect.js";

import {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
} from "../controllers/review.controller.js";

const reviewRouter = Router();

/**
 * PUBLIC
 */
reviewRouter.get("/:productId", getProductReviews);

/**
 * PRIVATE
 */
reviewRouter.post("/:productId", protect, createReview);
reviewRouter.put("/:id", protect, updateReview);
reviewRouter.delete("/:id", protect, deleteReview);

export default reviewRouter;
