//cropInfoPanel.jsx
import "./CropInfoPanel.css";
export default function CropInfoPanel({ crop }) {
  if (!crop) return null;

  const details = [
    { icon: "📅", label: "Growing Season", value: crop.season },
    { icon: "🌡️", label: "Temperature", value: crop.temp },
    { icon: "🪨", label: "Soil Type", value: crop.soil },
    { icon: "💧", label: "Water Needs", value: crop.water },
    { icon: "🚜", label: "Harvest Time", value: crop.harvest },
    { icon: "📦", label: "Category", value: crop.category },
  ];

  return (
    <div className="crop-info-panel">
      {/* Hero */}
      <div className="crop-info-hero">
        <div className="crop-info-icon-wrap">
          <span className="crop-info-big-icon">{crop.icon}</span>
        </div>
        <div className="crop-info-hero-text">
          <h2 className="crop-info-name">{crop.name}</h2>
          <p className="crop-info-category">{crop.category}</p>
          <p className="crop-info-states">
            <span className="states-label">Major growing states · </span>
            {crop.states}
          </p>
        </div>
      </div>

      {/* Detail Cards */}
      <div className="crop-info-grid">
        {details.map((d) => (
          <div className="crop-info-card" key={d.label}>
            <div className="crop-info-card-icon">{d.icon}</div>
            <div className="crop-info-card-label">{d.label}</div>
            <div className="crop-info-card-value">{d.value}</div>
          </div>
        ))}
      </div>

    </div>
  );
}