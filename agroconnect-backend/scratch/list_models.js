import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.GROQ_API_KEY;

async function listModels() {
  try {
    const res = await axios.get("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    console.log("AVAILABLE GROQ MODELS:", res.data.data.map(m => m.id));
  } catch (err) {
    console.error("List models failed:", err.response?.data || err.message);
  }
}

listModels();
