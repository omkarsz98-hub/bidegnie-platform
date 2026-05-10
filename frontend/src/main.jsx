import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const response = await originalFetch(...args);
  if (response.status === 401) {
    try {
      const clone = response.clone();
      const data = await clone.json();
      if (
        data.message === "Unauthorized: Invalid or expired token" ||
        data.message === "Unauthorized: Token missing" ||
        data.message === "Unauthorized: User not found"
      ) {
        localStorage.clear();
        window.location.href = "/login";
      }
    } catch (e) {
      // Ignore JSON parse errors on clone
    }
  }
  return response;
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);