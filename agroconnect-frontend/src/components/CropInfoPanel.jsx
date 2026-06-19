import { formatBilingualText, t } from "../utils/translations";
import "./CropInfoPanel.css";
export default function CropInfoPanel({ crop, language }) {
  if (!crop) return null;

  const details = [
    { icon: "📅", label: t("growingSeason", language), value: crop.season },
    { icon: "🌡️", label: t("temperature", language), value: crop.temp },
    { icon: "🪨", label: t("soilType", language), value: crop.soil },
    { icon: "💧", label: t("waterNeeds", language), value: crop.water },
    { icon: "🚜", label: t("harvestTime", language), value: crop.harvest },
    { icon: "📦", label: t("category", language), value: crop.category },
  ];

  return (
    <div className="crop-info-panel">
      {/* Hero */}
      <div className="crop-info-hero">
        <div className="crop-info-hero-top">
          <div className="crop-info-icon-wrap">
            <span className="crop-info-big-icon">{crop.icon}</span>
          </div>
          <div className="crop-info-hero-text">
            <h2 className="crop-info-name">
              {formatBilingualText(crop.name, language, "crop")}
            </h2>
            <p className="crop-info-category">
              {formatBilingualText(crop.category, language, "category")}
            </p>
          </div>
        </div>
        <div className="crop-info-states">
          <span className="states-label">{t("majorStates", language)} · </span>
          {crop.states.split(",").map(s => formatBilingualText(s.trim(), language, "state")).join(", ")}
        </div>
      </div>

      {/* Detail Cards */}
      <div className="crop-info-grid">
        {details.map((d) => (
          <div className="crop-info-card" key={d.label}>
            <div className="crop-info-card-icon">{d.icon}</div>
            <div className="crop-info-card-label">{d.label}</div>
            <div className="crop-info-card-value">{formatBilingualText(d.value, language)}</div>
          </div>
        ))}
      </div>

    </div>
  );
}