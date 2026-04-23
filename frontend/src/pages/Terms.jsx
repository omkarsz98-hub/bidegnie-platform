import React from 'react';
import { Link } from 'react-router-dom';

export default function Terms() {
  return (
    <div className="ai-page-bg min-h-screen px-4 py-12 text-slate-100 sm:px-6 relative overflow-x-hidden font-sans">
      <div className="mx-auto max-w-4xl space-y-8 relative z-10 bg-white/5 backdrop-blur-md rounded-3xl p-8 border border-white/10 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-6 mb-6">
           <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-pink-500">Terms and Conditions</h1>
           <Link to="/" className="text-sm rounded-lg border border-white/20 px-4 py-2 hover:bg-white/10 transition-colors">Back to Home</Link>
        </div>
        
        <div className="space-y-6 text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-white mb-2">1. Acceptance of Terms</h2>
            <p>By accessing and using BidGenie, you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you must not use our platform.</p>
          </section>
          
          <section>
            <h2 className="text-2xl font-bold text-white mb-2">2. Auction Rules</h2>
            <p>All bids placed on the platform are final and binding. When a bid is placed, funds are secured in escrow. Shill bidding, artificial inflation, or any form of market manipulation is strictly prohibited and carries an absolute ban.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-2">3. Escrow and Payments</h2>
            <p>Our automated escrow system locks the funds temporarily to guarantee transaction security. In the event of a lost bid, the locked funds are automatically released back to the user's wallet with zero deductions.</p>
          </section>
          
          <section>
            <h2 className="text-2xl font-bold text-white mb-2">4. AI Predictive Analytics</h2>
            <p>The BidGenie Predictive AutoBid and anomaly detection features are provided "as-is". While we utilize advanced machine learning to predict ceilings, market volatility can occur. BidGenie is not liable for predictions that do not perfectly align with human behavior.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
