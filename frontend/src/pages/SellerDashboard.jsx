import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import GlassCard from "../components/GlassCard";
import SectionHeader from "../components/SectionHeader";
import GlowButton from "../components/GlowButton";

export default function SellerDashboard() {
  const socket = useMemo(() => io("http://localhost:5000"), []);
  const navigate = useNavigate();
  const userId = localStorage.getItem("userId");
  const [loading, setLoading] = useState(true);
  const [auctions, setAuctions] = useState([]);
  const [now, setNow] = useState(Date.now());
  const [toast, setToast] = useState("");
  const [riskPanel, setRiskPanel] = useState({
    suspiciousBidCount: 0,
    fraudFlaggedBids: 0,
    botActivityPct: 0,
    avgAiConfidence: 0
  });

  const formatCurrency = (value) =>
    value !== undefined && value !== null && !Number.isNaN(Number(value))
      ? `₹${Number(value).toLocaleString()}`
      : "-";

  const formatRemaining = (endTime) => {
    const diff = Math.max(0, new Date(endTime).getTime() - now);
    if (diff <= 0) return "Auction Ended";
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);
    return `Ends in: ${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
  };

  const load = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/auctions?seller=currentUser", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      const list = json?.auctions || [];

      const enriched = await Promise.all(
        list.map(async (auction) => {
          const bidsRes = await fetch(`http://localhost:5000/api/auctions/bids/${auction._id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const bidsJson = await bidsRes.json();
          const bids = bidsJson?.bids || [];

          const aiRiskScore = auction?.isSuspicious ? 82 : Math.min(65, bids.length * 6);
          const botBids = bids.filter((b) => b?.bidder?.role === "bot").length;

          return {
            ...auction,
            bidCount: bids.length,
            aiRiskScore,
            botBids,
            computedStatus:
              auction.status === "live" && new Date(auction.endTime) <= new Date()
                ? "ended"
                : auction.status
          };
        })
      );

      const suspiciousBidCount = enriched.reduce((sum, a) => sum + (a.aiRiskScore > 60 ? 1 : 0), 0);
      const fraudFlaggedBids = enriched.filter((a) => a.isSuspicious).length;
      const totalBids = enriched.reduce((sum, a) => sum + (a.bidCount || 0), 0);
      const botBids = enriched.reduce((sum, a) => sum + (a.botBids || 0), 0);
      const avgAiConfidence = enriched.length
        ? Math.max(50, 100 - Math.floor(suspiciousBidCount * 8))
        : 0;

      setAuctions(enriched);
      setRiskPanel({
        suspiciousBidCount,
        fraudFlaggedBids,
        botActivityPct: totalBids ? Math.round((botBids / totalBids) * 100) : 0,
        avgAiConfidence
      });
    } catch (error) {
      console.error("Seller dashboard load error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const ticker = setInterval(() => setNow(Date.now()), 1000);

    if (socket.connected && userId) {
      socket.emit("registerUser", userId);
    }

    const onConnect = () => {
      if (userId) socket.emit("registerUser", userId);
    };

    const onAuctionEnd = (payload) => {
      setToast(`Your auction has ended. Winner: ${payload?.winnerCustomerId || "BG------"}. Final Price: ${formatCurrency(payload?.finalPrice)}`);
      setTimeout(() => setToast(""), 5000);
      load();
    };

    socket.on("connect", onConnect);
    socket.on("sellerAuctionEnded", onAuctionEnd);

    return () => {
      clearInterval(ticker);
      socket.off("connect", onConnect);
      socket.off("sellerAuctionEnded", onAuctionEnd);
    };
  }, [userId, socket]);

  useEffect(() => {
    return () => socket.disconnect();
  }, [socket]);

  const stats = useMemo(() => {
    const totalAuctionsCreated = auctions.length;
    const activeAuctions = auctions.filter((a) => a.computedStatus === "live").length;
    const totalRevenue = auctions
      .filter((a) => a.computedStatus === "ended")
      .reduce((sum, a) => sum + Number(a.currentPrice || 0), 0);
    const totalBidsReceived = auctions.reduce((sum, a) => sum + Number(a.bidCount || 0), 0);
    return { totalAuctionsCreated, activeAuctions, totalRevenue, totalBidsReceived };
  }, [auctions]);

  return (
    <div className="space-y-6 text-slate-100">
      <SectionHeader
        title="Seller Dashboard"
        subtitle="Auction performance, risk telemetry, and live timing control."
        action={<GlowButton onClick={() => navigate("/create")}>Create Auction</GlowButton>}
      />

      {toast ? (
        <GlassCard className="p-4" hover={false}>
          {toast}
        </GlassCard>
      ) : null}

      {loading ? (
        <GlassCard className="p-6" hover={false}>
          Loading seller analytics...
        </GlassCard>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Metric title="Total Auctions Created" value={String(stats.totalAuctionsCreated)} />
            <Metric title="Active Auctions" value={String(stats.activeAuctions)} />
            <Metric title="Total Revenue" value={formatCurrency(stats.totalRevenue)} />
            <Metric title="Total Bids Received" value={String(stats.totalBidsReceived)} />
          </div>

          <GlassCard className="p-6 bg-[#111827]/70 border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.5)]" hover={false}>
            <h3 className="text-lg font-semibold">AI Risk Panel</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricSmall title="Suspicious bid count" value={String(riskPanel.suspiciousBidCount)} />
              <MetricSmall title="Fraud flagged bids" value={String(riskPanel.fraudFlaggedBids)} />
              <MetricSmall title="Bot activity %" value={`${riskPanel.botActivityPct}%`} />
              <MetricSmall title="Avg AI confidence" value={`${riskPanel.avgAiConfidence}%`} />
            </div>
          </GlassCard>

          <GlassCard className="p-6 bg-[#111827]/70 border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.5)]" hover={false}>
            <h3 className="text-lg font-semibold">Auction Performance</h3>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-[900px] w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-400 border-b border-white/10">
                    <th className="py-3 pr-3">Product Name</th>
                    <th className="py-3 pr-3">Current Price</th>
                    <th className="py-3 pr-3">Total Bids</th>
                    <th className="py-3 pr-3">AI Risk Score</th>
                    <th className="py-3 pr-3">Time Remaining</th>
                    <th className="py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {auctions.map((auction) => (
                    <tr key={auction._id} className="border-b border-white/5">
                      <td className="py-3 pr-3">{auction.productName || auction.title || "-"}</td>
                      <td className="py-3 pr-3">{formatCurrency(auction.currentPrice)}</td>
                      <td className="py-3 pr-3">{auction.bidCount || 0}</td>
                      <td className="py-3 pr-3">{auction.aiRiskScore}%</td>
                      <td className="py-3 pr-3">{formatRemaining(auction.endTime)}</td>
                      <td className="py-3">
                        {auction.computedStatus === "ended" ? (
                          <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-xs">Ended</span>
                        ) : (
                          <span className="bg-[#7C3AED]/20 text-[#c4b5fd] px-3 py-1 rounded-full text-xs">Live</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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

function MetricSmall({ title, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0F172A]/70 p-3">
      <p className="text-xs text-slate-400">{title}</p>
      <p className="mt-1 text-lg font-medium">{value}</p>
    </div>
  );
}
