import express from "express";
import axios from "axios";
import Price from "../models/Price.js";
import CustomMandi from "../models/CustomMandi.js";

const router = express.Router();

const RESOURCE_ID = "9ef84268-d588-465a-a308-a864a43d0070";
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour
const PAGE_SIZE = 100;
const MAX_RECORDS = 500;

const normalize = (v) =>
  v ? v.trim().toLowerCase().replace(/\s+/g, " ") : "";

const fetchAllRecords = async (apiKey, crop, state) => {
  let allRecords = [];
  let offset = 0;
  let total = null;

  while (true) {
    let url = `https://api.data.gov.in/resource/${RESOURCE_ID}?api-key=${apiKey}&format=json&limit=${PAGE_SIZE}&offset=${offset}&filters[commodity]=${encodeURIComponent(crop)}`;

    if (state)
      url += `&filters[state.keyword]=${encodeURIComponent(state)}`;

    const response = await axios.get(url, { timeout: 10000 });

    const records = response.data.records || [];

    if (total === null)
      total = Number(response.data.total) || 0;

    allRecords = [...allRecords, ...records];

    if (
      records.length < PAGE_SIZE ||
      allRecords.length >= Math.min(total, MAX_RECORDS)
    ) {
      return { records: allRecords, total };
    }

    offset += PAGE_SIZE;
  }
};

/* GET PRICES */
router.get("/", async (req, res) => {
  const rawCrop = req.query.crop;
  const rawState = req.query.state || "";

  if (!rawCrop) {
    return res.status(400).json({ success: false, message: "Crop required" });
  }

  const normCrop = normalize(rawCrop);
  const normState = normalize(rawState);
  const cacheKey = `${normCrop}_${normState}`;

  console.log(`🔍 [Price Request] Crop: '${normCrop}', State: '${normState}', CacheKey: '${cacheKey}'`);

  const GOVT_API_KEY = process.env.MANDI_API_KEY;

  try {
    /* TRY CACHE FIRST */
    const cached = await Price.findOne({
      crop: normCrop,
      state: normState,
      fetchedAt: {
        $gte: new Date(Date.now() - CACHE_DURATION_MS),
      },
    });

    if (cached && cached.data?.length) {
      console.log(`📦 [CACHE HIT] Returning ${cached.data.length} cached records for key: ${cacheKey}`);
      return res.json({
        success: true,
        data: cached.data,
        bestMandi: cached.bestMandi,
        total: cached.total,
        fromCache: true,
        notice: null,
      });
    }

    console.log(`🌐 [CACHE MISS] Fetching fresh data from API for key: ${cacheKey}`);

    /* FETCH API DATA */
    // Try passing the raw State first, as the API might expect Title Case
    let { records, total } = await fetchAllRecords(
      GOVT_API_KEY,
      rawCrop,
      rawState
    );

    let notice = null;

    /* PROPER FALLBACK LOGIC */
    if (records.length === 0 && normState !== "") {
      console.log(`⚠️ API returned 0 records for state filter. Trying ALL INDIA fallback...`);
      const allIndiaData = await fetchAllRecords(GOVT_API_KEY, rawCrop, "");
      
      console.log(`🔍 [DEBUG] Starting strict manual filter for normState: '${normState}'`);
      
      // Manually filter down to the requested state
      records = allIndiaData.records.filter(r => {
        const rawApiState = r.state;
        const normApiState = normalize(rawApiState);
        const isMatch = normApiState === normState;
        
        // Log mismatch details for debugging if they are close (e.g. starts with same 3 letters)
        if (!isMatch && normApiState.substring(0, 3) === normState.substring(0, 3)) {
           console.log(`❌ [MISMATCH DEBUG] API State: '${rawApiState}' -> Normalized: '${normApiState}' | Expected: '${normState}'`);
        }
        
        if (isMatch) {
           console.log(`✅ [MATCH] API State: '${rawApiState}' matched requested '${normState}'`);
        }
        
        return isMatch;
      });
      total = records.length;
      
      console.log(`⚠️ Manual Fallback Filter: Found ${records.length} records matching '${normState}' out of ${allIndiaData.records.length} All India records.`);
      
      if (records.length === 0) {
         notice = `No data available for ${rawState} even after checking All India.`;
         
         // If still 0, log the top 5 unique states from the API to show what IS available
         const uniqueApiStates = [...new Set(allIndiaData.records.map(r => r.state))].slice(0, 5);
         console.log(`🕵️‍♂️ [API DATA SAMPLE] Unique states found in All India data:`, uniqueApiStates);
      }
    }

    /* NORMALIZE API DATA */
    const apiData = records.map((r) => ({
      mandi: r.market,
      district: r.district,
      state: normalize(r.state),
      crop: normalize(r.commodity),
      variety: r.variety || null,
      grade: r.grade || null,
      minPrice: Number(r.min_price),
      maxPrice: Number(r.max_price),
      modalPrice: Number(r.modal_price),
      arrivalQuantity: null,
      date: r.arrival_date,
      source: "api",
    }));

    /* GET ADMIN MANDIS */
    const customMandis = await CustomMandi.find({
      crop: normCrop,
      ...(normState && { state: normState }),
    });

    const adminData = customMandis.map((m) => {
      const min = m.minPrice ?? m.modalPrice;
      const max = m.maxPrice ?? m.modalPrice;

      return {
        mandi: m.mandi,
        district: m.district,
        state: m.state,
        crop: m.crop,
        variety: m.variety || null,
        grade: m.grade || null,
        minPrice: min,
        maxPrice: max,
        modalPrice: m.modalPrice,
        arrivalQuantity: m.arrivalQuantity || null,
        date: m.date,
        source: "admin",
      };
    });

    /* MERGE DATA */
    const allData = [...apiData, ...adminData];

    /* HANDLE EMPTY RESULTS */
    if (allData.length === 0) {
      console.log("⚠️ No data found - checking old cache");

      const oldCache = await Price.findOne({ crop: normCrop, state: normState });

      if (oldCache?.data?.length) {
        console.log("🛟 Serving old cache as fallback");

        return res.json({
          success: true,
          data: oldCache.data,
          bestMandi: oldCache.bestMandi,
          total: oldCache.total,
          fromCache: true,
          notice: "No fresh data. Showing last available data.",
        });
      }

      return res.json({
        success: true,
        data: [],
        bestMandi: null,
        total: 0,
        fromCache: false,
        notice: notice || "No mandi data available for this crop.",
      });
    }

    /* FIND BEST MANDI */
    const bestMandi = allData.reduce((max, item) =>
      item.modalPrice > max.modalPrice ? item : max
    );

    console.log(`✅ Total: ${allData.length} (API: ${apiData.length}, Admin: ${adminData.length})`);

    /* SAVE TO CACHE */
    await Price.findOneAndUpdate(
      { crop: normCrop, state: normState },
      {
        crop: normCrop,
        state: normState,
        data: allData,
        bestMandi,
        total: allData.length,
        fetchedAt: new Date(),
      },
      { upsert: true }
    );

    return res.json({
      success: true,
      data: allData,
      bestMandi,
      total: allData.length,
      fromCache: false,
      notice,
    });
  } catch (error) {
    console.error("❌ Price Fetch Error:", error.message);

    /* FINAL FALLBACK - SERVE OLD CACHE */
    const oldCache = await Price.findOne({
      crop: normCrop,
      state: normState,
    });

    if (oldCache?.data?.length) {
      console.log("🛟 API failed - serving old cache");

      return res.json({
        success: true,
        data: oldCache.data,
        bestMandi: oldCache.bestMandi,
        total: oldCache.total,
        fromCache: true,
        notice: "API unavailable. Showing cached data.",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error fetching prices",
    });
  }
});

export default router;