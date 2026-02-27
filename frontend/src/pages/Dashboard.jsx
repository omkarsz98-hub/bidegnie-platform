import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import GlassCard from "../components/GlassCard";
import HeatGauge from "../components/HeatGauge";
import SectionHeader from "../components/SectionHeader";
import ConfidenceBar from "../components/ConfidenceBar";

const easeOut = (t) => 1 - Math.pow(1 - t, 3);

export default function Dashboard() {
  const socket = useMemo(() => io("http://localhost:5000"), []);
  const role = localStorage.getItem("role");
  const userId = localStorage.getItem("userId");
  const feedRef = useRef(null);
  const animationRefs = useRef({});
  const previousTotalValue = useRef(0);

  const [stats, setStats] = useState({
    activeAuctions: 0,
    totalValue: 0,
    totalBids: 0,
    sellerRevenue: 0,
    sellerAverage: 0,
    sellerAuctionCount: 0,
    trend: "Stable"
  });
  const [activityFeed, setActivityFeed] = useState([]);
  const [recentBids, setRecentBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const statsRef = useRef(stats);

  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  })();

  const formatNumber = (value) =>
    typeof value === "number" ? value.toLocaleString() : "-";
  const formatCurrency = (value) =>
    value !== undefined && value !== null && !Number.isNaN(Number(value))
      ? `₹${Number(value).toLocaleString()}`
      : "-";

  const animateValue = useCallback((key, start, end, duration = 800) => {
    if (start === end) return;
    if (animationRefs.current[key]) cancelAnimationFrame(animationRefs.current[key]);

    let startTime = null;
    const step = (time) => {
      if (!startTime) startTime = time;
      const progress = Math.min((time - startTime) / duration, 1);
      const value = Math.floor(start + (end - start) * easeOut(progress));
      setStats((prev) => ({ ...prev, [key]: value }));
      if (progress < 1) animationRefs.current[key] = requestAnimationFrame(step);
    };

    animationRefs.current[key] = requestAnimationFrame(step);
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/auctions", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!data.success) return;

      const auctions = data.auctions || [];
      const activeAuctions = auctions.length;
      const totalValue = auctions.reduce((sum, a) => sum + (a.currentPrice || 0), 0);
      const totalBids = auctions.length * 3;

      let trend = "Stable";
      if (totalValue > previousTotalValue.current) trend = "Ascending";
      if (totalValue < previousTotalValue.current) trend = "Cooling";
      previousTotalValue.current = totalValue;

      const sellerAuctions = auctions.filter((a) => a.seller?._id === userId);
      const sellerRevenue = sellerAuctions.reduce((sum, a) => sum + (a.currentPrice || 0), 0);
      const sellerAverage = sellerAuctions.length ? Math.floor(sellerRevenue / sellerAuctions.length) : 0;

      animateValue("activeAuctions", statsRef.current.activeAuctions, activeAuctions);
      animateValue("totalValue", statsRef.current.totalValue, totalValue);
      animateValue("totalBids", statsRef.current.totalBids, totalBids);
      animateValue("sellerRevenue", statsRef.current.sellerRevenue, sellerRevenue);
      animateValue("sellerAverage", statsRef.current.sellerAverage, sellerAverage);
      animateValue("sellerAuctionCount", statsRef.current.sellerAuctionCount, sellerAuctions.length);
      setStats((prev) => ({ ...prev, trend }));
    } catch (error) {
      console.error("Dashboard fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, [animateValue, userId]);

  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  useEffect(() => {
    const currentUserId = localStorage.getItem("userId");
    if (socket.connected && currentUserId) {
      socket.emit("registerUser", currentUserId);
    }

    const onConnect = () => {
      if (currentUserId) {
        socket.emit("registerUser", currentUserId);
      }
    };

    fetchStats();

    const handleNewBid = (data) => {
      fetchStats();
      const bidderCustomerId = data?.bidderCustomerId || "BG------";
      const bidValue =
        data?.newPrice !== undefined && data?.newPrice !== null
          ? `₹${Number(data.newPrice).toLocaleString()}`
          : "-";

      setActivityFeed((prev) => [
        { message: `${bidderCustomerId} placed a bid ${bidValue}`, time: Date.now() },
        ...prev.slice(0, 24)
      ]);
      setRecentBids((prev) => [Date.now(), ...prev.filter((t) => Date.now() - t < 30000)]);
    };

    socket.on("connect", onConnect);
    socket.on("newBid", handleNewBid);
    return () => {
      socket.off("connect", onConnect);
      socket.off("newBid", handleNewBid);
    };
  }, [fetchStats, socket]);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [activityFeed]);

  useEffect(() => {
    return () => socket.disconnect();
  }, [socket]);

  const momentum = Math.min(stats.totalBids * 3, 100);
  const riskScore = Math.min(100, Math.max(15, recentBids.length * 12));
  const aiConfidence = Math.max(45, 100 - Math.min(55, recentBids.length * 6));

  return (
    <div className="space-y-6 text-slate-100">
      <SectionHeader
        title="AI Command Center"
        subtitle="Realtime bidding intelligence, risk posture, and performance telemetry."
        action={
          <div className="rounded-xl border border-white/10 bg-[#111827] px-3 py-2 text-sm text-slate-200">
            {user?.customerId || "BG------"}
          </div>
        }
      />

      {loading ? (
        <GlassCard className="p-8 text-slate-300" hover={false}>
          Loading command metrics...
        </GlassCard>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Metric title="Active Auctions" value={formatNumber(stats.activeAuctions)} />
            <Metric title="Total Market Volume" value={formatCurrency(stats.totalValue)} />
            <Metric title="Total Bids" value={formatNumber(stats.totalBids)} />
            <Metric title="Momentum Trend" value={stats.trend} />
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <GlassCard className="p-6 xl:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Live Activity Feed</h3>
                <span className="text-xs text-slate-400">Auto-scrolling stream</span>
              </div>
              <div ref={feedRef} className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {activityFeed.length === 0 ? (
                  <p className="text-sm text-slate-400">Awaiting incoming bids...</p>
                ) : (
                  activityFeed.map((item) => (
                    <div key={item.time} className="rounded-xl border border-white/10 bg-[#0F172A]/70 px-3 py-2 text-sm">
                      {item.message}
                    </div>
                  ))
                )}
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold">Market Heat</h3>
              <div className="mt-4 flex items-center justify-center">
                <HeatGauge value={momentum} label="Bid Pressure" size={128} />
              </div>
              <p className="mt-4 text-sm text-slate-400">Heat tracks active bid velocity across all live auctions.</p>
            </GlassCard>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold">AI Risk Summary</h3>
              <div className="mt-4 space-y-4">
                <div>
                  <p className="mb-2 text-sm text-slate-400">Exposure Score</p>
                  <ConfidenceBar value={riskScore} />
                </div>
                <div>
                  <p className="mb-2 text-sm text-slate-400">Model Confidence</p>
                  <ConfidenceBar value={aiConfidence} />
                </div>
                <p className="text-sm text-slate-400">
                  Risk indexing updates from live socket activity and active auction concentration.
                </p>
              </div>
            </GlassCard>

            {role === "seller" ? (
              <GlassCard className="p-6">
                <h3 className="text-lg font-semibold">Seller Performance</h3>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <MetricSmall title="Auctions Created" value={formatNumber(stats.sellerAuctionCount)} />
                  <MetricSmall title="Seller Revenue" value={formatCurrency(stats.sellerRevenue)} />
                  <MetricSmall title="Avg Sale Value" value={formatCurrency(stats.sellerAverage)} />
                  <MetricSmall title="Trend" value={stats.trend} />
                </div>
              </GlassCard>
            ) : (
              <GlassCard className="p-6">
                <h3 className="text-lg font-semibold">Execution Note</h3>
                <p className="mt-3 text-sm text-slate-400">
                  Bidder mode is active. Use live auctions for AI-guided bid placement and real-time risk feedback.
                </p>
              </GlassCard>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Metric({ title, value }) {
  return (
    <GlassCard className="p-5">
      <p className="text-xs uppercase tracking-wide text-slate-400">{title}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </GlassCard>
  );
}

function MetricSmall({ title, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0F172A]/70 p-3 transition-all duration-300 hover:border-[#7C3AED]/40">
      <p className="text-xs text-slate-400">{title}</p>
      <p className="mt-1 text-lg font-medium">{value}</p>
    </div>
  );
}

