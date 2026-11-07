import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.GROQ_API_KEY;

const modelsToTest = [
  "openai/gpt-oss-20b",
  "qwen/qwen3.8-27b",
  "allam-2-7b",
  "openai/gpt-oss-120b"
];

async function testWorkingModels() {
  for (const model of modelsToTest) {
    try {
      const res = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model,
          messages: [{ role: "user", content: "Say hello in one word." }],
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
      console.log(`✅ Model '${model}' SUCCESS! Reply:`, res.data.choices?.[0]?.message?.content);
    } catch (err) {
      console.log(`❌ Model '${model}' Error:`, err.response?.data?.error?.message || err.message);
    }
  }
}

testWorkingModels();
