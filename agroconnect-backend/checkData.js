import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import CustomMandi from "./models/CustomMandi.js";
import Admin from "./models/Admin.js";

const checkData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to DB");

    const mandis = await CustomMandi.find({});
    console.log(`Total Mandis: ${mandis.length}`);

    for (const m of mandis) {
      console.log(`Mandi: ${m.mandi} | ownerId: ${m.ownerId} | addedBy: ${m.addedBy}`);
    }

    const admins = await Admin.find({});
    for (const a of admins) {
      console.log(`Admin: ${a.name} | _id: ${a._id} | email: ${a.email}`);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

checkData();
