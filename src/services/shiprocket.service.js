import axios from "axios";
import { getShiprocketToken } from "../utils/shiprocket.js";
import mongoose from "mongoose";

const SR_BASE_URL = "https://apiv2.shiprocket.in/v1/external";

export const processShiprocketFlow = async (order) => {
  try {
    /* ---------------- TOKEN ---------------- */
    const token = await getShiprocketToken();

    const client = axios.create({
      baseURL: SR_BASE_URL,
      headers: { Authorization: `Bearer ${token}` },
      timeout: 15000,
    });

    /* ---------------- FETCH USER ---------------- */
   const user = await mongoose.connection
  .collection("users")
  .findOne(
    { _id: new mongoose.Types.ObjectId(order.userId) },
    { projection: { name: 1, email: 1 } }
  );

    /* ---------------- VALIDATION ---------------- */
    const addr = order.delivery_address;

    if (!addr) {
      throw new Error("❌ Delivery address missing in order");
    }

    const requiredFields = [
      "mobile",
      "address_line",
      "city",
      "state",
      "pincode",
    ];

    const capitalize = (str) =>
      str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

    for (let field of requiredFields) {
      if (!addr[field]) {
        throw new Error(`❌ Missing address field: ${field}`);
      }
    }

    /* ---------------- PAYLOAD ---------------- */
    const orderPayload = {
      order_id: order.orderNumber,
      order_date: new Date().toISOString().split("T")[0],
      pickup_location: "warehouse",

      // 🔥 USER + ADDRESS BASED (NO HARDCODE)
      billing_customer_name: user?.name || addr.name,
      billing_last_name: "",
      billing_address: addr.address_line,
      billing_city: addr.city,
      billing_pincode: addr.pincode,
      billing_state: capitalize(addr.state),
      billing_country: addr.country || "India",
      billing_phone: addr.mobile,
      billing_email: user?.email || "test@example.com",

      shipping_customer_name: user?.name || addr.name,
      shipping_address: addr.address_line,
      shipping_city: addr.city,
      shipping_pincode: addr.pincode,
      shipping_state: capitalize(addr.state),
      shipping_country: addr.country || "India",
      shipping_phone: addr.mobile,
      shipping_email: user?.email || "test@example.com",

      shipping_is_billing: true,

      order_items: order.items.map((item) => ({
  name: item.name,
  sku: item.sku,
  units: item.quantity,
  selling_price: item.price,
  hsn: item.hsnCode || "20081910", // 🔥 ADD THIS LINE
})),

      payment_method:
        order.payment.method === "COD" ? "COD" : "Prepaid",

      sub_total: order.pricing.subTotal,

      // 🔥 DYNAMIC DIMENSIONS
      length: order.shipmentDetails?.length || 10,
      breadth: order.shipmentDetails?.breadth || 10,
      height: order.shipmentDetails?.height || 10,
      weight: order.shipmentDetails?.weight || 0.5,
    };

    console.log("📦 Shiprocket Payload:", orderPayload);

    /* ---------------- STEP 1: CREATE ORDER ---------------- */
    const orderRes = await client.post("/orders/create/adhoc", orderPayload);

    console.log("📦 Shiprocket Order Response:", orderRes.data);

    const shipmentId = orderRes.data?.shipment_id;

    if (!shipmentId) {
      throw new Error("❌ Shipment ID not received from Shiprocket");
    }

    /* ---------------- STEP 2: GET BEST COURIER ---------------- */
    const weight = Math.max(order.shipmentDetails?.weight || 0.5, 0.5);

    const serviceRes = await client.get(
      `/courier/serviceability/?pickup_postcode=226010&delivery_postcode=${addr.pincode}&cod=${
        order.payment.method === "COD" ? 1 : 0
      }&weight=${weight}`
    );

    const couriers = serviceRes.data?.data?.available_courier_companies;

    let courierId =
      serviceRes.data?.data?.recommended_courier_company_id;

    if (!courierId && couriers?.length) {
      courierId = couriers.sort((a, b) => a.rate - b.rate)[0].courier_company_id;
    }

    if (!courierId) {
      throw new Error("❌ No courier available for this route");
    }

    console.log("🚚 Selected Courier ID:", courierId);

    /* ---------------- STEP 3: ASSIGN AWB ---------------- */
    await new Promise((resolve) => setTimeout(resolve, 1500));

    let awbCode = null;
    let courierName = null;

    try {
      const awbRes = await client.post("/courier/assign/awb", {
        shipment_id: shipmentId,
        courier_id: courierId,
      });

      console.log("🚚 AWB RESPONSE:", awbRes.data);

      if (awbRes.data?.awb_assign_status === 1) {
        awbCode = awbRes.data.response.data.awb_code;
        courierName = awbRes.data.response.data.courier_name;
      } else {
        console.warn("⚠️ AWB not assigned yet");
      }
    } catch (awbError) {
      console.warn(
        "⚠️ AWB assignment failed (wallet issue likely):",
        awbError.response?.data || awbError.message
      );
    }

    /* ---------------- SUCCESS ---------------- */
    return {
      shipmentId,
      awbCode,       // can be null
      courier: courierName, // can be null
    };

  } catch (error) {
    console.error(
      "🚨 Shiprocket Error:",
      error.response?.data || error.message
    );
    throw error;
  }
};


export const checkPincodeServiceability = async ({
  deliveryPincode,
  cod = 1,
  weight = 0.5,
}) => {
  try {
    const token = await getShiprocketToken();

    const client = axios.create({
      baseURL: SR_BASE_URL,
      headers: { Authorization: `Bearer ${token}` },
      timeout: 15000,
    });

    const response = await client.get(
      `/courier/serviceability/`,
      {
        params: {
          pickup_postcode: "226010", // 🔥 your warehouse pincode
          delivery_postcode: deliveryPincode,
          cod,
          weight,
        },
      }
    );

    const data = response.data?.data;
    const couriers = data?.available_courier_companies || [];

    if (!couriers.length) {
      return {
        available: false,
        message: "No courier available",
      };
    }

    // ✅ Cheapest courier
    const cheapest = [...couriers].sort((a, b) => a.rate - b.rate)[0];

    return {
      available: true,
      couriers,
      recommendedCourierId: data?.recommended_courier_company_id,
      cheapestCourier: {
        name: cheapest.courier_name,
        rate: cheapest.rate,
        etd: cheapest.estimated_delivery_days,
        cod: cheapest.cod,
      },
    };

  } catch (error) {
    console.error(
      "🚨 Serviceability Error:",
      error.response?.data || error.message
    );

    throw new Error("Failed to check serviceability");
  }
};