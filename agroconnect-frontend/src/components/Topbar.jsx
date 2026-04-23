// topbar.jsx
import { STATES, AGRI_STATES } from "../constants/states";
import { CROPS, CROP_CATEGORIES } from "../constants/crops";
import { useState, useMemo } from "react";
import "./Topbar.css";

export default function Topbar({
  sidebarOpen,
  onToggleSidebar,
  selectedCrop,
  onCropSelect,
  selectedState,
  onStateChange,
  onFetchPrices,
  loading,
  activeTab,
  onTabChange,
  hasResults,
  onLocate,
  locating,
  nearbyMode,
}) {

  const categories = Object.values(CROP_CATEGORIES);

  // ✅ No default category selected
  const [selectedCategory, setSelectedCategory] = useState("");

  // ✅ Show crops only after category selected
  const filteredCrops = useMemo(() => {
    if (!selectedCategory) return [];
    return CROPS.filter((c) => c.category === selectedCategory);
  }, [selectedCategory]);

  return (
    <header className="topbar">

      {/* LEFT */}
      <div className="topbar-left">
        <button className="hamburger" onClick={onToggleSidebar}>
          <span />
          <span />
          <span />
        </button>

        {/* CATEGORY SELECT */}
        <select
          className="category-select"
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value);
            onCropSelect(null);
          }}
        >
          <option value="">Select Category</option>

          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        {/* CROP SELECT */}
        <select
          className="crop-select"
          value={selectedCrop?.name || ""}
          disabled={!selectedCategory}
          onChange={(e) => {
            const crop = filteredCrops.find(
              (c) => c.name === e.target.value
            );
            onCropSelect(crop);
          }}
        >
          <option value="">Select Crop</option>

          {filteredCrops.map((crop) => (
            <option key={crop.name} value={crop.name}>
              {crop.icon} {crop.name}
            </option>
          ))}
        </select>
      </div>

      {/* CENTER */}
      <div className="topbar-center">
        <select
          className="state-select"
          value={selectedState}
          onChange={(e) => onStateChange(e.target.value)}
        >
          <option value="">All India</option>

          <optgroup label="Major Agri States">
            {AGRI_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </optgroup>

          <optgroup label="All States & UTs">
            {STATES.filter((s) => !AGRI_STATES.includes(s)).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </optgroup>
        </select>

        <button
          className={`fetch-btn ${loading ? "loading" : ""}`}
          onClick={onFetchPrices}
          disabled={!selectedCrop || loading}
        >
          {loading ? "Loading..." : "Get Prices →"}
        </button>

        {hasResults && (
          <button
            className={`nearby-btn ${nearbyMode ? "nearby-active" : ""}`}
            onClick={onLocate}
            disabled={locating}
          >
            {locating ? "…" : nearbyMode ? "📍 Nearest" : "📍 Near Me"}
          </button>
        )}
      </div>

      {/* RIGHT */}
      <div className="topbar-right">
        {selectedCrop && (
          <div className="tab-group">

            <button
              className={`tab ${activeTab === "prices" ? "tab-active" : ""}`}
              onClick={() => onTabChange("prices")}
            >
              📊 Prices
            </button>

            <button
              className={`tab ${activeTab === "info" ? "tab-active" : ""}`}
              onClick={() => onTabChange("info")}
            >
              🌾 Crop Info
            </button>

            {hasResults && (
              <button
                className={`tab ${activeTab === "ai" ? "tab-active" : ""}`}
                onClick={() => onTabChange("ai")}
              >
                🤖 AI Advisor
              </button>
            )}

          </div>
        )}
      </div>

    </header>
  );
}