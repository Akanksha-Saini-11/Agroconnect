import mongoose from "mongoose";

const customMandiSchema = new mongoose.Schema(
  {
    mandi: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    district: {
      type: String,
      required: true,
    },
    crop: {
      type: String,
      required: true,
    },
    variety: {
      type: String,
      default: null,
    },
    grade: {
      type: String,
      default: null,
    },
    minPrice: {
      type: Number,
      default: null,
    },
    maxPrice: {
      type: Number,
      default: null,
    },
    modalPrice: {
      type: Number,
      required: true,
    },
    arrivalQuantity: {
      type: Number,   // in quintals
      default: null,
    },
    date: {
      type: String,   // Format: YYYY-MM-DD
      required: true,
    },
    addedBy: {
      type: String,   // admin email
      required: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    source: {
      type: String,
      default: "admin",
    },
  },
  { timestamps: true }
);

// Unique index to prevent duplicate entries from the same admin
customMandiSchema.index(
  { ownerId: 1, mandi: 1, crop: 1, state: 1, district: 1, variety: 1, grade: 1 },
  { unique: true }
);

// Index for faster queries
customMandiSchema.index({ crop: 1, state: 1, district: 1 });

export default mongoose.model("CustomMandi", customMandiSchema);