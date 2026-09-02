import axios from "axios";
import { getShiprocketToken } from "../utils/shiprocket.js";
import Order from "../models/Orderschema.model.js";

const SR_BASE_URL = "https://apiv2.shiprocket.in/v1/external";

/**
 * @route   GET /api/track/:awb
 * @desc    Track shipment directly using Shiprocket AWB tracking API
 * @access  Public (No MongoDB order or authentication required)
 */
export const trackOrderController = async (req, res) => {
  try {
    const rawAwb = req.params.awb || req.params.identifier || req.query.awb;

    // 1. Validate that AWB exists and is not empty
    if (!rawAwb || typeof rawAwb !== "string" || !rawAwb.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please enter an AWB code.",
      });
    }

    // 2. Trim whitespace and treat as string (preserve leading zeros)
    const awb = String(rawAwb).trim();

    // 3. Validate reasonable AWB format/length
    if (awb.length < 3 || awb.length > 50) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid AWB code.",
      });
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(awb)) {
      return res.status(400).json({
        success: false,
        message: "Invalid AWB code format. AWB should only contain letters, numbers, and dashes.",
      });
    }

    // 4. Call Shiprocket AWB tracking API directly using server-side token
    let shiprocketResponse = null;

    try {
      const token = await getShiprocketToken();
      const client = axios.create({
        baseURL: SR_BASE_URL,
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000,
      });

      const response = await client.get(`/courier/track/awb/${encodeURIComponent(awb)}`);
      shiprocketResponse = response.data?.tracking_data;
    } catch (apiErr) {
      console.error(
        `🚨 Shiprocket tracking API error for AWB "${awb}":`,
        apiErr.response?.data || apiErr.message
      );
      return res.status(502).json({
        success: false,
        message: "Unable to fetch tracking information right now. Please try again.",
      });
    }

    // 5. Verify if Shiprocket returned valid tracking data
    const trackItem =
      shiprocketResponse?.shipment_track && shiprocketResponse.shipment_track.length > 0
        ? shiprocketResponse.shipment_track[0]
        : null;

    const hasValidAwb =
      trackItem && trackItem.awb_code && String(trackItem.awb_code).trim().length > 0;
    const hasValidTrackStatus =
      shiprocketResponse && shiprocketResponse.track_status === 1;

    if (!hasValidAwb && !hasValidTrackStatus) {
      return res.status(404).json({
        success: false,
        trackingAvailable: false,
        message: "Tracking information not found for this AWB.",
      });
    }

    // 6. Map actual timeline activities (without inventing any)
    const rawActivities = shiprocketResponse.shipment_track_activities || [];
    const timeline = rawActivities.map((act) => ({
      date: act.date,
      status: act.status,
      activity: act.activity,
      location: act.location && act.location !== "NA" ? act.location : null,
      srStatus: act["sr-status"] || null,
      srStatusLabel: act["sr-status-label"] || null,
    }));

    // 7. Optional MongoDB order enrichment (non-blocking, never fails the request)
    let orderDetails = null;
    try {
      const matchingOrder = await Order.findOne({ "shipping.awbCode": awb }).select(
        "orderNumber items delivery_address pricing createdAt"
      );
      if (matchingOrder) {
        orderDetails = {
          orderNumber: matchingOrder.orderNumber,
          items: matchingOrder.items || [],
          address: matchingOrder.delivery_address || {},
          amount: matchingOrder.pricing?.grandTotal,
          orderDate: matchingOrder.createdAt,
        };
      }
    } catch (dbErr) {
      // Non-blocking: proceed with pure Shiprocket data
    }

    // 8. Return normalized clean response structure
    return res.status(200).json({
      success: true,
      trackingAvailable: true,
      source: "shiprocket",
      data: {
        awb_code: trackItem?.awb_code || awb,
        current_status: trackItem?.current_status || "In Transit",
        current_status_id: trackItem?.current_status_id || shiprocketResponse.shipment_status || null,
        shipment_status: shiprocketResponse.shipment_status || null,
        courier_name: trackItem?.courier_name || "Courier Partner",
        courier_company_id: trackItem?.courier_company_id || null,
        shipment_id: trackItem?.shipment_id || null,
        order_id: trackItem?.order_id || null,
        pickup_date: trackItem?.pickup_date || null,
        delivered_date: trackItem?.delivered_date || null,
        origin: trackItem?.origin || null,
        destination: trackItem?.destination || trackItem?.delivered_to || null,
        delivered_to: trackItem?.delivered_to || null,
        edd: trackItem?.edd || shiprocketResponse.etd || null,
        etd: shiprocketResponse.etd || trackItem?.edd || null,
        updated_time_stamp: trackItem?.updated_time_stamp || null,
        track_url: shiprocketResponse.track_url || null,
        shipment_track_activities: timeline,
        is_return: Boolean(shiprocketResponse.is_return),
        npr: shiprocketResponse.npr || null,
        ndr: shiprocketResponse.ndr || null,
        orderDetails, // optional enriched info if AWB exists in MongoDB
      },
    });
  } catch (error) {
    console.error("Track Order Controller Exception:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch tracking information right now. Please try again.",
    });
  }
};