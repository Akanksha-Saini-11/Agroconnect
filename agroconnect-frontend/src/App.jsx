import { useState, useCallback, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import PricePanel from "./components/PricePanel";
import CropInfoPanel from "./components/CropInfoPanel";
import AIAdvisor from "./components/AIAdvisor";
import Footer from "./components/Footer";
import { fetchPrices } from "./api/priceApi";
import { getDistance, getDistrictCoords } from "./constants/districtCoords";
import AdminDashboard from "./components/AdminDashboard";
import { t, formatBilingualText } from "./utils/translations";
import "./App.css";
import "./components/EmptyState.css";



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
  
  // 🌐 Language State (Persisted)
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem("agroconnect_lang") || "en";
  });

  useEffect(() => {
    localStorage.setItem("agroconnect_lang", language);
  }, [language]);

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
    
    // Auto-close sidebar on mobile after selection
    if (window.innerWidth < 1025) {
      setSidebarOpen(false);
    }

    // Scroll main body and window back to top smoothly
    window.scrollTo({ top: 0, behavior: "smooth" });
    const appBody = document.querySelector(".app-body");
    if (appBody) {
      appBody.scrollTo({ top: 0, behavior: "smooth" });
    }

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
      setError(language === "hi" ? "सर्वर से कनेक्ट नहीं हो सका। कृपया बाद में प्रयास करें।" : "Could not connect to server. Is the backend running?");
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
        state: mandiRaw.state || "",
        district: mandiRaw.district || "",
        mandi: mandiRaw.mandi || "",
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
      setLocationError(language === "hi" ? "आपका ब्राउज़र लोकेशन का समर्थन नहीं करता है।" : "Geolocation not supported by your browser.");
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
            setActiveTab("prices");
          } else {
             setLocationError(language === "hi" ? "इस फसल के लिए कोई मंडी नहीं मिली।" : "No mandis found for this crop.");
          }
        } catch (err) {
          console.error("Error fetching All India data for Near Me:", err);
          setLocationError(language === "hi" ? "निकटतम मंडियों को लोड नहीं किया जा सका।" : "Could not fetch nearby mandis.");
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        if (err.code === 1) {
          setLocationError(language === "hi" ? "लोकेशन एक्सेस अस्वीकार कर दिया गया। कृपया परमिशन दें।" : "Location access denied. Please allow location.");
        } else {
          setLocationError(language === "hi" ? "आपकी लोकेशन नहीं मिल सकी। पुनः प्रयास करें।" : "Could not get your location. Try again.");
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
    <>
    <div className={`app ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        selectedCrop={selectedCrop}
        onCropSelect={handleCropSelect}
        onWeatherChange={setWeather}
        onDataChanged={handleFetchPrices}
        language={language}
        onLanguageChange={setLanguage}
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
          language={language}
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
              <span>💾</span> {t("loading", language)}
            </div>
          )}

          {activeTab === "prices" && (
            <>
              {loading && !hasResults ? (
                <LoadingState language={language} />
              ) : hasResults ? (
                <PricePanel
                  prices={prices}
                  bestMandi={bestMandi}
                  selectedCrop={selectedCrop}
                  selectedState={selectedState}
                  total={total}
                  nearbyMode={nearbyMode}
                  language={language}
                />
              ) : (
                <EmptyState crop={selectedCrop} language={language} onCropSelect={handleCropSelect} />
              )}
            </>
          )}

          {activeTab === "info" && selectedCrop && (
            <CropInfoPanel crop={selectedCrop} language={language} />
          )}

          {activeTab === "ai" && selectedCrop && (
            <AIAdvisor
              crop={selectedCrop}
              weather={weather}
              state={selectedState}
              prices={prices}
              bestMandi={bestMandi}
              language={language}
            />
          )}
        </main>
      </div>
    </div>

    <Footer language={language} onTabChange={setActiveTab} />
    </>
  );
}

function LoadingState({ language }) {
  return (
    <div className="loading-state">
      <div className="loading-spinner-wrap">
        <div className="loading-spinner"></div>
        <div className="loading-spinner-inner">🌾</div>
      </div>
      <h3 className="loading-title">
        {language === "hi" ? "नवीनतम मंडी दरें खोजी जा रही हैं..." : "Fetching latest mandi rates..."}
      </h3>
      <p className="loading-subtitle">
        {language === "hi" 
          ? "हम आपके लिए विभिन्न मंडियों से वास्तविक समय के भाव प्राप्त कर रहे हैं।" 
          : "Connecting to agriculture servers for real-time prices."}
      </p>
      
      <div className="skeleton-grid">
        <div className="skeleton-card"></div>
        <div className="skeleton-card"></div>
        <div className="skeleton-card"></div>
      </div>
    </div>
  );
}

function EmptyState({ crop, language, onCropSelect }) {
  if (!crop) {
    const popularCrops = [
      { name: "Wheat", icon: "🌾", apiName: "Wheat", category: "Cereals & Millets" },
      { name: "Rice", icon: "🍚", apiName: "Rice", category: "Cereals & Millets" },
      { name: "Paddy", icon: "🌿", apiName: "Paddy(Common)", category: "Cereals & Millets" },
      { name: "Potato", icon: "🥔", apiName: "Potato", category: "Vegetables" },
      { name: "Tomato", icon: "🍅", apiName: "Tomato", category: "Vegetables" },
      { name: "Onion", icon: "🧅", apiName: "Onion", category: "Vegetables" },
      { name: "Mustard", icon: "🌻", apiName: "Mustard", category: "Oilseeds" },
      { name: "Garlic", icon: "🧄", apiName: "Garlic", category: "Vegetables" },
      { name: "Chickpea", icon: "🫘", apiName: "Gram", category: "Pulses" },
      { name: "Mango", icon: "🥭", apiName: "Mango", category: "Fruits" },
      { name: "Cotton", icon: "☁️", apiName: "Cotton", category: "Cash Crops" },
      { name: "Sugarcane", icon: "🎋", apiName: "Sugarcane", category: "Cash Crops" },
    ];

    const stats = [
      { num: "500+", label: language === "hi" ? "सक्रिय मंडियां" : "Active Mandis", icon: "🏢" },
      { num: "50+", label: language === "hi" ? "समर्थित फसलें" : "Monitored Crops", icon: "🌾" },
      { num: "100%", label: language === "hi" ? "सत्यापित डेटा" : "Verified Prices", icon: "✅" },
      { num: "24/7", label: language === "hi" ? "एआई सहायता" : "AI Consultation", icon: "🤖" },
    ];

    const features = [
      {
        title: language === "hi" ? "लाइव मंडी दरें" : "Live Mandi Prices",
        desc: language === "hi" ? "विभिन्न राज्यों और जिलों में अपनी उपज के लिए वर्तमान दैनिक भाव देखें।" : "Check real-time market prices across different states and districts for your crop.",
        icon: "📊"
      },
      {
        title: language === "hi" ? "फसल सलाहकार" : "Crop Advisory",
        desc: language === "hi" ? "बुवाई से लेकर कटाई तक मौसम के अनुसार आदर्श कृषि पद्धतियों की जानकारी।" : "Access complete cultivation advice, soil guides, and weather-appropriate routines.",
        icon: "🌾"
      },
      {
        title: language === "hi" ? "एआई सलाहकार" : "AI Consultant",
        desc: language === "hi" ? "अपनी खेती की समस्याओं, रोगों और कीटों का एआई से त्वरित समाधान पाएं।" : "Consult our intelligent AI engine for instant diagnostics and farming tips.",
        icon: "🤖"
      },
      {
        title: language === "hi" ? "मौसम और वर्षा" : "Weather Forecast",
        desc: language === "hi" ? "फसल सुरक्षा और योजना के लिए लाइव मौसम और साप्ताहिक कृषि पूर्वानुमान।" : "Monitor temperature, moisture, and wind speed details mapped for agricultural use.",
        icon: "🌤️"
      }
    ];

    return (
      <div className="dashboard-home">
        {/* Hero Welcome */}
        <div className="dashboard-hero">
          <div className="hero-content">
            <span className="hero-badge">🌱 {t("mandiIntelligence", language)}</span>
            <h1 className="hero-title">
              {language === "hi" ? "कृषि मंडी एवं सलाहकार पोर्टल" : "Agricultural Mandi & Advisory Portal"}
            </h1>
            <p className="hero-subtitle">
              {language === "hi" 
                ? "वास्तविक समय के मंडी भाव, मौसम की जानकारी और एआई-संचालित विशेषज्ञ कृषि सलाह — सब कुछ एक स्थान पर।"
                : "Real-time crop prices, granular weather metrics, and AI-driven agronomy advisory — all integrated in one place."}
            </p>
          </div>
          <div className="hero-bg-shapes">
            <div className="shape shape-1" />
            <div className="shape shape-2" />
          </div>
        </div>

        {/* Stats Summary Bar */}
        <div className="dashboard-stats-grid">
          {stats.map((s, idx) => (
            <div key={idx} className="dashboard-stat-card">
              <span className="dstat-icon">{s.icon}</span>
              <div>
                <h3 className="dstat-num">{s.num}</h3>
                <p className="dstat-label">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Popular Crops Grid */}
        <div className="quick-start-section">
          <h2 className="section-title">
            {language === "hi" ? "त्वरित पहुँच: एक फसल चुनें" : "Quick Start: Select a Crop"}
          </h2>
          <p className="section-subtitle">
            {language === "hi"
              ? "साइडबार के बिना सीधे मंडी भाव और फसल जानकारी देखने के लिए नीचे दी गई किसी भी फसल पर क्लिक करें:"
              : "Click on any crop below to instantly view its live prices, advisor panel, and agricultural metrics:"}
          </p>
          <div className="crops-grid">
            {popularCrops.map((c) => (
              <button
                key={c.name}
                className="crop-quick-card"
                onClick={() => onCropSelect(c)}
              >
                <span className="crop-quick-icon">{c.icon}</span>
                <span className="crop-quick-name">
                  {formatBilingualText(c.name, language, "crop")}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Features Info Section */}
        <div className="features-section">
          <h2 className="section-title">
            {language === "hi" ? "मंच की मुख्य विशेषताएं" : "Core Platform Features"}
          </h2>
          <div className="features-grid">
            {features.map((f, idx) => (
              <div key={idx} className="feature-card">
                <span className="feature-icon">{f.icon}</span>
                <h3 className="feature-card-title">{f.title}</h3>
                <p className="feature-card-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 2. Crop Selected Ready-To-Fetch State
  return (
    <div className="crop-preview-container">
      <div className="crop-preview-header">
        <div className="crop-preview-badge-row">
          <span className="crop-preview-category">
            📂 {formatBilingualText(crop.category, language, "category")}
          </span>
          <span className="crop-preview-active-badge">
            ⚡ {language === "hi" ? "चयनित" : "Selected"}
          </span>
        </div>
        <div className="crop-preview-title-row">
          <span className="crop-preview-icon">{crop.icon}</span>
          <div>
            <h2 className="crop-preview-name">{formatBilingualText(crop.name, language, "crop")}</h2>
            <p className="crop-preview-season">🌾 {formatBilingualText(crop.season, language)}</p>
          </div>
        </div>
      </div>

      <div className="crop-profile-grid">
        <div className="crop-profile-card">
          <span className="prof-icon">🌡️</span>
          <div className="prof-info">
            <h4 className="prof-label">{t("temperature", language)}</h4>
            <p className="prof-val">{formatBilingualText(crop.temp, language)}</p>
          </div>
        </div>

        <div className="crop-profile-card">
          <span className="prof-icon">⛰️</span>
          <div className="prof-info">
            <h4 className="prof-label">{t("soilType", language)}</h4>
            <p className="prof-val">{formatBilingualText(crop.soil, language)}</p>
          </div>
        </div>

        <div className="crop-profile-card">
          <span className="prof-icon">💧</span>
          <div className="prof-info">
            <h4 className="prof-label">{t("waterNeeds", language)}</h4>
            <p className="prof-val">{formatBilingualText(crop.water, language)}</p>
          </div>
        </div>

        <div className="crop-profile-card">
          <span className="prof-icon">📅</span>
          <div className="prof-info">
            <h4 className="prof-label">{t("harvestTime", language)}</h4>
            <p className="prof-val">{formatBilingualText(crop.harvest, language)}</p>
          </div>
        </div>
      </div>

      {crop.states && (
        <div className="crop-states-box">
          <h4 className="states-title">🗺️ {t("majorStates", language)}</h4>
          <p className="states-list">{formatBilingualText(crop.states, language, "state")}</p>
        </div>
      )}

      <div className="crop-action-cta">
        <div className="cta-sparkle">🌾</div>
        <div>
          <h3 className="cta-title">
            {language === "hi" 
              ? `${formatBilingualText(crop.name, language, "crop")} के भाव देखने के लिए तैयार`
              : `Ready to load ${crop.name} Mandi Rates`}
          </h3>
          <p className="cta-desc">
            {language === "hi"
              ? "ऊपर दिए गए नियंत्रणों से एक राज्य (या अखिल भारतीय) चुनें और लाइव मंडी डेटा देखने के लिए 'भाव देखें' पर क्लिक करें।"
              : "Select a specific state (or keep 'All India') in the controls above and click 'Get Prices' to query live agriculture data."}
          </p>
        </div>
      </div>
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