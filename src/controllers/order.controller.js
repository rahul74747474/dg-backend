import crypto from "crypto";
import mongoose from "mongoose";
import Order from "../models/Orderschema.model.js";
import CartProduct from "../models/Cartproduct.model.js";
import Product from "../models/Product.model.js";
import Address from "../models/Address.model.js";
import { calculateOrderPricing } from "../services/pricing.service.js";
import { processShiprocketFlow } from "../services/shiprocket.service.js";

/**
 * Preview checkout billing and real-time shipping quote without committing an order.
 * POST /api/orders/preview
 */
export const previewOrderPricing = async (req, res) => {
  try {
    const userId = req.user._id;
    const { addressId, delivery_address, paymentMethod = "ONLINE", couponCode = "" } = req.body;

    let targetAddress = delivery_address || null;

    if (addressId) {
      const dbAddress = await Address.findOne({ _id: addressId, userId });
      if (dbAddress) {
        targetAddress = {
          name: dbAddress.name || "",
          mobile: dbAddress.mobile || "",
          address_line: dbAddress.address_line,
          city: dbAddress.city,
          state: dbAddress.state,
          pincode: dbAddress.pincode,
          country: dbAddress.country || "India",
        };
      }
    }

    const billing = await calculateOrderPricing({
      userId,
      address: targetAddress,
      paymentMethod,
      couponCode,
    });

    return res.status(200).json(billing);
  } catch (error) {
    console.error("ORDER PREVIEW ERROR:", error);
    return res.status(error.message === "Cart is empty" ? 400 : 500).json({
      success: false,
      message: error.message || "Failed to calculate pricing preview",
    });
  }
};

/**
 * Creates a Cash on Delivery (COD) Order using the Centralized Pricing Engine.
 * POST /api/orders
 */
export const createOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user._id;
    const { addressId, delivery_address, couponCode } = req.body;

    let targetAddress = delivery_address || null;

    if (addressId) {
      const dbAddress = await Address.findOne({ _id: addressId, userId }).session(session);
      if (dbAddress) {
        targetAddress = {
          name: dbAddress.name || req.user.name || "",
          mobile: dbAddress.mobile || "",
          address_line: dbAddress.address_line,
          city: dbAddress.city,
          state: dbAddress.state,
          pincode: dbAddress.pincode,
          country: dbAddress.country || "India",
        };
      }
    }

    if (!targetAddress || !targetAddress.pincode) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "A valid delivery address with pincode is required",
      });
    }

    // 1. Authoritative Pricing & Shipping Revalidation
    const billing = await calculateOrderPricing({
      userId,
      address: targetAddress,
      paymentMethod: "COD",
      couponCode,
      session,
    });

    if (!billing.serviceable) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: billing.message || "Delivery is not available for this address pincode",
      });
    }

    // 2. Create Order with Immutable Pricing Snapshot
    const [order] = await Order.create(
      [
        {
          userId,
          orderNumber: `DG-${crypto.randomUUID()}`,
          items: billing.items,
          pricing: billing.pricing,
          delivery_address: targetAddress,
          shipmentDetails: billing.shipmentDetails,
          payment: {
            method: "COD",
            status: "SUCCESS",
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

    // 3. Atomically Reduce Stock
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
        throw new Error(`Stock changed for "${item.name}". Please review your cart.`);
      }
    }

    // 4. Clear Cart
    await CartProduct.deleteMany({ userId }).session(session);

    await session.commitTransaction();
    session.endSession();

    // 5. Trigger Shiprocket Fulfillment (Non-blocking background)
    processShiprocketFlow(order).catch((err) => {
      console.warn("⚠️ Shiprocket background processing warning:", err.message);
    });

    return res.status(201).json({
      success: true,
      message: "Order placed successfully with Cash on Delivery 🎉",
      order,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error("CREATE ORDER ERROR:", error);
    return res.status(500).json({
      success: false,
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

/* ================= ADMIN: GET ALL ORDERS ================= */
export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("userId", "name email")
      .populate("delivery_address")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, orders });
  } catch (error) {
    console.error("GET ALL ORDERS ERROR:", error);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
};