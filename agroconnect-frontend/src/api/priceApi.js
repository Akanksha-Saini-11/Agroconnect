import axios from "axios";

const BASE_URL = "http://localhost:5000/api";

export const fetchPrices = async (cropApiName, state = "", limit = 30) => {
  try {
    const params = { crop: cropApiName, limit };
    if (state) params.state = state;

    const res = await axios.get(`${BASE_URL}/prices`, { params });
    return res.data;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
};

export const sendChatMessage = async (payload) => {
  try {
    const res = await axios.post(`${BASE_URL}/ai-chat`, payload);
    return res.data;
  } catch (error) {
    console.error("Chat API Error:", error);
    throw error;
  }
};

export const fetchAIAdvice = sendChatMessage;