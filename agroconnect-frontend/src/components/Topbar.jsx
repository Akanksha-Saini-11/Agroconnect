// topbar.jsx
import { STATES, AGRI_STATES } from "../constants/states";
import { CROPS, CROP_CATEGORIES } from "../constants/crops";
import { useState, useMemo, useEffect } from "react";
import "./Topbar.css";

import { formatBilingualText, t } from "../utils/translations";

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
  language,
}) {

  const categories = Object.values(CROP_CATEGORIES);

  // ✅ No default category selected
  const [selectedCategory, setSelectedCategory] = useState("");

  // Sync category dropdown state when crop changes from outside
  useEffect(() => {
    if (selectedCrop && selectedCrop.category && selectedCategory !== selectedCrop.category) {
      setSelectedCategory(selectedCrop.category);
    }
  }, [selectedCrop, selectedCategory]);

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
          <option value="">{t("selectCategory", language)}</option>

          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {formatBilingualText(cat, language, "category")}
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
          <option value="">{t("selectCrop", language)}</option>

          {filteredCrops.map((crop) => (
            <option key={crop.name} value={crop.name}>
              {crop.icon} {formatBilingualText(crop.name, language, "crop")}
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
          <option value="">{t("allIndia", language)}</option>

          <optgroup label={language === "hi" ? "प्रमुख कृषि राज्य" : "Major Agri States"}>
            {AGRI_STATES.map((s) => (
              <option key={s} value={s}>{formatBilingualText(s, language, "state")}</option>
            ))}
          </optgroup>

          <optgroup label={language === "hi" ? "सभी राज्य और केंद्र शासित प्रदेश" : "All States & UTs"}>
            {STATES.filter((s) => !AGRI_STATES.includes(s)).map((s) => (
              <option key={s} value={s}>{formatBilingualText(s, language, "state")}</option>
            ))}
          </optgroup>
        </select>

        <button
          className={`fetch-btn ${loading ? "loading" : ""}`}
          onClick={onFetchPrices}
          disabled={!selectedCrop || loading}
        >
          {loading ? t("loading", language) : `${t("getPrices", language)} →`}
        </button>

        {hasResults && (
          <button
            className={`nearby-btn ${nearbyMode ? "nearby-active" : ""}`}
            onClick={onLocate}
            disabled={locating}
          >
            {locating ? "…" : nearbyMode ? `📍 ${t("nearestMandi", language)}` : `📍 ${t("nearMe", language)}`}
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
              📊 {t("prices", language)}
            </button>

            <button
              className={`tab ${activeTab === "info" ? "tab-active" : ""}`}
              onClick={() => onTabChange("info")}
            >
              🌾 {t("cropInfo", language)}
            </button>

            {selectedCrop && (
              <button
                className={`tab ${activeTab === "ai" ? "tab-active" : ""}`}
                onClick={() => onTabChange("ai")}
              >
                🤖 {t("aiAdvisor", language)}
              </button>
            )}

          </div>
        )}
      </div>

    </header>
  );
}