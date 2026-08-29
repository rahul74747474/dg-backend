import express from "express";
import { handlePostPaymentShipment } from "../controllers/shiprocket.controller.js";
import { checkPincodeServiceability } from "../services/shiprocket.service.js";

const router = express.Router();

// Trigger post-payment shipment creation manually or via webhook
router.post("/create/:orderId", handlePostPaymentShipment);

// Check delivery pincode serviceability for product page
router.get("/check", async (req, res) => {
  try {
    const { pincode } = req.query;

    if (!pincode || String(pincode).trim().length !== 6) {
      return res.status(400).json({
        available: false,
        error: "Please enter a valid 6-digit delivery pincode",
      });
    }

    const result = await checkPincodeServiceability({
      deliveryPincode: String(pincode).trim(),
      cod: 1,
      weight: 0.5,
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error("Shipping serviceability check error:", err.message);
    return res.status(500).json({
      available: false,
      error: err.message || "Failed to check serviceability",
    });
  }
});

export default router;