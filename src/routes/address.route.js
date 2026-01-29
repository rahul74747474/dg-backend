import { Router } from "express";
import protect from "../middlewares/protect.js";

import {
  addAddress,
  getMyAddresses,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from "../controllers/address.controller.js";

const addressRouter = Router();

/**
 * @route   POST /api/address
 * @desc    Add new address
 * @access  Private
 */
addressRouter.post("/", protect, addAddress);

/**
 * @route   GET /api/address
 * @desc    Get user addresses
 * @access  Private
 */
addressRouter.get("/", protect, getMyAddresses);

/**
 * @route   PUT /api/address/:id
 * @desc    Update address
 * @access  Private
 */
addressRouter.put("/:id", protect, updateAddress);

/**
 * @route   PUT /api/address/default/:id
 * @desc    Set default address
 * @access  Private
 */
addressRouter.put("/default/:id", protect, setDefaultAddress);

/**
 * @route   DELETE /api/address/:id
 * @desc    Delete address (soft delete)
 * @access  Private
 */
addressRouter.delete("/:id", protect, deleteAddress);

export default addressRouter;
