import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import GlassCard from "../components/GlassCard";
import ConfidenceBar from "../components/ConfidenceBar";
import SectionHeader from "../components/SectionHeader";

export default function LiveAuctions() {
  const navigate = useNavigate();
  const socket = useMemo(() => io("http://localhost:5000"), []);
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stream, setStream] = useState([]);
  const [now, setNow] = useState(Date.now());
  const [tickByAuction, setTickByAuction] = useState({});

  const formatCurrency = (value) =>
    value !== undefined && value !== null && !Number.isNaN(Number(value))
      ? `₹${Number(value).toLocaleString()}`
      : "-";

  const fetchAuctions = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/auctions", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setAuctions(data.auctions || []);
    } catch (error) {
      console.error("Fetch auctions error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const currentUserId = localStorage.getItem("userId");
    if (socket.connected && currentUserId) {
      socket.emit("registerUser", currentUserId);
    }

    const onConnect = () => {
      if (currentUserId) socket.emit("registerUser", currentUserId);
    };

    fetchAuctions();
    const clock = setInterval(() => setNow(Date.now()), 1000);

    const handleNewBid = (data) => {
      setStream((prev) => [
        {
          id: `${Date.now()}-${Math.random()}`,
          auctionId: data?.auctionId,
          bidderCustomerId: data?.bidderCustomerId || "BG------",
          newPrice: data?.newPrice,
          time: Date.now()
        },
        ...prev.slice(0, 24)
      ]);

      setAuctions((prev) =>
        prev.map((auction) =>
          String(auction._id) === String(data?.auctionId)
            ? { ...auction, currentPrice: data?.newPrice ?? auction.currentPrice }
            : auction
        )
      );
    };

    const handleTick = (data) => {
      setTickByAuction((prev) => ({
        ...prev,
        [String(data.auctionId)]: Number(data.timeRemaining || 0)
      }));
    };

    socket.on("connect", onConnect);
    socket.on("newBid", handleNewBid);
    socket.on("auctionTick", handleTick);
    return () => {
      clearInterval(clock);
      socket.off("connect", onConnect);
      socket.off("newBid", handleNewBid);
      socket.off("auctionTick", handleTick);
    };
  }, [socket]);

  useEffect(() => {
    return () => socket.disconnect();
  }, [socket]);

  const lastStreamByAuction = useMemo(() => {
    const map = new Map();
    for (const item of stream) {
      if (!map.has(String(item.auctionId))) {
        map.set(String(item.auctionId), item);
      }
    }
    return map;
  }, [stream]);

  const getCountdown = (endTime) => {
    const diff = Math.max(0, new Date(endTime).getTime() - now);
    if (diff <= 0) return "Auction Ended";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return `Ends in: ${hours}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
  };

  const getCountdownFromTick = (auction) => {
    const tick = tickByAuction[String(auction?._id)];
    if (tick === undefined) return getCountdown(auction?.endTime);
    if (tick <= 0) return "Auction Ended";
    const h = Math.floor(tick / 3600);
    const m = Math.floor((tick % 3600) / 60);
    const s = tick % 60;
    return `Ends in: ${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
  };

  const getScore = (auction) => {
    const base = Number(auction?.currentPrice || 0);
    const confidence = Math.max(35, Math.min(96, 55 + (base % 42)));
    const fraud = Math.max(8, Math.min(90, 22 + (base % 35)));
    return { confidence, fraud };
  };

  return (
    <div className="space-y-6 text-slate-100">
      <GlassCard className="overflow-hidden p-0" hover={false}>
        <div className="bg-gradient-to-r from-[#7C3AED]/20 via-[#4F46E5]/20 to-[#EC4899]/20 px-6 py-6">
          <SectionHeader
            title="Live Auctions"
            subtitle="AI-rated opportunities with realtime bidding telemetry."
          />
        </div>
      </GlassCard>

      {loading ? (
        <GlassCard className="p-8" hover={false}>
          Loading live auctions...
        </GlassCard>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
          <div className="grid gap-5 md:grid-cols-2">
            {auctions.map((auction) => {
              const signals = getScore(auction);
              const lastBid = lastStreamByAuction.get(String(auction?._id));
              const botActive = lastBid?.bidderCustomerId?.startsWith?.("BG900");
              const isEnded =
                auction?.status === "ended" ||
                (auction?.status === "live" && new Date(auction?.endTime).getTime() <= now);

              return (
                <GlassCard
                  key={auction?._id}
                  className={`cursor-pointer overflow-hidden border-white/10 p-4 ${isEnded ? "opacity-60 grayscale" : "hover:border-[#7C3AED]/60 hover:scale-[1.03]"}`}
                  onClick={() => navigate(`/auction/${auction?._id}`)}
                >
                  <div className="flex justify-end">
                    {isEnded ? (
                      <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-xs mb-2">Ended</span>
                    ) : null}
                  </div>

                  {auction?.image ? (
                    <img
                      src={`http://localhost:5000${auction?.image}`}
                      alt={auction?.title || "Auction"}
                      className="h-44 w-full rounded-xl object-cover"
                    />
                  ) : (
                    <div className="grid h-44 place-items-center rounded-xl bg-[#0F172A] text-slate-400">No Image</div>
                  )}

                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="line-clamp-1 text-lg font-semibold">{auction?.title || "-"}</h3>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs">
                        {auction?.category || "General"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-2xl font-semibold transition-all duration-300">{formatCurrency(auction?.currentPrice)}</p>
                      <span className="rounded-full border border-[#4F46E5]/50 bg-[#4F46E5]/20 px-2.5 py-1 text-xs">
                        {botActive ? "Bot Activity" : "Human Flow"}
                      </span>
                    </div>

                    <div>
                      <p className="mb-1 text-xs text-slate-400">AI Confidence</p>
                      <ConfidenceBar value={signals.confidence} />
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Fraud Risk</span>
                      <span>{signals.fraud}%</span>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-[#0F172A]/70 px-3 py-2 text-sm">
                      {getCountdownFromTick(auction)}
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>

          <GlassCard className="p-5" hover={false}>
            <h3 className="text-lg font-semibold">Live Bid Stream</h3>
            <p className="mt-1 text-xs text-slate-400">Realtime socket updates from all auctions</p>
            <div className="mt-4 max-h-[70vh] space-y-2 overflow-y-auto pr-1">
              {stream.length === 0 ? (
                <p className="text-sm text-slate-400">No incoming bids yet.</p>
              ) : (
                stream.map((event) => (
                  <div key={event.id} className="rounded-xl border border-white/10 bg-[#0F172A]/70 p-3 text-sm">
                    <p className="font-medium">{event.bidderCustomerId}</p>
                    <p className="mt-0.5 text-slate-300">placed {formatCurrency(event.newPrice)}</p>
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
