import express from "express";
import axios from "axios";

const router = express.Router();

/* ---------------- CURRENT WEATHER ---------------- */
router.get("/current", async (req, res) => {
  try {
    const { city, lat, lon } = req.query;
    const API_KEY = process.env.OPENWEATHER_KEY;

    let url;

    if (lat && lon) {
      url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
    } else {
      url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`;
    }

    const { data } = await axios.get(url);

    res.json({
      success: true,
      city: data.name,
      temp: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      humidity: data.main.humidity,
      wind: Math.round(data.wind.speed * 3.6),
      icon: data.weather[0].main,
      description: data.weather[0].description,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ---------------- FORECAST ---------------- */
router.get("/forecast", async (req, res) => {
  try {
    const { lat, lon, city } = req.query;
    const API_KEY = process.env.OPENWEATHER_KEY;

    let url;
    if (lat && lon) {
      url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
    } else {
      url = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}&units=metric`;
    }

    const { data } = await axios.get(url);

    const dayMap = {};

    for (const item of data.list) {
      const date = item.dt_txt.split(" ")[0];
      if (!dayMap[date]) {
        dayMap[date] = {
          dt: item.dt,
          temps: [],
          icons: [],
          pops: [],
        };
      }
      dayMap[date].temps.push(item.main.temp);
      dayMap[date].icons.push(item.weather[0].main);
      dayMap[date].pops.push(item.pop ?? 0);
    }

    const forecast = Object.values(dayMap)
      .slice(0, 7)
      .map((day) => {
        const iconFreq = day.icons.reduce((acc, ic) => {
          acc[ic] = (acc[ic] || 0) + 1;
          return acc;
        }, {});
        const icon = Object.entries(iconFreq).sort((a, b) => b[1] - a[1])[0][0];

        return {
          date: day.dt,
          min: Math.round(Math.min(...day.temps)),
          max: Math.round(Math.max(...day.temps)),
          icon,
          rain: Math.round(Math.max(...day.pops) * 100),
        };
      });

    res.json({ success: true, forecast });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;