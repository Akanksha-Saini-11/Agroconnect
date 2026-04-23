import mongoose from "mongoose";
import { runAdminIsolationMigration } from "../utils/migrations.js";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");
    
    // Run automated migrations
    await runAdminIsolationMigration();
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

export default connectDB;