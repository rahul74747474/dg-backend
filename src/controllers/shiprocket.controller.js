import Order from "../models/Orderschema.model.js";
import { processShiprocketFlow } from "../services/shiprocket.service.js";

export const handlePostPaymentShipment = async (req, res) => {
  const { orderId } = req.params;

  try {
    const order = await Order.findById(orderId);

    if (!order) return res.status(404).json({ message: "Order not found" });

    // 1. Idempotency Check: Don't process if AWB already exists
    if (order.shipping?.awbCode) {
      return res.json({
        status: "success",
        awb: order.shipping.awbCode,
        courier: order.shipping.courierName
      });
    }

    // 2. Execute background flow
    const shippingDetails = await processShiprocketFlow(order);

    // 3. Return the shipping state so the client receives accurate info
    if (shippingDetails.awbCode) {
      return res.json({
        success: true,
        message: "Shipment and AWB processed successfully",
        shipmentId: shippingDetails.shipmentId,
        awb: shippingDetails.awbCode,
        courier: shippingDetails.courier,
        isFullyProcessed: true,
      });
    }

    return res.json({
      success: true,
      message: "Shipment created in Shiprocket. AWB assignment is pending.",
      shipmentId: shippingDetails.shipmentId,
      awb: null,
      courier: shippingDetails.courier,
      isFullyProcessed: false,
    });

  } catch (error) {
    // CRITICAL: Log this error to a database or monitoring tool
    console.error(`CRITICAL SHIPMENT FAILURE for Order ${orderId}:`, error.response?.data || error.message);

    // Even if it fails, we send a 200/202 status but with an 'error' flag 
    // so the frontend can show a "Contact Support" message rather than crashing.
    res.status(500).json({
      message: "Order paid but shipment auto-generation failed.",
      error: error.message
    });
  }
};