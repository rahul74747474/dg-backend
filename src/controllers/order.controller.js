import crypto from "crypto";
import mongoose from "mongoose";
import Order from "../models/Orderschema.model.js";
import CartProduct from "../models/Cartproduct.model.js";
import Product from "../models/Product.model.js";

/* ================= CREATE ORDER ================= */
export const createOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user._id;
    const { delivery_address, paymentMethod = "COD" } = req.body;

    if (!delivery_address) {
      await session.abortTransaction();
      return res.status(400).json({
        message: "Delivery address is required",
      });
    }

    // 🔹 Fetch cart items
    const cartItems = await CartProduct.find({ userId })
      .populate("productId")
      .session(session);

    if (!cartItems || cartItems.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({
        message: "Cart is empty",
      });
    }

    let subTotal = 0;
    const orderItems = [];

    // 🔹 Validate + calculate
    for (const item of cartItems) {
      const product = item.productId;

      if (!product || product.status !== "ACTIVE") {
        throw new Error("One or more products are unavailable");
      }

      if (product.countInStock < item.quantity) {
        throw new Error(`${product.name} is out of stock`);
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

    // 🔹 Pricing
    const shipping = subTotal > 999 ? 0 : 49;
    const tax = Math.round(subTotal * 0.05);
    const grandTotal = subTotal + shipping + tax;

    // 🔹 Create order
    const order = await Order.create(
      [
        {
          userId,
          orderNumber: `DG-${crypto.randomUUID()}`,
          items: orderItems,
          pricing: {
            subTotal,
            shipping,
            tax,
            grandTotal,
          },
          delivery_address,
          payment: {
            method: paymentMethod,
            status: "PENDING",
          },
          orderStatus: "PLACED",
        },
      ],
      { session }
    );

    // 🔻 Reduce stock (atomic)
    for (const item of cartItems) {
      const updated = await Product.findOneAndUpdate(
        {
          _id: item.productId._id,
          countInStock: { $gte: item.quantity },
        },
        { $inc: { countInStock: -item.quantity } },
        { session }
      );

      if (!updated) {
        throw new Error("Stock changed, try again");
      }
    }

    // 🔹 Clear cart
    await CartProduct.deleteMany({ userId }).session(session);

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order: order[0],
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error("CREATE ORDER ERROR:", error);

    res.status(500).json({
      message: error.message || "Failed to place order",
    });
  }
};

/* ================= GET MY ORDERS ================= */
export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id }).sort({
      createdAt: -1,
    });

    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch orders",
    });
  }
};

/* ================= GET ORDER BY ID ================= */
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate(
      "userId",
      "name email"
    );

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch order",
    });
  }
};

/* ================= UPDATE PAYMENT STATUS ================= */
export const updatePaymentStatus = async (req, res) => {
  try {
    const { status, transactionId } = req.body;

    const validStatuses = ["SUCCESS", "FAILED", "PENDING"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid payment status",
      });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        "payment.status": status,
        "payment.transactionId": transactionId,
        orderStatus: status === "SUCCESS" ? "CONFIRMED" : "FAILED",
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update payment",
    });
  }
};

/* ================= ADMIN: UPDATE ORDER STATUS ================= */
export const updateOrderStatus = async (req, res) => {
  try {
    const { orderStatus } = req.body;

    const allowedStatuses = [
      "PLACED",
      "CONFIRMED",
      "SHIPPED",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
      "CANCELLED",
    ];

    if (!allowedStatuses.includes(orderStatus)) {
      return res.status(400).json({
        message: "Invalid order status",
      });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { orderStatus },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update order status",
    });
  }
};

/* ================= ADMIN: GET ALL ORDERS ================= */ export const getAllOrders = async (req, res) => { try { const orders = await Order.find() .populate("userId", "name email") .populate("delivery_address") .sort({ createdAt: -1 }); res.status(200).json({ success: true, orders, }); } catch (error) { console.error("GET ALL ORDERS ERROR:", error); res.status(500).json({ message: "Failed to fetch orders", }); } };