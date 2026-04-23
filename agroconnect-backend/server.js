import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import priceRoutes from "./routes/priceRoutes.js";
import weatherRoutes from "./routes/weatherRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import adminAuthRoutes from "./routes/adminAuthRoutes.js";
import mandiRoutes from "./routes/mandiRoutes.js";

connectDB();

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/prices", priceRoutes);
app.use("/api/weather", weatherRoutes);
app.use("/api/ai-chat", aiRoutes);
app.use("/api/admin/auth", adminAuthRoutes);      // ← NEW: Admin authentication
app.use("/api/admin/mandis", mandiRoutes);        // ← NEW: Mandi management

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});