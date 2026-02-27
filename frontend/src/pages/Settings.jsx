import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import GlassCard from "../components/GlassCard";
import SectionHeader from "../components/SectionHeader";
import GlowButton from "../components/GlowButton";

export default function Settings() {
  const navigate = useNavigate();
  const [autoBidEnabled, setAutoBidEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [budget, setBudget] = useState("50000");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }, []);

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");

  const role = user?.role || localStorage.getItem("role") || "-";
  const customerId = user?.customerId || localStorage.getItem("customerId") || "BG------";

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      setMessage("");
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/users/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name, email })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setMessage(data.message || "Unable to update profile.");
        return;
      }

      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("role", data.user.role);
      localStorage.setItem("customerId", data.user.customerId);
      localStorage.setItem("userId", data.user._id);
      setMessage("Profile updated successfully.");
    } catch (error) {
      console.error("Profile update error:", error);
      setMessage("Unable to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <div className="space-y-6 text-slate-100">
      <SectionHeader title="Settings" subtitle="Profile controls and account preferences." />

      <div className="grid gap-5 lg:grid-cols-2">
        <GlassCard className="p-6 bg-[#111827]/70 border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.5)]" hover={false}>
          <h3 className="text-lg font-semibold">Profile</h3>
          <div className="mt-4 space-y-4 text-sm">
            <label className="block">
              <span className="text-slate-300">Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#0F172A]/80 px-4 py-3 outline-none transition-all duration-300 focus:border-[#7C3AED]"
              />
            </label>

            <label className="block">
              <span className="text-slate-300">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#0F172A]/80 px-4 py-3 outline-none transition-all duration-300 focus:border-[#7C3AED]"
              />
            </label>

            <p className="text-slate-300">
              BG User ID: <span className="font-medium text-white">{customerId}</span>
            </p>
            <p className="text-slate-300">
              Role: <span className="font-medium text-white">{role}</span>
            </p>

            <GlowButton onClick={handleSaveProfile} disabled={saving}>
              {saving ? "Saving..." : "Save Profile"}
            </GlowButton>
            {message ? <p className="text-sm text-slate-300">{message}</p> : null}
          </div>
        </GlassCard>

        <GlassCard className="p-6 bg-[#111827]/70 border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.5)]" hover={false}>
          <h3 className="text-lg font-semibold">Automation</h3>
          <div className="mt-4 space-y-4">
            <label className="flex items-center justify-between text-sm">
              <span className="text-slate-300">AutoBid Toggle</span>
              <button
                onClick={() => setAutoBidEnabled((v) => !v)}
                className={`relative h-6 w-11 rounded-full transition-all duration-300 ${autoBidEnabled ? "bg-[#7C3AED]" : "bg-white/10"}`}
              >
                <span
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all duration-300 ${autoBidEnabled ? "left-6" : "left-1"}`}
                />
              </button>
            </label>

            <label className="block text-sm text-slate-300">
              Budget
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#0F172A]/80 px-4 py-3 outline-none transition-all duration-300 focus:border-[#7C3AED]"
              />
            </label>

            <label className="flex items-center justify-between text-sm">
              <span className="text-slate-300">Notifications</span>
              <button
                onClick={() => setNotificationsEnabled((v) => !v)}
                className={`relative h-6 w-11 rounded-full transition-all duration-300 ${notificationsEnabled ? "bg-[#7C3AED]" : "bg-white/10"}`}
              >
                <span
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all duration-300 ${notificationsEnabled ? "left-6" : "left-1"}`}
                />
              </button>
            </label>
          </div>
        </GlassCard>
      </div>

      <GlassCard className="p-6 bg-[#111827]/70 border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.5)]" hover={false}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-300">Use logout to end active session on this device.</p>
          <GlowButton onClick={handleLogout}>Logout</GlowButton>
        </div>
      </GlassCard>
    </div>
  );
}

