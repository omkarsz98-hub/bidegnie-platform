import React from 'react';
import { Link } from 'react-router-dom';

export default function AuctionSystem() {
  return (
    <div className="ai-page-bg min-h-screen px-4 py-12 text-slate-100 sm:px-6 relative overflow-x-hidden font-sans">
      <div className="mx-auto max-w-4xl space-y-8 relative z-10 bg-white/5 backdrop-blur-md rounded-3xl p-8 border border-white/10 shadow-2xl">
         <div className="flex items-center justify-between border-b border-white/10 pb-6 mb-6">
           <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-indigo-500">What is the Auction System?</h1>
           <Link to="/" className="text-sm rounded-lg border border-white/20 px-4 py-2 hover:bg-white/10 transition-colors">Back to Home</Link>
        </div>
        
        <div className="space-y-6 text-slate-300 leading-relaxed">
          <section className="bg-white/5 p-6 rounded-xl border border-white/5">
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-emerald-400">1.</span> Standard Bidding Mechanics
            </h2>
            <p>The auction system allows users to compete for rare digital assets by placing progressively higher bids. Each item has a countdown timer. The last bidder standing when the timer hits zero wins the asset. If a bid is placed in the final seconds, the timer may slightly extend to prevent snipe-monopolies.</p>
          </section>

          <section className="bg-white/5 p-6 rounded-xl border border-white/5">
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-violet-400">2.</span> The Escrow Lockout
            </h2>
            <p>Trust is built into the protocol. When you bid, the amount is deducted from your wallet and locked in an atomic escrow smart contract. If an opponent outbids you, your funds are instantaneously refunded to your wallet via WebSocket events.</p>
          </section>

          <section className="bg-white/5 p-6 rounded-xl border border-white/5">
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-rose-400">3.</span> AI Anomaly Protection
            </h2>
            <p>Our auction system incorporates a live Flask ML microservice. Every bid is evaluated against historically validated patterns. If the system detects suspicious "shill bidding" (sellers artificially inflating their own prices via alternate accounts), the offending bids are rejected and accounts are flagged in milliseconds.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
