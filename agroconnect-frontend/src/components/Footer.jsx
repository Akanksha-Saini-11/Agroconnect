// Footer.jsx
import React from "react";
import { Link } from "react-router-dom";
import { t } from "../utils/translations";
import "./Footer.css";

export default function Footer({ language, onTabChange }) {
  const currentYear = new Date().getFullYear();

  const handleTabClick = (tab) => {
    if (onTabChange) {
      onTabChange(tab);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <footer className="agroconnect-footer">
      <div className="footer-container">
        
        {/* Left Column - Branding */}
        <div className="footer-brand">
          <div className="footer-logo">
            <span className="logo-leaf">🌱</span>
            <span className="logo-text">AgroConnect</span>
          </div>
          <p className="footer-desc">
            {t("footerDesc", language)}
          </p>
        </div>

        {/* Middle Left Column - Features */}
        <div className="footer-col">
          <h4 className="footer-col-title">{t("features", language)}</h4>
          <ul className="footer-links">
            <li>
              <button 
                type="button" 
                className="footer-link-btn"
                onClick={() => handleTabClick("prices")}
              >
                📊 {t("mandiPrices", language)}
              </button>
            </li>
            <li>
              <button 
                type="button" 
                className="footer-link-btn"
                onClick={() => handleTabClick("info")}
              >
                🌾 {t("cropAdvisory", language)}
              </button>
            </li>
            <li>
              <button 
                type="button" 
                className="footer-link-btn"
                onClick={() => handleTabClick("ai")}
              >
                🤖 {t("aiConsultant", language)}
              </button>
            </li>
            <li>
              <span className="footer-static-item">🌤️ {t("weatherForecast", language)}</span>
            </li>
          </ul>
        </div>

        {/* Middle Right Column - Quick Links */}
        <div className="footer-col">
          <h4 className="footer-col-title">{t("links", language)}</h4>
          <ul className="footer-links">
            <li>
              {onTabChange ? (
                <button 
                  type="button" 
                  className="footer-link-btn"
                  onClick={() => handleTabClick("prices")}
                >
                  {t("prices", language)}
                </button>
              ) : (
                <Link to="/" className="footer-link">{t("prices", language)}</Link>
              )}
            </li>
            <li>
              {onTabChange ? (
                <button 
                  type="button" 
                  className="footer-link-btn"
                  onClick={() => handleTabClick("info")}
                >
                  {t("cropInfo", language)}
                </button>
              ) : (
                <Link to="/" className="footer-link">{t("cropInfo", language)}</Link>
              )}
            </li>
            <li>
              {onTabChange ? (
                <button 
                  type="button" 
                  className="footer-link-btn"
                  onClick={() => handleTabClick("ai")}
                >
                  {t("aiAdvisor", language)}
                </button>
              ) : (
                <Link to="/" className="footer-link">{t("aiAdvisor", language)}</Link>
              )}
            </li>
            <li>
              <Link to="/admin" className="footer-link">🔒 {t("adminPortal", language)}</Link>
            </li>
          </ul>
        </div>

        {/* Right Column - Legal & Support */}
        <div className="footer-col">
          <h4 className="footer-col-title">{language === "hi" ? "कानूनी" : "Legal"}</h4>
          <ul className="footer-links">
            <li>
              <span className="footer-static-item">{t("privacy", language)}</span>
            </li>
            <li>
              <span className="footer-static-item">{t("terms", language)}</span>
            </li>
          </ul>
        </div>

      </div>

      {/* Bottom Block */}
      <div className="footer-bottom">
        <div className="footer-disclaimer">
          {t("disclaimer", language)}
        </div>
        <div className="footer-copyright">
          {t("copyright", language).replace("{year}", currentYear)}
        </div>
      </div>
    </footer>
  );
}
