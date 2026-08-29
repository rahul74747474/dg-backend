import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_DB_URI || process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("MongoDB URI environment variable (MONGO_DB_URI / MONGODB_URI) is missing");
    }
    const conn = await mongoose.connect(uri);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("❌ MongoDB connection failed");
    console.error(error.message);
    process.exit(1);
  }
};

export default connectDB;
