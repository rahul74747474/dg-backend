import Address from "../models/Address.model.js";
import axios from "axios";

/* ================= ADD ADDRESS ================= */
export const addAddress = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      address_line,
      city,
      state,
      pincode,
      country,
      mobile,
      isDefault,
    } = req.body;

    if (!address_line || !city || !state || !pincode) {
      return res.status(400).json({
        message: "Required fields missing",
      });
    }

    // If setting as default, unset previous default
    if (isDefault) {
      await Address.updateMany(
        { userId },
        { $set: { isDefault: false } }
      );
    }

    const address = await Address.create({
      address_line,
      city,
      state,
      pincode,
      country,
      mobile,
      isDefault: isDefault || false,
      userId,
    });

    res.status(201).json({
      success: true,
      message: "Address added successfully",
      address,
    });
  } catch (error) {
    console.error("ADD ADDRESS ERROR:", error);
    res.status(500).json({ message: "Failed to add address" });
  }
};

/* ================= GET USER ADDRESSES ================= */
export const getMyAddresses = async (req, res) => {
  try {
    const userId = req.user._id;

    const addresses = await Address.find({
      userId,
      status: true,
    }).sort({ isDefault: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      addresses,
    });
  } catch (error) {
    console.error("GET ADDRESS ERROR:", error);
    res.status(500).json({ message: "Failed to fetch addresses" });
  }
};

/* ================= UPDATE ADDRESS ================= */
export const updateAddress = async (req, res) => {
  try {
    const userId = req.user._id;
    const addressId = req.params.id;

    const {
      address_line,
      city,
      state,
      pincode,
      country,
      mobile,
      isDefault,
    } = req.body;

    // If making default → unset old default
    if (isDefault) {
      await Address.updateMany(
        { userId },
        { $set: { isDefault: false } }
      );
    }

    const address = await Address.findOneAndUpdate(
      { _id: addressId, userId },
      {
        address_line,
        city,
        state,
        pincode,
        country,
        mobile,
        isDefault,
      },
      { new: true }
    );

    if (!address) {
      return res.status(404).json({ message: "Address not found" });
    }

    res.status(200).json({
      success: true,
      message: "Address updated",
      address,
    });
  } catch (error) {
    console.error("UPDATE ADDRESS ERROR:", error);
    res.status(500).json({ message: "Failed to update address" });
  }
};

/* ================= DELETE ADDRESS (SOFT) ================= */
export const deleteAddress = async (req, res) => {
  try {
    const userId = req.user._id;
    const addressId = req.params.id;

    const address = await Address.findOneAndUpdate(
      { _id: addressId, userId },
      { status: false },
      { new: true }
    );

    if (!address) {
      return res.status(404).json({ message: "Address not found" });
    }

    res.status(200).json({
      success: true,
      message: "Address deleted",
    });
  } catch (error) {
    console.error("DELETE ADDRESS ERROR:", error);
    res.status(500).json({ message: "Failed to delete address" });
  }
};

/* ================= SET DEFAULT ADDRESS ================= */
export const setDefaultAddress = async (req, res) => {
  try {
    const userId = req.user._id;
    const addressId = req.params.id;

    await Address.updateMany(
      { userId },
      { $set: { isDefault: false } }
    );

    const address = await Address.findOneAndUpdate(
      { _id: addressId, userId },
      { isDefault: true },
      { new: true }
    );

    if (!address) {
      return res.status(404).json({ message: "Address not found" });
    }

    res.status(200).json({
      success: true,
      message: "Default address set",
      address,
    });
  } catch (error) {
    console.error("SET DEFAULT ADDRESS ERROR:", error);
    res.status(500).json({ message: "Failed to set default address" });
  }
};
export const getAddressByIdController = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Address ID is required" });
    }

    const address = await Address.findOne({
      _id: id,
      userId,
    });

    if (!address) {
      return res.status(404).json({ message: "Address not found" });
    }

    res.status(200).json({
      success: true,
      address,
    });
  } catch (error) {
    console.error("GET ADDRESS BY ID ERROR:", error);
    res.status(500).json({ message: "Failed to fetch address" });
  }
};

/* ================= LOOKUP PINCODE ================= */
const getStateByPincodePrefix = (pin) => {
  const p = String(pin).trim();
  if (p.length !== 6 || !/^\d{6}$/.test(p)) return null;

  const prefix3 = parseInt(p.slice(0, 3), 10);
  const prefix2 = parseInt(p.slice(0, 2), 10);

  // 3-digit prefix overrides
  if (prefix3 === 744) return { state: "Andaman and Nicobar Islands", city: "Port Blair" };
  if (prefix3 === 682) return { state: "Lakshadweep", city: "Kavaratti" };
  if (prefix3 === 605) return { state: "Puducherry", city: "Puducherry" };
  if (prefix3 === 403) return { state: "Goa", city: "Goa" };
  if (prefix3 >= 790 && prefix3 <= 792) return { state: "Arunachal Pradesh", city: "Itanagar" };
  if (prefix3 >= 793 && prefix3 <= 794) return { state: "Meghalaya", city: "Shillong" };
  if (prefix3 === 795) return { state: "Manipur", city: "Imphal" };
  if (prefix3 === 796) return { state: "Mizoram", city: "Aizawl" };
  if (prefix3 === 797) return { state: "Nagaland", city: "Kohima" };
  if (prefix3 === 799) return { state: "Tripura", city: "Agartala" };
  if (prefix3 >= 244 && prefix3 <= 249) return { state: "Uttarakhand", city: "Dehradun" };
  if (prefix3 >= 262 && prefix3 <= 263) return { state: "Uttarakhand", city: "Nainital" };
  if (prefix3 >= 500 && prefix3 <= 509) return { state: "Telangana", city: "Hyderabad" };
  if (prefix3 >= 814 && prefix3 <= 835) return { state: "Jharkhand", city: "Ranchi" };
  if (prefix3 >= 190 && prefix3 <= 194) return { state: "Jammu and Kashmir", city: "Srinagar" };
  if (prefix3 >= 194 && prefix3 <= 195) return { state: "Ladakh", city: "Leh" };

  // 2-digit major prefixes
  switch (prefix2) {
    case 11: return { state: "Delhi", city: "New Delhi" };
    case 12: case 13: return { state: "Haryana", city: "Gurugram" };
    case 14: case 15: return { state: "Punjab", city: "Amritsar" };
    case 16: return { state: "Chandigarh", city: "Chandigarh" };
    case 17: return { state: "Himachal Pradesh", city: "Shimla" };
    case 18: case 19: return { state: "Jammu and Kashmir", city: "Jammu" };
    case 20: case 21: case 22: case 23: case 24: case 25: case 26: case 27: case 28:
      return { state: "Uttar Pradesh", city: "Lucknow" };
    case 30: case 31: case 32: case 33: case 34:
      return { state: "Rajasthan", city: "Jaipur" };
    case 36: case 37: case 38: case 39:
      return { state: "Gujarat", city: "Ahmedabad" };
    case 40: case 41: case 42: case 43: case 44:
      return { state: "Maharashtra", city: "Mumbai" };
    case 45: case 46: case 47: case 48:
      return { state: "Madhya Pradesh", city: "Bhopal" };
    case 49: return { state: "Chhattisgarh", city: "Raipur" };
    case 50: case 51: case 52: case 53:
      return { state: "Andhra Pradesh", city: "Visakhapatnam" };
    case 56: case 57: case 58: case 59:
      return { state: "Karnataka", city: "Bengaluru" };
    case 60: case 61: case 62: case 63: case 64:
      return { state: "Tamil Nadu", city: "Chennai" };
    case 67: case 68: case 69:
      return { state: "Kerala", city: "Kochi" };
    case 70: case 71: case 72: case 73: case 74:
      return { state: "West Bengal", city: "Kolkata" };
    case 75: case 76: case 77:
      return { state: "Odisha", city: "Bhubaneswar" };
    case 78: return { state: "Assam", city: "Guwahati" };
    case 80: case 81: case 82: case 83: case 84: case 85:
      return { state: "Bihar", city: "Patna" };
    default:
      return null;
  }
};

export const lookupPincode = async (req, res) => {
  try {
    const rawPin = req.params.pincode || req.query.pincode;
    const pincode = String(rawPin || "").trim();

    if (!pincode || pincode.length !== 6 || !/^\d{6}$/.test(pincode)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid 6-digit Indian pincode",
      });
    }

    // Try India Post API with timeout
    try {
      const response = await axios.get(`https://api.postalpincode.in/pincode/${pincode}`, {
        timeout: 3000,
      });

      const data = response.data;
      if (Array.isArray(data) && data[0]?.Status === "Success" && data[0]?.PostOffice?.length > 0) {
        const postOffice = data[0].PostOffice[0];
        const state = postOffice.State;
        const district = postOffice.District || postOffice.Block || postOffice.Name;

        return res.status(200).json({
          success: true,
          source: "postal_api",
          pincode,
          state,
          city: district,
          country: "India",
        });
      }
    } catch (apiErr) {
      console.warn("Postal API lookup non-blocking error:", apiErr.message);
    }

    // Fallback to offline PIN prefix table
    const fallback = getStateByPincodePrefix(pincode);
    if (fallback) {
      return res.status(200).json({
        success: true,
        source: "offline_prefix",
        pincode,
        state: fallback.state,
        city: fallback.city || "",
        country: "India",
      });
    }

    return res.status(404).json({
      success: false,
      message: "No state details found for this pincode",
    });

  } catch (error) {
    console.error("Lookup Pincode Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to lookup pincode",
    });
  }
};

