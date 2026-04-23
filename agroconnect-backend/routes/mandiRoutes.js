import express from "express";
import CustomMandi from "../models/CustomMandi.js";
import { verifyAdminToken } from "./adminAuthRoutes.js";
import Price from "../models/Price.js";
import { normalizeText } from "../utils/normalize.js";

const router = express.Router();

/* GET ADMIN'S OWN MANDIS */
router.get("/", verifyAdminToken, async (req, res) => {
  try {
    const { crop, state, district } = req.query;
    let filter = { ownerId: req.adminId };

    if (crop) filter.crop = normalizeText(crop);
    if (state) filter.state = normalizeText(state);
    if (district) filter.district = normalizeText(district);

    const mandis = await CustomMandi.find(filter).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: mandis,
      total: mandis.length,
    });
  } catch (error) {
    console.error("Get mandis error:", error);
    res.status(500).json({ success: false, message: "Error fetching mandis" });
  }
});

/* GET SINGLE MANDI */
router.get("/:id", verifyAdminToken, async (req, res) => {
  try {
    const mandi = await CustomMandi.findById(req.params.id);

    if (!mandi) {
      return res.status(404).json({ success: false, message: "Mandi not found" });
    }

    if (mandi.ownerId.toString() !== req.adminId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You do not own this mandi entry",
      });
    }

    res.json({ success: true, data: mandi });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching mandi" });
  }
});

/* ADD NEW MANDI */
router.post("/", verifyAdminToken, async (req, res) => {
  try {
    const {
      mandi,
      state,
      district,
      crop,
      variety,
      grade,
      minPrice,
      maxPrice,
      modalPrice,
      arrivalQuantity,
    } = req.body;

    if (!mandi || !state || !district || !crop || !modalPrice) {
      return res.status(400).json({
        success: false,
        message: "Required fields: mandi, state, district, crop, modalPrice",
      });
    }

    const normMandi = normalizeText(mandi);
    const normState = normalizeText(state);
    const normDistrict = normalizeText(district);
    const normCrop = normalizeText(crop);
    const normVariety = variety?.trim() || null;
    const normGrade = grade?.trim() || null;

    const query = {
      ownerId: req.adminId,
      mandi: normMandi,
      crop: normCrop,
      state: normState,
      district: normDistrict,
      variety: normVariety,
      grade: normGrade
    };

    const update = {
      $set: {
        minPrice: minPrice ? Number(minPrice) : null,
        maxPrice: maxPrice ? Number(maxPrice) : null,
        modalPrice: Number(modalPrice),
        arrivalQuantity: arrivalQuantity ? Number(arrivalQuantity) : null,
        date: new Date().toISOString().split("T")[0],
        addedBy: req.adminEmail,
        ownerId: req.adminId,
        source: "admin",
      }
    };

    const customMandi = await CustomMandi.findOneAndUpdate(query, update, {
      upsert: true,
      new: true
    });

    /* CLEAR API CACHE for this crop + state and all India */
    await Price.deleteMany({
      crop: customMandi.crop,
      state: { $in: [customMandi.state, ""] },
    });

    res.status(201).json({
      success: true,
      message: "Mandi added successfully",
      data: customMandi,
      cacheCleared: true,
    });
  } catch (error) {
    console.error("Add mandi error:", error);
    res.status(500).json({ success: false, message: "Error adding mandi" });
  }
});

/* UPDATE MANDI */
router.put("/:id", verifyAdminToken, async (req, res) => {
  try {
    const {
      mandi,
      state,
      district,
      crop,
      variety,
      grade,
      minPrice,
      maxPrice,
      modalPrice,
      arrivalQuantity,
    } = req.body;

    const today = new Date().toISOString().split("T")[0];

    const mandiToUpdate = await CustomMandi.findById(req.params.id);
    if (!mandiToUpdate) {
      return res.status(404).json({ success: false, message: "Mandi not found" });
    }

    if (mandiToUpdate.ownerId.toString() !== req.adminId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You do not own this mandi entry",
      });
    }

    const updatedMandi = await CustomMandi.findByIdAndUpdate(
      req.params.id,
      {
        mandi: normalizeText(mandi),
        state: normalizeText(state),
        district: normalizeText(district),
        crop: normalizeText(crop),
        variety: variety?.trim() || null,
        grade: grade?.trim() || null,
        minPrice: minPrice ? Number(minPrice) : null,
        maxPrice: maxPrice ? Number(maxPrice) : null,
        modalPrice: Number(modalPrice),
        arrivalQuantity: arrivalQuantity ? Number(arrivalQuantity) : null,
        date: today,
      },
      { new: true }
    );

    if (!updatedMandi) {
      return res.status(404).json({
        success: false,
        message: "Mandi not found",
      });
    }

    /* CLEAR API CACHE for this crop + state and all India */
    await Price.deleteMany({
      crop: updatedMandi.crop,
      state: { $in: [updatedMandi.state, ""] },
    });

    res.json({
      success: true,
      message: "Mandi updated successfully",
      data: updatedMandi,
      cacheCleared: true,
    });
  } catch (error) {
    console.error("Update mandi error:", error);
    res.status(500).json({ success: false, message: "Error updating mandi" });
  }
});

/* DELETE MANDI */
router.delete("/:id", verifyAdminToken, async (req, res) => {
  try {
    const mandiToDelete = await CustomMandi.findById(req.params.id);
    if (!mandiToDelete) {
      return res.status(404).json({ success: false, message: "Mandi not found" });
    }

    if (mandiToDelete.ownerId.toString() !== req.adminId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You do not own this mandi entry",
      });
    }

    const deletedMandi = await CustomMandi.findByIdAndDelete(req.params.id);

    if (!deletedMandi) {
      return res.status(404).json({
        success: false,
        message: "Mandi not found",
      });
    }

    /* CLEAR API CACHE for this crop + state and all India */
    await Price.deleteMany({
      crop: deletedMandi.crop,
      state: { $in: [deletedMandi.state, ""] },
    });

    res.json({
      success: true,
      message: "Mandi deleted successfully",
      data: deletedMandi,
      cacheCleared: true,
    });
  } catch (error) {
    console.error("Delete mandi error:", error);
    res.status(500).json({ success: false, message: "Error deleting mandi" });
  }
});

export default router;