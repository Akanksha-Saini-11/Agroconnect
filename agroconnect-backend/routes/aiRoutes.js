import express from "express";
import axios from "axios";

const router = express.Router();

// Build system prompt with all context
const buildSystemPrompt = ({ crop, cropInfo, weather, state, prices, bestMandi }) => {
  const currentMonth = new Date().toLocaleString("en-IN", { month: "long" });
  const currentYear = new Date().getFullYear();

  const weatherContext = weather
    ? `Current weather at ${weather.city}: ${weather.temp}°C, ${weather.description}, Humidity: ${weather.humidity}%, Wind: ${weather.wind} km/h`
    : "Weather data not available.";

  const priceContext = prices?.length
    ? `Current mandi prices for ${crop} (${state || "All India"}):
- Best mandi: ${bestMandi?.mandi} in ${bestMandi?.district}, ${bestMandi?.state} at Rs.${bestMandi?.modalPrice}/qtl
- Average price: Rs.${Math.round(prices.reduce((s, p) => s + p.modalPrice, 0) / prices.length)}/qtl
- Top mandis: ${prices.slice(0, 5).map(p => `${p.mandi} (Rs.${p.modalPrice})`).join(", ")}`
    : `No current price data available for ${crop}.`;

  const cropContext = cropInfo
    ? `Crop details — Season: ${cropInfo.season}, Ideal temp: ${cropInfo.temp}, Harvest: ${cropInfo.harvest}, Soil: ${cropInfo.soil || "Not specified"}`
    : "";

  return `You are a friendly, expert agricultural advisor helping Indian farmers in simple language.

Today: ${currentMonth} ${currentYear}
Crop: ${crop || "Not specified"}
Region: ${state || "All India"}
${cropContext}
${weatherContext}
${priceContext}

Guidelines:
- Answer ANY farming question — prices, pesticides, harvesting, storage, weather, soil, government schemes, etc.
- Use simple, friendly language a village farmer understands. Mix Hindi/Punjabi words naturally (e.g. "bhaiya", "kisan bhai", "accha", "theek hai").
- When talking about prices, always use EXACT mandi names and prices from the data above.
- Use emojis to make responses easy to scan.
- Keep responses concise — under 150 words unless the question needs more detail.
- Never use ** markdown bold. Use emojis as section markers instead.
- Be specific and actionable, not generic.
- If you don't have data for something, say so honestly and give general best-practice advice.`;
};

// POST /api/ai-chat
router.post("/", async (req, res) => {
  const { messages, context } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ success: false, message: "Messages are required" });
  }

  const systemPrompt = buildSystemPrompt(context || {});

  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages, // full conversation history
        ],
        max_tokens: 400,
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      }
    );

    const reply = response.data.choices?.[0]?.message?.content || "Sorry, I could not generate a response.";
    res.json({ success: true, reply });

  } catch (error) {
    console.error("AI chat error:", error.response?.data || error.message);
    res.status(500).json({ success: false, message: "Could not get AI response" });
  }
});

export default router;