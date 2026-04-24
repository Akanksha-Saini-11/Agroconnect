# AgroConnect: Frontend Interview Preparation Guide

This document provides a comprehensive technical breakdown of the AgroConnect frontend, designed to prepare a developer for interview-style technical deep-dives into the architecture, state management, and feature implementation of the platform.

---

## 1. Project Overview

### What is AgroConnect?
AgroConnect is a production-grade SaaS dashboard designed for agricultural stakeholders (farmers, traders, and government bodies). It serves as a data intelligence hub that aggregates real-time market (mandi) prices, localized weather data, and AI-driven agricultural advice.

### Problem it Solves
*   **Information Asymmetry**: Farmers often don't know the prices in neighboring districts. AgroConnect provides transparency.
*   **Decision Support**: AI-powered advice helps farmers decide when to sell or how to manage pests.
*   **Geospatial Convenience**: The "Near Me" feature eliminates the manual search for nearby mandis by using GPS coordinates.

### High-Level Architecture (Frontend)
*   **Framework**: React (Function Components with Hooks).
*   **Styling**: Vanilla CSS with a centralized Design System (CSS Variables).
*   **Data Flow**: Unidirectional (Top-Down) from `App.jsx` to sub-components.
*   **Service Layer**: Decoupled API services using Axios for clean separation of concerns.

---

## 2. Full Application Flow

### Step-by-Step Execution
1.  **Bootstrapping**: `index.js` renders the `BrowserRouter`, which wraps the `MainApp` in `App.jsx`.
2.  **Mounting Phase**: `App.jsx` initializes global states (selectedCrop, prices, location). The `Sidebar` and `Topbar` are rendered immediately.
3.  **User Interaction (Sidebar)**: 
    *   User clicks a **Crop Card**. `handleCropSelect` is triggered.
    *   State `selectedCrop` updates in `App.jsx`.
4.  **API Trigger**: 
    *   The `useEffect` in `App.jsx` detects the crop change and triggers `handleFetchPrices`.
    *   **Caching Logic**: The app first checks `localStorage` for a `cacheKey` (e.g., `prices_wheat_all`).
    *   If found, it renders instantly (Cache-First). If not, it hits the Node.js backend.
5.  **Rendering Data**: Once the API returns JSON, `App.jsx` updates the `prices` and `bestMandi` states. These props flow down to `PricePanel` for visualization.
6.  **Admin Flow**: Users access the Admin Panel via the Topbar. This requires a JWT token stored in `localStorage`, verified on the backend via the `verifyToken` utility.

---

## 3. Component Breakdown

| Component | Purpose | Key State/Role |
| :--- | :--- | :--- |
| **App.jsx** | The **Source of Truth**. Manages global state and API coordination. | `prices`, `selectedCrop`, `handleFetchPrices` |
| **Sidebar.jsx** | Navigation and selection. Holds the crop list and location filter. | Passes `selectedCrop` up to parent. |
| **WeatherWidget.jsx**| Displays live weather and 5-day forecast. | `weather`, `forecast`, `loadWeatherByCoords` |
| **PricePanel.jsx** | Data visualization. Uses Recharts for price trends. | Props: `prices`, `loading`, `error`. |
| **AIAdvisor.jsx** | Chat interface for Groq AI. | `messages`, `loading`, `sendChatMessage` |
| **AdminDashboard.jsx**| Full-page CRUD management for mandi data. | `mandis`, `isLoggedIn`, `token`. |
| **AdminModal.jsx** | The form interface for adding/editing mandis. | `formData`, `verifyToken`, `handleSubmit`. |
| **StrictSelect.jsx** | Custom-built premium dropdown component. | Shared UI primitive used for consistency. |

---

## 4. State Management Explanation

### useState & Lifting State Up
AgroConnect uses **State Lifting**. Since both the `Sidebar` (selection) and `PricePanel` (display) need access to the `selectedCrop`, the state is defined in `App.jsx` (the common ancestor) and passed down as props.

### Prop Drilling vs. Context
The project avoids complex context providers for simplicity and performance. Props are passed directly (Max 2 levels deep).
*   **Local State**: `WeatherWidget` keeps weather data locally because no other component needs it.
*   **Shared State**: `prices` are kept in `App.jsx` because they are shared by `PricePanel`, `AIAdvisor`, and `Topbar`.

---

## 5. API Flow

### `fetchPrices` Lifecycle
1.  **Input**: `cropApiName` and `state`.
2.  **Request**: Axios GET request to `${BASE_URL}/prices`.
3.  **Loading State**: `setLoading(true)` is called before the request to show a spinner.
4.  **Error Handling**: A `try-catch` block catches network failures or 404s, setting the `error` state which displays a friendly UI alert.
5.  **Success**: `setPrices(data.data)` updates the UI.

---

## 6. Caching System (SWR Logic)

The project implements a **Stale-While-Revalidate** style caching strategy manually:
*   **Storage**: `localStorage`.
*   **Key Logic**: `prices_{crop}_{state}` (e.g., `prices_wheat_punjab`).
*   **Flow**:
    1.  Check `localStorage` for the key.
    2.  If exists, parse JSON and `setPrices` immediately (Instant UI).
    3.  Proceed to fetch fresh data from the API regardless.
    4.  Update `localStorage` and UI with the fresh data (Background Refresh).
*   **Result**: Zero perceived latency for returning users.

---

## 7. Location Feature ("Near Me")

1.  **Geolocation API**: Uses `navigator.geolocation.getCurrentPosition` to get `lat/lon`.
2.  **Distance Calculation**: Uses the **Haversine Formula** (implemented in `districtCoords.js`) to calculate the "Great-Circle" distance between user and mandi.
3.  **Normalization**: The `addDistances` function maps the backend's "District Name" to a hardcoded coordinate map (`DISTRICT_COORDS`).
4.  **Fallback**: If GPS is denied, the app defaults to "All India" or a manual state selection.

---

## 8. Admin Panel Flow

### Security & JWT
*   **Login**: Admin submits credentials -> Backend returns a JWT.
*   **Persistence**: Token is stored in `localStorage.adminToken`.
*   **Verification**: Every time the Admin Modal opens, it calls `verifyToken` (Bearer Token in headers) to ensure the session hasn't expired.

### CRUD Operations
*   **Create/Update**: Handled in `AdminModal`. Uses a single `handleSubmit` that switches between POST and PUT based on whether an `editingId` exists.
*   **Cross-Tab Sync**: When an admin updates a price, it sets a `storage` event (`agroconnect_refresh_prices`). Other open tabs listen for this event and refresh their data automatically.

---

## 9. React Concepts Used

*   **useEffect**: Used for side effects like API calls and event listeners. We use dependency arrays (`[selectedCrop]`) to ensure effects only run when necessary.
*   **useCallback**: Wraps functions like `handleFetchPrices` to prevent unnecessary re-renders of child components that receive these functions as props.
*   **useMemo**: Optimizes the filtering of the Mandi list in the Admin panel to avoid expensive array operations on every render.
*   **Conditional Rendering**: Used extensively to show Loading Spinners, Error Messages, or "Empty State" illustrations.

---

## 10. Common Interview Questions

**Q1: How does caching work in this app?**
*   **Answer**: We use a custom localStorage-based system. Each crop/state combination generates a unique key. On request, we check this key; if data exists, we show it instantly to the user while fetching fresh data in the background to keep the UI up-to-date.

**Q2: How do you handle the "Near Me" distance calculation?**
*   **Answer**: We use the browser's Geolocation API for the user's coordinates and a static mapping of district centers for the mandis. We calculate the distance using the Haversine formula and then sort the mandi list by proximity.

**Q3: How is the Admin Panel secured?**
*   **Answer**: It uses JWT-based authentication. The token is stored locally and sent in the `Authorization: Bearer <token>` header for all protected API calls. We also have a `verifyToken` check on component mount.

**Q4: Why use `useCallback` for your fetch functions?**
*   **Answer**: Since these functions are passed down as props to memoized child components, `useCallback` ensures that the function reference remains stable across re-renders, preventing the child from re-rendering unnecessarily.

**Q5: How does the app update data in one tab when you change it in another?**
*   **Answer**: We utilize the `storage` event. When an admin makes a change, we update a specific key in `localStorage`. Other open tabs have a listener for this key change and trigger a background refresh of their own data.

**Q6: What happens if the Government API is slow?**
*   **Answer**: The combination of our local cache and our custom backend caching layer ensures the user never sees a blank screen. They see the last known prices instantly while the system waits for the fresh response.

**Q7: How do you handle deep selection (State -> District)?**
*   **Answer**: We use a cascading state system. Selecting a State updates the `districts` available in the next dropdown by filtering a pre-defined `stateDistricts.js` mapping.

**Q8: Explain the purpose of `StrictSelect.jsx`.**
*   **Answer**: It's a custom-built select component designed to replace native browser selects. It ensures a consistent, premium dark-mode aesthetic and forces a strictly downward opening behavior, which was a specific UX requirement for this project.

**Q9: How do you handle API errors?**
*   **Answer**: We use `try-catch` blocks in our API service layer. If an error occurs, we set a global `error` state in `App.jsx`, which triggers a specialized `EmptyState` component with a user-friendly message.

**Q10: How do you manage the layout of such a data-heavy dashboard?**
*   **Answer**: We use a modular component architecture. The sidebar handles navigation, the topbar handles global filters, and the main stage uses CSS Grid/Flexbox to distribute `PricePanel`, `CropInfoPanel`, and `AIAdvisor` effectively.
