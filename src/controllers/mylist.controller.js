import MyListModel from "../models/Mylist.model.js";

/* ================= ADD TO WISHLIST ================= */
export const addToMyList = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const {
      productId,
      productTitle,
      image,
      rating,
      price,
      oldPrice,
      Discount,
    } = req.body;

    if (!productId || !productTitle || !image) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    // prevent duplicate wishlist item
    const alreadyExists = await MyListModel.findOne({
      userId,
      productId,
    });

    if (alreadyExists) {
      return res.status(409).json({
        message: "Product already in wishlist",
      });
    }

    const wishlistItem = await MyListModel.create({
      userId,
      productId,
      productTitle,
      image,
      rating,
      price,
      oldPrice,
      Discount,
    });

    res.status(201).json({
      success: true,
      message: "Added to wishlist",
      wishlistItem,
    });
  } catch (error) {
    console.error("ADD TO WISHLIST ERROR:", error);
    res.status(500).json({ message: "Failed to add to wishlist" });
  }
};

/* ================= GET WISHLIST ================= */
export const getMyList = async (req, res) => {
  try {
    const userId = req.user._id.toString();

    const wishlist = await MyListModel.find({ userId })
      .lean() // IMPORTANT
      .sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      wishlist,
    });
  } catch (error) {
    console.error("GET WISHLIST ERROR:", error);
    res.status(500).json({ message: "Failed to fetch wishlist" });
  }
};

/* ================= REMOVE FROM WISHLIST ================= */
export const removeFromMyList = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { productId } = req.params;

    const deleted = await MyListModel.findOneAndDelete({
      userId,
      productId,
    });

    if (!deleted) {
      return res.status(404).json({ message: "Item not found in wishlist" });
    }

    res.status(200).json({
      success: true,
      message: "Removed from wishlist",
    });
  } catch (error) {
    console.error("REMOVE WISHLIST ERROR:", error);
    res.status(500).json({ message: "Failed to remove wishlist item" });
  }
};

/* ================= CLEAR WISHLIST ================= */
export const clearMyList = async (req, res) => {
  try {
    const userId = req.user._id.toString();

    await MyListModel.deleteMany({ userId });

    res.status(200).json({
      success: true,
      message: "Wishlist cleared",
    });
  } catch (error) {
    console.error("CLEAR WISHLIST ERROR:", error);
    res.status(500).json({ message: "Failed to clear wishlist" });
  }
};
