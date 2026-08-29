import express from "express";

/* ================= IMPORT ROUTES ================= */
import authRoutes from "./routes/auth.routes.js";
import productRoutes from "./routes/product.route.js";
import cartRoutes from "./routes/cart.route.js";
import myListRoutes from "./routes/mylist.route.js";
import addressRoutes from "./routes/address.route.js";
import orderRoutes from "./routes/order.route.js";
import reviewRoutes from "./routes/review.route.js";
import paymentRouter from "./routes/payment.route.js";
import shippingRoutes from "./routes/shiprocket.route.js";
import contactRoutes from "./routes/contact.route.js";
import b2bRouter from "./routes/b2b.route.js";
import pricingRoutes from "./routes/pricing.route.js";
import { trackOrderController } from "./controllers/track.controller.js";


const router = express.Router();

/* ================= HEALTH CHECK ================= */
router.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "OK",
    timestamp: new Date().toISOString(),
  });
});

/* ================= API MODULE ROUTES ================= */

// Auth & User
router.use("/auth", authRoutes);

// Products
router.use("/products", productRoutes);

// Cart
router.use("/cart", cartRoutes);

// Wishlist / My List
router.use("/wishlist", myListRoutes);

// Address
router.use("/address", addressRoutes);

// Orders
router.use("/orders", orderRoutes);

// Reviews
router.use("/reviews", reviewRoutes);

//payment
router.use("/payment", paymentRouter);

// Pricing Configuration
router.use("/pricing", pricingRoutes);

router.use("/shipping", shippingRoutes);
router.use("/contact", contactRoutes);
router.get("/track/:shipmentId", trackOrderController);
router.use("/b2b", b2bRouter);
export default router;

