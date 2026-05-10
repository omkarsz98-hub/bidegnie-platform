import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import GlassCard from "../components/GlassCard";
import GlowButton from "../components/GlowButton";

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "bidder"
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "Registration failed");
        setLoading(false);
        return;
      }

      localStorage.setItem("token", data.token);
      const user = data.user || {
        _id: data.userId,
        customerId: data.customerId,
        role: data.role
      };
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("role", user.role || "");
      localStorage.setItem("customerId", user.customerId || "");
      if (user._id) localStorage.setItem("userId", user._id);

      if (user.role === "seller") {
        navigate("/seller/dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch {
      setError("Server error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="ai-page-bg min-h-screen px-6 py-10 text-slate-100">
      <div className="mx-auto flex min-h-[85vh] max-w-xl items-center justify-center">
        <GlassCard className="w-full p-8 md:p-10" hover={false}>
          <p className="text-xs tracking-wide text-slate-400">BIDGENIE AI ONBOARDING</p>
          <h1 className="mt-2 text-3xl font-semibold">Create your intelligence account</h1>
          <p className="mt-2 text-sm text-slate-400">Register once and enter the AI auction command center instantly.</p>

          {error ? <p className="mt-5 rounded-lg bg-[#EC4899]/15 px-3 py-2 text-sm text-slate-100">{error}</p> : null}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="relative">
              <input
                type="text"
                name="name"
                placeholder=" "
                value={formData.name}
                onChange={handleChange}
                required
                autoComplete="name"
                className="floating-input w-full rounded-xl border border-white/10 bg-[#0F172A]/80 px-4 pb-3 pt-6 text-slate-100 outline-none transition-all duration-300 focus:border-[#7C3AED]"
              />
              <label className="floating-label">Full Name</label>
            </div>

            <div className="relative">
              <input
                type="email"
                name="email"
                placeholder=" "
                value={formData.email}
                onChange={handleChange}
                required
                autoComplete="email"
                className="floating-input w-full rounded-xl border border-white/10 bg-[#0F172A]/80 px-4 pb-3 pt-6 text-slate-100 outline-none transition-all duration-300 focus:border-[#7C3AED]"
              />
              <label className="floating-label">Email</label>
            </div>

            <div className="relative">
              <input
                type="password"
                name="password"
                placeholder=" "
                value={formData.password}
                onChange={handleChange}
                required
                autoComplete="new-password"
                className="floating-input w-full rounded-xl border border-white/10 bg-[#0F172A]/80 px-4 pb-3 pt-6 text-slate-100 outline-none transition-all duration-300 focus:border-[#7C3AED]"
              />
              <label className="floating-label">Password</label>
            </div>

            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full rounded-xl border border-white/10 bg-[#0F172A]/80 px-4 py-3 text-slate-100 outline-none transition-all duration-300 focus:border-[#7C3AED]"
            >
              <option value="bidder">Bidder</option>
              <option value="seller">Seller</option>
            </select>

            <GlowButton type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating Account..." : "Create Account"}
            </GlowButton>
          </form>

          <p className="mt-6 text-sm text-slate-300">
            Already have an account?{" "}
            <Link to="/login" className="transition-all duration-300 hover:text-white">
              Sign In
            </Link>
          </p>
        </GlassCard>
      </div>
    </div>
  );
}
