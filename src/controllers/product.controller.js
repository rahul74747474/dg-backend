import Product from "../models/Product.model.js";
import { v2 as cloudinary } from "cloudinary";

/* ================= UPLOAD PRODUCT IMAGES ================= */
export const uploadImages = async (req, res) => {
  try {
    if (!req.files?.length) {
      return res.status(400).json({ message: "No images uploaded" });
    }

    const images = [];

    for (const file of req.files) {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: "products",
      });

      images.push({
        url: result.secure_url,
        publicId: result.public_id,
      });
    }

    res.json({ success: true, images });
  } catch (err) {
    res.status(500).json({ message: "Image upload failed" });
  }
};

/* ================= CREATE PRODUCT ================= */
export const createProduct = async (req, res) => {
  try {
    const { name, slug, price, oldPrice } = req.body;

    if (!name || !slug || !price) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const slugExists = await Product.findOne({ slug });
    if (slugExists) {
      return res.status(409).json({ message: "Slug already exists" });
    }

    if (oldPrice && oldPrice < price) {
      return res.status(400).json({
        message: "Old price cannot be less than price",
      });
    }

    const product = await Product.create(req.body);
    res.status(201).json({ success: true, product });
  } catch (err) {
    res.status(500).json({ message: "Product creation failed" });
  }
};

/* ================= UPDATE PRODUCT ================= */
export const updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ message: "Product update failed" });
  }
};

/* ================= SOFT DELETE PRODUCT ================= */
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { status: "INACTIVE" },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({ success: true, message: "Product deactivated" });
  } catch (err) {
    res.status(500).json({ message: "Product delete failed" });
  }
};

/* ================= GET SINGLE PRODUCT ================= */
export const getProduct = async (req, res) => {
  const product = await Product.findOne({
    slug: req.params.slug,
    status: "ACTIVE",
  });

  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  res.json({ product });
};

/* ================= GET ALL PRODUCTS (FILTERS + PAGINATION) ================= */
export const getAllProducts = async (req, res) => {
  const { category, minPrice, maxPrice } = req.query;

  const filter = { status: "ACTIVE" };

  if (category) {
    filter.catName = category; // "Sweet Makhana"
  }

  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  const products = await Product.find(filter).sort({ createdAt: -1 });

  res.json({ success: true, products });
};

/* ================= FEATURED PRODUCTS ================= */
export const getAllFeaturedProducts = async (req, res) => {
  const products = await Product.find({
    isFeatured: true,
    status: "ACTIVE",
  });

  res.json({ success: true, products });
};

/* ================= REMOVE IMAGE ================= */
export const removeImageFromCloudinary = async (req, res) => {
  try {
    const { publicId } = req.body;

    if (!publicId) {
      return res.status(400).json({ message: "publicId required" });
    }

    await cloudinary.uploader.destroy(publicId);
    res.json({ success: true });
  } catch {
    res.status(500).json({ message: "Failed to remove image" });
  }
};

/* ================= BULK DELETE PRODUCTS ================= */
export const deleteMultipleProducts = async (req, res) => {
  try {
    const { productIds } = req.body;
    if (!Array.isArray(productIds) || productIds.length === 0) { return res.status(400).json({ message: "productIds array is required", }); } // Fetch products to delete their images 
    const products = await Product.find({ _id: { $in: productIds }, }); // Delete images from Cloudinary 
    for (const product of products) {
      if (product.images?.length) {
        for (const img of product.images) {
          await cloudinary.uploader.destroy(img.publicId);
        }
      }
    } // Delete products from DB 
    await Product.deleteMany({ _id: { $in: productIds }, }); res.status(200).json({ success: true, message: "Products deleted successfully", deletedCount: products.length, });
  } catch (error) { console.error("BULK DELETE ERROR:", error); res.status(500).json({ message: "Failed to delete products", }); }
};

/* ================= PRODUCTS COUNT ================= */
 export const getProductsCount = async (req, res) => { const count = await Product.countDocuments(); res.json({ count }); };