import axios from "axios";

let shiprocketToken = null;
let tokenExpiry = null;

export const getShiprocketToken = async () => {
  if (shiprocketToken && tokenExpiry && tokenExpiry > Date.now()) {
    return shiprocketToken;
  }

  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;

  if (!email || !password) {
    throw new Error("Shiprocket credentials (SHIPROCKET_EMAIL, SHIPROCKET_PASSWORD) are not configured");
  }

  const res = await axios.post(
    "https://apiv2.shiprocket.in/v1/external/auth/login",
    { email, password },
    { timeout: 10000 }
  );

  if (!res.data?.token) {
    throw new Error("Failed to obtain authentication token from Shiprocket");
  }

  shiprocketToken = res.data.token;
  // Cache for 9 days (Shiprocket tokens typically last 10 days)
  tokenExpiry = Date.now() + 9 * 24 * 60 * 60 * 1000;

  return shiprocketToken;
};