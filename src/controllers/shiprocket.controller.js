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
  

    // 3. Update Database
    order.shipping.shipmentId = shippingDetails.shipmentId;
    order.shipping.awbCode = shippingDetails.awbCode;
    order.shipping.courierName = shippingDetails.courier;
    order.status = "Processed"; // Update internal order status
    
    await order.save();

    // 4. Return the AWB so the frontend can display it
    res.json({
      message: "Shipment processed successfully",
      awb: shippingDetails.awbCode,
      courier: shippingDetails.courier
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