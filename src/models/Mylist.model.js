import mongoose from "mongoose";

const myListSchema = new mongoose.Schema(
  {
    productTitle: {
      type: String,
      required:true,
    },
    image: {
      type: String,
      required:true,
    },
    price: {
      type: Number,
      required:true,
    },
    rating: {
    type: Number,
    default: 0,        // ✅ NOT required
  },

  oldPrice: {
    type: Number,
    default: 0,        // ✅ NOT required
  },

  Discount: {
    type: Number,
    default: 0,        // ✅ NOT required
  },

    productId: {
      type: String,
      required:true,
    },
    userId: {
      type: String,
      required:true,
    },
  },
  {
    timestamps: true,
  }
);

const MyListModel = mongoose.model(
  "MyList",
  myListSchema
);

export default MyListModel;
