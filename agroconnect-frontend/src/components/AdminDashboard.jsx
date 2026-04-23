import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import districts from "../constants/stateDistricts";
import { CROPS } from "../constants/crops";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const API_BASE = `${process.env.REACT_APP_API_URL}/api`;


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
    const currentToken = localStorage.getItem("adminToken");
    if (!currentToken) {
      handleLogout();
      return;
    }

    try {
      const res = await axios.get(`${API_BASE}/admin/auth/verify`, {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      setIsLoggedIn(true);
      setAdminName(res.data.admin.name);
    } catch (err) {
      console.error("Token verification failed:", err);
      handleLogout();
    }
  }, [handleLogout]);

  const fetchMandis = useCallback(async () => {
    const currentToken = localStorage.getItem("adminToken");
    if (!currentToken) {
      handleLogout();
      return;
    }

    try {
      const res = await axios.get(`${API_BASE}/admin/mandis`, {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      setMandis(res.data.data || []);
    } catch (e) {
      console.error("Error fetching mandis:", e);
      if (e.response?.status === 401 || e.response?.status === 403) {
        handleLogout();
      } else {
        setMessage("❌ Error fetching mandis");
      }
    }
  }, [handleLogout]);

  /* VERIFY TOKEN ON MOUNT */
  useEffect(() => {
    const activeToken = localStorage.getItem("adminToken");
    if (activeToken) {
      verifyToken();
    }
  }, [verifyToken]);

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
        email,
        password,
        name,
        secretCode,
      });

      // Use an inline state or a custom alert, here we can repurpose authError to show a success message but styled green,
      // Wait, there's no success state for auth. I will just set authError but with a success prefix.
      setAuthError("✅ Registration successful! Please login.");
      setAuthMode("login");
      setEmail("");
      setPassword("");
      setName("");
      setSecretCode("");
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
          <h1>AgroConnect Admin</h1>

          <div className="auth-tabs">
            <button
              onClick={() => setAuthMode("login")}
              className={`tab ${authMode === "login" ? "active" : ""}`}
            >
              Login
            </button>
            <button
              onClick={() => setAuthMode("register")}
              className={`tab ${authMode === "register" ? "active" : ""}`}
            >
              Register
            </button>
          </div>

          <form onSubmit={authMode === "login" ? handleLogin : handleRegister} className="auth-form">
            {authMode === "register" && (
              <input
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            )}

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {authMode === "register" && (
              <input
                type="password"
                placeholder="Secret Code"
                value={secretCode}
                onChange={(e) => setSecretCode(e.target.value)}
                required
              />
            )}

            <button type="submit" disabled={loading}>
              {loading ? "Processing..." : authMode === "login" ? "Login" : "Register"}
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
        <h1>Admin Dashboard</h1>
        <div className="admin-info">
          <span>Welcome, <strong>{adminName}</strong></span>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="admin-content">
        {/* FORM SECTION */}
        <div className="form-section">
          <h2>{editingId ? "Edit Mandi" : "Add Mandi"}</h2>

          <form onSubmit={handleSubmit} className="mandi-form">
            <input
              placeholder="Mandi Name"
              value={formData.mandi}
              onChange={(e) => setFormData({ ...formData, mandi: e.target.value })}
              required
            />

            <select
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value, district: "" })}
              required
            >
              <option value="">Select State</option>
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <select
              value={formData.district}
              onChange={(e) => setFormData({ ...formData, district: e.target.value })}
              required
              disabled={!formData.state}
            >
              <option value="">{formData.state ? "Select District" : "Select State First"}</option>
              {(districts[formData.state] || []).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
              {formData.district && !(districts[formData.state] || []).some(d => d.toLowerCase().trim() === formData.district.toLowerCase().trim()) && (
                <option value={formData.district}>{formData.district} (Update Required)</option>
              )}
            </select>

            <select
              value={formData.crop}
              onChange={(e) => setFormData({ ...formData, crop: e.target.value })}
              required
            >
              <option value="">Select Crop</option>
              {CROPS.map((c) => (
                <option key={c.apiName} value={c.apiName}>{c.name}</option>
              ))}
            </select>

            <input
              placeholder="Variety"
              value={formData.variety}
              onChange={(e) => setFormData({ ...formData, variety: e.target.value })}
            />

            <select
              value={formData.grade}
              onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
            >
              <option value="">Select Grade</option>
              {GRADES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>

            <input
              type="number"
              placeholder="Min Price (₹)"
              value={formData.minPrice}
              onChange={(e) => setFormData({ ...formData, minPrice: e.target.value })}
            />

            <input
              type="number"
              placeholder="Modal Price (₹)"
              value={formData.modalPrice}
              onChange={(e) => setFormData({ ...formData, modalPrice: e.target.value })}
              required
            />

            <input
              type="number"
              placeholder="Max Price (₹)"
              value={formData.maxPrice}
              onChange={(e) => setFormData({ ...formData, maxPrice: e.target.value })}
            />

            <input
              type="number"
              placeholder="Arrival Quantity (quintals)"
              value={formData.arrivalQuantity}
              onChange={(e) => setFormData({ ...formData, arrivalQuantity: e.target.value })}
            />

            <div className="form-actions" style={{ gridColumn: "1 / -1", display: "flex", gap: "12px" }}>
              <button type="submit" disabled={loading} style={{ flex: 1 }}>
                {loading ? "Saving..." : editingId ? "Update Mandi" : "Add Mandi"}
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
                  Cancel
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
            <h2>My Mandis ({filteredMandis.length})</h2>
            
            <div className="view-toggle">
              <button className={`view-btn ${view === "cards" ? "view-active" : ""}`} onClick={() => setView("cards")}>Table</button>
              <button className={`view-btn ${view === "chart" ? "view-active" : ""}`} onClick={() => setView("chart")}>Analytics</button>
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
              <option value="">All States</option>
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            
            <select
              value={filterCrop}
              onChange={(e) => setFilterCrop(e.target.value)}
            >
              <option value="">All Crops</option>
              {CROPS.map((c) => (
                <option key={c.apiName} value={c.apiName}>{c.name}</option>
              ))}
            </select>
            
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              disabled={!selectedState}
            >
              <option value="">{selectedState ? "All Districts" : "Select State First"}</option>
              {(districts[selectedState] || []).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            <input
              placeholder="Search mandi, variety..."
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
                      <th>Mandi</th>
                      <th>Location</th>
                      <th>Crop</th>
                      <th>Variety</th>
                      <th>Prices (Min/Modal/Max)</th>
                      <th>Qty</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredMandis.map((m) => (
                      <tr key={m._id}>
                        <td>{m.mandi}</td>
                        <td>
                          <div style={{ color: "var(--text-primary)" }}>{m.district}</div>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{m.state}</div>
                        </td>
                        <td>{m.crop}</td>
                        <td>
                          {m.variety || "—"}
                          {m.grade && <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Grade: {m.grade}</div>}
                        </td>
                        <td>
                          <div style={{ fontWeight: "600", color: "var(--primary)" }}>₹{m.modalPrice}</div>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>₹{m.minPrice || "—"} - ₹{m.maxPrice || "—"}</div>
                        </td>
                        <td>{m.arrivalQuantity != null ? `${m.arrivalQuantity} qtl` : "—"}</td>
                        <td>
                          <div style={{ display: "flex", gap: "8px" }}>
                            {deleteConfirmId === m._id ? (
                              <>
                                <button onClick={() => executeDelete(m)} className="delete-btn" style={{ background: "var(--error)", color: "white" }}>Confirm</button>
                                <button onClick={() => setDeleteConfirmId(null)} className="edit-btn">No</button>
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
              <PriceChart data={filteredMandis} />
            )
          ) : (
            <p style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>No mandis found matching filters.</p>
          )}
        </div>
      </div>
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