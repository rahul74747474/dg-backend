import Razorpay from "razorpay";
import crypto from "crypto";
import CartProduct from "../models/Cartproduct.model.js";
import Product from "../models/Product.model.js";
import Order from "../models/Orderschema.model.js";
import mongoose from "mongoose";
import Address from "../models/Address.model.js";

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

    const shipping = total > 500 ? 0 : 50;
    const tax = Math.round(total * 0.05);
    const finalAmount = total + shipping + tax;

    const razorpayOrder = await razorpay.orders.create({
      amount: finalAmount * 100,
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

/* ================= VERIFY PAYMENT ================= */
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
    } = req.body;

    // 🔁 prevent duplicate
    const existingOrder = await Order.findOne({
      "payment.transactionId": razorpay_payment_id,
    });

    if (existingOrder) {
      throw new Error("Payment already processed");
    }

    // 🔐 signature verify
    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expected !== razorpay_signature) {
      throw new Error("Payment verification failed");
    }

    // 🔹 address fetch
    const address = await Address.findOne({
      _id: addressId,
      userId,
    });

    if (!address) throw new Error("Invalid address");

    // 🔹 fetch cart with full data
    const cartItems = await CartProduct.find({ userId })
      .populate({
        path: "productId",
        select:
          "name price sku weight dimensions hsnCode tax images status countInStock",
      })
      .session(session);

    if (!cartItems.length) throw new Error("Cart empty");

    let subTotal = 0;
    const orderItems = [];

    // 🔹 build items
    for (const item of cartItems) {
      const product = item.productId;

      if (
        !product ||
        product.status !== "ACTIVE" ||
        product.countInStock < item.quantity
      ) {
        throw new Error(`${product?.name || "Product"} unavailable`);
      }

      if (!product.sku) {
        throw new Error(`SKU missing for ${product.name}`);
      }

      const itemTotal = product.price * item.quantity;
      subTotal += itemTotal;

      orderItems.push({
        productId: product._id,
        name: product.name,
        image: product.images?.[0] || "",
        sku: product.sku,

        price: product.price,
        quantity: item.quantity,
        total: itemTotal,

        // 🔥 shipping snapshot
        weight: product.weight || 0.5,
        length: product.dimensions?.length || 10,
        breadth: product.dimensions?.breadth || 10,
        height: product.dimensions?.height || 5,
        hsnCode: product.hsnCode || "0000",
        tax: product.tax || 0,
      });
    }

    // 🔥 shipment calculation
    const totalWeight = cartItems.reduce(
      (acc, item) =>
        acc + (item.productId.weight || 0.5) * item.quantity,
      0
    );

    const maxLength = Math.max(
      ...cartItems.map(i => i.productId.dimensions?.length || 10)
    );

    const maxBreadth = Math.max(
      ...cartItems.map(i => i.productId.dimensions?.breadth || 10)
    );

    const totalHeight = cartItems.reduce(
      (acc, i) =>
        acc + (i.productId.dimensions?.height || 5) * i.quantity,
      0
    );

    // 🔹 pricing
    const shipping = subTotal > 500 ? 0 : 50;
    const tax = Math.round(subTotal * 0.05);
    const grandTotal = subTotal + shipping + tax;

    // 🔍 amount check
    const razorpayOrder = await razorpay.orders.fetch(razorpay_order_id);

    if (razorpayOrder.amount !== grandTotal * 100) {
      throw new Error("Cart modified during payment");
    }

    // 🔹 create order
    const [order] = await Order.create(
      [
        {
          userId,
          orderId: razorpay_order_id,
          orderNumber: `DG-${crypto.randomUUID()}`,

          items: orderItems,

          pricing: { subTotal, shipping, tax, grandTotal },

          delivery_address: {
            name: address.name || "",
            mobile: address.mobile,
            address_line: address.address_line,
            city: address.city,
            state: address.state,
            pincode: address.pincode,
            country: address.country,
          },

          shipmentDetails: {
            weight: totalWeight,
            length: maxLength,
            breadth: maxBreadth,
            height: totalHeight,
          },

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

    // 🔻 stock update
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
      order,
    });


  } catch (error) {
    await session.abortTransaction();
    session.endSession();


    console.error("VERIFY PAYMENT ERROR:", error);

    res.status(500).json({
      message: error.message || "Payment failed",
    });


  }
};

export const razorpayWebhook = async (req, res) => { const secret = process.env.RAZORPAY_WEBHOOK_SECRET; const signature = req.headers["x-razorpay-signature"]; const expected = crypto.createHmac("sha256", secret).update(JSON.stringify(req.body)).digest("hex"); if (expected !== signature) { return res.status(400).json({ message: "Invalid webhook" }); } const event = req.body; if (event.event === "payment.captured") { const payment = event.payload.payment.entity; console.log("Payment captured:", payment.id); // 👉 here you can create order if not already created 
} res.json({ success: true }); };