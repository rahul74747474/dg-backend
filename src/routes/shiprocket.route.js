import express from "express";
import {handlePostPaymentShipment } from "../controllers/shiprocket.controller.js";
import {checkPincodeServiceability} from "../services/shiprocket.service.js"

const router = express.Router();

router.post("/create/:orderId", handlePostPaymentShipment);

// /routes/shipping.js
import axios from "axios";

router.get("/check", async (req, res) => {
  try {
    const { pincode } = req.query;

    if (!pincode || pincode.length !== 6) {
      return res.status(400).json({
        error: "Invalid pincode",
      });
    }

    const result = await checkPincodeServiceability({
      deliveryPincode: pincode,
      cod: 1,
      weight: 0.5,
    });

    res.json(result);

  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});


export default router;