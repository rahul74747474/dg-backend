import Razorpay from "razorpay";
import crypto from "crypto";
import CartProduct from "../models/Cartproduct.model.js";
import Product from "../models/Product.model.js";
import Order from "../models/Orderschema.model.js";
import mongoose from "mongoose";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/* ================= CREATE RAZORPAY ORDER ================= */
export const createRazorpayOrder = async (req, res) => {
  try {
    const userId = req.user._id;

    const cartItems = await CartProduct.find({ userId }).populate("productId");

    if (!cartItems.length) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    let total = 0;

    for (const item of cartItems) {
      total += item.productId.price * item.quantity;
    }

    const shipping = total > 999 ? 0 : 49;
    const tax = Math.round(total * 0.05);
    const finalAmount = total + shipping + tax;

    const razorpayOrder = await razorpay.orders.create({
      amount: finalAmount * 100, // paisa
      currency: "INR",
      receipt: "rcpt_" + Date.now(),
    });

    res.json({
      success: true,
      order: razorpayOrder,
      amount: finalAmount,
    });

  } catch (error) {
    res.status(500).json({ message: "Failed to create payment order" });
  }
};

export const verifyPayment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user._id;

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      delivery_address,
    } = req.body;

    // 🔐 SIGNATURE VERIFY
    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expected !== razorpay_signature) {
      throw new Error("Payment verification failed");
    }

    // 🔹 Fetch cart
    const cartItems = await CartProduct.find({ userId })
      .populate("productId")
      .session(session);

    let subTotal = 0;
    const orderItems = [];

    for (const item of cartItems) {
      const product = item.productId;

      if (!product || product.status !== "ACTIVE") {
        throw new Error("Product unavailable");
      }

      const itemTotal = product.price * item.quantity;
      subTotal += itemTotal;

      orderItems.push({
        productId: product._id,
        name: product.name,
        image: product.images?.[0]?.url || "",
        price: product.price,
        quantity: item.quantity,
        total: itemTotal,
      });
    }

    const shipping = subTotal > 999 ? 0 : 49;
    const tax = Math.round(subTotal * 0.05);
    const grandTotal = subTotal + shipping + tax;

    const razorpayOrder = await razorpay.orders.fetch(razorpay_order_id);

if (razorpayOrder.amount !== grandTotal * 100) {
  throw new Error("Cart modified during payment");
}


    // 🔹 CREATE ORDER
    const order = await Order.create(
      [
        {
          userId,
         orderNumber: `DG-${crypto.randomUUID()}`,
          items: orderItems,
          pricing: { subTotal, shipping, tax, grandTotal },
          delivery_address,
          payment: {
            method: "ONLINE",
            status: "SUCCESS",
            transactionId: razorpay_payment_id,
          },
          orderStatus: "CONFIRMED",
        },
      ],
      { session }
    );

    // 🔻 STOCK UPDATE
    for (const item of cartItems) {
      const updated = await Product.findOneAndUpdate(
        {
          _id: item.productId._id,
          countInStock: { $gte: item.quantity },
        },
        { $inc: { countInStock: -item.quantity } },
        { session }
      );

      if (!updated) throw new Error("Stock issue");
    }

    await CartProduct.deleteMany({ userId }).session(session);

    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      order: order[0],
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    res.status(500).json({
      message: error.message || "Payment failed",
    });
  }
};

export const razorpayWebhook = async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  const signature = req.headers["x-razorpay-signature"];

  const expected = crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(req.body))
    .digest("hex");

  if (expected !== signature) {
    return res.status(400).json({ message: "Invalid webhook" });
  }

  const event = req.body;

  if (event.event === "payment.captured") {
    const payment = event.payload.payment.entity;

    console.log("Payment captured:", payment.id);

    // 👉 here you can create order if not already created
  }

  res.json({ success: true });
};