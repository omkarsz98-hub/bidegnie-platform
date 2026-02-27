import { useNavigate } from "react-router-dom";
import GlassCard from "../components/GlassCard";
import GlowButton from "../components/GlowButton";
import SectionHeader from "../components/SectionHeader";

const intelligenceCards = [
  {
    title: "Predictive Bid Engine",
    desc: "Model-driven pricing guidance using live market signals."
  },
  {
    title: "Fraud Detection Core",
    desc: "Real-time anomaly detection powered by RandomForest."
  },
  {
    title: "Smart AutoBid Layer",
    desc: "Budget-aware automated bidding strategy."
  },
  {
    title: "Live Market Broadcast",
    desc: "Socket-driven real-time auction updates."
  }
];

const steps = [
  "User Places Bid",
  "AI Evaluates Market",
  "Fraud Risk Scored",
  "AutoBid Strategy Adjusted",
  "Live Update Broadcast"
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="ai-page-bg min-h-screen px-4 py-10 text-slate-100 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-12">
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#111827]/70 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.45)] sm:p-10">
          <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[#7C3AED]/20 blur-3xl" />
          <div className="absolute -bottom-20 right-0 h-64 w-64 rounded-full bg-[#EC4899]/15 blur-3xl" />

          <div className="relative z-10 grid items-center gap-10 lg:grid-cols-2">
            <div className="text-center lg:text-left">
              <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">BidGenie</h1>
              <h2 className="mt-3 text-xl text-slate-300 sm:text-2xl">AI-Powered Auction Intelligence</h2>
              <p className="mx-auto mt-4 max-w-xl text-slate-400 lg:mx-0">
                Predict bids. Detect risk. Compete with confidence.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row lg:justify-start">
                <GlowButton className="w-full sm:w-auto" onClick={() => navigate("/login")}>
                  Enter Platform
                </GlowButton>
                <GlowButton
                  variant="ghost"
                  className="w-full sm:w-auto"
                  onClick={() => navigate("/live")}
                >
                  Explore Live Auctions
                </GlowButton>
              </div>
            </div>

            <div className="flex justify-center">
              <div className="relative grid h-72 w-72 place-items-center sm:h-80 sm:w-80">
                <div className="absolute h-full w-full animate-pulse rounded-full border border-white/10" />
                <div className="absolute h-56 w-56 animate-[spin_14s_linear_infinite] rounded-full border border-[#4F46E5]/60" />
                <div className="h-40 w-40 rounded-full bg-gradient-to-r from-[#7C3AED] via-[#4F46E5] to-[#EC4899] shadow-[0_0_80px_rgba(124,58,237,0.6)]" />
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-5">
          <SectionHeader
            title="System Intelligence"
            subtitle="Core AI layers powering decision speed and execution confidence."
          />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {intelligenceCards.map((card) => (
              <GlassCard key={card.title} className="p-5">
                <h3 className="text-lg font-semibold">{card.title}</h3>
                <p className="mt-2 text-sm text-slate-300">{card.desc}</p>
              </GlassCard>
            ))}
          </div>
        </section>

        <section className="space-y-5">
          <SectionHeader title="How It Works" subtitle="Realtime intelligence loop for every bid event." />
          <div className="grid gap-3 md:grid-cols-5">
            {steps.map((step, idx) => (
              <div
                key={step}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-3 text-center text-sm shadow-[0_0_20px_rgba(124,58,237,0.14)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_24px_rgba(124,58,237,0.24)]"
              >
                <span className="text-slate-300">{idx + 1}.</span> {step}
              </div>
            ))}
          </div>
        </section>

        <section className="pb-4 text-center">
          <GlassCard className="mx-auto max-w-2xl p-8" hover={false}>
            <h3 className="text-2xl font-semibold">Enter the Intelligence Layer</h3>
            <p className="mt-2 text-sm text-slate-400">Start with secure sign-in and launch into live AI bidding intelligence.</p>
            <GlowButton className="mt-6 w-full sm:w-auto" onClick={() => navigate("/login")}>
              Go to Login
            </GlowButton>
          </GlassCard>
        </section>
      </div>
    </div>
  );
}

