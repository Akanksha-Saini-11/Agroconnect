import { useState, useCallback, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import PricePanel from "./components/PricePanel";
import CropInfoPanel from "./components/CropInfoPanel";
import AIAdvisor from "./components/AIAdvisor";
import { fetchPrices } from "./api/priceApi";
import { getDistance, getDistrictCoords } from "./constants/districtCoords";
import AdminDashboard from "./components/AdminDashboard";
import "./App.css";
import "./components/EmptyState.css";

// CACHE CONFIG
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Helper: Check if cache is still valid
// eslint-disable-next-line no-unused-vars
// const isCacheValid = (timestamp) => {
//   if (!timestamp) return false;
//   return Date.now() - timestamp < CACHE_TTL_MS;
// };

// Helper: Get cache key
const getCacheKey = (crop, state) => {
  const normCrop = crop ? crop.trim().toLowerCase().replace(/\s+/g, " ") : "";
  const normState = state ? state.trim().toLowerCase().replace(/\s+/g, " ") : "";
  return `prices_${normCrop}_${normState}`;
};

function MainApp() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedCrop, setSelectedCrop] = useState(null);
  const [selectedState, setSelectedState] = useState("");

  const [prices, setPrices] = useState([]);
  const [bestMandi, setBestMandi] = useState(null);
  const [total, setTotal] = useState(null);
  const [weather, setWeather] = useState(null);

  const [userLocation, setUserLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [nearbyMode, setNearbyMode] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("prices");
  const [fromCache, setFromCache] = useState(false);

  // Cross-tab real-time update listener
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "agroconnect_refresh_prices") {
        console.log("🔄 Cross-tab update detected. Refreshing dashboard...");
        if (selectedCrop) {
          handleFetchPrices();
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCrop, selectedState]); 

  const handleCropSelect = (crop) => {
    setSelectedCrop(crop);
    setPrices([]);
    setBestMandi(null);
    setError("");
    setActiveTab("prices");
    setNearbyMode(false);
    setTimeout(handleFetchPrices, 50);
  };

  const handleFetchPrices = async () => {
    if (!selectedCrop) return;

    const crop = selectedCrop.apiName;
    const state = selectedState || "all";
    const cacheKey = getCacheKey(crop, state);

    try {
      setLoading(true);
      setError("");
      setActiveTab("prices");
      setNearbyMode(false);

      /* STEP 1: CHECK LOCALSTORAGE CACHE */
      const cached = localStorage.getItem(cacheKey);

      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          console.log("⚡ Showing cached data (will refresh in background)");
          setPrices(parsed.data || []);
          setBestMandi(parsed.bestMandi || null);
          setTotal(parsed.total || null);
          setFromCache(true);
        } catch (parseError) {
          console.error("Cache parse error:", parseError);
          localStorage.removeItem(cacheKey);
        }
      }

      /* STEP 2: FETCH FRESH DATA FROM API */
      console.log(`🌐 Fetching fresh data from API for crop: ${crop}, state: ${selectedState || "All India"}`);
      const data = await fetchPrices(crop, selectedState);

      if (!data.success || !data.data?.length) {
        setError(data.notice || "No results found for this crop.");
        return;
      }

      // REQUIRED DEBUG: Log raw API data BEFORE processing
      console.log(`📦 [RAW API DATA] Total records received: ${data.data.length}`);
      const uniqueStates = [...new Set(data.data.map(m => m.state))];
      console.log(`🗺️ [RAW API DATA] Unique states received:`, uniqueStates);

      setPrices(data.data);
      setBestMandi(data.bestMandi);
      setTotal(data.total);
      setFromCache(false);

      if (data.notice) {
        setError(data.notice);
      }

      /* STEP 3: SAVE TO LOCALSTORAGE WITH TIMESTAMP */
      localStorage.setItem(
        cacheKey,
        JSON.stringify({
          data: data.data,
          bestMandi: data.bestMandi,
          total: data.total,
          timestamp: Date.now(), // Important: TTL validation
        })
      );

      console.log("✅ Updated localStorage cache with fresh data");
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Could not connect to server. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  const addDistances = useCallback((mandiList, location) => {
    let missingCoordsCount = 0;
    
    const mappedList = mandiList.map((mandiRaw) => {
      // 1. Normalize schema and casing
      const mandi = {
        ...mandiRaw,
        state: mandiRaw.state?.toLowerCase().trim() || "",
        district: mandiRaw.district?.toLowerCase().trim() || "",
        mandi: mandiRaw.mandi?.toLowerCase().trim() || "",
        lat: mandiRaw.lat || null,
        lng: mandiRaw.lng || null,
        source: mandiRaw.source || "gov"
      };

      const coords = getDistrictCoords(mandi.district);
      
      // Strict Coordinate Validation
      if (!coords || coords.lat == null || coords.lon == null) {
        console.log(`🚫 Missing coordinates for district: ${mandi.district}`);
        missingCoordsCount++;
        return { ...mandi, distance: 999999 };
      }
      
      // Compute Distance Safely
      const dist = getDistance(
        location.lat,
        location.lon,
        coords.lat,
        coords.lon 
      );
      
      // Mathematical Safety Net
      if (dist == null || isNaN(dist) || !isFinite(dist)) {
        console.log(`🚫 Invalid distance computed for: ${mandi.district}`);
        return { ...mandi, distance: 999999 };
      }

      return { ...mandi, distance: dist };
    });
    
    // 30% Health Warning Rule
    const missingPercentage = Math.round((missingCoordsCount / mandiList.length) * 100);
    if (missingPercentage > 30) {
      console.warn(`🚨 WARNING: District mapping incomplete - ${missingPercentage}% mandis missing coordinates`);
    }
    
    return mappedList;
  }, []);

  const handleLocate = async () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation not supported by your browser.");
      return;
    }

    if (!selectedCrop) return;

    setLocating(true);
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const location = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        };
        console.log("📍 [Near Me] Raw browser geolocation:", location);
        setUserLocation(location);

        try {
          // Always fetch All India data for Near Me to ensure we have nearby mandis from neighboring states
          console.log(`🌐 [Near Me] Fetching ALL INDIA data for ${selectedCrop.apiName}...`);
          const data = await fetchPrices(selectedCrop.apiName, "");

          if (data.success && data.data?.length > 0) {
            const withDist = addDistances(data.data, location);
            setPrices(withDist);
            setNearbyMode(true);
            setTotal(data.total);
            setBestMandi(data.bestMandi);
          } else {
             setLocationError("No mandis found for this crop.");
          }
        } catch (err) {
          console.error("Error fetching All India data for Near Me:", err);
          setLocationError("Could not fetch nearby mandis.");
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        if (err.code === 1) {
          setLocationError("Location access denied. Please allow location.");
        } else {
          setLocationError("Could not get your location. Try again.");
        }
      },
      { timeout: 8000 }
    );
  };

  const handleToggleNearby = () => {
    if (!userLocation || !nearbyMode) {
      handleLocate();
    } else {
      setNearbyMode(false);
      handleFetchPrices();
    }
  };

  const hasResults = prices.length > 0;

  return (
    <div className={`app ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        selectedCrop={selectedCrop}
        onCropSelect={handleCropSelect}
        onWeatherChange={setWeather}
        onDataChanged={handleFetchPrices}
      />

      <div className="app-main">
        <Topbar
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((o) => !o)}
          selectedCrop={selectedCrop}
          onCropSelect={handleCropSelect}
          selectedState={selectedState}
          onStateChange={setSelectedState}
          onFetchPrices={handleFetchPrices}
          loading={loading}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          hasResults={hasResults}
          onLocate={handleToggleNearby}
          locating={locating}
          nearbyMode={nearbyMode}
          hasLocation={!!userLocation}
        />

        <main className="app-body">
          {loading && <div className="global-loading-bar" />}

          {error && (
            <div className="global-notice">
              <span>⚠️</span> {error}
            </div>
          )}

          {locationError && (
            <div className="global-notice">
              <span>📍</span> {locationError}
            </div>
          )}

          {fromCache && (
            <div className="global-notice" style={{ opacity: 0.7 }}>
              <span>💾</span> Showing cached data (updated every 5 minutes)
            </div>
          )}

          {activeTab === "prices" && (
            <>
              {hasResults ? (
                <PricePanel
                  prices={prices}
                  bestMandi={bestMandi}
                  selectedCrop={selectedCrop}
                  selectedState={selectedState}
                  total={total}
                  nearbyMode={nearbyMode}
                />
              ) : (
                !loading && <EmptyState crop={selectedCrop} />
              )}
            </>
          )}

          {activeTab === "info" && selectedCrop && (
            <CropInfoPanel crop={selectedCrop} />
          )}

          {activeTab === "ai" && selectedCrop && (
            <AIAdvisor
              crop={selectedCrop}
              weather={weather}
              state={selectedState}
              prices={prices}
              bestMandi={bestMandi}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function EmptyState({ crop }) {
  return (
    <div className="empty-state">
      <div className="empty-illustration">
        <span className="empty-crop-icon">{crop ? crop.icon : "🌾"}</span>
        <div className="empty-rings">
          <div className="ring ring-1" />
          <div className="ring ring-2" />
          <div className="ring ring-3" />
        </div>
      </div>
      <h2 className="empty-title">
        {crop ? `Ready to fetch ${crop.name} prices` : "Select a crop to begin"}
      </h2>
      <p className="empty-sub">
        {crop
          ? `Choose a state (or All India) and click "Get Prices" to see live mandi data.`
          : "Pick any crop from the sidebar — cereals, vegetables, fruits, and more."}
      </p>
      {!crop && (
        <div className="empty-categories">
          {["🌾 Cereals", "🥬 Vegetables", "🍌 Fruits", "🌻 Oilseeds", "🫘 Pulses", "🌶️ Spices"].map((c) => (
            <span key={c} className="empty-category-chip">
              {c}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/" element={<MainApp />} />
        <Route path="*" element={<MainApp />} />
      </Routes>
    </BrowserRouter>
  );
}