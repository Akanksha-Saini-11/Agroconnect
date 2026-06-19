//adminmodal.jsx
import { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import districts from "../constants/stateDistricts";
import { t, formatBilingualText } from "../utils/translations";
import "./AdminModal.css";
import StrictSelect from "./ui/StrictSelect";

const API_BASE = `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api`;

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu & Kashmir", "Ladakh", "Puducherry"
];

const CROPS = [
  "Wheat", "Rice", "Maize", "Bajra", "Jowar", "Barley", "Ragi",
  "Potato", "Onion", "Tomato", "Cauliflower", "Cabbage", "Brinjal",
  "Spinach", "Peas", "Carrot", "Radish", "Garlic", "Ginger",
  "Banana", "Mango", "Apple", "Grapes", "Papaya", "Guava", "Orange",
  "Mustard", "Groundnut", "Soybean", "Sunflower", "Coconut",
  "Tur Dal", "Moong Dal", "Urad Dal", "Chana", "Masoor Dal",
  "Turmeric", "Chilli", "Coriander", "Cumin", "Cardamom", "Pepper"
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

export default function AdminModal({ onClose, onDataChanged, language }) {
  const [isLoggedIn, setIsLoggedIn]   = useState(false);
  const [adminName, setAdminName]     = useState("");
  const [token, setToken]             = useState(localStorage.getItem("adminToken"));

  const [authMode, setAuthMode]       = useState("login");
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [name, setName]               = useState("");
  const [secretCode, setSecretCode]   = useState("");
  const [authError, setAuthError]     = useState("");

  const [mandis, setMandis]           = useState([]);
  const [formData, setFormData]       = useState(EMPTY_FORM);
  const [editingId, setEditingId]     = useState(null);
  const [loading, setLoading]         = useState(false);
  const [message, setMessage]         = useState("");
  const [selectedState, setSelectedState]       = useState("");
  const [selectedCrop, setSelectedCrop]         = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [search, setSearch]                     = useState("");
  const [deleteConfirmId, setDeleteConfirmId]   = useState(null);
  
  const filteredMandis = useMemo(() => {
    return mandis.filter((m) => {
      // 1. Exact Dropdown Matching (case-insensitive)
      if (selectedState && m.state?.trim().toLowerCase() !== selectedState.toLowerCase()) return false;
      if (selectedCrop && m.crop?.trim().toLowerCase() !== selectedCrop.toLowerCase()) return false;
      
      // 2. District Matching (partial/exact)
      if (selectedDistrict && !m.district?.toLowerCase().includes(selectedDistrict.toLowerCase().trim())) return false;

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
  }, [mandis, search, selectedState, selectedCrop, selectedDistrict]);
  const verifyToken = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/admin/auth/verify`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setIsLoggedIn(true);
      setAdminName(res.data.admin.name);
    } catch {
      localStorage.removeItem("adminToken");
      setToken(null);
    }
  }, [token]);

  const fetchMandis = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_BASE}/admin/mandis`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setMandis(res.data.data);
      }
    } catch (err) {
      console.error("Fetch mandis failed:", err);
    }
  }, [token]);

  useEffect(() => {
    if (token) verifyToken();
  }, [token, verifyToken]);

  useEffect(() => {
    if (isLoggedIn) fetchMandis();
  }, [isLoggedIn, fetchMandis]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);


  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError("");
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/admin/auth/login`, { email, password });
      const newToken = res.data.token;
      localStorage.setItem("adminToken", newToken);
      setToken(newToken);
      setIsLoggedIn(true);
      setAdminName(res.data.admin.name);
      setEmail(""); setPassword("");
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
        email, password, name, secretCode,
      });
      alert(language === "hi" ? "पंजीकरण सफल! कृपया लॉगिन करें।" : "Registration successful! Please login.");
      setAuthMode("login");
      setEmail(""); setPassword(""); setName(""); setSecretCode("");
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

    // Frontend price validation before sending
    const min   = Number(formData.minPrice);
    const max   = Number(formData.maxPrice);
    const modal = Number(formData.modalPrice);

    if (formData.minPrice && formData.maxPrice) {
      if (min > max) {
        setMessage("❌ Min price cannot be greater than max price");
        setLoading(false);
        return;
      }
      if (modal < min || modal > max) {
        setMessage("❌ Modal price must be between min and max price");
        setLoading(false);
        return;
      }
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
      const config = { headers: { Authorization: `Bearer ${token}` } };
      if (editingId) {
        await axios.put(`${API_BASE}/admin/mandis/${editingId}`, formData, config);
        setMessage("✅ Mandi updated successfully");
      } else {
        await axios.post(`${API_BASE}/admin/mandis`, formData, config);
        setMessage("✅ Mandi added successfully");
      }
      setFormData(EMPTY_FORM);
      setEditingId(null);
      fetchMandis();
      
      const normalizedCrop = formData.crop.trim().toLowerCase().replace(/\s+/g, " ");
      const normalizedState = formData.state.trim().toLowerCase().replace(/\s+/g, " ");
      localStorage.removeItem(`prices_${normalizedCrop}_${normalizedState}`);
      localStorage.removeItem(`prices_${normalizedCrop}_all`);
      
      // Trigger cross-tab event for other open tabs
      localStorage.setItem("agroconnect_refresh_prices", Date.now().toString());
      
      if (onDataChanged) onDataChanged();
    } catch (err) {
      setMessage(`❌ ${err.response?.data?.message || "Error saving mandi"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (m) => {
    const sTrim = m.state?.trim().toLowerCase();
    const cTrim = m.crop?.trim().toLowerCase();
    const gTrim = m.grade?.trim().toLowerCase();

    const matchedState = INDIAN_STATES.find((s) => s.toLowerCase() === sTrim) || m.state || "";
    const matchedCrop = CROPS.find((c) => c.toLowerCase() === cTrim) || m.crop || "";
    const matchedGrade = GRADES.find((g) => g.toLowerCase() === gTrim) || m.grade || "";

    const allowedDistrictsForState = districts[matchedState] || [];
    // 🎯 Robust case matching for district
    const matchedDistrict = allowedDistrictsForState.find(d => d.toLowerCase().trim() === m.district?.toLowerCase().trim()) || m.district;

    setFormData({
      mandi:            m.mandi,
      state:            matchedState,
      district:         matchedDistrict,
      crop:             matchedCrop,
      variety:          m.variety          || "",
      grade:            matchedGrade,
      minPrice:         m.minPrice         ?? "",
      maxPrice:         m.maxPrice         ?? "",
      modalPrice:       m.modalPrice,
      arrivalQuantity:  m.arrivalQuantity  ?? "",
    });
    setEditingId(m._id);
    setMessage("");
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_BASE}/admin/mandis/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessage("✅ Mandi deleted");
      fetchMandis();
      
      const m = mandis.find(x => x._id === id);
      if (m) {
        const normalizedCrop = m.crop.trim().toLowerCase().replace(/\s+/g, " ");
        const normalizedState = m.state.trim().toLowerCase().replace(/\s+/g, " ");
        localStorage.removeItem(`prices_${normalizedCrop}_${normalizedState}`);
        localStorage.removeItem(`prices_${normalizedCrop}_all`);
      }

      // Trigger cross-tab event for other open tabs
      localStorage.setItem("agroconnect_refresh_prices", Date.now().toString());
      
      if (onDataChanged) onDataChanged();
    } catch (err) {
      setMessage(`❌ ${err.response?.data?.message || "Error deleting"}`);
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setToken(null);
    localStorage.removeItem("adminToken");
    setAdminName("");
  };

  const field = (key, value) => setFormData((p) => ({ ...p, [key]: value }));

  return (
    <div
      className="admin-modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="admin-modal">

        {/* Header */}
        <div className="admin-modal-header">
          <h2>{isLoggedIn ? `📊 ${t("admin", language)}` : `🔒 ${language === "hi" ? "एडमिन लॉगिन" : "Admin Login"}`}</h2>
          <div className="admin-modal-header-right">
            {isLoggedIn && <span className="admin-welcome">👤 {adminName}</span>}
            {isLoggedIn && (
              <button onClick={handleLogout} className="admin-logout-btn">{t("logout", language)}</button>
            )}
            <button onClick={onClose} className="admin-close-btn">✕</button>
          </div>
        </div>

        <div className="admin-modal-body">

          {/* ── AUTH SCREEN ── */}
          {!isLoggedIn ? (
            <div className="admin-auth">
              <div className="auth-tabs">
                <button
                  className={authMode === "login" ? "active" : ""}
                  onClick={() => { setAuthMode("login"); setAuthError(""); }}
                >
                  {language === "hi" ? "लॉगिन" : "Login"}
                </button>
                <button
                  className={authMode === "register" ? "active" : ""}
                  onClick={() => { setAuthMode("register"); setAuthError(""); }}
                >
                  {language === "hi" ? "रजिस्टर" : "Register"}
                </button>
              </div>

              <form
                onSubmit={authMode === "login" ? handleLogin : handleRegister}
                className="auth-form"
              >
                {authMode === "register" && (
                  <input
                    type="text" placeholder={language === "hi" ? "पूरा नाम" : "Full Name"} value={name}
                    onChange={(e) => setName(e.target.value)} required
                  />
                )}
                <input
                  type="email" placeholder={language === "hi" ? "ईमेल" : "Email"} value={email}
                  onChange={(e) => setEmail(e.target.value)} required
                />
                <input
                  type="password" placeholder={language === "hi" ? "पासवर्ड" : "Password"} value={password}
                  onChange={(e) => setPassword(e.target.value)} required
                />
                {authMode === "register" && (
                  <input
                    type="password" placeholder={language === "hi" ? "गुप्त कोड (Secret Code)" : "Secret Code"} value={secretCode}
                    onChange={(e) => setSecretCode(e.target.value)} required
                  />
                )}
                <button type="submit" disabled={loading}>
                  {loading ? (language === "hi" ? "प्रसंस्करण..." : "Processing...") : authMode === "login" ? (language === "hi" ? "लॉगिन" : "Login") : (language === "hi" ? "रजिस्टर" : "Register")}
                </button>
              </form>

              {authError && <p className="auth-error">{authError}</p>}
            </div>

          ) : (
            /* ── DASHBOARD SCREEN ── */
            <div className="admin-panel">

              {/* ── FORM ── */}
              <div className="admin-form-section">
                <h3>{editingId ? `✏️ ${t("editMandi", language)}` : `➕ ${t("addNewMandi", language)}`}</h3>
                <form onSubmit={handleSubmit} className="mandi-form">

                  {/* Row 1 — Mandi name */}
                  <input
                    type="text" placeholder={t("mandiName", language)} value={formData.mandi}
                    onChange={(e) => field("mandi", e.target.value)} required
                  />

                  {/* Row 2 — State + District */}
                  <div className="form-row-2">
                    <StrictSelect
                      value={formData.state}
                      placeholder={t("selectState", language)}
                      options={INDIAN_STATES.map(s => ({ value: s, label: formatBilingualText(s, language, "state") }))}
                      onChange={(val) => {
                        field("state", val);
                        field("district", "");
                      }}
                    />

                    <StrictSelect
                      value={formData.district}
                      placeholder={formData.state ? (language === "hi" ? "जिला चुनें" : "Select District") : t("selectStateFirst", language)}
                      options={(districts[formData.state] || []).map(d => ({ value: d, label: formatBilingualText(d, language) }))}
                      disabled={!formData.state}
                      onChange={(val) => field("district", val)}
                    />
                  </div>

                  {/* Row 3 — Crop */}
                  <StrictSelect
                    value={formData.crop}
                    placeholder={t("selectCrop", language)}
                    options={CROPS.map(c => ({ value: c, label: formatBilingualText(c, language, "crop") }))}
                    onChange={(val) => field("crop", val)}
                  />

                  {/* Row 4 — Variety + Grade */}
                  <div className="form-row-2">
                    <input
                      type="text"
                      placeholder={t("variety", language)}
                      value={formData.variety}
                      onChange={(e) => field("variety", e.target.value)}
                    />
                    <select
                      value={formData.grade}
                      onChange={(e) => field("grade", e.target.value)}
                    >
                      <option value="">{t("grade", language)}</option>
                      {GRADES.map((g) => (
                        <option key={g} value={g}>
                          {formatBilingualText(g, language, "grade")}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Row 5 — Min / Max / Modal Price */}
                  <div className="form-row-3">
                    <input
                      type="number" placeholder={`${t("minPriceShort", language)} (₹)`}
                      value={formData.minPrice} min="0"
                      onChange={(e) => field("minPrice", e.target.value)}
                    />
                    <input
                      type="number" placeholder={`${t("modalPriceShort", language)} (₹)`}
                      value={formData.modalPrice} min="1" required
                      onChange={(e) => field("modalPrice", e.target.value)}
                    />
                    <input
                      type="number" placeholder={`${t("maxPriceShort", language)} (₹)`}
                      value={formData.maxPrice} min="0"
                      onChange={(e) => field("maxPrice", e.target.value)}
                    />
                  </div>

                  {/* Row 6 — Arrival Quantity */}
                  <input
                    type="number"
                    placeholder={t("arrivalQuantity", language)}
                    value={formData.arrivalQuantity} min="0"
                    onChange={(e) => field("arrivalQuantity", e.target.value)}
                  />

                  {/* Buttons */}
                  <div className="form-btns">
                    <button type="submit" disabled={loading}>
                      {loading ? `${t("loading", language)}` : editingId ? t("saveMandi", language) : t("addNewMandi", language)}
                    </button>
                    {editingId && (
                      <button
                        type="button" className="cancel-btn"
                        onClick={() => { setEditingId(null); setFormData(EMPTY_FORM); setMessage(""); }}
                      >
                        {t("cancel", language)}
                      </button>
                    )}
                  </div>
                </form>

                {message && (
                  <p className={message.includes("✅") ? "success-msg" : "error-msg"}>
                    {message}
                  </p>
                )}
              </div>

              {/* ── TABLE ── */}
              <div className="admin-table-section">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <h3>{t("addedMandis", language)} ({filteredMandis.length})</h3>
                </div>

                <div className="table-header-controls">
                  <StrictSelect
                    value={selectedState}
                    placeholder={t("allStates", language)}
                    options={INDIAN_STATES.map(s => ({ value: s, label: formatBilingualText(s, language, "state") }))}
                    onChange={(val) => {
                      setSelectedState(val);
                      setSelectedDistrict("");
                    }}
                  />
                  
                  <StrictSelect
                    value={selectedCrop}
                    placeholder={t("allCrops", language)}
                    options={CROPS.map(c => ({ value: c, label: formatBilingualText(c, language, "crop") }))}
                    onChange={(val) => setSelectedCrop(val)}
                  />
                  
                  <StrictSelect
                    value={selectedDistrict}
                    placeholder={selectedState ? t("allDistricts", language) : t("selectStateFirst", language)}
                    options={(districts[selectedState] || []).map(d => ({ value: d, label: formatBilingualText(d, language) }))}
                    disabled={!selectedState}
                    onChange={(val) => setSelectedDistrict(val)}
                  />

                  <input placeholder={t("searchMandi", language)} value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>

                {filteredMandis.length > 0 ? (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>{t("mandiName", language)}</th>
                          <th>{t("state", language)}</th>
                          <th>{t("district", language)}</th>
                          <th>{t("crop", language)}</th>
                          <th>{t("variety", language)}</th>
                          <th>{t("grade", language)}</th>
                          <th>{t("minPriceShort", language)}</th>
                          <th>{t("modalPriceShort", language)}</th>
                          <th>{t("maxPriceShort", language)}</th>
                          <th>{t("qtyShort", language)}</th>
                          <th>{t("actions", language)}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMandis.map((m) => (
                          <tr key={m._id}>
                            <td>{formatBilingualText(m.mandi, language)}</td>
                            <td>{formatBilingualText(m.state, language, "state")}</td>
                            <td>{formatBilingualText(m.district, language)}</td>
                            <td>{formatBilingualText(m.crop, language, "crop")}</td>
                            <td>{formatBilingualText(m.variety, language)  || "—"}</td>
                            <td>{formatBilingualText(m.grade, language, "grade")    || "—"}</td>
                            <td>{m.minPrice != null ? m.minPrice.toLocaleString("en-IN") : "—"}</td>
                            <td>{m.modalPrice.toLocaleString("en-IN")}</td>
                            <td>{m.maxPrice != null ? m.maxPrice.toLocaleString("en-IN") : "—"}</td>
                            <td>{m.arrivalQuantity != null ? m.arrivalQuantity.toLocaleString("en-IN") : "—"}</td>
                            <td>
                              <div style={{ display: "flex", gap: "8px" }}>
                                {deleteConfirmId === m._id ? (
                                  <>
                                    <button 
                                      onClick={() => handleDelete(m._id)} 
                                      className="delete-btn" 
                                      style={{ backgroundColor: "#d32f2f", color: "white", fontWeight: "600", border: "none", borderRadius: "4px" }}
                                    >
                                      {t("confirm", language)}
                                    </button>
                                    <button 
                                      onClick={() => setDeleteConfirmId(null)} 
                                      className="cancel-btn"
                                    >
                                      {t("no", language)}
                                    </button>
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
                  <p className="no-data">{t("noMandisYet", language)}</p>
                )}
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}