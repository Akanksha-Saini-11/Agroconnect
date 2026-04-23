import mongoose from "mongoose";

const priceSchema = new mongoose.Schema({
  crop:       { type: String, required: true },
  state:      { type: String, default: "" },
  data:       { type: Array, required: true },   // full records array
  bestMandi:  { type: Object, required: true },
  total:      { type: Number },
  fetchedAt:  { type: Date, default: Date.now },  // for cache expiry
});

// Index for fast lookup
priceSchema.index({ crop: 1, state: 1 });

export default mongoose.model("Price", priceSchema);