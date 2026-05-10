import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function MyAuctions() {
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const formatNumber = (value) =>
    typeof value === "number" ? value.toLocaleString() : "-";

  const formatCurrency = (value) =>
    value !== undefined && value !== null && !Number.isNaN(Number(value))
      ? `₹${Number(value).toLocaleString()}`
      : "-";

  const formatDateTime = (value) =>
    value ? new Date(value).toLocaleString() : "-";

  useEffect(() => {
    const fetchMyAuctions = async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await fetch("http://localhost:5000/api/auctions/my", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (data.success) {
          setAuctions(data.auctions || []);
        }
      } catch (error) {
        console.error("Fetch my auctions error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMyAuctions();
  }, []);

  return (
    <div className="min-h-screen text-white space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          My Auctions
        </h1>

        <button
          onClick={() => navigate("/create")}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 hover:scale-105 transition"
        >
          + Create New
        </button>
      </div>

      {loading ? (
        <div className="text-gray-300 animate-pulse">Loading your auctions...</div>
      ) : auctions.length === 0 ? (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-xl p-10 text-center text-gray-300">
          No auctions created yet.
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-8">
          {auctions.map((auction) => (
            <div
              key={auction?._id}
              className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl hover:scale-105 transition cursor-pointer shadow-xl hover:shadow-purple-500/30"
              onClick={() => navigate(`/auction/${auction?._id}`)}
            >
              {auction?.image && (
                <img
                  src={`http://localhost:5000${auction?.image}`}
                  alt={auction?.title || "Auction"}
                  className="w-full h-40 object-contain bg-[#0F172A] rounded-xl mb-4"
                />
              )}

              <h2 className="text-xl font-bold mb-2">
                {auction?.title !== undefined && auction?.title !== null ? auction?.title : "-"}
              </h2>

              <p className="text-sm">
                Status:
                <span className="ml-2 font-semibold text-purple-300">
                  {auction?.status !== undefined && auction?.status !== null ? auction?.status.toUpperCase() : "-"}
                </span>
              </p>

              <p className="mt-2 font-semibold">Current Price: {formatCurrency(auction?.currentPrice)}</p>

              <p className="text-gray-300 text-sm mt-1">Bids: {formatNumber(auction?.bidCount)}</p>

              {auction?.reservePrice && (
                <p className="text-gray-300 text-sm mt-1">Reserve: {formatCurrency(auction?.reservePrice)}</p>
              )}

              <p className="text-gray-300 text-xs mt-3">
                Ends: {formatDateTime(auction?.endTime)}
              </p>

              {auction?.status === "ended" && auction?.winner && (
                <p className="text-purple-300 text-sm mt-2">
                  Winner: {auction?.winner?.customerId !== undefined && auction?.winner?.customerId !== null ? auction?.winner?.customerId : "-"}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
