import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { runAdminIsolationMigration } from "./utils/migrations.js";

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to DB");
    await runAdminIsolationMigration();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
