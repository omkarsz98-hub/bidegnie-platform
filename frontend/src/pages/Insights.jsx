import { useEffect, useMemo, useState } from "react";
import GlassCard from "../components/GlassCard";
import SectionHeader from "../components/SectionHeader";
import ConfidenceBar from "../components/ConfidenceBar";

export default function Insights() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    avgConfidence: 0,
    recentFraudScore: 0,
    autoBidRecommendation: 0,
    botActivityCount: 0
  });
  const [predictions, setPredictions] = useState([]);

  useEffect(() => {
    const run = async () => {
      try {
        const token = localStorage.getItem("token");
        const auctionRes = await fetch("http://localhost:5000/api/auctions", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const auctionJson = await auctionRes.json();
        const auctions = (auctionJson?.auctions || []).slice(0, 8);

        const perAuction = await Promise.all(
          auctions.map(async (auction) => {
            const [suggestRes, bidsRes] = await Promise.all([
              fetch(`http://localhost:5000/api/auctions/suggest/${auction._id}`, {
                headers: { Authorization: `Bearer ${token}` }
              }).then((r) => r.json()),
              fetch(`http://localhost:5000/api/auctions/bids/${auction._id}`, {
                headers: { Authorization: `Bearer ${token}` }
              }).then((r) => r.json())
            ]);

            const suggestion = suggestRes?.aiPrediction || suggestRes?.modelResponse || null;
            const bids = bidsRes?.bids || [];
            const fallbackConfidence = 0.65;
            const fallbackFraud = Math.min(0.9, bids.length / 20);

            return {
              auctionId: auction._id,
              title: auction.title,
              currentPrice: auction.currentPrice,
              suggestedBid: suggestRes?.suggestedBid ?? auction.currentPrice,
              confidence: suggestion?.confidence ?? fallbackConfidence,
              fraud: suggestion?.fraud_probability ?? fallbackFraud,
              botBids: bids.filter((b) => b?.bidder?.role === "bot").length
            };
          })
        );

        const count = perAuction.length || 1;
        const avgConfidence = perAuction.reduce((s, x) => s + x.confidence, 0) / count;
        const recentFraudScore = perAuction.reduce((s, x) => s + x.fraud, 0) / count;
        const autoBidRecommendation =
          perAuction.reduce((s, x) => s + Number(x.suggestedBid || 0), 0) / count;
        const botActivityCount = perAuction.reduce((s, x) => s + x.botBids, 0);

        setMetrics({
          avgConfidence,
          recentFraudScore,
          autoBidRecommendation,
          botActivityCount
        });
        setPredictions(perAuction.slice(0, 5));
      } catch (error) {
        console.error("Insights load error:", error);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const confidencePct = useMemo(() => Math.floor((metrics.avgConfidence || 0) * 100), [metrics.avgConfidence]);
  const fraudPct = useMemo(() => Math.floor((metrics.recentFraudScore || 0) * 100), [metrics.recentFraudScore]);

  return (
    <div className="space-y-6 text-slate-100">
      <SectionHeader
        title="AI Insights"
        subtitle="Operational ML signals from live auction and bid activity."
      />

      {loading ? (
        <GlassCard className="p-6" hover={false}>
          Loading AI insights...
        </GlassCard>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Metric title="Average AI Confidence" value={`${confidencePct}%`} />
            <Metric title="Recent Fraud Score" value={`${fraudPct}%`} />
            <Metric
              title="AutoBid Recommendation"
              value={`₹${Number(metrics.autoBidRecommendation || 0).toLocaleString()}`}
            />
            <Metric title="Bot Activity Count" value={String(metrics.botActivityCount)} />
          </div>

          <GlassCard className="p-6" hover={false}>
            <p className="text-sm text-slate-400">Model Confidence</p>
            <ConfidenceBar value={confidencePct} className="mt-2" />
          </GlassCard>

          <GlassCard className="p-6" hover={false}>
            <h3 className="text-lg font-semibold">Last 5 ML Predictions</h3>
            <div className="mt-4 space-y-2">
              {predictions.length === 0 ? (
                <p className="text-sm text-slate-400">No predictions available.</p>
              ) : (
                predictions.map((pred) => (
                  <div
                    key={pred.auctionId}
                    className="rounded-xl border border-white/10 bg-[#111827]/70 p-3 shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
                  >
                    <p className="font-medium">{pred.title}</p>
                    <p className="mt-1 text-sm text-slate-300">
                      Suggested: ₹{Number(pred.suggestedBid || 0).toLocaleString()} | Confidence:{" "}
                      {Math.floor((pred.confidence || 0) * 100)}%
                    </p>
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        </>
      )}
    </div>
  );
}

function Metric({ title, value }) {
  return (
    <GlassCard className="p-5 bg-[#111827]/70 border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
      <p className="text-sm text-slate-400">{title}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </GlassCard>
  );
}

