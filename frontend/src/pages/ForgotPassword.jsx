import { useState } from "react";
import { Link } from "react-router-dom";

export default function ForgotPassword() {
  const [customerId, setCustomerId] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    alert("Password reset link will be sent (demo version)");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0B0618] via-[#140A2E] to-[#1A0F3D] px-4">

      <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">

        <h2 className="text-3xl font-bold text-center mb-6 text-purple-400">
          Reset Password
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">

          <input
            type="text"
            placeholder="Enter Customer ID"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="w-full p-3 rounded-lg bg-white/10 border border-white/10 focus:ring-2 focus:ring-purple-500"
            required
          />

          <button
            type="submit"
            className="w-full py-3 rounded-lg bg-gradient-to-r from-purple-600 to-purple-400"
          >
            Send Reset Link
          </button>

        </form>

        <p className="text-center mt-4 text-purple-300">
          <Link to="/login">Back to Login</Link>
        </p>

      </div>
    </div>
  );
}