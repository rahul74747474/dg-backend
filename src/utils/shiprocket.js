import axios from "axios";

const SHIPROCKET_EMAIL = process.env.SHIPROCKET_EMAIL;
const SHIPROCKET_PASSWORD = process.env.SHIPROCKET_PASSWORD;

let shiprocketToken = null;
let tokenExpiry = null;

export const getShiprocketToken = async () => {
  if (shiprocketToken && tokenExpiry > Date.now()) {
    return shiprocketToken;
  }

  const res = await axios.post(
    "https://apiv2.shiprocket.in/v1/external/auth/login",
    {
      email: SHIPROCKET_EMAIL,
      password: SHIPROCKET_PASSWORD,
    }
  );

  shiprocketToken = res.data.token;

  tokenExpiry = Date.now() + 9 * 24 * 60 * 60 * 1000; // 9 days

  return shiprocketToken;
};