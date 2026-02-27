import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import GlassCard from "../components/GlassCard";
import GlowButton from "../components/GlowButton";
import ConfidenceBar from "../components/ConfidenceBar";
import HeatGauge from "../components/HeatGauge";
import SectionHeader from "../components/SectionHeader";

export default function AuctionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const storedUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  })();
  const role = storedUser?.role || localStorage.getItem("role");
  const socket = useMemo(() => io("http://localhost:5000"), []);

  const [auction, setAuction] = useState(null);
  const [bidAmount, setBidAmount] = useState("");
  const [bidHistory, setBidHistory] = useState([]);
  const [aiData, setAiData] = useState(null);
  const [overWarning, setOverWarning] = useState(false);
  const [autoBidBudget, setAutoBidBudget] = useState("");
  const [autoBidInfo, setAutoBidInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingAI, setLoadingAI] = useState(true);
  const [typedText, setTypedText] = useState("");
  const [expandedInsights, setExpandedInsights] = useState(true);
  const [pulse, setPulse] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [tickRemaining, setTickRemaining] = useState(null);
  const [overpriceAlert, setOverpriceAlert] = useState(null);
  const [overrideLock, setOverrideLock] = useState(false);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [shortfallAmount, setShortfallAmount] = useState(0);
  const [isRecalculatingProjection, setIsRecalculatingProjection] = useState(false);
  const [displayProjectedPrice, setDisplayProjectedPrice] = useState(null);
  const [projectionDirection, setProjectionDirection] = useState(null);

  const previousPrice = useRef(null);
  const previousProjectedRef = useRef(null);
  const projectionAnimationRef = useRef(null);
  const newestBidId = bidHistory?.[0]?._id;

  const formatCurrency = (value) =>
    value !== undefined && value !== null && !Number.isNaN(Number(value))
      ? `₹${Number(value).toLocaleString()}`
      : "-";

  function getRelativeTime(dateString) {
    const seconds = Math.floor((Date.now() - new Date(dateString)) / 1000);
    if (seconds < 5) return "Just now";
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return new Date(dateString).toLocaleTimeString();
  }

  const getCountdown = (endTime) => {
    const diff = Math.max(0, new Date(endTime).getTime() - now);
    if (diff <= 0) return "Auction Ended";
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);
    return `Ends in: ${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
  };

  const fetchAll = useCallback(async () => {
    try {
      setLoadingAI(true);
      const token = localStorage.getItem("token");
      const isBidder = role === "bidder";

      const baseRequests = [
        fetch(`http://localhost:5000/api/auctions/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`http://localhost:5000/api/auctions/bids/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ];

      const bidderOnlyRequests = isBidder
        ? [
            fetch(`http://localhost:5000/api/auctions/suggest/${id}`, {
              headers: { Authorization: `Bearer ${token}` }
            }),
            fetch(`http://localhost:5000/api/auctions/autobid/${id}`, {
              headers: { Authorization: `Bearer ${token}` }
            })
          ]
        : [];

      const responses = await Promise.all([...baseRequests, ...bidderOnlyRequests]);
      const [auctionRes, bidRes, aiRes, autoRes] = responses;

      const auctionData = await auctionRes.json();
      const bidData = await bidRes.json();

      if (auctionData.success) {
        setAuction(auctionData.auction);
        previousPrice.current = auctionData.auction.currentPrice;
      }
      if (bidData.success) setBidHistory(bidData.bids);

      if (isBidder) {
        const aiDataRes = await aiRes.json();
        const autoData = await autoRes.json();
        if (aiDataRes.success) setAiData(aiDataRes.aiPrediction);
        if (autoData.success) setAutoBidInfo(autoData.autoBid);
      } else {
        setAiData(null);
        setAutoBidInfo(null);
      }
    } catch (err) {
      console.error("Fetch all error:", err);
    } finally {
      setLoadingAI(false);
      setLoading(false);
    }
  }, [id, role]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    const fullText = "BidGenie intelligence stream is analyzing live market patterns...";
    if (!loadingAI) {
      setTypedText(fullText);
      return;
    }

    let i = 0;
    setTypedText("");
    const timer = setInterval(() => {
      i += 1;
      setTypedText(fullText.slice(0, i));
      if (i >= fullText.length) clearInterval(timer);
    }, 24);

    return () => clearInterval(timer);
  }, [loadingAI]);

  useEffect(() => {
    const currentUserId = localStorage.getItem("userId");
    if (socket.connected && currentUserId) {
      socket.emit("registerUser", currentUserId);
    }

    const onConnect = () => {
      if (currentUserId) socket.emit("registerUser", currentUserId);
    };

    const handleNewBid = (data) => {
      if (String(data?.auctionId) !== String(id)) return;

      setAuction((prev) => {
        if (!prev) return prev;
        if (previousPrice.current !== data.newPrice) {
          setPulse(true);
          setTimeout(() => setPulse(false), 420);
        }
        previousPrice.current = data.newPrice;
        return { ...prev, currentPrice: data.newPrice };
      });

      if (role === "bidder") {
        setIsRecalculatingProjection(true);
      }
      fetchAll();
    };

    const handleAuctionEnded = () => fetchAll();
    const handleAuctionTick = (data) => {
      if (String(data?.auctionId) !== String(id)) return;
      setTickRemaining(Number(data.timeRemaining || 0));
    };

    socket.on("connect", onConnect);
    socket.on("newBid", handleNewBid);
    socket.on("auctionEnded", handleAuctionEnded);
    socket.on("auctionTick", handleAuctionTick);

    return () => {
      socket.off("connect", onConnect);
      socket.off("newBid", handleNewBid);
      socket.off("auctionEnded", handleAuctionEnded);
      socket.off("auctionTick", handleAuctionTick);
    };
  }, [id, fetchAll, role, socket]);

  useEffect(() => {
    return () => socket.disconnect();
  }, [socket]);

  const placeBid = async (confirmOverride = false) => {
    try {
      const token = localStorage.getItem("token");
      const numericBidAmount = Number(bidAmount);
      const res = await fetch("http://localhost:5000/api/auctions/bid", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          auctionId: id,
          amount: numericBidAmount,
          confirmOverride
        })
      });

      const data = await res.json();
      const errorMessage = String(data?.message || "");
      const lowerMessage = errorMessage.toLowerCase();
      if (!res.ok && (lowerMessage.includes("insufficient") || lowerMessage.includes("balance"))) {
        const walletBalance = Number(storedUser?.walletBalance || 0);
        setShortfallAmount(Math.max(0, numericBidAmount - walletBalance));
        setShowBalanceModal(true);
        return;
      }

      if (data?.overpriceWarning === true) {
        setExpandedInsights(true);
        setOverpriceAlert(data);
        if (data.level === "extreme") {
          setOverrideLock(true);
          setTimeout(() => setOverrideLock(false), 2000);
        }
        return;
      }

      setOverpriceAlert(null);
      setOverWarning(data.overbiddingWarning || false);
      setBidAmount("");
      setShowBalanceModal(false);
    } catch (err) {
      const apiMessage = String(err?.response?.data?.message || "").toLowerCase();
      if (apiMessage.includes("insufficient") || apiMessage.includes("balance")) {
        const walletBalance = Number(storedUser?.walletBalance || 0);
        const numericBidAmount = Number(bidAmount);
        setShortfallAmount(Math.max(0, numericBidAmount - walletBalance));
        setShowBalanceModal(true);
      }
      console.error("Bid error:", err);
    }
  };

  const activateAutoBid = async () => {
    try {
      const token = localStorage.getItem("token");
      await fetch("http://localhost:5000/api/auctions/autobid", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          auctionId: id,
          maxBudget: Number(autoBidBudget)
        })
      });
      setAutoBidBudget("");
      fetchAll();
    } catch (err) {
      console.error("Activate auto bid error:", err);
    }
  };

  const disableAutoBid = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:5000/api/auctions/autobid/${id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        setAutoBidInfo(null);
      }
      fetchAll();
    } catch (err) {
      console.error("Disable auto bid error:", err);
    }
  };

  const projectedFinalPrice = Number(aiData?.predicted_final_price);
  const winningProbabilityRatio = Number(aiData?.winning_probability_ratio);
  const fraudProbability = Number(aiData?.fraud_probability);
  const confidenceScore = Number(aiData?.confidence_score);

  const projectedFinalPriceValue = Number.isFinite(projectedFinalPrice)
    ? projectedFinalPrice
    : null;
  const winningProbabilityPct = Number.isFinite(winningProbabilityRatio)
    ? winningProbabilityRatio * 100
    : null;
  const fraudRiskPct = Number.isFinite(fraudProbability)
    ? fraudProbability * 100
    : null;
  const modelConfidencePct = Number.isFinite(confidenceScore)
    ? confidenceScore * 100
    : null;
  const normalizedConfidencePct =
    modelConfidencePct === null
      ? 0
      : Math.max(0, Math.min(100, modelConfidencePct));
  const marketGap = projectedFinalPriceValue === null
    ? null
    : projectedFinalPriceValue - Number(auction?.currentPrice || 0);
  const fraudRiskLabel =
    fraudRiskPct === null
      ? "-"
      : fraudRiskPct <= 20
      ? "Low"
      : fraudRiskPct <= 50
      ? "Moderate"
      : "High";

  useEffect(() => {
    if (projectionAnimationRef.current) {
      cancelAnimationFrame(projectionAnimationRef.current);
      projectionAnimationRef.current = null;
    }

    if (projectedFinalPriceValue === null) {
      setDisplayProjectedPrice(null);
      setProjectionDirection(null);
      previousProjectedRef.current = null;
      return;
    }

    const previousProjected = previousProjectedRef.current;
    if (previousProjected === null) {
      setDisplayProjectedPrice(projectedFinalPriceValue);
      setProjectionDirection(null);
      previousProjectedRef.current = projectedFinalPriceValue;
      return;
    }

    if (previousProjected === projectedFinalPriceValue) {
      setDisplayProjectedPrice(projectedFinalPriceValue);
      setProjectionDirection(null);
      previousProjectedRef.current = projectedFinalPriceValue;
      return;
    }

    setProjectionDirection(projectedFinalPriceValue > previousProjected ? "up" : "down");
    const startValue = previousProjected;
    const targetValue = projectedFinalPriceValue;
    const durationMs = 300;
    const startTime = performance.now();

    const animate = (nowMs) => {
      const progress = Math.min((nowMs - startTime) / durationMs, 1);
      const nextValue = startValue + (targetValue - startValue) * progress;
      setDisplayProjectedPrice(nextValue);

      if (progress < 1) {
        projectionAnimationRef.current = requestAnimationFrame(animate);
      } else {
        previousProjectedRef.current = targetValue;
      }
    };

    projectionAnimationRef.current = requestAnimationFrame(animate);

    return () => {
      if (projectionAnimationRef.current) {
        cancelAnimationFrame(projectionAnimationRef.current);
        projectionAnimationRef.current = null;
      }
    };
  }, [projectedFinalPriceValue]);

  useEffect(() => {
    if (!isRecalculatingProjection) return;
    if (projectedFinalPriceValue === null && loadingAI) return;
    setIsRecalculatingProjection(false);
  }, [isRecalculatingProjection, projectedFinalPriceValue, loadingAI]);
  const sellerProjectedPrice = projectedFinalPriceValue;
  const sellerRangeMin =
    Number.isFinite(sellerProjectedPrice) && sellerProjectedPrice > 0
      ? sellerProjectedPrice * 0.95
      : null;
  const sellerRangeMax =
    Number.isFinite(sellerProjectedPrice) && sellerProjectedPrice > 0
      ? sellerProjectedPrice * 1.05
      : null;
  const growthPct = (() => {
    const start = Number(auction?.startingPrice || 0);
    const current = Number(auction?.currentPrice || 0);
    if (!Number.isFinite(start) || start <= 0 || !Number.isFinite(current)) return null;
    return ((current - start) / start) * 100;
  })();
  const uniqueParticipants = new Set(
    (bidHistory || []).map((bid) => bid?.bidder?._id || bid?.bidder?.customerId).filter(Boolean)
  ).size;
  const recentBidCount = (bidHistory || []).filter((bid) => {
    const ts = new Date(bid?.createdAt || 0).getTime();
    return Number.isFinite(ts) && Date.now() - ts <= 10 * 60 * 1000;
  }).length;
  const momentumLabel =
    recentBidCount > 5 ? "High Activity" : recentBidCount >= 2 ? "Moderate Activity" : "Low Activity";

  if (loading || !auction) {
    return <GlassCard className="p-8 text-slate-300">Loading auction data...</GlassCard>;
  }

  const isEnded =
    auction?.status === "ended" ||
    (auction?.status === "live" && new Date(auction?.endTime).getTime() <= now);
  const tickDisplay = (() => {
    if (tickRemaining === null) return getCountdown(auction?.endTime);
    if (tickRemaining <= 0) return "Auction Ended";
    const h = Math.floor(tickRemaining / 3600);
    const m = Math.floor((tickRemaining % 3600) / 60);
    const s = tickRemaining % 60;
    return `Ends in: ${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
  })();
  const isSeller = role === "seller";
  const alertTone =
    overpriceAlert?.level === "extreme"
      ? "border-red-400/60 bg-red-500/10 shadow-[0_0_30px_rgba(248,113,113,0.35)]"
      : overpriceAlert?.level === "strong"
      ? "border-[#EC4899]/60 bg-[#EC4899]/10 shadow-[0_0_30px_rgba(236,72,153,0.35)]"
      : "border-[#7C3AED]/60 bg-[#7C3AED]/10 shadow-[0_0_30px_rgba(124,58,237,0.35)]";

  return (
    <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
      <div className="space-y-6">
        <GlassCard className={`overflow-hidden p-0 ${isEnded ? "opacity-60 grayscale" : ""}`} hover={false}>
          <div className="flex justify-end px-6 pt-4">
            {isEnded ? (
              <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-xs">Ended</span>
            ) : null}
          </div>
          {auction?.image ? (
            <img
              src={`http://localhost:5000${auction?.image}`}
              alt={auction?.title || "Auction"}
              className="h-72 w-full object-cover"
            />
          ) : (
            <div className="grid h-72 place-items-center bg-[#0F172A] text-slate-400">No Image</div>
          )}
          <div className="space-y-4 p-6">
            <SectionHeader
              title={auction?.title || "Auction"}
              subtitle={`${auction?.productName || "-"} • ${auction?.category || "-"}`}
            />
            <p className={`text-4xl font-semibold transition-all duration-300 ${pulse ? "scale-105 text-[#EC4899]" : ""}`}>
              {formatCurrency(auction?.currentPrice)}
            </p>
            <p className="text-sm text-slate-300">{tickDisplay}</p>
            {auction?.reservePrice ? (
              <p className="text-sm text-slate-400">Reserve Price: {formatCurrency(auction.reservePrice)}</p>
            ) : null}
            {isEnded ? (
              <div className="rounded-xl border border-white/10 bg-[#0F172A]/60 p-4 text-sm">
                <p>Winner: {auction?.winner?.customerId || "BG------"}</p>
                <p className="mt-1">Winning Bid: {formatCurrency(bidHistory?.[0]?.amount || auction?.currentPrice)}</p>
              </div>
            ) : null}
          </div>
        </GlassCard>

        <GlassCard className="p-6" hover={false}>
          <h3 className="text-lg font-semibold">Bid Execution</h3>
          {isSeller ? (
            <p className="mt-4 rounded-lg border border-white/10 bg-[#0F172A]/65 px-4 py-3 text-sm text-slate-300">
              You are a seller. Bidding is restricted.
            </p>
          ) : (
            <>
              <div className="mt-4 flex flex-wrap gap-3">
                <input
                  type="number"
                  disabled={isEnded || overrideLock}
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  placeholder="Enter bid amount"
                  className="min-w-[220px] flex-1 rounded-xl border border-[#7C3AED]/40 bg-[#0F172A]/80 px-4 py-3 outline-none transition-all duration-300 focus:border-[#EC4899]"
                />
                <GlowButton disabled={isEnded || overrideLock} onClick={() => placeBid(false)}>
                  {overrideLock ? "AI Thinking..." : "Place Bid"}
                </GlowButton>
              </div>

              {overWarning ? (
                <p className="mt-3 rounded-lg border border-[#EC4899]/35 bg-[#EC4899]/10 px-3 py-2 text-sm">
                  AI warning: This bid may be above expected market optimum.
                </p>
              ) : null}

              {overpriceAlert ? (
                <div className={`mt-3 rounded-xl border p-4 text-sm ${alertTone}`}>
                  <p className="font-medium capitalize">{overpriceAlert.level} overprice warning</p>
                  <p className="mt-2">Fair Value: {formatCurrency(overpriceAlert.predictedPrice)}</p>
                  <p>Your Bid: {formatCurrency(overpriceAlert.userBid)}</p>
                  <p>Overpriced By: {Number(overpriceAlert.overPercent || 0).toFixed(2)}%</p>
                  <p>
                    AI Confidence: {Math.round(Number(overpriceAlert.confidence || 0) * 100)}%
                  </p>
                  <GlowButton
                    className="mt-3"
                    onClick={() => placeBid(true)}
                    disabled={overrideLock || isEnded}
                  >
                    Proceed Anyway
                  </GlowButton>
                </div>
              ) : null}

              <div className="mt-5 rounded-xl border border-white/10 bg-[#0F172A]/65 p-4">
                <h4 className="font-medium">Auto Bid</h4>
                {autoBidInfo ? (
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <p className="text-sm text-slate-300">Max Budget: {formatCurrency(autoBidInfo?.maxBudget)}</p>
                    <GlowButton variant="ghost" onClick={disableAutoBid}>
                      Disable Auto Bid
                    </GlowButton>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-3">
                    <input
                      type="number"
                      value={autoBidBudget}
                      onChange={(e) => setAutoBidBudget(e.target.value)}
                      placeholder="Set max budget"
                      className="min-w-[220px] flex-1 rounded-xl border border-white/10 bg-[#111827] px-4 py-3 outline-none transition-all duration-300 focus:border-[#7C3AED]"
                    />
                    <GlowButton onClick={activateAutoBid}>Activate</GlowButton>
                  </div>
                )}
              </div>
            </>
          )}
        </GlassCard>

        {isSeller ? (
          <GlassCard className="p-6" hover={false}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Seller Market Intelligence</h3>
            </div>
            {loadingAI ? (
              <p className="mt-4 text-sm text-slate-300">{typedText}</p>
            ) : (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <InsightTile
                  title="Expected Closing Range"
                  value={
                    sellerRangeMin !== null && sellerRangeMax !== null
                      ? `${formatCurrency(sellerRangeMin)} - ${formatCurrency(sellerRangeMax)}`
                      : "Projection temporarily unavailable"
                  }
                />
                <InsightTile
                  title="Price Growth Since Start"
                  value={growthPct === null ? "-" : `${growthPct >= 0 ? "+" : ""}${growthPct.toFixed(2)}% since launch`}
                />
                <InsightTile title="Active Participants" value={`Active Participants: ${uniqueParticipants}`} />
                <InsightTile title="Bid Momentum Indicator" value={momentumLabel} />
                <div className="rounded-xl border border-white/10 bg-[#0F172A]/60 p-4 md:col-span-2">
                  <p className="text-sm text-slate-400">Projection Confidence</p>
                  <ConfidenceBar value={normalizedConfidencePct} className="mt-2" />
                  <p className="mt-2 text-sm">
                    {modelConfidencePct === null ? "-" : `${Math.round(modelConfidencePct)}%`}
                  </p>
                </div>
                <InsightTile
                  title="Integrity Risk"
                  value={fraudRiskPct === null ? "-" : `${Math.round(fraudRiskPct)}%`}
                />
              </div>
            )}
          </GlassCard>
        ) : (
          <GlassCard className="p-6" hover={false}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">AI MARKET PROJECTION</h3>
              <GlowButton variant="ghost" onClick={() => setExpandedInsights((prev) => !prev)}>
                {expandedInsights ? "Collapse" : "Expand"}
              </GlowButton>
            </div>

            {loadingAI ? (
              <p className="mt-4 text-sm text-slate-300">{typedText}</p>
            ) : expandedInsights ? (
              <div className="mt-4 rounded-xl border border-white/10 bg-[#0F172A]/60 p-5">
                <div className="mb-4 border-b border-white/10 pb-4">
                  <p className="text-xs tracking-wide text-slate-400">Projected Final Price</p>
                  <div className="mt-2 flex items-center gap-2">
                    <p className="text-3xl font-semibold">
                      {displayProjectedPrice === null ? "-" : formatCurrency(displayProjectedPrice)}
                    </p>
                    {projectionDirection === "up" ? <span className="text-lg">▲</span> : null}
                    {projectionDirection === "down" ? <span className="text-lg">▼</span> : null}
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Market Gap</span>
                    <span>
                      {marketGap === null
                        ? "-"
                        : `${marketGap >= 0 ? "+" : "-"}${formatCurrency(Math.abs(marketGap))}`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Winning Probability</span>
                    <span>
                      {winningProbabilityPct === null ? "-" : `${Math.round(winningProbabilityPct)}%`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Fraud Risk</span>
                    <span>
                      {fraudRiskPct === null ? "-" : `${Math.round(fraudRiskPct)}% (${fraudRiskLabel})`}
                    </span>
                  </div>
                </div>

                <div className="mt-4 border-t border-white/10 pt-4">
                  <p className="text-sm text-slate-400">Model Confidence</p>
                  <ConfidenceBar value={normalizedConfidencePct} className="mt-2" />
                  <p className="mt-2 text-sm">
                    {modelConfidencePct === null ? "-" : `${Math.round(modelConfidencePct)}%`}
                  </p>
                </div>

                {isRecalculatingProjection ? (
                  <p className="mt-4 text-xs text-slate-300">Recalculating projection...</p>
                ) : null}
              </div>
            ) : null}
          </GlassCard>
        )}
      </div>

      <GlassCard className="h-fit p-5" hover={false}>
        <h3 className="text-lg font-semibold">Live Bid History</h3>
        <p className="mt-1 text-xs text-slate-400">BG customer IDs only</p>
        <div className="mt-4 max-h-[76vh] space-y-3 overflow-y-auto pr-1">
          {bidHistory?.length > 0 ? (
            bidHistory.map((bid) => (
              <div
                key={bid._id}
                className={`rounded-xl border p-3 text-sm transition-all duration-300 ${
                  bid._id === newestBidId
                    ? "border-[#7C3AED]/60 bg-[#7C3AED]/12 shadow-[0_0_24px_rgba(124,58,237,0.25)]"
                    : "border-white/10 bg-[#0F172A]/65"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p>
                    {bid?.bidder?.role === "bot" ? "BOT " : ""}
                    {bid?.bidder?.customerId || "BG------"}
                  </p>
                  <p className="font-semibold">{formatCurrency(bid?.amount)}</p>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {bid?.createdAt ? new Date(bid.createdAt).toLocaleTimeString() : "-"} •{" "}
                  {bid?.createdAt ? getRelativeTime(bid.createdAt) : "-"}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-400">No bids yet.</p>
          )}
        </div>
        <div className="mt-5 flex justify-center">
          <HeatGauge value={Math.min(100, bidHistory.length * 8)} label="Battle Intensity" />
        </div>
      </GlassCard>

      {showBalanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-96 rounded-xl bg-gray-900 p-6 shadow-xl">
            <h2 className="mb-3 text-xl font-semibold text-red-400">
              Insufficient Wallet Balance
            </h2>
            <p className="mb-2 text-gray-300">
              Your current balance is ₹{Number(storedUser?.walletBalance || 0).toLocaleString()}
            </p>
            <p className="mb-4 text-gray-300">
              You need ₹{Number(shortfallAmount || 0).toLocaleString()} more to place this bid.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowBalanceModal(false)}
                className="rounded-lg bg-gray-700 px-4 py-2"
              >
                Cancel
              </button>
              <button
                onClick={() => navigate("/wallet")}
                className="rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2"
              >
                Add Funds
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InsightTile({ title, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0F172A]/60 p-4">
      <p className="text-sm text-slate-400">{title}</p>
      <p className="mt-2 text-base">{value}</p>
    </div>
  );
}

