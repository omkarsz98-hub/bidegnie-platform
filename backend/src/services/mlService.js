import axios from "axios";
import dotenv from "dotenv";

dotenv.config();
const ML_BASE_URL = process.env.ML_SERVICE_URL || "http://127.0.0.1:5001";

export const getAIPrediction = async (auctionData) => {
  try {
    console.log("Calling ML at:", `${ML_BASE_URL}/predict`);
    const response = await axios.post(
      `${ML_BASE_URL}/predict`,
      auctionData
    );

    return response.data;

  } catch (error) {
    if (error.response && error.response.data) {
      console.error("ML RESPONSE ERROR:", error.response.data);
    } else {
      console.error("ML ERROR:", error.message);
    }
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
