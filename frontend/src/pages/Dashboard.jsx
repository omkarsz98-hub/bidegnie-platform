import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import GlassCard from "../components/GlassCard";
import HeatGauge from "../components/HeatGauge";
import SectionHeader from "../components/SectionHeader";
import ConfidenceBar from "../components/ConfidenceBar";

const easeOut = (t) => 1 - Math.pow(1 - t, 3);

export default function Dashboard() {
  const navigate = useNavigate();
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
    bidderEngagedAuctions: 0,
    bidderCommittedValue: 0,
    trend: "Stable"
  });
  const [activityFeed, setActivityFeed] = useState([]);
  const [recentBids, setRecentBids] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [aiTelemetry, setAiTelemetry] = useState({ riskScore: 15, confidence: 95 });
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

  const fetchStats = useCallback(async (isInitial = false) => {
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

      const bidsPromises = auctions.slice(0, 15).map(async (auction) => {
        const bRes = await fetch(`http://localhost:5000/api/auctions/bids/${auction._id}`, {
           headers: { Authorization: `Bearer ${token}` }
        });
        const bData = await bRes.json();
        return (bData?.bids || []).map(b => ({
           ...b, 
           auctionName: auction.productName || auction.title || "Unknown Asset"
        }));
      });
      
      const allBidsArrays = await Promise.all(bidsPromises);
      const globalBids = allBidsArrays.flat().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const totalBids = globalBids.length;

      let trend = "Stable";
      if (totalValue > previousTotalValue.current) trend = "Ascending";
      if (totalValue < previousTotalValue.current) trend = "Cooling";
      previousTotalValue.current = totalValue;

      const sellerAuctions = auctions.filter((a) => a.seller?._id === userId);
      const sellerRevenue = sellerAuctions.reduce((sum, a) => sum + (a.currentPrice || 0), 0);
      const sellerAverage = sellerAuctions.length ? Math.floor(sellerRevenue / sellerAuctions.length) : 0;

      const myBids = globalBids.filter(b => b.bidder?._id === userId || b.bidder === userId);
      const engagedAuctionIds = [...new Set(myBids.map(b => b.auction))];
      const bidderEngagedAuctions = engagedAuctionIds.length;
      
      const myEngagedAuctions = auctions.filter(a => engagedAuctionIds.includes(a._id));
      if (isInitial) setWatchlist(myEngagedAuctions.slice(0, 3));

      let bidderCommittedValue = 0;
      myEngagedAuctions.forEach(a => {
         if (a.winner === userId || a.winner?._id === userId) {
            bidderCommittedValue += (a.currentPrice || 0);
         }
      });

      animateValue("activeAuctions", statsRef.current.activeAuctions, activeAuctions);
      animateValue("totalValue", statsRef.current.totalValue, totalValue);
      animateValue("totalBids", statsRef.current.totalBids, totalBids);
      animateValue("sellerRevenue", statsRef.current.sellerRevenue, sellerRevenue);
      animateValue("sellerAverage", statsRef.current.sellerAverage, sellerAverage);
      animateValue("sellerAuctionCount", statsRef.current.sellerAuctionCount, sellerAuctions.length);
      animateValue("bidderEngagedAuctions", statsRef.current.bidderEngagedAuctions, bidderEngagedAuctions);
      animateValue("bidderCommittedValue", statsRef.current.bidderCommittedValue, bidderCommittedValue);
      setStats((prev) => ({ ...prev, trend }));

      if (isInitial) {
         setActivityFeed(globalBids.slice(0, 24).map(b => ({
            id: b._id || b.createdAt,
            auctionId: b.auction,
            message: `${b.bidder?.customerId || "BG------"} placed a bid ₹${Number(b.amount).toLocaleString()} on ${b.auctionName}`,
            time: new Date(b.createdAt).getTime()
         })));
         
         const cutOff = Date.now() - (2 * 60 * 60 * 1000);
         const recent = globalBids.filter(b => new Date(b.createdAt).getTime() > cutOff);
         setRecentBids(recent.map(b => new Date(b.createdAt).getTime()));
      }

      // Feature 4: Real AI/ML telemetry call for the hottest auction
      if (auctions.length > 0) {
        const hottest = auctions.reduce((prev, current) => {
          const prevBids = globalBids.filter(b => b.auction === prev._id).length;
          const currBids = globalBids.filter(b => b.auction === current._id).length;
          return (currBids > prevBids) ? current : prev;
        });
        
        try {
          const timeRemaining = Math.max(1, (new Date(hottest.endTime).getTime() - Date.now()) / 1000);
          const bidVel = Math.max(1, globalBids.filter(b => b.auction === hottest._id).length / timeRemaining);
          const mlRes = await fetch("http://localhost:5001/predict-fraud", {
             method: "POST", headers: { "Content-Type": "application/json" },
             body: JSON.stringify({
                current_price: hottest.currentPrice,
                starting_price: hottest.startingPrice,
                time_remaining: timeRemaining,
                bid_velocity: bidVel,
                category: hottest.category,
                product_name: hottest.productName
             })
          });
          const mlData = await mlRes.json();
          if (mlData.fraud_probability !== undefined) {
             setAiTelemetry({ 
                riskScore: Math.round(mlData.fraud_probability * 100), 
                confidence: Math.round(Math.max(45, 100 - mlData.fraud_probability * 50))
             });
          }
        } catch (mlErr) { 
           // Handled gracefully, fall back to default
        }
      }
      
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

    fetchStats(true);

    const handleNewBid = (data) => {
      fetchStats(false);
      const bidderCustomerId = data?.bidderCustomerId || "BG------";
      const bidValue =
        data?.newPrice !== undefined && data?.newPrice !== null
          ? `₹${Number(data.newPrice).toLocaleString()}`
          : "-";

      setActivityFeed((prev) => [
        { 
          id: Date.now().toString(), 
          auctionId: data?.auctionId, 
          message: `${bidderCustomerId} placed a bid ${bidValue}`, 
          time: Date.now() 
        },
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
    if (socket.disconnected) {
      socket.connect();
    }
    return () => socket.disconnect();
  }, [socket]);

  const momentum = Math.min(stats.totalBids * 3, 100);

  return (
    <div className="space-y-6 text-slate-100">
      <SectionHeader
        title="AI Command Center"
        subtitle="Realtime bidding intelligence, risk posture, and performance telemetry."
        action={
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end justify-center rounded-xl border border-white/10 bg-[#0F172A] px-4 py-1.5 text-right">
               <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Market Vol</span>
               <span className="text-sm font-bold text-emerald-400">{formatCurrency(stats.totalValue)}</span>
            </div>
            <button 
               onClick={() => navigate("/wallet")}
               className="flex flex-col items-end justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 text-right transition-all hover:bg-emerald-500/20"
            >
               <span className="text-[10px] uppercase tracking-wider text-emerald-500/70 font-semibold">Funds</span>
               <span className="text-sm font-bold text-emerald-400">{formatCurrency(user?.walletBalance)}</span>
            </button>
            <button 
               onClick={() => navigate("/settings")}
               className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#111827] px-4 py-3 text-sm text-slate-200 transition-all hover:bg-white/5"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              <span className="hidden sm:inline">{user?.customerId || "BG------"}</span>
            </button>
          </div>
        }
      />

      {loading ? (
        <GlassCard className="p-8 text-slate-300" hover={false}>
          Loading command metrics...
        </GlassCard>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Metric 
               title="Active Auctions" 
               value={formatNumber(stats.activeAuctions)} 
               onClick={() => navigate('/live')} 
            />
            {role !== 'seller' ? (
               <Metric 
                  title="My Engaged Auctions" 
                  value={formatNumber(stats.bidderEngagedAuctions)} 
                  onClick={() => navigate('/analytics')} 
               />
            ) : (
               <Metric title="Total Bids" value={formatNumber(stats.totalBids)} />
            )}
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <GlassCard className="p-6 xl:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Live Activity Feed</h3>
                <span className="text-xs text-slate-400">Interactive stream</span>
              </div>
              <div ref={feedRef} className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {activityFeed.length === 0 ? (
                  <p className="text-sm text-slate-400">Awaiting incoming bids...</p>
                ) : (
                  activityFeed.map((item) => (
                    item.auctionId ? (
                      <Link 
                        key={item.id + item.time} 
                        to={`/auction/${item.auctionId}`}
                        className="block rounded-xl border border-white/10 bg-[#0F172A]/70 px-3 py-2 text-sm hover:bg-[#1E293B] hover:border-[#7C3AED]/50 transition-all cursor-pointer shadow-sm"
                      >
                        {item.message}
                      </Link>
                    ) : (
                      <div key={item.id + item.time} className="rounded-xl border border-white/10 bg-[#0F172A]/70 px-3 py-2 text-sm">
                        {item.message}
                      </div>
                    )
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

          <div className="grid gap-6 xl:grid-cols-1">
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
                <div className="flex justify-between items-center mb-4">
                   <h3 className="text-lg font-semibold">My Watchlist</h3>
                   <span className="text-xs text-[#7C3AED] bg-[#7C3AED]/10 px-2 py-1 rounded font-mono font-medium">Escrow Locked: {formatCurrency(stats.bidderCommittedValue)}</span>
                </div>
                <div className="space-y-3 mt-4">
                   {watchlist.length === 0 ? (
                      <p className="text-sm text-slate-400">You haven't engaged in any active auctions yet. Start bidding to track them here!</p>
                   ) : (
                      watchlist.map(auction => {
                         const isWinning = auction.winner === userId || auction.winner?._id === userId;
                         return (
                           <div key={auction._id} onClick={() => navigate(`/auction/${auction._id}`)} className="flex justify-between items-center bg-[#0F172A]/70 rounded-xl border border-white/10 p-3 hover:border-[#7C3AED]/50 cursor-pointer transition-all shadow-sm group">
                              <div>
                                 <p className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors line-clamp-1">{auction.productName || auction.title}</p>
                                 <p className="text-xs font-semibold tracking-wide mt-0.5">
                                    {isWinning ? <span className="text-emerald-400">WINNING</span> : <span className="text-rose-400">OUTBID</span>}
                                 </p>
                              </div>
                              <div className="text-right ml-4">
                                 <p className="text-sm font-bold text-white tracking-tight">₹{auction.currentPrice?.toLocaleString()}</p>
                              </div>
                           </div>
                         );
                      })
                   )}
                </div>
              </GlassCard>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Metric({ title, value, onClick }) {
  return (
    <div onClick={onClick} className={onClick ? 'cursor-pointer group' : ''}>
      <GlassCard className={`p-5 ${onClick ? 'transition-all duration-300 group-hover:border-[#7C3AED]/50 group-hover:shadow-[0_0_20px_rgba(124,58,237,0.15)]' : ''}`}>
        <p className="text-xs uppercase tracking-wide text-slate-400 group-hover:text-slate-300 transition-colors">{title}</p>
        <p className="mt-2 text-2xl font-semibold group-hover:text-emerald-400 transition-colors">{value}</p>
      </GlassCard>
    </div>
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


