import { useEffect, useMemo, useState } from "react";
import GlassCard from "../components/GlassCard";
import SectionHeader from "../components/SectionHeader";

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    totalBidsPlaced: 0,
    auctionsParticipated: 0,
    winRatio: 0,
    avgBidIncrement: 0,
    totalAuctionsCreated: 0,
    revenue: 0,
    highestGrowthAuction: "-",
    bidCountPerAuction: []
  });

  const role = localStorage.getItem("role");
  const userId = localStorage.getItem("userId");
  const customerId = (() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      return user?.customerId || localStorage.getItem("customerId") || "";
    } catch {
      return localStorage.getItem("customerId") || "";
    }
  })();

  useEffect(() => {
    const run = async () => {
      try {
        const token = localStorage.getItem("token");

        if (role === "seller") {
          const res = await fetch("http://localhost:5000/api/auctions/my", {
            headers: { Authorization: `Bearer ${token}` }
          });
          const json = await res.json();
          const auctions = json?.auctions || [];

          const totalAuctionsCreated = auctions.length;
          const revenue = auctions
            .filter((a) => a.status === "ended")
            .reduce((sum, a) => sum + Number(a.currentPrice || 0), 0);

          const growthSorted = [...auctions].sort((a, b) => {
            const ga = ((a.currentPrice || 0) - (a.startingPrice || 0)) / Math.max(1, a.startingPrice || 1);
            const gb = ((b.currentPrice || 0) - (b.startingPrice || 0)) / Math.max(1, b.startingPrice || 1);
            return gb - ga;
          });

          setData((prev) => ({
            ...prev,
            totalAuctionsCreated,
            revenue,
            highestGrowthAuction: growthSorted[0]?.title || "-",
            bidCountPerAuction: auctions.map((a) => ({ title: a.title, bidCount: a.bidCount || 0 })).slice(0, 8)
          }));
        } else {
          const res = await fetch("http://localhost:5000/api/auctions", {
            headers: { Authorization: `Bearer ${token}` }
          });
          const json = await res.json();
          const auctions = json?.auctions || [];

          const bidSets = await Promise.all(
            auctions.slice(0, 12).map(async (auction) => {
              const bidsRes = await fetch(`http://localhost:5000/api/auctions/bids/${auction._id}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              const bidsJson = await bidsRes.json();
              return { auction, bids: bidsJson?.bids || [] };
            })
          );

          let totalBidsPlaced = 0;
          const participatedIds = new Set();
          let wonAuctions = 0;
          const increments = [];

          for (const set of bidSets) {
            const myBids = set.bids
              .filter((b) => b?.bidder?.customerId === customerId)
              .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

            if (!myBids.length) continue;
            totalBidsPlaced += myBids.length;
            participatedIds.add(String(set.auction._id));

            if (String(set.auction?.winner || "") === String(userId || "")) {
              wonAuctions += 1;
            }

            myBids.forEach((bid, idx) => {
              const prev = idx === 0 ? Number(set.auction.startingPrice || 0) : Number(myBids[idx - 1].amount || 0);
              increments.push(Math.max(0, Number(bid.amount || 0) - prev));
            });
          }

          const auctionsParticipated = participatedIds.size;
          const winRatio = auctionsParticipated ? (wonAuctions / auctionsParticipated) * 100 : 0;
          const avgBidIncrement = increments.length
            ? increments.reduce((a, b) => a + b, 0) / increments.length
            : 0;

          setData((prev) => ({
            ...prev,
            totalBidsPlaced,
            auctionsParticipated,
            winRatio,
            avgBidIncrement
          }));
        }
      } catch (error) {
        console.error("Analytics load error:", error);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [role, userId, customerId]);

  const cards = useMemo(() => {
    if (role === "seller") {
      return [
        ["Total Auctions Created", String(data.totalAuctionsCreated)],
        ["Revenue", `₹${Number(data.revenue || 0).toLocaleString()}`],
        ["Highest Growth Auction", data.highestGrowthAuction || "-"],
        [
          "Bid Count per Auction",
          data.bidCountPerAuction.length ? `${data.bidCountPerAuction[0].title} (${data.bidCountPerAuction[0].bidCount})` : "-"
        ]
      ];
    }
    return [
      ["Total Bids Placed", String(data.totalBidsPlaced)],
      ["Auctions Participated", String(data.auctionsParticipated)],
      ["Win Ratio", `${Math.round(data.winRatio)}%`],
      ["Avg Bid Increment", `₹${Math.round(data.avgBidIncrement).toLocaleString()}`]
    ];
  }, [data, role]);

  return (
    <div className="space-y-6 text-slate-100">
      <SectionHeader
        title="Analytics"
        subtitle={role === "seller" ? "Seller performance metrics from live backend data." : "Bidder performance metrics from bid activity."}
      />

      {loading ? (
        <GlassCard className="p-6" hover={false}>
          Loading analytics...
        </GlassCard>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {cards.map(([title, value]) => (
              <GlassCard
                key={title}
                className="p-5 bg-[#111827]/70 border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
              >
                <p className="text-sm text-slate-400">{title}</p>
                <p className="mt-2 text-2xl font-semibold">{value}</p>
              </GlassCard>
            ))}
          </div>

          {role === "seller" ? (
            <GlassCard className="p-6" hover={false}>
              <h3 className="text-lg font-semibold">Bid Count per Auction</h3>
              <div className="mt-4 space-y-2">
                {data.bidCountPerAuction.length === 0 ? (
                  <p className="text-sm text-slate-400">No auction bid stats found.</p>
                ) : (
                  data.bidCountPerAuction.map((entry) => (
                    <div
                      key={`${entry.title}-${entry.bidCount}`}
                      className="rounded-xl border border-white/10 bg-[#111827]/70 p-3 text-sm"
                    >
                      {entry.title} - {entry.bidCount} bids
                    </div>
                  ))
                )}
              </div>
            </GlassCard>
          ) : null}
        </>
      )}
    </div>
  );
}

