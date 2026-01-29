import mongoose from "mongoose";
import Review from "../models/Reviews.model.js";
import Product from "../models/Product.model.js";

/**
 * Recalculate average rating & rating count
 */
export const updateProductRating = async (productId) => {
  const stats = await Review.aggregate([
    {
      $match: {
        product: new mongoose.Types.ObjectId(productId),
      },
    },
    {
      $group: {
        _id: "$product",
        avgRating: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    await Product.findByIdAndUpdate(productId, {
      averageRating: Number(stats[0].avgRating.toFixed(1)),
      ratingCount: stats[0].count,
    });
  } else {
    await Product.findByIdAndUpdate(productId, {
      averageRating: 0,
      ratingCount: 0,
    });
  }
};
