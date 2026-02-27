import { useEffect, useMemo, useState } from "react";
import GlassCard from "../components/GlassCard";
import GlowButton from "../components/GlowButton";
import SectionHeader from "../components/SectionHeader";

const QUICK_AMOUNTS = [5000, 10000, 50000, 100000, 500000, 1000000];

export default function Wallet() {
  const role = localStorage.getItem("role");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [activeRevenue, setActiveRevenue] = useState(0);
  const [completedSales, setCompletedSales] = useState(0);
  const [amount, setAmount] = useState("10000");
  const [message, setMessage] = useState("");

  const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString()}`;

  const loadWallet = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/wallet", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!data.success) return;
      setWalletBalance(Number(data.walletBalance || 0));
      setTransactions(data.transactions || []);
      setActiveRevenue(Number(data.activeRevenue || 0));
      setCompletedSales(Number(data.completedSales || 0));
    } catch (error) {
      console.error("Wallet load error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWallet();
  }, []);

  const addFunds = async (value) => {
    try {
      setAdding(true);
      setMessage("");
      const token = localStorage.getItem("token");
      const payload = Number(value);
      const res = await fetch("http://localhost:5000/api/wallet/add-funds", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ amount: payload })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setMessage(data.message || "Unable to add funds");
        return;
      }
      setWalletBalance(Number(data.walletBalance || 0));
      setMessage("Funds added successfully.");
      await loadWallet();
    } catch (error) {
      console.error("Add funds error:", error);
      setMessage("Unable to add funds");
    } finally {
      setAdding(false);
    }
  };

  const bidderBanner = useMemo(
    () => walletBalance === 0,
    [walletBalance]
  );

  return (
    <div className="space-y-6 text-slate-100">
      <SectionHeader
        title={role === "seller" ? "Seller Wallet" : "Wallet"}
        subtitle={role === "seller" ? "Track earnings and completed auction revenue." : "Manage bid balance and payments."}
      />

      {loading ? (
        <GlassCard className="p-6" hover={false}>
          Loading wallet...
        </GlassCard>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Metric title={role === "seller" ? "Total Earnings" : "Current Balance"} value={formatCurrency(walletBalance)} />
            {role === "seller" ? (
              <>
                <Metric title="Active Revenue" value={formatCurrency(activeRevenue)} />
                <Metric title="Completed Sales" value={String(completedSales)} />
                <Metric title="Transactions" value={String(transactions.length)} />
              </>
            ) : (
              <>
                <Metric title="Wallet Cap" value={formatCurrency(1000000)} />
                <Metric title="Transactions" value={String(transactions.length)} />
                <Metric title="Status" value={walletBalance > 0 ? "Funded" : "Awaiting Funds"} />
              </>
            )}
          </div>

          {role === "bidder" && bidderBanner ? (
            <GlassCard className="p-5 bg-[#111827]/70 border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.5)]" hover={false}>
              <p className="text-sm">
                Your wallet balance is ₹0. Please add funds to participate in auctions.
              </p>
            </GlassCard>
          ) : null}

          {role === "bidder" ? (
            <GlassCard className="p-6 bg-[#111827]/70 border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.5)]" hover={false}>
              <h3 className="text-lg font-semibold">Add Funds</h3>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {QUICK_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => {
                      setAmount(String(amt));
                      addFunds(amt);
                    }}
                    className="rounded-xl border border-white/10 bg-[#0F172A]/70 px-4 py-3 text-sm transition-all duration-300 hover:border-[#7C3AED]"
                    disabled={adding}
                  >
                    {formatCurrency(amt)}
                  </button>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="min-w-[220px] flex-1 rounded-xl border border-white/10 bg-[#0F172A]/80 px-4 py-3 outline-none transition-all duration-300 focus:border-[#7C3AED]"
                />
                <GlowButton onClick={() => addFunds(amount)} disabled={adding}>
                  {adding ? "Processing..." : "Add Funds"}
                </GlowButton>
              </div>
              {message ? <p className="mt-3 text-sm text-slate-300">{message}</p> : null}
            </GlassCard>
          ) : null}

          <GlassCard className="p-6 bg-[#111827]/70 border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.5)]" hover={false}>
            <h3 className="text-lg font-semibold">Transaction History</h3>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-[720px] w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-400 border-b border-white/10">
                    <th className="py-3 pr-3">Type</th>
                    <th className="py-3 pr-3">Amount</th>
                    <th className="py-3 pr-3">Description</th>
                    <th className="py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="py-4 text-slate-400">No transactions yet.</td>
                    </tr>
                  ) : (
                    transactions.map((tx) => (
                      <tr key={tx._id} className="border-b border-white/5">
                        <td className="py-3 pr-3 uppercase">{tx.type}</td>
                        <td className="py-3 pr-3">{formatCurrency(tx.amount)}</td>
                        <td className="py-3 pr-3">{tx.description || "-"}</td>
                        <td className="py-3">{new Date(tx.createdAt).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
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

