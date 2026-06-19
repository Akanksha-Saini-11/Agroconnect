import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import districts from "../constants/stateDistricts";
import { CROPS } from "../constants/crops";
import { t, formatBilingualText } from "../utils/translations";
import Footer from "./Footer";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const API_BASE = `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api`;


const normalize = (value) =>
  value ? value.trim().toLowerCase().replace(/\s+/g, " ") : value;



const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu & Kashmir", "Ladakh", "Puducherry"
];

const GRADES = ["FAQ", "A", "B", "C", "Premium", "Standard", "Below Standard"];

const EMPTY_FORM = {
  mandi: "",
  state: "",
  district: "",
  crop: "",
  variety: "",
  grade: "",
  minPrice: "",
  maxPrice: "",
  modalPrice: "",
  arrivalQuantity: "",
};


export default function AdminDashboard() {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem("agroconnect_lang") || "en";
  });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [token, setToken] = useState(localStorage.getItem("adminToken"));

  const [authMode, setAuthMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [secretCode, setSecretCode] = useState("");
  const [authError, setAuthError] = useState("");

  const [mandis, setMandis] = useState([]);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [view, setView] = useState("cards");

  const handleLogout = useCallback(() => {
    localStorage.removeItem("adminToken");
    setToken(null);
    setIsLoggedIn(false);
    setAdminName("");
  }, []);

  const verifyToken = useCallback(async () => {
    if (!token) {
      handleLogout();
      return;
    }

    try {
      const res = await axios.get(`${API_BASE}/admin/auth/verify`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setIsLoggedIn(true);
      setAdminName(res.data.admin.name);
    } catch (err) {
      console.error("Token verification failed:", err);
      handleLogout();
    }
  }, [handleLogout, token]);

  const fetchMandis = useCallback(async () => {
    if (!token) {
      handleLogout();
      return;
    }

    try {
      const res = await axios.get(`${API_BASE}/admin/mandis`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        setMandis(res.data.data);
      } else {
        setMessage("❌ Error fetching mandis");
      }
    } catch (err) {
      console.error("Fetch mandis failed:", err);
      setMessage("❌ Error fetching mandis");
    }
  }, [handleLogout, token]);

  /* VERIFY TOKEN ON MOUNT */
  useEffect(() => {
    if (token) {
      verifyToken();
    }
  }, [token, verifyToken]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  /* FETCH MANDIS WHEN LOGGED IN */
  useEffect(() => {
    if (!isLoggedIn) return;

    fetchMandis();

    const handleStorageChange = (e) => {
      if (e.key === "agroconnect_refresh_prices") {
        fetchMandis();
      }
    };
    
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [isLoggedIn, fetchMandis]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError("");
    setLoading(true);

    try {
      const res = await axios.post(`${API_BASE}/admin/auth/login`, {
        email,
        password,
      });

      localStorage.setItem("adminToken", res.data.token);
      setToken(res.data.token);
      setAdminName(res.data.admin.name);
      setIsLoggedIn(true);
      // No need to call fetchMandis here as the useEffect will trigger it on isLoggedIn change
      setEmail("");
      setPassword("");
    } catch (err) {
      setAuthError(err.response?.data?.message || (language === "hi" ? "लॉगिन विफल" : "Login failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError("");
    setLoading(true);

    try {
      await axios.post(`${API_BASE}/admin/auth/register`, {
        email,
        password,
        name,
        secretCode,
      });

      // Use an inline state or a custom alert, here we can repurpose authError to show a success message but styled green,
      // Wait, there's no success state for auth. I will just set authError but with a success prefix.
      setAuthError(language === "hi" ? "✅ पंजीकरण सफल! कृपया लॉगिन करें।" : "✅ Registration successful! Please login.");
      setAuthMode("login");
      setEmail("");
      setPassword("");
      setName("");
      setSecretCode("");
    } catch (err) {
      setAuthError(err.response?.data?.message || (language === "hi" ? "पंजीकरण विफल" : "Registration failed"));
    } finally {
      setLoading(false);
    }
  };



  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (!formData.mandi || !formData.state || !formData.district || !formData.crop || !formData.modalPrice) {
      setMessage("❌ Please fill all required fields");
      setLoading(false);
      return;
    }

    // 🎯 FORM VALIDATION HARD LOCK (Case-Insensitive)
    const allowedDistricts = districts[formData.state] || [];
    const isDistrictValid = allowedDistricts.some(d => d.toLowerCase().trim() === formData.district?.toLowerCase().trim());
    
    if (!isDistrictValid) {
      setMessage(`❌ Invalid district "${formData.district}" for state "${formData.state}". Please select from the list.`);
      setLoading(false);
      return;
    }

    try {
      const normalizedData = {
        ...formData,
        mandi: normalize(formData.mandi),
        district: normalize(formData.district),
        state: normalize(formData.state),
        crop: normalize(formData.crop),
        variety: normalize(formData.variety) || "",
        grade: normalize(formData.grade) || "",
        modalPrice: Number(formData.modalPrice),
        minPrice: formData.minPrice ? Number(formData.minPrice) : null,
        maxPrice: formData.maxPrice ? Number(formData.maxPrice) : null,
        arrivalQuantity: formData.arrivalQuantity ? Number(formData.arrivalQuantity) : null,
      };

      const currentToken = localStorage.getItem("adminToken");
      if (!currentToken) return handleLogout();

      const config = {
        headers: { Authorization: `Bearer ${currentToken}` },
      };

      if (editingId) {
        await axios.put(
          `${API_BASE}/admin/mandis/${editingId}`,
          normalizedData,
          config
        );
        setMessage("✅ Mandi updated successfully");
      } else {
        // ... (Duplicate safety check logic)
        const isDuplicate = mandis.some((m) => 
          normalize(m.mandi) === normalizedData.mandi &&
          normalize(m.state) === normalizedData.state &&
          normalize(m.district) === normalizedData.district &&
          normalize(m.crop) === normalizedData.crop &&
          (normalize(m.variety) || "") === normalizedData.variety &&
          (normalize(m.grade) || "") === normalizedData.grade
        );

        if (isDuplicate) {
          setMessage("⚠️ Duplicate mandi entry already exists");
          setLoading(false);
          return;
        }

        await axios.post(
          `${API_BASE}/admin/mandis`,
          normalizedData,
          config
        );
        setMessage("✅ Mandi added successfully");
      }
      await fetchMandis();
      setEditingId(null);
      setFormData(EMPTY_FORM);

      /* CLEAR BROWSER CACHE for affected crop */
      const cacheKey = `prices_${normalizedData.crop}_${normalizedData.state}`;
      const cacheKeyAll = `prices_${normalizedData.crop}_all`;
      localStorage.removeItem(cacheKey);
      localStorage.removeItem(cacheKeyAll);
      console.log("🗑️ Cleared cache:", cacheKey, cacheKeyAll);

      // Trigger cross-tab event
      localStorage.setItem("agroconnect_refresh_prices", Date.now().toString());
    } catch (err) {
      setMessage(`❌ ${err.response?.data?.message || "Error saving mandi"}`);
    } finally {
      setLoading(false);
    }
  };

  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  
  // Advanced Filter States
  const [selectedState, setSelectedState] = useState("");
  const [filterCrop, setFilterCrop] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");

  const filteredMandis = useMemo(() => {
    return mandis.filter((m) => {
      // 1. Exact Dropdown Matching (case-insensitive)
      if (selectedState && m.state?.trim().toLowerCase() !== selectedState.toLowerCase()) return false;
      if (filterCrop && m.crop?.trim().toLowerCase() !== filterCrop.toLowerCase()) return false;
      
      // 2. District Matching (exact)
      if (selectedDistrict && m.district?.trim().toLowerCase() !== selectedDistrict.toLowerCase()) return false;

      // 3. Global Search Box
      if (search) {
        const q = search.toLowerCase().trim();
        const matchesSearch = 
          (m.mandi && m.mandi.toLowerCase().includes(q)) ||
          (m.crop && m.crop.toLowerCase().includes(q)) ||
          (m.state && m.state.toLowerCase().includes(q)) ||
          (m.district && m.district.toLowerCase().includes(q)) ||
          (m.variety && m.variety.toLowerCase().includes(q));
        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [mandis, search, selectedState, filterCrop, selectedDistrict]);

  const handleEdit = (m) => {
    // Find exact casing for dropdowns (robust against spaces and case)
    const sTrim = m.state?.trim().toLowerCase();
    const cTrim = m.crop?.trim().toLowerCase();
    const gTrim = m.grade?.trim().toLowerCase();

    const matchedState = INDIAN_STATES.find((s) => s.toLowerCase() === sTrim) || m.state || "";
    const matchedCrop = CROPS.find((c) => c.apiName.toLowerCase() === cTrim)?.apiName || m.crop || "";
    const matchedGrade = GRADES.find((g) => g.toLowerCase() === gTrim) || m.grade || "";

    const allowedDistrictsForState = districts[matchedState] || [];
    // 🎯 Robust case matching for district
    const matchedDistrict = allowedDistrictsForState.find(d => d.toLowerCase().trim() === m.district?.toLowerCase().trim()) || m.district;

    setFormData({
      mandi: m.mandi,
      state: matchedState,
      district: matchedDistrict,
      crop: matchedCrop,
      variety: m.variety || "",
      grade: matchedGrade,
      minPrice: m.minPrice ?? "",
      maxPrice: m.maxPrice ?? "",
      modalPrice: m.modalPrice,
      arrivalQuantity: m.arrivalQuantity ?? "",
    });
    setEditingId(m._id);
    setMessage("");
  };

  const executeDelete = async (m) => {
    const currentToken = localStorage.getItem("adminToken");
    if (!currentToken) return handleLogout();

    try {
      await axios.delete(`${API_BASE}/admin/mandis/${m._id}`, {
        headers: { Authorization: `Bearer ${currentToken}` },
      });

      setMessage("✅ Mandi deleted successfully");
      await fetchMandis();

      /* CLEAR BROWSER CACHE for affected crop */
      const normalizedCrop = normalize(m.crop);
      const normalizedState = normalize(m.state);
      const cacheKey = `prices_${normalizedCrop}_${normalizedState}`;
      const cacheKeyAll = `prices_${normalizedCrop}_all`;
      localStorage.removeItem(cacheKey);
      localStorage.removeItem(cacheKeyAll);
      
      localStorage.setItem("agroconnect_refresh_prices", Date.now().toString());
    } catch (err) {
      setMessage(`❌ ${err.response?.data?.message || "Error deleting mandi"}`);
    } finally {
      setDeleteConfirmId(null);
    }
  };

  /* ====== LOGIN UI ====== */
  if (!isLoggedIn) {
    return (
      <div className="admin-auth-container">
        <div className="auth-card">
          <h1>{language === "hi" ? "AgroConnect एडमिन" : "AgroConnect Admin"}</h1>

          <div className="auth-tabs">
            <button
              onClick={() => setAuthMode("login")}
              className={`tab ${authMode === "login" ? "active" : ""}`}
            >
              {language === "hi" ? "लॉगिन" : "Login"}
            </button>
            <button
              onClick={() => setAuthMode("register")}
              className={`tab ${authMode === "register" ? "active" : ""}`}
            >
              {language === "hi" ? "रजिस्टर" : "Register"}
            </button>
          </div>

          <form onSubmit={authMode === "login" ? handleLogin : handleRegister} className="auth-form">
            {authMode === "register" && (
              <input
                placeholder={language === "hi" ? "पूरा नाम" : "Full Name"}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            )}

            <input
              type="email"
              placeholder={language === "hi" ? "ईमेल" : "Email"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <input
              type="password"
              placeholder={language === "hi" ? "पासवर्ड" : "Password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {authMode === "register" && (
              <input
                type="password"
                placeholder={language === "hi" ? "गुप्त कोड (Secret Code)" : "Secret Code"}
                value={secretCode}
                onChange={(e) => setSecretCode(e.target.value)}
                required
              />
            )}

            <button type="submit" disabled={loading}>
              {loading ? (language === "hi" ? "प्रसंस्करण..." : "Processing...") : authMode === "login" ? (language === "hi" ? "लॉगिन" : "Login") : (language === "hi" ? "रजिस्टर" : "Register")}
            </button>
          </form>

          {authError && <p className="error">{authError}</p>}
        </div>
      </div>
    );
  }

  /* ====== DASHBOARD UI ====== */
  return (
    <div className="admin-dashboard">
      {/* HEADER */}
      <div className="admin-header">
        <h1>{language === "hi" ? "एडमिन डैशबोर्ड" : "Admin Dashboard"}</h1>
        <div className="admin-info">
          {/* Language Toggle */}
          <div className="language-toggle">
            <button 
              type="button"
              className={`lang-btn ${language === "en" ? "active" : ""}`}
              onClick={() => {
                setLanguage("en");
                localStorage.setItem("agroconnect_lang", "en");
              }}
            >
              English
            </button>
            <button 
              type="button"
              className={`lang-btn ${language === "hi" ? "active" : ""}`}
              onClick={() => {
                setLanguage("hi");
                localStorage.setItem("agroconnect_lang", "hi");
              }}
            >
              हिंदी
            </button>
          </div>
          <span>{t("welcome", language)}, <strong>{adminName}</strong></span>
          <button onClick={handleLogout} className="logout-btn">
            {t("logout", language)}
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="admin-content">
        {/* FORM SECTION */}
        <div className="form-section">
          <h2>{editingId ? (language === "hi" ? "मंडी बदलें" : "Edit Mandi") : (language === "hi" ? "नई मंडी जोड़ें" : "Add Mandi")}</h2>

          <form onSubmit={handleSubmit} className="mandi-form">
            <input
              placeholder={t("mandiName", language)}
              value={formData.mandi}
              onChange={(e) => setFormData({ ...formData, mandi: e.target.value })}
              required
            />

            <select
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value, district: "" })}
              required
            >
              <option value="">{t("selectState", language)}</option>
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>{formatBilingualText(s, language, "state")}</option>
              ))}
            </select>

            <select
              value={formData.district}
              onChange={(e) => setFormData({ ...formData, district: e.target.value })}
              required
              disabled={!formData.state}
            >
              <option value="">{formData.state ? (language === "hi" ? "जिला चुनें" : "Select District") : t("selectStateFirst", language)}</option>
              {(districts[formData.state] || []).map((d) => (
                <option key={d} value={d}>{formatBilingualText(d, language)}</option>
              ))}
              {formData.district && !(districts[formData.state] || []).some(d => d.toLowerCase().trim() === formData.district.toLowerCase().trim()) && (
                <option value={formData.district}>{formatBilingualText(formData.district, language)} ({language === "hi" ? "सुधार आवश्यक" : "Update Required"})</option>
              )}
            </select>

            <select
              value={formData.crop}
              onChange={(e) => setFormData({ ...formData, crop: e.target.value })}
              required
            >
              <option value="">{t("selectCrop", language)}</option>
              {CROPS.map((c) => (
                <option key={c.apiName} value={c.apiName}>{formatBilingualText(c.name, language, "crop")}</option>
              ))}
            </select>

            <input
              placeholder={t("variety", language)}
              value={formData.variety}
              onChange={(e) => setFormData({ ...formData, variety: e.target.value })}
            />

            <select
              value={formData.grade}
              onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
            >
              <option value="">{t("grade", language)}</option>
              {GRADES.map((g) => (
                <option key={g} value={g}>{formatBilingualText(g, language, "grade")}</option>
              ))}
            </select>

            <input
              type="number"
              placeholder={`${t("minPriceShort", language)} (₹)`}
              value={formData.minPrice}
              onChange={(e) => setFormData({ ...formData, minPrice: e.target.value })}
            />

            <input
              type="number"
              placeholder={`${t("modalPriceShort", language)} (₹)`}
              value={formData.modalPrice}
              onChange={(e) => setFormData({ ...formData, modalPrice: e.target.value })}
              required
            />

            <input
              type="number"
              placeholder={`${t("maxPriceShort", language)} (₹)`}
              value={formData.maxPrice}
              onChange={(e) => setFormData({ ...formData, maxPrice: e.target.value })}
            />

            <input
              type="number"
              placeholder={t("arrivalQuantity", language)}
              value={formData.arrivalQuantity}
              onChange={(e) => setFormData({ ...formData, arrivalQuantity: e.target.value })}
            />

            <div className="form-actions" style={{ gridColumn: "1 / -1", display: "flex", gap: "12px" }}>
              <button type="submit" disabled={loading} style={{ flex: 1 }}>
                {loading ? t("loading", language) : editingId ? t("saveMandi", language) : t("addNewMandi", language)}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setFormData(EMPTY_FORM);
                    setMessage("");
                  }}
                  className="cancel-btn"
                  style={{ flex: 1 }}
                >
                  {t("cancel", language)}
                </button>
              )}
            </div>
          </form>

          {message && (
            <div className={`message ${message.includes("✅") ? "success" : "error"}`} style={{ marginTop: "16px" }}>
              {message}
            </div>
          )}
        </div>

        {/* TABLE SECTION */}
        <div className="mandis-section">
          <div className="section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h2>{t("myMandis", language)} ({filteredMandis.length})</h2>
            
            <div className="view-toggle">
              <button className={`view-btn ${view === "cards" ? "view-active" : ""}`} onClick={() => setView("cards")}>{t("table", language)}</button>
              <button className={`view-btn ${view === "chart" ? "view-active" : ""}`} onClick={() => setView("chart")}>{t("analytics", language)}</button>
            </div>
          </div>

          <div className="table-header-controls">
            <select
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value);
                setSelectedDistrict("");
              }}
            >
              <option value="">{t("allStates", language)}</option>
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>{formatBilingualText(s, language, "state")}</option>
              ))}
            </select>
            
            <select
              value={filterCrop}
              onChange={(e) => setFilterCrop(e.target.value)}
            >
              <option value="">{t("allCrops", language)}</option>
              {CROPS.map((c) => (
                <option key={c.apiName} value={c.apiName}>{formatBilingualText(c.name, language, "crop")}</option>
              ))}
            </select>
            
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              disabled={!selectedState}
            >
              <option value="">{selectedState ? t("allDistricts", language) : t("selectStateFirst", language)}</option>
              {(districts[selectedState] || []).map((d) => (
                <option key={d} value={d}>{formatBilingualText(d, language)}</option>
              ))}
            </select>

            <input
              placeholder={t("searchMandi", language)}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {filteredMandis.length > 0 ? (
            view === "cards" ? (
              <div className="mandis-table">
                <table>
                  <thead>
                    <tr>
                      <th>{t("mandiName", language)}</th>
                      <th>{t("location", language)}</th>
                      <th>{t("crop", language)}</th>
                      <th>{t("variety", language)}</th>
                      <th>{t("pricesMinModalMax", language)}</th>
                      <th>{t("qty", language)}</th>
                      <th>{t("actions", language)}</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredMandis.map((m) => (
                      <tr key={m._id}>
                        <td>{formatBilingualText(m.mandi, language)}</td>
                        <td>
                          <div style={{ color: "var(--text-primary)" }}>{formatBilingualText(m.district, language)}</div>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{formatBilingualText(m.state, language, "state")}</div>
                        </td>
                        <td>{formatBilingualText(m.crop, language, "crop")}</td>
                        <td>
                          {formatBilingualText(m.variety, language) || "—"}
                          {m.grade && (
                            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                              {t("grade", language)}: {formatBilingualText(m.grade, language, "grade")}
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ fontWeight: "600", color: "var(--primary)" }}>₹{m.modalPrice.toLocaleString("en-IN")}</div>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                            ₹{m.minPrice != null ? m.minPrice.toLocaleString("en-IN") : "—"} - ₹{m.maxPrice != null ? m.maxPrice.toLocaleString("en-IN") : "—"}
                          </div>
                        </td>
                        <td>{m.arrivalQuantity != null ? `${m.arrivalQuantity.toLocaleString("en-IN")} ${t("qtl", language)}` : "—"}</td>
                        <td>
                          <div style={{ display: "flex", gap: "8px" }}>
                            {deleteConfirmId === m._id ? (
                              <>
                                <button onClick={() => executeDelete(m)} className="delete-btn" style={{ background: "var(--error)", color: "white" }}>{t("confirm", language)}</button>
                                <button onClick={() => setDeleteConfirmId(null)} className="edit-btn">{t("no", language)}</button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => handleEdit(m)} className="edit-btn">{t("edit", language)}</button>
                                <button onClick={() => setDeleteConfirmId(m._id)} className="delete-btn">{t("delete", language)}</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <PriceChart data={filteredMandis} />
            )
          ) : (
            <p style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
              {language === "hi" ? "फिल्टर से मेल खाने वाली कोई मंडी नहीं मिली।" : "No mandis found matching filters."}
            </p>
          )}
        </div>
      </div>

      <Footer language={language} />
    </div>
  );
}

function PriceChart({ data }) {
  return (
    <div className="bar-chart-panel" style={{ height: 400, marginTop: "20px" }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis 
            dataKey="mandi" 
            tick={{ fill: "var(--text-muted)", fontSize: 10 }} 
            angle={-45}
            textAnchor="end"
            interval={0}
            height={80}
          />
          <YAxis 
            tick={{ fill: "var(--text-muted)", fontSize: 12 }} 
          />
          <Tooltip 
            contentStyle={{ backgroundColor: "var(--bg-soft)", borderColor: "var(--border)", borderRadius: 8 }}
            itemStyle={{ color: "var(--primary)" }}
          />
          <Bar dataKey="modalPrice" fill="var(--primary)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}