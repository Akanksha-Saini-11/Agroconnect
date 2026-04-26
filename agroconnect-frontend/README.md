# 🌱 AgroConnect - Mandi Price Intelligence

AgroConnect is a production-grade Mandi Price Intelligence platform designed to empower farmers with real-time market data, AI-driven farming advice, and local weather insights. It bridges the gap between official Government API data and real-time community-driven updates.

## 🚀 Key Features

- **Real-Time Price Intelligence**: Fetches live commodity prices from the official Government of India API (`data.gov.in`).
- **📍 Near Me (Geospatial Analysis)**: Automatically detects user location and sorts mandis by physical distance using the Haversine formula.
- **🤖 AI Farming Advisor**: Provides localized, crop-specific advice based on current market trends and weather conditions.
- **📊 Admin Dashboard**: Allows verified administrators to add, update, and manage mandi data manually to supplement official API records.
- **✨ Intelligent Display Formatter**: A custom utility layer that ensures normalized data (lowercase) is presented professionally (e.g., "Naraingarh APMC", "UP State") without breaking backend logic.
- **📱 Fully Responsive Design**: Optimized for everything from small smartphones to large 4K monitors with a specialized 2-column mobile grid.

## 🛠️ Technical Stack

- **Frontend**: React (CRA), Axios, Recharts, Vanilla CSS (Modern CSS variables).
- **Backend**: Node.js, Express, MongoDB (Mongoose).
- **APIs**: Government Mandi API, OpenWeatherMap API, Gemini AI API.
- **Geospatial**: Custom Haversine implementation for distance-based sorting.

## 🌐 Production Configuration

The application is built for seamless deployment. It utilizes environment variables for API endpoints:

- **Local Development**: Falls back to `http://localhost:5000`.
- **Production**: Uses `REACT_APP_API_URL` to point to your live Render/Vercel instance.

## 📦 Getting Started

### 1. Prerequisites
- Node.js (v16+)
- MongoDB instance (Atlas or Local)
- API Keys for `data.gov.in` and `OpenWeatherMap`.

### 2. Installation
```bash
# Clone the repository
git clone <repository-url>

# Install Dependencies (Frontend)
cd agroconnect-frontend
npm install

# Install Dependencies (Backend)
cd ../agroconnect-backend
npm install
```

### 3. Environment Setup
Create a `.env` file in the backend:
```env
PORT=5000
MONGO_URI=your_mongodb_uri
MANDI_API_KEY=your_gov_api_key
WEATHER_API_KEY=your_weather_key
GEMINI_API_KEY=your_gemini_key
JWT_SECRET=your_secret_key
```

### 4. Running the App
```bash
# Start Backend
cd agroconnect-backend
npm start

# Start Frontend
cd agroconnect-frontend
npm start
```

## 📈 Performance & Optimization
- **Intelligent Caching**: Implements a manual Stale-While-Revalidate (SWR) cache to reduce API calls and ensure fast load times.
- **Render Layer Formatting**: Uses a custom utility to handle professional text presentation without mutating underlying data state.
- **Sticky UI Components**: Enhanced Admin tables with sticky identifiers for better usability on small screens.

---
*Built for the next generation of Indian Agriculture.*
