import { Router } from "express";
import protect from "../middlewares/protect.js";
import adminOnly from "../middlewares/adminOnly.js";

import {
  createOrder,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updatePaymentStatus,
  updateOrderStatus,
} from "../controllers/order.controller.js";

const orderRouter = Router();

/* =====================================================
   USER ROUTES
   ===================================================== */

/**
 * Create new order (from cart)
 * POST /api/orders
 */
orderRouter.post("/", protect, createOrder);

/**
 * Get logged-in user's orders
 * GET /api/orders/my-orders
 */
orderRouter.get("/my-orders", protect, getMyOrders);

/**
 * Get single order (user can only access their own order)
 * GET /api/orders/:id
 */
orderRouter.get("/:id", protect, getOrderById);


/* =====================================================
   ADMIN ROUTES
   ===================================================== */

/**
 * Get all orders (admin dashboard)
 * GET /api/orders
 */
orderRouter.get("/", protect, adminOnly, getAllOrders);

/**
 * Update payment status (after gateway callback / admin action)
 * PUT /api/orders/payment/:id
 */
orderRouter.put(
  "/payment/:id",
  protect,
  adminOnly,
  updatePaymentStatus
);

/**
 * Update order lifecycle status
 * (PLACED → CONFIRMED → SHIPPED → DELIVERED etc.)
 * PUT /api/orders/status/:id
 */
orderRouter.put(
  "/status/:id",
  protect,
  adminOnly,
  updateOrderStatus
);

export default orderRouter;
