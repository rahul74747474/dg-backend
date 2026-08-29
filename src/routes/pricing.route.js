import { Router } from "express";
import protect from "../middlewares/protect.js";
import adminOnly from "../middlewares/adminOnly.js";
import {
  getPricingConfigController,
  updatePricingConfigController,
} from "../controllers/pricing.controller.js";

const router = Router();

router.get("/config", getPricingConfigController);
router.put("/config", protect, adminOnly, updatePricingConfigController);

export default router;
