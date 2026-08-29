import Razorpay from "razorpay";
import crypto from "crypto";
import mongoose from "mongoose";
import CartProduct from "../models/Cartproduct.model.js";
import Product from "../models/Product.model.js";
import Order from "../models/Orderschema.model.js";
import Address from "../models/Address.model.js";
import { calculateOrderPricing } from "../services/pricing.service.js";
import { processShiprocketFlow } from "../services/shiprocket.service.js";

const getRazorpayInstance = () => {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    throw new Error("Razorpay credentials (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) are missing");
  }

  return new Razorpay({ key_id, key_secret });
};

/**
 * Creates a Razorpay Order based on the Authoritative Centralized Pricing Engine.
 * POST /api/payment/create-order
 */
export const createRazorpayOrder = async (req, res) => {
  try {
    const userId = req.user._id;
    const { addressId, couponCode } = req.body;

    let targetAddress = null;
    if (addressId) {
      targetAddress = await Address.findOne({ _id: addressId, userId });
    }

    // 1. Authoritative Pricing Calculation
    const billing = await calculateOrderPricing({
      userId,
      address: targetAddress,
      paymentMethod: "ONLINE",
      couponCode,
    });

    if (!billing.serviceable) {
      return res.status(400).json({
        success: false,
        message: billing.message || "Delivery is not available for this delivery pincode",
      });
    }

    const finalAmount = billing.pricing.grandTotal;

    if (finalAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid order amount for online payment",
      });
    }

    const razorpay = getRazorpayInstance();

    // 2. Create Razorpay order for the exact amount in paise (INR)
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(finalAmount * 100),
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
    });

    return res.status(200).json({
      success: true,
      order: razorpayOrder,
      amount: finalAmount,
      billing,
    });
  } catch (error) {
    console.error("CREATE RAZORPAY ORDER ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to initialize online payment",
    });
  }
};

/**
 * Verifies Razorpay HMAC Signature, revalidates pricing, reduces stock, and finalizes the order.
 * POST /api/payment/verify
 */
export const verifyPayment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user._id;
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      addressId,
      couponCode,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new Error("Incomplete payment verification payload");
    }

    // 1. Prevent duplicate transaction capture
    const existingOrder = await Order.findOne({
      "payment.transactionId": razorpay_payment_id,
    });

    if (existingOrder) {
      throw new Error("Payment has already been processed for this transaction");
    }

    // 2. Cryptographic HMAC SHA256 Signature Verification
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expected !== razorpay_signature) {
      throw new Error("Payment signature verification failed");
    }

    // 3. Fetch & Validate Delivery Address
    const dbAddress = await Address.findOne({ _id: addressId, userId }).session(session);
    if (!dbAddress) {
      throw new Error("Selected delivery address could not be found");
    }

    const targetAddress = {
      name: dbAddress.name || req.user.name || "",
      mobile: dbAddress.mobile || "",
      address_line: dbAddress.address_line,
      city: dbAddress.city,
      state: dbAddress.state,
      pincode: dbAddress.pincode,
      country: dbAddress.country || "India",
    };

    // 4. Server-Side Pricing & Stock Revalidation
    const billing = await calculateOrderPricing({
      userId,
      address: targetAddress,
      paymentMethod: "ONLINE",
      couponCode,
      session,
    });

    if (!billing.serviceable) {
      throw new Error(billing.message || "Pincode became unserviceable during checkout");
    }

    const razorpay = getRazorpayInstance();
    const razorpayOrder = await razorpay.orders.fetch(razorpay_order_id);

    if (razorpayOrder.amount !== Math.round(billing.pricing.grandTotal * 100)) {
      throw new Error("Order pricing changed during checkout. Please contact support.");
    }

    // 5. Commit Order with Complete Snapshot
    const [order] = await Order.create(
      [
        {
          userId,
          orderId: razorpay_order_id,
          orderNumber: `DG-${crypto.randomUUID()}`,
          items: billing.items,
          pricing: billing.pricing,
          delivery_address: targetAddress,
          shipmentDetails: billing.shipmentDetails,
          payment: {
            method: "ONLINE",
            status: "SUCCESS",
            transactionId: razorpay_payment_id,
          },
          orderStatus: "CONFIRMED",
          statusHistory: [
            {
              status: "CONFIRMED",
              date: new Date(),
            },
          ],
        },
      ],
      { session }
    );

    // 6. Reduce Stock Atomically
    for (const item of billing.items) {
      const updated = await Product.findOneAndUpdate(
        {
          _id: item.productId,
          countInStock: { $gte: item.quantity },
        },
        { $inc: { countInStock: -item.quantity } },
        { session }
      );

      if (!updated) {
        throw new Error(`Stock changed for "${item.name}"`);
      }
    }

    // 7. Clear Cart
    await CartProduct.deleteMany({ userId }).session(session);

    await session.commitTransaction();
    session.endSession();

    // 8. Trigger Shiprocket Fulfillment (Non-blocking background)
    processShiprocketFlow(order).catch((err) => {
      console.warn("⚠️ Shiprocket background processing warning:", err.message);
    });

    return res.status(200).json({
      success: true,
      message: "Payment verified and order created successfully 🎉",
      order,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error("VERIFY PAYMENT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Payment verification failed",
    });
  }
};

/**
 * Razorpay Webhook Handler
 */
export const razorpayWebhook = async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    return res.status(200).json({ received: true });
  }

  const signature = req.headers["x-razorpay-signature"];
  const expected = crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(req.body))
    .digest("hex");

  if (expected !== signature) {
    return res.status(400).json({ message: "Invalid webhook signature" });
  }

  const event = req.body;
  if (event.event === "payment.captured") {
    console.log("💳 Payment captured via webhook:", event.payload?.payment?.entity?.id);
  }

  return res.json({ success: true });
};