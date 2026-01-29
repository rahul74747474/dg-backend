import Review from "../models/Reviews.model.js";
import Product from "../models/Product.model.js";
import { updateProductRating } from "../utils/review.utils.js";

/* ================= GET REVIEWS FOR PRODUCT ================= */
export const getProductReviews = async (req, res) => {
  const { productId } = req.params;

  const reviews = await Review.find({ product: productId })
    .populate("user", "name")
    .sort({ createdAt: -1 });

  res.json({ success: true, reviews });
};

/* ================= CREATE REVIEW ================= */
export const createReview = async (req, res) => {
  try {
    const { productId } = req.params;
    const { rating, comment } = req.body;

    if (!rating) {
      return res.status(400).json({ message: "Rating is required" });
    }

    // validate product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // prevent duplicate review
    const alreadyReviewed = await Review.findOne({
      user: req.user._id,
      product: productId,
    });

    if (alreadyReviewed) {
      return res.status(409).json({
        message: "You have already reviewed this product",
      });
    }

    const review = await Review.create({
      user: req.user._id,
      product: productId,
      rating,
      comment,
    });

    await updateProductRating(productId);

    res.status(201).json({ success: true, review });
  } catch (error) {
    console.error("CREATE REVIEW ERROR:", error);
    res.status(500).json({ message: "Failed to create review" });
  }
};

/* ================= UPDATE REVIEW ================= */
export const updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    const review = await Review.findOne({
      _id: id,
      user: req.user._id,
    });

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    if (rating) review.rating = rating;
    if (comment) review.comment = comment;

    await review.save();
    await updateProductRating(review.product);

    res.json({ success: true, review });
  } catch (error) {
    console.error("UPDATE REVIEW ERROR:", error);
    res.status(500).json({ message: "Failed to update review" });
  }
};

/* ================= DELETE REVIEW ================= */
export const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;

    const review = await Review.findOneAndDelete({
      _id: id,
      user: req.user._id,
    });

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    await updateProductRating(review.product);

    res.json({ success: true, message: "Review deleted" });
  } catch (error) {
    console.error("DELETE REVIEW ERROR:", error);
    res.status(500).json({ message: "Failed to delete review" });
  }
};
