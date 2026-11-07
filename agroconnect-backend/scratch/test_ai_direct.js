import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const systemPrompt = "You are an agricultural advisor.";
const messages = [{ role: "user", content: "Pesticide for brinjal" }];

const MODELS = [
  "qwen/qwen3.8-27b",
  "allam-2-7b",
  "openai/gpt-oss-20b"
];

async function testDirect() {
  for (const model of MODELS) {
    try {
      console.log(`Testing model '${model}'...`);
      const response = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model,
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          max_tokens: 150,
          temperature: 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          timeout: 12000,
        }
      );

      const reply = response.data.choices?.[0]?.message?.content;
      console.log(`✅ SUCCESS WITH '${model}':`, reply);
      return;
    } catch (err) {
      console.log(`❌ Failed '${model}':`, err.response?.data?.error?.message || err.message);
    }
  }
}

testDirect();
