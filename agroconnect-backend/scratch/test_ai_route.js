import axios from "axios";

async function testAIRoute() {
  try {
    const res = await axios.post("http://localhost:5000/api/ai-chat", {
      messages: [{ role: "user", content: "What is the best pesticide for brinjal?" }],
      context: { crop: "Brinjal", state: "Punjab" }
    });
    console.log("✅ AI ROUTE SUCCESS! Reply:", res.data);
  } catch (err) {
    console.error("❌ AI ROUTE FAILED:", err.response?.data || err.message);
  }
}

testAIRoute();
