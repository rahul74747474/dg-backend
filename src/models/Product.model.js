import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: String,

    images: { type: [String], default: [] },
    brand: String,

    price: { type: Number, required: true },
    oldPrice: Number,
    discount: Number,
    discountType: { type: String, enum: ["PERCENT", "FLAT"] },

    catName: { type: String, required: true, index: true },
    countInStock: { type: Number, default: 0 },

    averageRating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },

    ingredients: [String],

    nutrition: {
      calories: String,
      protein: String,
      fat: String,
      carbs: String,
      fiber: String,
      sugar: String,
      sodium: String,
    },

    netQuantity: {
      value: Number,
      unit: { type: String, enum: ["g", "kg", "ml"] },
    },

    /* 📦 SHIPPING FIELDS */

    sku: {
      type: String,
      unique: true,
      required: true,
      uppercase: true,
      trim: true,
    },

    weight: {
      type: Number, // in kg
      required: true,
    },

    dimensions: {
      length: { type: Number, required: true }, // cm
      breadth: { type: Number, required: true }, // cm
      height: { type: Number, required: true }, // cm
    },

    packageType: {
      type: String,
      enum: ["POUCH", "JAR", "BOX"],
      default: "POUCH",
    },

    hsnCode: {
      type: String,
      default: "20081910",
    },

    tax: {
      type: Number,
      default: 5, // GST for makhana snacks
    },

    /* OTHER */

    isFeatured: { type: Boolean, default: false },

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "OUT_OF_STOCK"],
      default: "ACTIVE",
    },

    fssaiLicense: String,
    shelfLife: String,
    storageInstructions: String,
    countryOfOrigin: String,
  },
  { timestamps: true }
);

/* 🔥 Indexes */

productSchema.index({ name: "text", description: "text" });
productSchema.index({ price: 1 });
productSchema.index({ isFeatured: 1 });

export default mongoose.model("product", productSchema);