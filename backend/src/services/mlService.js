import axios from "axios";
import dotenv from "dotenv";

dotenv.config();
const ML_BASE_URL = process.env.ML_SERVICE_URL || "http://localhost:5001";

export const getAIPrediction = async (auctionData) => {
  try {
    const response = await axios.post(
      `${ML_BASE_URL}/predict`,
      auctionData
    );

    return response.data;

  } catch (error) {
    console.error("ML Service Error:", error.message);
    return null;
  }
};

export const getFraudPrediction = async (payload) => {
  try {
    const res = await axios.post(
      `${ML_BASE_URL}/predict-fraud`,
      payload
    );

    return res.data;
  } catch (error) {
    console.error("Fraud ML error:", error.message);
    return null;
  }
};

export const getAutoBidPrediction = async (payload) => {
  try {
    const res = await axios.post(
      `${ML_BASE_URL}/predict-autobid`,
      payload
    );

    return res.data;
  } catch (error) {
    console.error("Autobid ML error:", error.message);
    return null;
  }
};
