import express from "express";
import axios from "axios";
import Price from "../models/Price.js";
import CustomMandi from "../models/CustomMandi.js";

const router = express.Router();

const RESOURCE_ID = "9ef84268-d588-465a-a308-a864a43d0070";
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour
const PAGE_SIZE = 500; // Optimized: Fetch maximum records in a single call
const MAX_RECORDS = 500;

const normalize = (v) =>
  v ? v.trim().toLowerCase().replace(/\s+/g, " ") : "";

const CROP_BASE_PRICES = {
  wheat: 2450,
  rice: 3200,
  paddy: 2200,
  potato: 1400,
  tomato: 1850,
  onion: 2100,
  mustard: 5400,
  groundnut: 6200,
  garlic: 8500,
  gram: 5100,
  mango: 4200,
  cotton: 6800,
  sugarcane: 340,
  brinjal: 1800,
  maize: 2150,
};

const SAMPLE_MANDIS = [
  { mandi: "Khanna APMC", district: "Ludhiana", state: "punjab" },
  { mandi: "Karnal Mandi", district: "Karnal", state: "haryana" },
  { mandi: "Azamgarh Mandi", district: "Azamgarh", state: "uttar pradesh" },
  { mandi: "Indore Mandi", district: "Indore", state: "madhya pradesh" },
  { mandi: "Kota APMC", district: "Kota", state: "rajasthan" },
  { mandi: "Rajkot APMC", district: "Rajkot", state: "gujarat" },
  { mandi: "Guntur APMC", district: "Guntur", state: "andhra pradesh" },
  { mandi: "Lasalgaon Mandi", district: "Nashik", state: "maharashtra" },
];

const generateFallbackData = (crop, requestedState) => {
  const base = CROP_BASE_PRICES[crop] || 3500;
  const today = new Date().toLocaleDateString("en-GB");

  let selectedMandis = SAMPLE_MANDIS;
  if (requestedState) {
    const match = SAMPLE_MANDIS.filter(m => m.state === requestedState);
    if (match.length) selectedMandis = match;
  }

  const data = selectedMandis.map((m, idx) => {
    const variance = (idx % 5 - 2) * 120;
    const modalPrice = Math.max(100, base + variance);
    return {
      mandi: m.mandi,
      district: m.district,
      state: m.state,
      crop: crop,
      variety: "Local / Standard",
      grade: "FAQ",
      minPrice: Math.round(modalPrice * 0.92),
      maxPrice: Math.round(modalPrice * 1.08),
      modalPrice: modalPrice,
      arrivalQuantity: 150 + idx * 40,
      date: today,
      source: "fallback",
    };
  });

  const bestMandi = data.reduce((max, item) =>
    item.modalPrice > max.modalPrice ? item : max
  );

  return { data, bestMandi };
};

const fetchAllRecords = async (apiKey, crop, state) => {
  let allRecords = [];
  let offset = 0;
  let total = null;

  try {
    while (true) {
      let url = `https://api.data.gov.in/resource/${RESOURCE_ID}?api-key=${apiKey}&format=json&limit=${PAGE_SIZE}&offset=${offset}&filters[commodity]=${encodeURIComponent(crop)}`;

      if (state)
        url += `&filters[state.keyword]=${encodeURIComponent(state)}`;

      const response = await axios.get(url, { timeout: 3500 });

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
  } catch (err) {
    console.warn(`⚠️ API fetch attempt failed for state='${state}': ${err.message}`);
    // If state filter failed (e.g. 502 Bad Gateway on state.keyword filter), retry without state filter
    if (state) {
      try {
        console.log(`🔄 Retrying without state filter for crop '${crop}'...`);
        let fallbackUrl = `https://api.data.gov.in/resource/${RESOURCE_ID}?api-key=${apiKey}&format=json&limit=200&filters[commodity]=${encodeURIComponent(crop)}`;
        const response = await axios.get(fallbackUrl, { timeout: 3500 });
        const records = response.data.records || [];
        return { records, total: Number(response.data.total) || records.length };
      } catch (fallbackErr) {
        console.error(`❌ Fallback API query failed: ${fallbackErr.message}`);
        throw err;
      }
    }
    throw err;
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
        
        if (isMatch) {
           console.log(`✅ [MATCH] API State: '${rawApiState}' matched requested '${normState}'`);
        }
        
        return isMatch;
      });
      total = records.length;
      
      console.log(`⚠️ Manual Fallback Filter: Found ${records.length} records matching '${normState}' out of ${allIndiaData.records.length} All India records.`);
      
      if (records.length === 0) {
         notice = `No data available for ${rawState} even after checking All India.`;
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

      // Generate fallback data if no records returned
      const fallback = generateFallbackData(normCrop, normState);
      return res.json({
        success: true,
        data: fallback.data,
        bestMandi: fallback.bestMandi,
        total: fallback.data.length,
        fromCache: true,
        notice: notice || "Showing estimated mandi rates (API offline).",
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

    /* 1. SERVE OLD CACHE FOR SPECIFIC CROP + STATE */
    const oldCache = await Price.findOne({
      crop: normCrop,
      state: normState,
    });

    if (oldCache?.data?.length) {
      console.log("🛟 API failed - serving old cache for requested crop & state");
      return res.json({
        success: true,
        data: oldCache.data,
        bestMandi: oldCache.bestMandi,
        total: oldCache.total,
        fromCache: true,
        notice: "Government API (data.gov.in) temporarily unresponsive. Showing cached data.",
      });
    }

    /* 2. SERVE GENERAL CROP CACHE (e.g. ALL INDIA CACHE) */
    const anyCropCache = await Price.findOne({ crop: normCrop });
    if (anyCropCache?.data?.length) {
      const filtered = normState
        ? anyCropCache.data.filter((r) => normalize(r.state) === normState)
        : anyCropCache.data;
      const targetData = filtered.length ? filtered : anyCropCache.data;
      const bestMandi = targetData.reduce((max, item) =>
        item.modalPrice > max.modalPrice ? item : max
      );
      console.log(`🛟 API failed - serving general crop cache (${targetData.length} records)`);
      return res.json({
        success: true,
        data: targetData,
        bestMandi,
        total: targetData.length,
        fromCache: true,
        notice: "Government API (data.gov.in) temporarily unresponsive. Showing cached data.",
      });
    }

    /* 3. SERVE ADMIN CUSTOM MANDIS */
    const customMandis = await CustomMandi.find({
      crop: normCrop,
      ...(normState && { state: normState }),
    });

    if (customMandis?.length) {
      const adminData = customMandis.map((m) => ({
        mandi: m.mandi,
        district: m.district,
        state: m.state,
        crop: m.crop,
        variety: m.variety || null,
        grade: m.grade || null,
        minPrice: m.minPrice ?? m.modalPrice,
        maxPrice: m.maxPrice ?? m.modalPrice,
        modalPrice: m.modalPrice,
        arrivalQuantity: m.arrivalQuantity || null,
        date: m.date,
        source: "admin",
      }));

      const bestMandi = adminData.reduce((max, item) =>
        item.modalPrice > max.modalPrice ? item : max
      );

      console.log("🛟 API failed - serving admin custom mandis");
      return res.json({
        success: true,
        data: adminData,
        bestMandi,
        total: adminData.length,
        fromCache: false,
        notice: "Government API (data.gov.in) unreachable. Showing local admin mandi data.",
      });
    }

    /* 4. SERVE GENERATED FALLBACK DATA & SEED DB CACHE */
    const fallback = generateFallbackData(normCrop, normState);
    console.log(`🛟 API failed & no cache - serving generated fallback data for '${normCrop}'`);
    
    // Save generated fallback to cache in background so next request is instant
    Price.findOneAndUpdate(
      { crop: normCrop, state: normState },
      {
        crop: normCrop,
        state: normState,
        data: fallback.data,
        bestMandi: fallback.bestMandi,
        total: fallback.data.length,
        fetchedAt: new Date(),
      },
      { upsert: true }
    ).catch(() => {});

    return res.json({
      success: true,
      data: fallback.data,
      bestMandi: fallback.bestMandi,
      total: fallback.data.length,
      fromCache: true,
      notice: "Government API (data.gov.in) server temporarily offline. Displaying estimated APMC mandi rates.",
    });
  }
});

export default router;