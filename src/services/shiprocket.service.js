import axios from "axios";
import { getShiprocketToken } from "../utils/shiprocket.js";
import mongoose from "mongoose";

const SR_BASE_URL = "https://apiv2.shiprocket.in/v1/external";

/**
 * Creates an authenticated Axios client for Shiprocket API requests.
 */
const getShiprocketClient = async () => {
  const token = await getShiprocketToken();
  return axios.create({
    baseURL: SR_BASE_URL,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    timeout: 12000,
  });
};

/**
 * Calculates live courier rates and serviceability from Shiprocket based on actual cart weight,
 * dimensions, delivery pincode, and payment method.
 *
 * @param {Object} params
 * @param {string} params.deliveryPincode
 * @param {boolean} [params.isCod=false]
 * @param {number} [params.weight=0.5] // in kg (minimum 0.5kg for courier rates)
 * @param {Object} [params.dimensions] // { length, breadth, height } in cm
 * @param {string} [params.courierSelectionStrategy='cheapest']
 * @returns {Promise<{ serviceable: boolean, actualRate?: number, courierName?: string, courierId?: number, etd?: string, error?: string }>}
 */
export const getShippingRateForCart = async ({
  deliveryPincode,
  isCod = false,
  weight = 0.5,
  dimensions = { length: 10, breadth: 10, height: 5 },
  courierSelectionStrategy = "cheapest",
  declaredValue = 500,
}) => {
  const pickupPincode = process.env.SHIPROCKET_PICKUP_PINCODE || "226010";
  const normalizedWeight = Math.max(Number(weight) || 0.5, 0.5);

  if (!deliveryPincode || String(deliveryPincode).trim().length !== 6) {
    return {
      serviceable: false,
      error: "Invalid delivery pincode",
    };
  }

  try {
    const client = await getShiprocketClient();

    const response = await client.get("/courier/serviceability/", {
      params: {
        pickup_postcode: pickupPincode,
        delivery_postcode: deliveryPincode,
        cod: isCod ? 1 : 0,
        weight: normalizedWeight,
        length: Math.max(dimensions.length || 10, 5),
        breadth: Math.max(dimensions.breadth || 10, 5),
        height: Math.max(dimensions.height || 5, 2),
        declared_value: Math.max(Number(declaredValue) || 100, 100),
      },
    });

    const data = response.data?.data;
    const couriers = data?.available_courier_companies || [];

    if (!couriers.length) {
      return {
        serviceable: false,
        error: `Delivery is not available for pincode ${deliveryPincode}`,
      };
    }

    // Courier selection strategy
    let selectedCourier = null;
    if (courierSelectionStrategy === "recommended" && data?.recommended_courier_company_id) {
      selectedCourier = couriers.find(
        (c) => c.courier_company_id === data.recommended_courier_company_id
      );
    }

    if (!selectedCourier) {
      // Default to cheapest eligible courier
      selectedCourier = [...couriers].sort((a, b) => Number(a.rate) - Number(b.rate))[0];
    }

    if (!selectedCourier || isNaN(Number(selectedCourier.rate))) {
      return {
        serviceable: false,
        error: `No courier rate available for pincode ${deliveryPincode}`,
      };
    }

    const actualRate = Math.round(Number(selectedCourier.rate));

    return {
      serviceable: true,
      actualRate,
      courierName: selectedCourier.courier_name || "Standard Courier",
      courierId: selectedCourier.courier_company_id,
      etd: selectedCourier.estimated_delivery_days
        ? `${selectedCourier.estimated_delivery_days} days`
        : "3-5 days",
    };
  } catch (error) {
    const isDev = process.env.NODE_ENV !== "production";
    const allowFallback = process.env.SHIPROCKET_ALLOW_FALLBACK === "true" || isDev;

    console.error(
      "🚨 Shiprocket Serviceability API Error:",
      error.response?.data?.message || error.message
    );

    // In production without explicit fallback flag, fail safely with controlled error
    if (!allowFallback) {
      return {
        serviceable: false,
        error: "Unable to retrieve live shipping rates. Please verify your delivery pincode or try again later.",
      };
    }

    // In development / test fallback mode
    console.warn(
      `⚠️ [DEV FALLBACK] Shiprocket unavailable. Using development fallback rate for pincode ${deliveryPincode}.`
    );

    return {
      serviceable: true,
      actualRate: 65,
      courierName: "Standard Surface (Dev Fallback)",
      courierId: 1,
      etd: "3-5 days",
      isDevFallback: true,
    };
  }
};

/**
 * Public serviceability check for product detail page and quick pincode validation.
 */
export const checkPincodeServiceability = async ({
  deliveryPincode,
  cod = 1,
  weight = 0.5,
}) => {
  const result = await getShippingRateForCart({
    deliveryPincode,
    isCod: Boolean(cod),
    weight,
  });

  return {
    available: result.serviceable,
    message: result.serviceable ? "Delivery available" : result.error || "Delivery not available",
    cheapestCourier: result.serviceable
      ? {
          name: result.courierName,
          rate: result.actualRate,
          etd: result.etd,
          cod,
        }
      : null,
  };
};

/**
 * Creates an adhoc order, checks courier serviceability, and assigns AWB in Shiprocket.
 * Executed after an order is committed and confirmed.
 *
 * @param {Object} order - Mongoose Order document
 */
export const processShiprocketFlow = async (order) => {
  try {
    const client = await getShiprocketClient();
    const pickupPincode = process.env.SHIPROCKET_PICKUP_PINCODE || "226010";

    const user = await mongoose.connection
      .collection("users")
      .findOne(
        { _id: new mongoose.Types.ObjectId(order.userId) },
        { projection: { name: 1, email: 1 } }
      );

    const addr = order.delivery_address;
    if (!addr) {
      throw new Error("Delivery address missing in order");
    }

    const requiredFields = ["mobile", "address_line", "city", "state", "pincode"];
    const capitalize = (str) =>
      str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

    for (const field of requiredFields) {
      if (!addr[field]) {
        throw new Error(`Missing address field: ${field}`);
      }
    }

    const orderPayload = {
      order_id: order.orderNumber,
      order_date: new Date().toISOString().split("T")[0],
      pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || "Primary",

      billing_customer_name: user?.name || addr.name || "Customer",
      billing_last_name: "",
      billing_address: addr.address_line,
      billing_city: addr.city,
      billing_pincode: addr.pincode,
      billing_state: capitalize(addr.state),
      billing_country: addr.country || "India",
      billing_phone: addr.mobile,
      billing_email: user?.email || "customer@example.com",

      shipping_customer_name: user?.name || addr.name || "Customer",
      shipping_address: addr.address_line,
      shipping_city: addr.city,
      shipping_pincode: addr.pincode,
      shipping_state: capitalize(addr.state),
      shipping_country: addr.country || "India",
      shipping_phone: addr.mobile,
      shipping_email: user?.email || "customer@example.com",

      shipping_is_billing: true,

      order_items: order.items.map((item) => ({
        name: item.name,
        sku: item.sku || `SKU-${item.productId}`,
        units: item.quantity,
        selling_price: item.price,
        hsn: item.hsnCode || "20081910",
      })),

      payment_method: order.payment?.method === "COD" ? "COD" : "Prepaid",
      sub_total: order.pricing?.subTotal || 0,

      length: Math.max(order.shipmentDetails?.length || 10, 5),
      breadth: Math.max(order.shipmentDetails?.breadth || 10, 5),
      height: Math.max(order.shipmentDetails?.height || 5, 2),
      weight: Math.max(order.shipmentDetails?.weight || 0.5, 0.5),
    };

    console.log("📦 Shiprocket Create Order Payload:", orderPayload);

    // Step 1: Create adhoc order
    const orderRes = await client.post("/orders/create/adhoc", orderPayload);

console.log(
  "🚚 SHIPROCKET CREATE ORDER STATUS:",
  orderRes.status
);

console.log(
  "🚚 SHIPROCKET CREATE ORDER RESPONSE:",
  JSON.stringify(orderRes.data, null, 2)
);

const shipmentId = orderRes.data?.shipment_id;

if (!shipmentId) {
  throw new Error(
    `Shipment ID not received from Shiprocket. Response: ${JSON.stringify(orderRes.data)}`
  );
}
    // Step 2: Get Best Courier
// const weight = Math.max(order.shipmentDetails?.weight || 0.5, 0.5);

// console.log("🚚 STEP 2: Checking courier serviceability...");
// console.log("📍 Pickup:", pickupPincode);
// console.log("📍 Delivery:", addr.pincode);
// console.log("⚖️ Weight:", weight);
// console.log("💰 COD:", order.payment?.method === "COD" ? 1 : 0);

// const serviceRes = await client.get("/courier/serviceability/", {
//   params: {
//     pickup_postcode: pickupPincode,
//     delivery_postcode: addr.pincode,
//     cod: order.payment?.method === "COD" ? 1 : 0,
//     weight,
//   },
// });

// console.log(
//   "🚚 STEP 2 RESPONSE:",
//   JSON.stringify(serviceRes.data, null, 2)
// );

// const couriers =
//   serviceRes.data?.data?.available_courier_companies || [];

// if (!couriers.length) {
//   throw new Error(
//     `No courier available for this route. Response: ${JSON.stringify(
//       serviceRes.data
//     )}`
//   );
// }

// // Select the courier with the lowest shipping rate
// const cheapestCourier = [...couriers].sort(
//   (a, b) => Number(a.rate) - Number(b.rate)
// )[0];

// const courierId = cheapestCourier.courier_company_id;

// console.log("💰 AVAILABLE COURIERS:");

// console.table(
//   couriers.map((courier) => ({
//     id: courier.courier_company_id,
//     name: courier.courier_name,
//     rate: courier.rate,
//   }))
// );

// console.log("💰 CHEAPEST COURIER SELECTED:");
// console.log({
//   id: courierId,
//   name: cheapestCourier.courier_name,
//   rate: cheapestCourier.rate,
// });

  // Step 3: Assign AWB
// await new Promise((resolve) => setTimeout(resolve, 1000));

// console.log("🚚 STEP 3: Assigning AWB...");
// console.log("📦 Shipment ID:", shipmentId);
// console.log("🚚 Courier ID:", courierId);

// let awbCode = null;
// let courierName = null;

// try {
//   const awbRes = await client.post("/courier/assign/awb", {
//     shipment_id: shipmentId,
//     courier_id: courierId,
//   });

//   console.log(
//     "🚚 AWB RESPONSE:",
//     JSON.stringify(awbRes.data, null, 2)
//   );

//   if (awbRes.data?.awb_assign_status === 1) {
//     awbCode = awbRes.data.response.data.awb_code;
//     courierName = awbRes.data.response.data.courier_name;

//     console.log("✅ AWB ASSIGNED:", awbCode);
//     console.log("🚚 COURIER:", courierName);
//   } else {
//     console.warn(
//       "⚠️ AWB was not assigned:",
//       JSON.stringify(awbRes.data, null, 2)
//     );
//   }
// } catch (awbError) {
//   console.error(
//     "❌ AWB ASSIGNMENT ERROR:",
//     awbError.response?.data || awbError.message
//   );
// }
    // Step 4: Persist shipping details on Order document
    await mongoose.connection.collection("orders").updateOne(
      { _id: new mongoose.Types.ObjectId(order._id) },
      {
        $set: {
          "shipping.shipmentId": shipmentId,
          "shipping.awbCode": awbCode,
          "shipping.courierName": courierName,
          orderStatus: awbCode ? "CONFIRMED" : "PLACED",
        },
      }
    );

    return {
      shipmentId,
      awbCode,
      courier: courierName,
    };
  } catch (error) {
    console.error("🚨 Shiprocket Execution Error:", error.response?.data || error.message);
    throw error;
  }
};