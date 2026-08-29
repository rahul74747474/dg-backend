import PricingConfig from "../models/PricingConfig.model.js";
import { getActivePricingConfig } from "../services/pricing.service.js";

/**
 * Get current pricing configuration
 * GET /api/pricing/config
 */
export const getPricingConfigController = async (req, res) => {
  try {
    const config = await getActivePricingConfig();
    res.status(200).json({
      success: true,
      config,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch pricing configuration",
    });
  }
};

/**
 * Update pricing configuration (Admin only)
 * PUT /api/pricing/config
 */
export const updatePricingConfigController = async (req, res) => {
  try {
    const updates = req.body;

    const config = await PricingConfig.findOneAndUpdate(
      { key: "default" },
      { $set: updates },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Pricing configuration updated successfully",
      config,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update pricing configuration",
    });
  }
};
