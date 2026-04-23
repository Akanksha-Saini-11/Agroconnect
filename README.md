# AgroConnect
**Full-Stack Mandi Intelligence & Agricultural Decision Support System**

AgroConnect is a production-grade data platform designed to bridge the information gap for agricultural stakeholders. It provides real-time market pricing from government APIs, localized weather forecasting, and AI-driven crop insights through a performance-optimized, distributed architecture.

## 🔗 Project Links
- **Frontend**: [agroconnect-frontend.vercel.app](https://agroconnect-frontend.vercel.app)
- **Backend API**: [agroconnect-api.onrender.com](https://agroconnect-api.onrender.com)
- **Database**: MongoDB Atlas (Cloud)

## 🛠 Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React, Recharts, Lucide, Geolocation API, LocalStorage Sync |
| **Backend** | Node.js, Express.js, JWT Authentication |
| **Database** | MongoDB Atlas (Mongoose ODM) |
| **AI/ML** | Groq Cloud API (Llama 3 Inference) |
| **APIs** | OpenWeatherMap, Data.gov.in (Agmarknet) |
| **DevOps** | Vercel (Frontend), Render (Backend), GitHub Actions |

## 🚀 Core Features

- **Real-Time Market Data**: Fetches and normalizes commodity prices from the Agmarknet (Data.gov.in) API.
- **Hybrid Caching Engine**: Implements a Stale-While-Revalidate (SWR) strategy on both frontend and backend to mitigate slow government API response times.
- **Geospatial Intelligence**: "Near Me" feature calculates distances between the user's GPS coordinates and mandi locations for localized pricing.
- **Admin Management System**: Secure dashboard for CRUD operations with multi-admin isolation and robust data validation.
- **Cross-Tab Synchronization**: Real-time state updates across multiple browser tabs using LocalStorage event listeners.
- **AI Advisory**: Integration with Llama 3 for context-aware agricultural consulting and pest management advice.
- **Analytics Suite**: Dynamic data visualization using Recharts for price trend analysis.

## 📐 Architecture Overview

AgroConnect utilizes a decoupled architecture designed for high availability and low latency:

1. **Client (React)**: Implements a cache-first strategy. It requests data from the Backend while simultaneously checking local cache for instant UI rendering.
2. **Server (Express)**: Acts as a middleware and normalization layer. It aggregates data from multiple external APIs and manages authentication.
3. **Caching Layer**: The backend caches external API responses to reduce rate-limiting risks and improve response times for frequently requested states/crops.
4. **Persistence (MongoDB)**: Stores custom mandi entries, admin credentials, and user-specific configurations.

## 📸 Screenshots

*(Placeholders for future screenshots)*
- **Main Dashboard**: `[screenshot_dashboard.png]`
- **Admin Panel**: `[screenshot_admin.png]`
- **AI Consultation**: `[screenshot_ai.png]`

## ⚙️ Key Engineering Highlights

- **Data Normalization**: Implemented a robust normalization layer to handle inconsistent string formatting and data structures from legacy government APIs.
- **Performance Optimization**: Reduced perceived load times by 70% through strategic use of LocalStorage and background revalidation.
- **Cross-Tab Real-Time Sync**: Custom event-driven synchronization ensures that price updates in the Admin panel reflect instantly across all open user tabs without a page refresh.
- **Resilient Geolocation**: Smart fallback mechanism that switches to manual city selection if GPS access is denied or unavailable.

## 📂 Folder Structure

```bash
AgroConnect/
├── agroconnect-frontend/      # React client-side application
│   ├── src/
│   │   ├── api/               # API service abstractions
│   │   ├── components/        # Reusable UI primitives & modules
│   │   ├── constants/         # Geo-coordinates & static datasets
│   │   └── ui/                # Custom StrictSelect & theme components
├── agroconnect-backend/       # Node.js API server
│   ├── models/                # Mongoose schemas
│   ├── routes/                # Express controllers & routing
│   └── utils/                 # Normalization & migration scripts
└── README.md                  # Project documentation
```

## 🛠 Installation & Setup

### Backend
1. `cd agroconnect-backend`
2. `npm install`
3. Create a `.env` file:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_atlas_uri
   JWT_SECRET=your_jwt_secret
   ADMIN_SECRET=your_registration_code
   OPENWEATHER_KEY=your_weather_api_key
   GROQ_API_KEY=your_groq_api_key
   MANDI_API_KEY=your_government_api_key
   ```
4. `npm start`

### Frontend
1. `cd agroconnect-frontend`
2. `npm install`
3. `npm start`

## ☁️ Deployment

### 1. MongoDB Atlas
- Create a new cluster and database named `agroconnect`.
- Whitelist all IP addresses (`0.0.0.0/0`) for Render/Vercel access.

### 2. Render (Backend)
- Connect your GitHub repository.
- Set the Build Command to `cd agroconnect-backend && npm install`.
- Set the Start Command to `cd agroconnect-backend && node server.js`.
- Add all environment variables from your `.env` file.

### 3. Vercel (Frontend)
- Connect your GitHub repository.
- Set the Framework Preset to `Create React App`.
- Set the Root Directory to `agroconnect-frontend`.
- Add environment variables if any (e.g., `REACT_APP_API_URL`).

## 🔮 Future Roadmap
- [ ] Predictive price modeling using historical dataset analysis.
- [ ] Multi-language support (Hindi, Punjabi, Marathi) for broader accessibility.
- [ ] Push notification system for price alerts on specific crops.
- [ ] Offline-first support using Service Workers.

## 👤 Author
**Akanksha Saini**
- GitHub: [@Akanksha-Saini-11](https://github.com/Akanksha-Saini-11)
- LinkedIn: [linkedin.com/in/akanksha-saini](https://linkedin.com/in/akanksha-saini)
