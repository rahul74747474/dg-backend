import { Router } from "express";
import protect from "../middlewares/protect.js";
import {
  createRazorpayOrder,
  verifyPayment,razorpayWebhook
} from "../controllers/payment.controller.js";

const router = Router();

router.post("/create-order", protect, createRazorpayOrder);
router.post("/verify", protect, verifyPayment);
router.post("/webhook", razorpayWebhook);

export default router;