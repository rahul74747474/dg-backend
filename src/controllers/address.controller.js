import Address from "../models/Address.model.js";

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
