import { useState, useEffect, useCallback } from "react";
import "./WeatherWidget.css";
import {
  fetchWeather,
  fetchWeatherByCoords,
  getUserLocation,
  fetchForecast,
} from "../api/weatherApi";
import { CITY_GROUPS } from "../constants/cities";
import { getDistance } from "../constants/districtCoords";
import StrictSelect from "./ui/StrictSelect";

const WEATHER_ICONS = {
  Clear: "☀️",
  Clouds: "⛅",
  Rain: "🌧️",
  Drizzle: "🌦️",
  Thunderstorm: "⛈️",
  Snow: "❄️",
  Mist: "🌫️",
  Haze: "🌫️",
  Fog: "🌫️",
  Smoke: "🌫️",
  Dust: "🌪️",
  Sand: "🌪️",
  Ash: "🌋",
  Squall: "🌬️",
  Tornado: "🌪️",
};

const WEATHER_BG = {
  Clear: "weather-clear",
  Clouds: "weather-cloudy",
  Rain: "weather-rain",
  Drizzle: "weather-rain",
  Thunderstorm: "weather-storm",
  Snow: "weather-snow",
  Mist: "weather-mist",
  Haze: "weather-mist",
  Fog: "weather-mist",
};

const LS_WEATHER_KEY = "agroconnect_weather";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

export default function WeatherWidget({ onWeatherChange }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [forecast, setForecast] = useState([]);

  // null  = still trying GPS (silent)
  // true  = GPS failed/denied, show city picker prompt
  const [showCityPrompt, setShowCityPrompt] = useState(null);

  // Load by city name (Manual Dropdown)
  const loadWeatherByCity = useCallback(async (city) => {
    setLoading(true);
    setError("");
    setForecast([]);
    try {
      const [current, future] = await Promise.all([
        fetchWeather(city),
        fetchForecast(city),
      ]);

      if (current.success) {
        setWeather(current);
        onWeatherChange?.(current);
      } else {
        setError("City not found");
      }

      if (future.success) setForecast(future.forecast);
    } catch {
      setError("Failed to fetch weather");
    } finally {
      setLoading(false);
    }
  }, [onWeatherChange]);

  // Load by GPS coords (Smart Cached)
  const loadWeatherByCoords = useCallback(async (lat, lon) => {
    setLoading(true);
    setError("");
    setForecast([]);
    
    // Check Cache
    try {
      const cachedString = localStorage.getItem(LS_WEATHER_KEY);
      if (cachedString) {
        const cache = JSON.parse(cachedString);
        const age = Date.now() - cache.timestamp;
        const distance = getDistance(lat, lon, cache.lat, cache.lon);
        
        if (age < CACHE_TTL_MS && distance <= 15) {
          console.log(`🌤️ [Weather] Using cache. Distance: ${distance}km, Age: ${Math.round(age/60000)}m`);
          setWeather(cache.current);
          setForecast(cache.future);
          setSelectedCity(cache.current.city);
          onWeatherChange?.(cache.current);
          setLoading(false);
          return;
        } else {
          console.log(`🌤️ [Weather] Cache invalid. Distance: ${distance}km, Age: ${Math.round(age/60000)}m`);
        }
      }
    } catch (e) {
      console.warn("Weather cache read error:", e);
    }

    try {
      const [current, future] = await Promise.all([
        fetchWeatherByCoords(lat, lon),
        fetchForecast(lat, lon),
      ]);

      if (current.success) {
        setWeather(current);
        setSelectedCity(current.city);
        onWeatherChange?.(current);
        
        // Update Cache
        localStorage.setItem(LS_WEATHER_KEY, JSON.stringify({
          lat,
          lon,
          current,
          future: future.success ? future.forecast : [],
          timestamp: Date.now()
        }));
      } else {
        setError("Could not fetch weather");
      }

      if (future.success) setForecast(future.forecast);
    } catch {
      setError("Failed to fetch weather");
    } finally {
      setLoading(false);
    }
  }, [onWeatherChange]);

  // On mount: ALWAYS try GPS silently first
  useEffect(() => {
    getUserLocation()
      .then(({ lat, lon }) => {
        // GPS worked — load smart coords
        setShowCityPrompt(false);
        loadWeatherByCoords(lat, lon);
      })
      .catch(() => {
        // GPS denied or failed
        setShowCityPrompt(true);
      });
  }, [loadWeatherByCoords]);

  // Manual city select from dropdown
  const handleCityChange = (city) => {
    setSelectedCity(city);
    setShowCityPrompt(false);
    loadWeatherByCity(city);
  };


  // 📍 button — re-attempt GPS manually
  const handleGeolocate = async () => {
    setError("");
    setForecast([]);
    setLoading(true);

    try {
      const permission = await navigator.permissions.query({ name: "geolocation" });
      
      if (permission.state === "denied") {
        setError("Location is blocked. Please enable it in browser settings.");
        setLoading(false);
        return;
      }

      const { lat, lon } = await getUserLocation();
      setShowCityPrompt(false);
      await loadWeatherByCoords(lat, lon);
    } catch (e) {
      setError("Location is blocked. Please enable it in browser settings.");
      setLoading(false);
    }
  };

  const bgClass = weather
    ? WEATHER_BG[weather.icon] || "weather-default"
    : "weather-default";
    
  const allCities = CITY_GROUPS.flatMap(group => group.cities.map(c => c.name));

  // Still silently trying GPS (brief moment on first load)
  if (showCityPrompt === null) {
    return (
      <div className="weather-widget weather-default">
        <div className="weather-locating">
          <span className="weather-locating-icon">📡</span>
          <p>Detecting your location…</p>
        </div>
      </div>
    );
  }

  // GPS failed and no saved city — show prompt
  if (showCityPrompt) {
    return (
      <div className="weather-widget weather-default">
        <div className="weather-prompt card-style">
          <div className="prompt-header">
            <span className="weather-prompt-icon">🌤️</span>
            <p className="weather-prompt-title">Weather Forecast</p>
            <p className="weather-prompt-sub">Get live updates for your area</p>
          </div>
          
          <div className="prompt-actions">
            {error && <div className="prompt-error-msg">{error}</div>}
            
            <button
              className="geo-btn geo-btn-large"
              onClick={handleGeolocate}
            >
              📍 {error ? "Retry Location Access" : "Use My Location"}
            </button>
            
            <div className="prompt-divider">
              <span>OR</span>
            </div>
            
            <StrictSelect
              value={selectedCity}
              placeholder="Select a city manually"
              options={allCities}
              onChange={handleCityChange}
              className="large-select"
            />
          </div>
        </div>
      </div>
    );
  }
  // Normal weather view
  return (
    <div className={`weather-widget ${bgClass}`}>
      {/* Controls */}
      <div className="weather-controls">
        <StrictSelect
          value={selectedCity}
          placeholder="Select City"
          options={allCities}
          onChange={handleCityChange}
        />

        <button
          className="geo-btn"
          onClick={handleGeolocate}
          disabled={loading}
          title="Use my location"
        >
          {loading ? "…" : "📍"}
        </button>
      </div>

      {/* Weather Display */}
      {loading && (
        <div className="weather-loading">
          <div className="weather-shimmer" />
        </div>
      )}

      {error && !loading && <p className="weather-error">{error}</p>}

      {weather && !loading && (
        <div className="weather-body">
          <div className="weather-main">
            <span className="weather-emoji">
              {WEATHER_ICONS[weather.icon] || "🌤️"}
            </span>
            <div className="weather-temp-block">
              <span className="weather-temp">{weather.temp}°</span>
              <span className="weather-unit">C</span>
            </div>
          </div>

          <div className="weather-city-name">{weather.city}</div>
          <div className="weather-desc">{weather.description}</div>

          <div className="weather-stats">
            <div className="weather-stat">
              <span className="wstat-icon">💧</span>
              <span className="wstat-val">{weather.humidity}%</span>
              <span className="wstat-label">Humidity</span>
            </div>
            <div className="weather-stat">
              <span className="wstat-icon">💨</span>
              <span className="wstat-val">{weather.wind}</span>
              <span className="wstat-label">km/h</span>
            </div>
            <div className="weather-stat">
              <span className="wstat-icon">🌡️</span>
              <span className="wstat-val">{weather.feelsLike}°</span>
              <span className="wstat-label">Feels like</span>
            </div>
          </div>
        </div>
      )}

      {forecast.length > 0 && (
        <div className="weather-forecast">
          {forecast.map((day, i) => {
            const d = new Date(day.date * 1000);
            const label =
              i === 0
                ? "Today"
                : d.toLocaleDateString("en-IN", { weekday: "short" });

            return (
              <div key={i} className="forecast-day">
                <span>{label}</span>
                <span>{WEATHER_ICONS[day.icon] || "🌤️"}</span>
                <span>
                  {day.min}° / {day.max}°
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}