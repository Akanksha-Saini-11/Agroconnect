import { useState } from "react";
import WeatherWidget from "./WeatherWidget";
import AdminModal from "./AdminModal";
import "./Sidebar.css";

export default function Sidebar({ open, onClose, selectedCrop, onCropSelect, onWeatherChange, onDataChanged }) {
  const [showAdminModal, setShowAdminModal] = useState(false);

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
              <p className="logo-sub">Mandi Price Intelligence</p>
            </div>
          </div>
        </div>

        <div className="sidebar-weather-wrap">
          <WeatherWidget onWeatherChange={onWeatherChange} />
        </div>

        <div className="sidebar-footer">
          <button
            className="admin-trigger-btn"
            onClick={() => setShowAdminModal(true)}
            title="Admin Login"
          >
            🔒 Admin
          </button>
        </div>
      </aside>

      {showAdminModal && (
        <AdminModal onClose={() => setShowAdminModal(false)} onDataChanged={onDataChanged} />
      )}
    </>
  );
}
