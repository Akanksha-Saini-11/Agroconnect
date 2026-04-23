//weatherApi.js 
import axios from "axios";

const BASE_URL = `${process.env.REACT_APP_API_URL}/api/weather`;

/* CURRENT WEATHER */
export const fetchWeather = async (city) => {
  const res = await axios.get(`${BASE_URL}/current`, {
    params: { city },
  });
  return res.data;
};

export const fetchWeatherByCoords = async (lat, lon) => {
  const res = await axios.get(`${BASE_URL}/current`, {
    params: { lat, lon },
  });
  return res.data;
};

/* FORECAST — accepts either city name or lat/lon */
export const fetchForecast = async (latOrCity, lon = null) => {
  const params =
    lon !== null
      ? { lat: latOrCity, lon }
      : { city: latOrCity };

  const res = await axios.get(`${BASE_URL}/forecast`, { params });
  return res.data;
};

/* GEOLOCATION */
export const getUserLocation = () => {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        }),
      reject,
      { timeout: 8000 }
    );
  });
};