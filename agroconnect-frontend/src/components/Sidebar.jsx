import { useState, useEffect } from "react";
import WeatherWidget from "./WeatherWidget";
import AdminModal from "./AdminModal";
import { t } from "../utils/translations";
import "./Sidebar.css";

export default function Sidebar({ 
  open, 
  onClose, 
  selectedCrop, 
  onCropSelect, 
  onWeatherChange, 
  onDataChanged,
  language,
  onLanguageChange
}) {
  const [showAdminModal, setShowAdminModal] = useState(false);

  useEffect(() => {
    if (open) {
      document.body.classList.add("sidebar-active");
    } else {
      document.body.classList.remove("sidebar-active");
    }
    return () => {
      document.body.classList.remove("sidebar-active");
    };
  }, [open]);

  return (
    <>
      {open && <div className="sidebar-overlay" onClick={onClose} />}

        <aside className={`sidebar ${open ? "open" : "closed"}`}>
          <button className="sidebar-mobile-close" onClick={onClose}>×</button>
          <div className="sidebar-header">
          <div className="sidebar-logo">
            <span className="logo-leaf">🌱</span>
            <div>
              <h1 className="logo-title">AgroConnect</h1>
              <p className="logo-sub">{t("mandiIntelligence", language)}</p>
            </div>
          </div>
        </div>

        <div className="sidebar-weather-wrap">
          <WeatherWidget onWeatherChange={onWeatherChange} language={language} />
        </div>

        <div className="sidebar-footer">
          {/* Language Toggle */}
          <div className="language-toggle">
            <button 
              className={`lang-btn ${language === "en" ? "active" : ""}`}
              onClick={() => onLanguageChange("en")}
            >
              English
            </button>
            <button 
              className={`lang-btn ${language === "hi" ? "active" : ""}`}
              onClick={() => onLanguageChange("hi")}
            >
              हिंदी
            </button>
          </div>

          <button
            className="admin-trigger-btn"
            onClick={() => setShowAdminModal(true)}
            title={t("admin", language)}
          >
            🔒 {t("admin", language)}
          </button>
        </div>
      </aside>

      {showAdminModal && (
        <AdminModal 
          onClose={() => setShowAdminModal(false)} 
          onDataChanged={onDataChanged} 
          language={language}
        />
      )}
    </>
  );
}
