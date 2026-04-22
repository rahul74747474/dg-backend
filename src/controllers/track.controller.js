import axios from "axios";
import { getShiprocketToken } from "../utils/shiprocket.js";
import Order from "../models/Orderschema.model.js";

const SR_BASE_URL = "https://apiv2.shiprocket.in/v1/external";

export const trackOrderController = async (req, res) => {
  try {
    const { shipmentId } = req.params;

    if (!shipmentId) {
      return res.status(400).json({
        success: false,
        message: "Shipment ID is required",
      });
    }

    /* ---------------- GET ORDER FIRST ---------------- */
    const order = await Order.findOne({
      "shipping.shipmentId": shipmentId,
    });

    /* ---------------- GET TOKEN ---------------- */
    const token = await getShiprocketToken();

    const client = axios.create({
      baseURL: SR_BASE_URL,
      headers: { Authorization: `Bearer ${token}` },
      timeout: 15000,
    });

    /* ---------------- HIT SHIPROCKET ---------------- */
    let shiprocketData = null;

    try {
      const response = await client.get(
        `/courier/track/shipment/${shipmentId}`
      );

      shiprocketData = response.data?.tracking_data;
    } catch (err) {
      console.log("Shiprocket fetch failed, fallback to DB");
    }

    /* ---------------- SHIPROCKET SUCCESS ---------------- */
    if (
      shiprocketData &&
      shiprocketData.shipment_track &&
      shiprocketData.shipment_track.length > 0
    ) {
      const track = shiprocketData.shipment_track[0];

      return res.status(200).json({
        success: true,
        source: "shiprocket",

        orderInfo: {
          shipmentId,
          orderNumber: order?.orderNumber,
          currentStatus: track.current_status,
          etd: shiprocketData.etd,
          trackUrl: shiprocketData.track_url,

          amount: order?.pricing?.grandTotal,
          orderDate: order?.createdAt,
        },

        items: order?.items || [],
        address: order?.delivery_address || {},

        timeline: shiprocketData.shipment_track_activities || [],
      });
    }

    /* ---------------- FALLBACK ---------------- */
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    return res.status(200).json({
      success: true,
      source: "database",

      orderInfo: {
        shipmentId,
        orderNumber: order.orderNumber,
        status: order.orderStatus || "PLACED",

        amount: order.pricing?.grandTotal,
        orderDate: order.createdAt,
      },

      items: order.items || [],
      address: order.delivery_address || {},

      timeline: [
        {
          status: "PLACED",
          activity: "Order confirmed and awaiting shipment",
          date: order.createdAt,
          location: "Order Warehouse",
        },
      ],
    });

  } catch (error) {
    console.error("Track Order Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};