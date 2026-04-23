# 🌱 AgroConnect: Mandi Price Intelligence Dashboard

AgroConnect is a production-grade SaaS dashboard designed for farmers, traders, and agricultural stakeholders. It provides real-time mandi price intelligence, AI-powered agricultural advice, and localized weather forecasts through a modern, premium dark-themed interface.

![AgroConnect Banner](https://raw.githubusercontent.com/Akanksha-Saini-11/Agroconnect/main/agroconnect-frontend/public/logo512.png)

## 🚀 Key Features

- **📊 Real-time Price Intelligence**: Track commodity prices across 300+ mandis in India with dynamic charts and visual analytics.
- **🤖 AI Crop Advisor**: Integration with Groq AI to provide expert advice on crop selection, pest management, and market trends.
- **🌤️ Localized Weather**: Live weather updates and 5-day forecasts based on user location or manual city selection.
- **🔒 Admin Management System**: Secure admin panel to add, edit, and manage custom mandi data with a strictly downward-opening UI.
- **📱 Responsive Design**: Fully optimized for mobile, tablet, and desktop viewing.

## 🛠️ Tech Stack

- **Frontend**: React.js, Recharts, Lucide Icons, Vanilla CSS (Custom Design System)
- **Backend**: Node.js, Express.js
- **Database**: MongoDB Atlas
- **AI Engine**: Groq Cloud API (Llama 3)
- **Weather API**: OpenWeatherMap

---

## 📂 Project Structure

```bash
AgroConnect/
├── agroconnect-frontend/    # React Client
└── agroconnect-backend/     # Express Server
```

---

## ⚙️ Setup Instructions

### 1. Prerequisites
- Node.js (v16+)
- MongoDB Atlas Account
- API Keys for OpenWeather and Groq

### 2. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd agroconnect-backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `agroconnect-backend` folder:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_uri
   JWT_SECRET=your_secret_key
   ADMIN_SECRET=your_admin_secret_code
   OPENWEATHER_KEY=your_openweather_key
   GROQ_API_KEY=your_groq_api_key
   MANDI_API_KEY=your_data_gov_in_key
   ```
4. Start the server:
   ```bash
   npm start
   ```

### 3. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd ../agroconnect-frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the application:
   ```bash
   npm start
   ```

---

## 🎨 Design Philosophy

AgroConnect follows a **"Strictly Pro"** design system:
- **Unified Color Palette**: Deep navy backgrounds with vibrant emerald accents.
- **Custom UI Components**: Hand-built "StrictSelect" dropdowns for consistent behavior across all browsers.
- **Visual Clarity**: High-contrast charts and breathable layouts to manage large datasets without clutter.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---
Developed with ❤️ for the Agricultural Community.
