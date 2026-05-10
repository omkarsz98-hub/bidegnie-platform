import { useEffect, useState } from "react";

const Confetti = () => {
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden flex justify-center">
      {Array.from({ length: 50 }).map((_, i) => (
        <div
          key={i}
          className="absolute top-[-10%] text-2xl"
          style={{
            left: `${Math.random() * 100}%`,
            animation: `fall ${Math.random() * 3 + 2}s linear ${Math.random() * 2}s forwards`
          }}
        >
          {['🎉', '🎊', '💰', '✨'][Math.floor(Math.random() * 4)]}
        </div>
      ))}
      <style>{`
        @keyframes fall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default function WinnerModal({
  isOpen,
  onClose,
  role = "bidder",
  isWinner = false,
  auctionTitle = "-",
  finalPrice = 0,
  winnerCustomerId = "",
  transactionId = "",
}) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => setEntered(true), 10);
    return () => clearTimeout(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const isSeller = role === "seller";
  const title = isSeller
    ? "💰 Auction Sold Successfully"
    : isWinner
    ? "🎉 You Won This Auction!"
    : `🎉 ${winnerCustomerId || "Someone"} Won This Auction!`;

  const formatCurrency = (value) =>
    value !== undefined && value !== null && !Number.isNaN(Number(value))
      ? `₹${Number(value).toLocaleString()}`
      : "-";

  return (
    <>
      {entered && <Confetti />}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 transition-opacity duration-300">
        <div
          className={`w-full max-w-md rounded-2xl border border-emerald-500/30 bg-[#111827] p-6 shadow-[0_0_50px_rgba(16,185,129,0.2)] transition-all duration-300 ${
            entered ? "scale-100 opacity-100" : "scale-95 opacity-0"
          }`}
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <h2 className="text-xl font-semibold text-emerald-400">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-lg bg-white/10 px-3 py-1.5 text-sm transition hover:bg-white/20"
            >
              Close
            </button>
          </div>

          <p className="text-sm text-slate-300">{auctionTitle}</p>

          <div className="mt-4 rounded-xl border border-white/10 bg-[#0F172A]/70 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Final Price</p>
            <p className="mt-1 text-3xl font-bold">{formatCurrency(finalPrice)}</p>
          </div>

          {!isWinner && winnerCustomerId ? (
            <p className="mt-4 text-sm text-slate-300">Winning Bidder: <span className="font-bold text-emerald-400">{winnerCustomerId}</span></p>
          ) : null}

          <p className="mt-3 text-sm text-slate-300">
            {isSeller ? "Amount credited to your wallet" : isWinner ? "Amount deducted from wallet" : "Auction has concluded."}
          </p>

          {transactionId ? (
            <p className="mt-2 text-xs text-slate-400">Transaction ID: {transactionId}</p>
          ) : null}
        </div>
      </div>
    </>
  );
}
