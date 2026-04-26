//adminmodal.jsx
import { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import districts from "../constants/stateDistricts";
import { formatDisplayText } from "../utils/formatText";
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

export default function AdminModal({ onClose, onDataChanged }) {
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
      setAuthError(err.response?.data?.message || "Login failed");
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
      alert("Registration successful! Please login.");
      setAuthMode("login");
      setEmail(""); setPassword(""); setName(""); setSecretCode("");
    } catch (err) {
      setAuthError(err.response?.data?.message || "Registration failed");
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
          <h2>{isLoggedIn ? "📊 Admin Dashboard" : "🔒 Admin Login"}</h2>
          <div className="admin-modal-header-right">
            {isLoggedIn && <span className="admin-welcome">👤 {adminName}</span>}
            {isLoggedIn && (
              <button onClick={handleLogout} className="admin-logout-btn">Logout</button>
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
                >Login</button>
                <button
                  className={authMode === "register" ? "active" : ""}
                  onClick={() => { setAuthMode("register"); setAuthError(""); }}
                >Register</button>
              </div>

              <form
                onSubmit={authMode === "login" ? handleLogin : handleRegister}
                className="auth-form"
              >
                {authMode === "register" && (
                  <input
                    type="text" placeholder="Full Name" value={name}
                    onChange={(e) => setName(e.target.value)} required
                  />
                )}
                <input
                  type="email" placeholder="Email" value={email}
                  onChange={(e) => setEmail(e.target.value)} required
                />
                <input
                  type="password" placeholder="Password" value={password}
                  onChange={(e) => setPassword(e.target.value)} required
                />
                {authMode === "register" && (
                  <input
                    type="password" placeholder="Secret Code" value={secretCode}
                    onChange={(e) => setSecretCode(e.target.value)} required
                  />
                )}
                <button type="submit" disabled={loading}>
                  {loading ? "Processing..." : authMode === "login" ? "Login" : "Register"}
                </button>
              </form>

              {authError && <p className="auth-error">{authError}</p>}
            </div>

          ) : (
            /* ── DASHBOARD SCREEN ── */
            <div className="admin-panel">

              {/* ── FORM ── */}
              <div className="admin-form-section">
                <h3>{editingId ? "✏️ Edit Mandi" : "➕ Add New Mandi"}</h3>
                <form onSubmit={handleSubmit} className="mandi-form">

                  {/* Row 1 — Mandi name */}
                  <input
                    type="text" placeholder="Mandi Name" value={formData.mandi}
                    onChange={(e) => field("mandi", e.target.value)} required
                  />

                  {/* Row 2 — State + District */}
                  <div className="form-row-2">
                    <StrictSelect
                      value={formData.state}
                      placeholder="Select State"
                      options={INDIAN_STATES}
                      onChange={(val) => {
                        field("state", val);
                        field("district", "");
                      }}
                    />

                    <StrictSelect
                      value={formData.district}
                      placeholder={formData.state ? "Select District" : "Select State First"}
                      options={districts[formData.state] || []}
                      disabled={!formData.state}
                      onChange={(val) => field("district", val)}
                    />
                  </div>

                  {/* Row 3 — Crop */}
                  <StrictSelect
                    value={formData.crop}
                    placeholder="Select Crop"
                    options={CROPS}
                    onChange={(val) => field("crop", val)}
                  />

                  {/* Row 4 — Variety + Grade */}
                  <div className="form-row-2">
                    <input
                      type="text"
                      placeholder="Variety (e.g. Sharbati, 1121 Basmati)"
                      value={formData.variety}
                      onChange={(e) => field("variety", e.target.value)}
                    />
                    <select
                      value={formData.grade}
                      onChange={(e) => field("grade", e.target.value)}
                    >
                      <option value="">Select Grade</option>
                      {GRADES.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>

                  {/* Row 5 — Min / Max / Modal Price */}
                  <div className="form-row-3">
                    <input
                      type="number" placeholder="Min Price (₹)"
                      value={formData.minPrice} min="0"
                      onChange={(e) => field("minPrice", e.target.value)}
                    />
                    <input
                      type="number" placeholder="Modal Price (₹)"
                      value={formData.modalPrice} min="1" required
                      onChange={(e) => field("modalPrice", e.target.value)}
                    />
                    <input
                      type="number" placeholder="Max Price (₹)"
                      value={formData.maxPrice} min="0"
                      onChange={(e) => field("maxPrice", e.target.value)}
                    />
                  </div>

                  {/* Row 6 — Arrival Quantity */}
                  <input
                    type="number"
                    placeholder="Arrival Quantity (quintals) — optional"
                    value={formData.arrivalQuantity} min="0"
                    onChange={(e) => field("arrivalQuantity", e.target.value)}
                  />

                  {/* Buttons */}
                  <div className="form-btns">
                    <button type="submit" disabled={loading}>
                      {loading ? "Saving..." : editingId ? "Update Mandi" : "Add Mandi"}
                    </button>
                    {editingId && (
                      <button
                        type="button" className="cancel-btn"
                        onClick={() => { setEditingId(null); setFormData(EMPTY_FORM); setMessage(""); }}
                      >
                        Cancel
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
                  <h3>Added Mandis ({filteredMandis.length})</h3>
                </div>

                <div className="table-header-controls">
                  <StrictSelect
                    value={selectedState}
                    placeholder="All States"
                    options={INDIAN_STATES}
                    onChange={(val) => {
                      setSelectedState(val);
                      setSelectedDistrict("");
                    }}
                  />
                  
                  <StrictSelect
                    value={selectedCrop}
                    placeholder="All Crops"
                    options={CROPS}
                    onChange={(val) => setSelectedCrop(val)}
                  />
                  
                  <StrictSelect
                    value={selectedDistrict}
                    placeholder={selectedState ? "All Districts" : "Select State First"}
                    options={districts[selectedState] || []}
                    disabled={!selectedState}
                    onChange={(val) => setSelectedDistrict(val)}
                  />

                  <input placeholder="Search mandi, variety..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>

                {filteredMandis.length > 0 ? (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Mandi</th>
                          <th>State</th>
                          <th>District</th>
                          <th>Crop</th>
                          <th>Variety</th>
                          <th>Grade</th>
                          <th>Min ₹</th>
                          <th>Modal ₹</th>
                          <th>Max ₹</th>
                          <th>Qty (qtl)</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMandis.map((m) => (
                          <tr key={m._id}>
                            <td>{formatDisplayText(m.mandi)}</td>
                            <td>{formatDisplayText(m.state)}</td>
                            <td>{formatDisplayText(m.district)}</td>
                            <td>{formatDisplayText(m.crop)}</td>
                            <td>{formatDisplayText(m.variety)  || "—"}</td>
                            <td>{formatDisplayText(m.grade)    || "—"}</td>
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
                                      Confirm
                                    </button>
                                    <button 
                                      onClick={() => setDeleteConfirmId(null)} 
                                      className="cancel-btn"
                                    >
                                      No
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button onClick={() => handleEdit(m)} className="edit-btn">Edit</button>
                                    <button onClick={() => setDeleteConfirmId(m._id)} className="delete-btn">Delete</button>
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
                  <p className="no-data">No mandis added yet</p>
                )}
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}