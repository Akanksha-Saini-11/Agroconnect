import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const RESOURCE_ID = "9ef84268-d588-465a-a308-a864a43d0070";
const apiKey = process.env.MANDI_API_KEY;

async function testPriceFetch(crop, limit) {
  const start = Date.now();
  const url = `https://api.data.gov.in/resource/${RESOURCE_ID}?api-key=${apiKey}&format=json&limit=${limit}&filters[commodity]=${encodeURIComponent(crop)}`;
  try {
    const res = await axios.get(url, { timeout: 10000 });
    const timeTaken = Date.now() - start;
    console.log(`✅ Crop: '${crop}', Limit: ${limit} -> SUCCESS in ${timeTaken}ms! Records: ${res.data.records?.length}`);
  } catch (err) {
    const timeTaken = Date.now() - start;
    console.log(`❌ Crop: '${crop}', Limit: ${limit} -> FAILED in ${timeTaken}ms:`, err.message);
  }
}

async function runTests() {
  await testPriceFetch("groundnut", 500);
  await testPriceFetch("groundnut", 100);
  await testPriceFetch("mustard", 100);
  await testPriceFetch("brinjal", 100);
}

runTests();
