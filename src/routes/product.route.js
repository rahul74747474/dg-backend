import express from "express";
import {
  uploadImages,
  createProduct,
  updateProduct,
  deleteProduct,
  getProduct,
  getAllProducts,
  getProductsCount,
  getAllFeaturedProducts,
  removeImageFromCloudinary,
  deleteMultipleProducts
} from "../controllers/product.controller.js";

import protect from "../middlewares/protect.js";
import adminOnly from "../middlewares/adminOnly.js";
import upload from "../middlewares/upload.js";

const router = express.Router();

/* ================= PUBLIC ROUTES ================= */

// get all products (with filters)
router.get("/", getAllProducts);

// product count
router.get("/count/all", getProductsCount);

// featured products
router.get("/featured/all", getAllFeaturedProducts);

// ✅ get single product by SLUG (IMPORTANT)
router.get("/slug/:slug", getProduct);

/* ================= ADMIN ROUTES ================= */

// upload product images
router.post(
  "/upload-images",
  protect,
  adminOnly,
  upload.array("images"),
  uploadImages
);

// create product
router.post(
  "/create",
  protect,
  adminOnly,
  createProduct
);

// update product by ID
router.put(
  "/update/:id",
  protect,
  adminOnly,
  updateProduct
);

// soft delete product
router.delete(
  "/delete/:id",
  protect,
  adminOnly,
  deleteProduct
);

// remove image
router.delete(
  "/remove-image",
  protect,
  adminOnly,
  removeImageFromCloudinary
);

// bulk delete
router.delete(
  "/bulk-delete",
  protect,
  adminOnly,
  deleteMultipleProducts
);

export default router;
