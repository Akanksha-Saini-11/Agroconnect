import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LabelList } from "recharts";
import { formatBilingualText, t } from "../utils/translations";
import "./PricePanel.css";

const SORT_OPTIONS = (language) => [
  { value: "price-desc", label: language === "hi" ? "भाव: उच्च → कम" : "Price: High → Low" },
  { value: "price-asc", label: language === "hi" ? "भाव: कम → उच्च" : "Price: Low → High" },
  { value: "distance", label: language === "hi" ? "निकटतम पहले" : "Nearest First" },
  { value: "state", label: language === "hi" ? "राज्य के अनुसार" : "By State" },
  { value: "district", label: language === "hi" ? "जिले के अनुसार" : "By District" },
];

export default function PricePanel({
  prices = [],
  bestMandi,
  selectedCrop,
  selectedState,
  total,
  nearbyMode,
  language,
}) {
  const [sort, setSort] = useState("price-desc");
  const [view, setView] = useState("cards");
  const [showAllChart, setShowAllChart] = useState(false);

  /* ---------- EMPTY SAFETY ---------- */
  if (!prices || prices.length === 0) {
    return (
      <div className="price-panel empty-panel">
        <h3>{t("noData", language)}</h3>
        <p>{t("selectCrop", language)}</p>
      </div>
    );
  }

  let validPrices = prices;
  
  if (nearbyMode) {
    // Step 2: Ensure valid mandis are NOT removed due to distance issues
    validPrices = prices.filter(m => m.distance !== undefined && m.distance !== null);
  }

  const effectiveSort = nearbyMode ? "distance" : sort;

  // Step 3: Sort the valid prices strictly
  const sorted = [...validPrices].sort((a, b) => {
    if (effectiveSort === "price-desc") return b.modalPrice - a.modalPrice;
    if (effectiveSort === "price-asc") return a.modalPrice - b.modalPrice;
    if (effectiveSort === "distance") return a.distance - b.distance; // Guaranteed valid numbers
    if (effectiveSort === "state") return a.state.localeCompare(b.state);
    if (effectiveSort === "district") return a.district.localeCompare(b.district);
    return 0;
  });

  // Step 4: Slice top 20 ONLY after full validation and sorting (to ensure admin mandis are not pushed out by density)
  const limitedPrices = nearbyMode ? sorted.slice(0, 20) : sorted;

  if (nearbyMode) {
    console.log("📍 [Near Me] FINAL Computed Top Nearest Mandis:");
    if (limitedPrices.length === 0) {
      console.warn("⚠️ No mandis found with valid mapped coordinates.");
    } else {
      limitedPrices.forEach((m, i) => {
        console.log(`   ${i + 1}. ${m.mandi} (${m.district}, ${m.state}) - ${m.distance} km`);
      });
    }
  }

  const finalDisplayPrices = limitedPrices.map((p) => ({
    ...p,
    modalPrice: Number(p.modalPrice) || 0,
    minPrice: Number(p.minPrice) || null,
    maxPrice: Number(p.maxPrice) || null,
  }));

  const chartData = (finalDisplayPrices.length > 20 && !showAllChart)
    ? finalDisplayPrices.slice(0, 20)
    : finalDisplayPrices;

  /* ---------- SAFE STATS ---------- */
  const modalPrices = prices.map((p) => Number(p.modalPrice) || 0);

  const maxPrice = Math.max(...modalPrices);
  const minPrice = Math.min(...modalPrices);
  const avgPrice = Math.round(
    modalPrices.reduce((s, v) => s + v, 0) / modalPrices.length
  );

  const nearestMandi = nearbyMode
    ? [...prices]
        .filter((p) => p.distance != null)
        .sort((a, b) => a.distance - b.distance)[0]
    : null;

  return (
    <div className="price-panel">
      {/* ---------- CROP HEADER ---------- */}
      <div className="price-dashboard-crop">
        <span className="pd-crop-icon">{selectedCrop?.icon}</span>
        <span className="pd-crop-name">
          {formatBilingualText(selectedCrop?.name, language, "crop")}
        </span>
      </div>

      {/* ---------- STATS ---------- */}
      <div className="stats-row">
        {nearbyMode && nearestMandi ? (
          <StatCard
            label={t("nearestMandi", language)}
            value={formatBilingualText(nearestMandi.mandi, language)}
            sub={`${t("kmAway", language).replace("{dist}", nearestMandi.distance)} · ₹${nearestMandi.modalPrice}/${t("qtl", language)}`}
            accent
          />
        ) : (
          <StatCard
            label={t("bestMandi", language)}
            value={formatBilingualText(bestMandi?.mandi, language) || "—"}
            sub={
              bestMandi
                ? `${formatBilingualText(bestMandi.district, language)}, ${formatBilingualText(bestMandi.state, language, "state")}`
                : t("noData", language)
            }
            accent
          />
        )}

        <StatCard
          label={t("bestPrice", language)}
          value={bestMandi ? `₹${bestMandi.modalPrice}` : "—"}
          sub={t("modalPrice", language)}
        />

        <StatCard
          label={t("avgPrice", language)}
          value={`₹${avgPrice}`}
          sub={t("showingRecords", language)
            .replace("{count}", prices.length)
            .replace("{crop}", "")}
        />

        <StatCard
          label={t("priceRange", language)}
          value={`₹${minPrice} – ₹${maxPrice}`}
          sub={formatBilingualText(selectedState, language, "state") || t("allIndia", language)}
        />
      </div>

      {/* ---------- CONTROLS ---------- */}
      <div className="panel-controls">
        <div className="panel-controls-left">
          <span className="results-label">
            {nearbyMode ? (
              <>
                📍 {t("sortedBy", language).replace("{type}", t("nearMe", language))} ·{" "}
                {t("showingRecords", language)
                  .replace("{count}", finalDisplayPrices.length)
                  .replace("{crop}", t("nearestMandi", language))}
              </>
            ) : (
              <>
                {t("showingRecords", language)
                  .replace("{count}", prices.length)
                  .replace("{crop}", formatBilingualText(selectedCrop?.name, language, "crop"))}
                {total ? ` (${total} total)` : ""}
              </>
            )}
          </span>
        </div>

        <div className="panel-controls-right">
          {!nearbyMode && (
            <select
              className="sort-select"
              value={effectiveSort}
              onChange={(e) => setSort(e.target.value)}
            >
              {SORT_OPTIONS(language)
                .filter((o) => o.value !== "distance")
                .map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
            </select>
          )}

          <div className="view-toggle">
            <button
              className={`view-btn ${view === "cards" ? "view-active" : ""}`}
              onClick={() => setView("cards")}
            >
              ▦
            </button>
            <button
              className={`view-btn ${view === "chart" ? "view-active" : ""}`}
              onClick={() => setView("chart")}
            >
              ▤
            </button>
          </div>
        </div>
      </div>

      {/* ---------- CARDS ---------- */}
      {view === "cards" && (
        <div className="price-cards">
          {finalDisplayPrices.map((item, i) => {
            return (
              <div key={i} className="price-card">
                <div className="price-card-left">
                  <div className="price-card-mandi">
                    {formatBilingualText(item.mandi, language)}
                  </div>
                  <div className="price-card-meta">
                    📍 {formatBilingualText(item.district, language)}, {formatBilingualText(item.state, language, "state")}
                    {item.variety ? ` · ${formatBilingualText(item.variety, language)}` : ""}
                    {nearbyMode && item.distance != null && (
                      <span className="mandi-distance-tag">
                        {" "}· 🚀 {t("kmAway", language).replace("{dist}", item.distance)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="price-card-right">
                  <div className="price-card-modal">
                    ₹{item.modalPrice}
                    <span className="price-card-unit">/{t("qtl", language)}</span>
                  </div>
                </div>

                <div className="price-card-footer">
                  <div className="price-spread-compact">
                    ₹{item.minPrice} – ₹{item.maxPrice}
                  </div>
                  <div className="price-card-date">📅 {item.date}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---------- CHART ---------- */}
      {view === "chart" && (
        <div className="bar-chart-wrapper">
          {finalDisplayPrices.length > 20 && (
            <div className="chart-controls">
              <button 
                className="view-btn"
                onClick={() => setShowAllChart(!showAllChart)}
              >
                {showAllChart 
                  ? (language === "hi" ? "शीर्ष 20 दिखाएं" : "Show Top 20") 
                  : (language === "hi" ? `सभी ${finalDisplayPrices.length} दिखाएं` : `Show All ${finalDisplayPrices.length}`)}
              </button>
            </div>
          )}
          
          <div className="bar-chart-panel">
            <ResponsiveContainer width="100%" height={Math.max(400, chartData.length * 40)}>
              <BarChart 
                layout="vertical" 
                data={chartData} 
                margin={{ top: 10, right: 100, left: 160, bottom: 10 }}
              >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={true} vertical={false} />
                  <XAxis 
                    type="number"
                    tick={{ fill: "var(--text-muted)", fontSize: 12 }}
                    tickFormatter={(value) => `₹${value}`}
                  />
                  <YAxis 
                    type="category"
                    dataKey="mandi" 
                    tick={{ fill: "var(--text-secondary)", fontSize: 10 }}
                    width={160}
                    interval={0}
                    tickFormatter={(value) => {
                      const translated = formatBilingualText(value, language);
                      return translated.length > 25 ? translated.substring(0, 22) + "..." : translated;
                    }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "var(--bg-soft)", borderColor: "var(--border)", borderRadius: 8, color: "var(--text-primary)" }}
                    itemStyle={{ color: "var(--primary)" }}
                    formatter={(value, name, props) => [
                      `₹${value}`, 
                      formatBilingualText(props.payload.mandi, language)
                    ]}
                  />
                  <Bar 
                    dataKey="modalPrice" 
                    fill="var(--primary)" 
                    radius={[0, 4, 4, 0]} 
                    maxBarSize={20}
                  >
                    <LabelList 
                      dataKey="modalPrice" 
                      position="right" 
                      formatter={(value) => `₹${value}`}
                      style={{ 
                        fill: "var(--text-primary)", 
                        fontSize: 11,
                        fontWeight: 600
                      }} 
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    );
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div className={`stat-card ${accent ? "stat-card-accent" : ""}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-sub">{sub}</div>
    </div>
  );
}