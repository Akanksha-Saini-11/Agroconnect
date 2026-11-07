import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.GROQ_API_KEY;

const testModels = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "llama3-8b-8192",
  "mixtral-8x7b-32768",
  "gemma2-9b-it"
];

async function checkModels() {
  console.log("Testing Groq API Models...");
  for (const model of testModels) {
    try {
      const res = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model,
          messages: [{ role: "user", content: "Hello" }],
          max_tokens: 10,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 5000,
        }
      );
      console.log(`✅ Model '${model}' WORKS! Reply:`, res.data.choices?.[0]?.message?.content);
    } catch (err) {
      console.log(`❌ Model '${model}' FAILED:`, err.response?.data?.error?.message || err.message);
    }
  }
}

checkModels();
