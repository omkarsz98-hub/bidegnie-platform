import { Link, useNavigate } from "react-router-dom";
import GlassCard from "../components/GlassCard";
import GlowButton from "../components/GlowButton";
import SectionHeader from "../components/SectionHeader";
import { useEffect, useState } from "react";

export default function Landing() {
  const navigate = useNavigate();
  const [isReady, setIsReady] = useState(false);
  
  // Live Simulation States
  const [currentBid, setCurrentBid] = useState(8500);
  const [timeLeft, setTimeLeft] = useState(252);
  const [isAutoBidEngaged, setIsAutoBidEngaged] = useState(false);
  const [showRiskPopup, setShowRiskPopup] = useState(false);

  // Basic heuristic for auth state visibility
  const isAuthenticated = typeof window !== "undefined" ? !!localStorage.getItem("token") : false;
  
  useEffect(() => {
    setIsReady(true);
    
    // Live Auction Simulation Interval
    const timerId = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      
      // Random opponent bidding if AutoBid is OFF
      if (!isAutoBidEngaged && Math.random() > 0.65) {
         setCurrentBid(prev => prev + (Math.floor(Math.random() * 3) + 1) * 100);
      }
      
      // Randomly pop up the Risk Detection anomaly
      if (Math.random() > 0.85) {
         setShowRiskPopup(true);
         setTimeout(() => setShowRiskPopup(false), 3000);
      }
    }, 1000);
    return () => clearInterval(timerId);
  }, [isAutoBidEngaged]);

  // When AI AutoBid is toggled ON
  useEffect(() => {
    if (isAutoBidEngaged) {
      // Simulate AI rapidly securing the bid
      const aiResponse = setTimeout(() => {
         setCurrentBid(prev => prev + 200);
      }, 600);
      return () => clearTimeout(aiResponse);
    }
  }, [isAutoBidEngaged, currentBid]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `00:${m}:${s}`;
  };

  return (
    <div className="ai-page-bg min-h-screen px-4 py-12 text-slate-100 sm:px-6 relative overflow-x-hidden font-sans">
      {/* Background Grid Texture */}
      <div aria-hidden="true" className="absolute inset-0 z-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTAgMGg0MHY0MEgwem0zOSAzOVYxaC0ydjM4aDJ6TTEgMzlWMWgydjM4SDF6bTM4LTFIMnYyaDM4djIweiIgZmlsbD0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjAxKSIgZmlsbC1ydWxlPSJldmVub2RkIi8+PC9zdmc+')] opacity-20" />

      <div className="mx-auto max-w-7xl space-y-12 relative z-10 pt-16">
        
        {/* === GLASS GLOWING LOGO (TOP LEFT) === */}
        <div className="absolute top-0 left-0 sm:-left-4 sm:top-0 z-50 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-md shadow-[0_0_20px_rgba(139,92,246,0.2)] flex items-center gap-2 group cursor-pointer transition-transform hover:scale-105" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
           <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 shadow-lg shadow-violet-500/50 group-hover:shadow-[0_0_25px_rgba(236,72,153,0.5)] transition-shadow">
             <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-white"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
           </div>
           <span className="text-xl font-bold tracking-tight text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">BidGenie</span>
        </div>

        {/* === HERO SECTION === */}
        <section className="relative overflow-visible rounded-3xl border border-white/10 bg-gradient-to-br from-[#111827]/90 to-[#0B0F19]/90 p-8 shadow-[0_20px_70px_rgba(0,0,0,0.6)] sm:p-14 backdrop-blur-md">
          {/* Optimized decorative glows (GPU accelerated) */}
          <div aria-hidden="true" className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-violet-600/15 blur-3xl will-change-transform transform-gpu pointer-events-none" />
          <div aria-hidden="true" className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-pink-600/10 blur-3xl will-change-transform transform-gpu pointer-events-none" />

          <div className="relative z-10 grid items-center gap-12 lg:grid-cols-2">
            
            {/* Value Proposition */}
            <div className="text-center lg:text-left space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-sm font-medium text-violet-300">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
                </span>
                BidGenie Engine v2.0 is Live
              </div>
              
              <h1 className="text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 sm:text-6xl lg:text-7xl leading-[1.1]">
                Never Overpay. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-pink-500">Never Miss Out.</span>
              </h1>
              
              <p className="mx-auto max-w-xl text-lg text-slate-400 lg:mx-0 leading-relaxed font-light">
                Secure your wins with military-grade escrow and AI-driven autobidding. We analyze live market data so you know exactly when to push and when to walk away.
              </p>

              <div className="flex flex-col gap-4 sm:flex-row lg:justify-start pt-2">
                <GlowButton className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold" onClick={() => navigate("/login")}>
                  Login
                </GlowButton>
                <div onClick={() => navigate("/register")} className="w-full sm:w-auto text-center sm:text-left">
                  <button className="px-6 py-3.5 text-slate-300 hover:text-white transition-colors duration-200 font-medium">
                    Register &rarr;
                  </button>
                </div>
              </div>
            </div>

            {/* Live Interactive Mockup */}
            <div className={`relative flex justify-center transition-all duration-1000 transform ${isReady ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
              <GlassCard hover={false} className="w-full max-w-sm overflow-hidden p-0 border border-white/5 shadow-2xl relative">
                
                {/* AI Overlay when engaged */}
                <div className={`absolute inset-0 z-20 bg-indigo-900/90 backdrop-blur-md flex flex-col items-center justify-center transition-all duration-500 pointer-events-none ${isAutoBidEngaged ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}>
                   <div className="h-16 w-16 mb-4 relative flex items-center justify-center">
                     <div className="absolute inset-0 rounded-full border-4 border-indigo-400/30 animate-[ping_2s_ease-out_infinite]" />
                     <div className="absolute inset-0 rounded-full border-4 border-t-indigo-400 animate-spin" />
                     <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-white"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                   </div>
                   <h4 className="text-xl font-bold text-white">AutoBid Active</h4>
                   <p className="text-sm text-indigo-300 mt-2 font-medium">Optimal ceiling locked: <span className="text-white">₹{currentBid + 1200}</span></p>
                   <p className="text-xs text-indigo-400/70 mt-1 uppercase tracking-widest animate-pulse">Defending position...</p>
                </div>

                <div className="h-56 bg-gradient-to-tr from-slate-900 via-[#1a1c29] to-violet-900/40 relative flex items-center justify-center overflow-hidden">
                  <div className="absolute top-4 left-4 z-10 bg-black/60 backdrop-blur-md rounded-md px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider flex items-center gap-2 border border-white/10 shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                    <div className="flex items-center justify-center h-2 w-2 relative">
                       <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
                       <div className="h-1.5 w-1.5 rounded-full bg-rose-500" /> 
                    </div>
                    LIVE AUCTION
                  </div>
                  
                  {/* Innovative 3D-like Asset Animation */}
                  <div className="relative z-10 w-32 h-32 flex items-center justify-center group-hover:scale-110 transition-transform duration-700">
                    <div className="absolute inset-0 border-2 border-fuchsia-500/40 rounded-xl rotate-45 backdrop-blur-sm bg-gradient-to-br from-fuchsia-500/10 to-violet-500/10 shadow-[0_0_40px_rgba(217,70,239,0.3)] animate-[spin_12s_linear_infinite]" />
                    <div className="absolute inset-0 border-2 border-cyan-400/40 rounded-xl -rotate-12 backdrop-blur-sm bg-gradient-to-tr from-cyan-500/10 to-blue-500/10 shadow-[0_0_30px_rgba(56,189,248,0.2)] animate-[spin_18s_linear_infinite_reverse]" />
                    <div className="h-12 w-12 bg-white/10 backdrop-blur-md border border-white/20 rounded shadow-lg flex items-center justify-center z-10">
                       <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24" className="text-white opacity-80"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                    </div>
                  </div>
                  
                  {/* Background grid for asset */}
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-900 opacity-100 z-0" />
                  <div className="absolute bottom-0 w-full h-[1px] bg-gradient-to-r from-transparent via-violet-500/50 to-transparent shadow-[0_0_10px_rgba(139,92,246,1)]" />
                </div>

                <div className="p-6 bg-[#0B0F19] relative z-10 border-t border-white/5">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="font-semibold text-lg hover:text-violet-400 transition-colors cursor-pointer text-white shadow-black drop-shadow-md">Quantum Core Genesis</h3>
                      <p className={`text-xs mt-1.5 font-mono bg-black/30 w-fit px-2 py-0.5 rounded border border-white/5 ${timeLeft < 60 ? 'text-rose-400 font-bold' : 'text-slate-400'}`}>
                        Ends: {formatTime(timeLeft)}
                      </p>
                    </div>
                    <div className="text-right flex flex-col justify-end items-end">
                      <p className="text-[10px] font-semibold text-slate-500 tracking-widest uppercase mb-1">Current Bid</p>
                      <div className="flex items-center gap-2 justify-end bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-lg">
                         <div className="relative flex h-2 w-2">
                           <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                           <span className="relative inline-flex rounded-full h-1.5 w-1.5 top-0.5 left-0.5 bg-emerald-500"></span>
                         </div>
                         <p className="font-mono font-bold text-xl text-emerald-400 tracking-tight transition-all duration-300">₹{currentBid.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Interactive AI Toggle */}
                  <button 
                    onClick={() => setIsAutoBidEngaged(!isAutoBidEngaged)}
                    className={`w-full mt-2 flex items-center justify-between rounded-xl border p-4 transition-all duration-300 outline-none ${
                       isAutoBidEngaged 
                         ? 'bg-indigo-600/20 border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.2)]' 
                         : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                    }`}
                  >
                     <span className={`text-sm font-semibold flex items-center gap-2 ${isAutoBidEngaged ? 'text-indigo-300' : 'text-slate-300'}`}>
                       <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                       {isAutoBidEngaged ? 'AI AutoBid Active' : 'Enable Predictive AutoBid'}
                     </span>
                     <div className={`h-6 w-12 rounded-full flex items-center px-1 transition-colors duration-300 shadow-inner ${isAutoBidEngaged ? 'bg-indigo-500' : 'bg-slate-700'}`}>
                        <div className={`h-4 w-4 rounded-full bg-white shadow-md transition-transform duration-300 ${isAutoBidEngaged ? 'transform translate-x-6' : 'transform translate-x-0'}`} />
                     </div>
                  </button>
                </div>
              </GlassCard>
              
              {/* Floating Live Risk Alert (Animated in and out) */}
              <div className={`absolute -right-4 md:-right-12 top-20 z-30 transition-all duration-500 transform ${showRiskPopup && !isAutoBidEngaged ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-10 opacity-0 scale-95 pointer-events-none'}`}>
                 <div className="flex items-center gap-3 rounded-xl border border-rose-500/40 bg-[#1a0f14]/90 backdrop-blur-xl p-3 shadow-[0_10px_40px_rgba(225,29,72,0.4)]">
                   <div className="text-rose-400 flex items-center justify-center p-2 rounded-md bg-rose-500/20 shadow-inner">
                     <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                   </div>
                   <div>
                     <p className="text-[9px] uppercase font-bold text-rose-400/80 tracking-widest mb-0.5">Live Anomaly Detected</p>
                     <p className="text-sm font-semibold text-slate-200">Shill Bid Rejected <span className="text-rose-400 font-mono ml-1">-₹1,200</span></p>
                   </div>
                 </div>
              </div>
            </div>
          </div>
        </section>



        {/* === BENTO BOX FEATURES === */}
        <section className="space-y-8">
          <SectionHeader
            title="Smarter Than the Market"
            subtitle="Stop guessing. Our AI engine analyzes millions of data points to guarantee fair pricing and protect your wallet."
          />
          <div className="grid gap-5 md:grid-cols-3">
             {/* Feature 1 - Large Wide */}
             <GlassCard className="p-8 md:col-span-2 relative overflow-hidden group">
               <div className="absolute right-0 top-0 opacity-10 transition-opacity group-hover:opacity-20 flex h-full items-center pl-20">
                  {/* Abstract Graph SVG */}
                  <svg width="200" height="150" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-violet-500"><path d="M10 140L50 90L90 110L140 40L190 60"/><path d="M140 40V140M90 110V140M50 90V140" strokeOpacity="0.2" strokeDasharray="4 4" /></svg>
               </div>
               <div className="relative z-10 w-2/3">
                  <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-violet-500/10 border border-violet-500/20 mb-4">
                     <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-violet-400"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Never Overpay Again</h3>
                  <p className="text-slate-400 leading-relaxed text-sm">
                    Our Predictive Bid Engine generates dynamic pricing guidance using live market signals. It calculates the realistic ceiling of any item so you don't fall for emotional overbidding.
                  </p>
               </div>
             </GlassCard>

             {/* Feature 2 - Small Square */}
             <GlassCard className="p-8 flex flex-col justify-between group">
               <div>
                 <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 mb-4">
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-emerald-400"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                 </div>
                 <h3 className="text-lg font-bold mb-2">100% Verified Floor</h3>
                 <p className="text-slate-400 text-sm leading-relaxed">
                   Real-time anomaly detection scans every incoming bid. Shill patterns and fake volume are banned instantly.
                 </p>
               </div>
             </GlassCard>

             {/* Feature 3 - Small Square */}
             <GlassCard className="p-8">
               <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20 mb-4">
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-blue-400"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
               </div>
               <h3 className="text-lg font-bold mb-2">Automated Escrow</h3>
               <p className="text-slate-400 text-sm leading-relaxed">
                 Atomic smart transactions lock and release funds securely in milliseconds. You're never double-charged.
               </p>
             </GlassCard>

             {/* Feature 4 - Large Wide */}
             <GlassCard className="p-8 md:col-span-2 relative overflow-hidden group">
               <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-gradient-to-l from-indigo-500/5 to-transparent flex items-center justify-end pr-8">
                 <div className="hidden sm:flex flex-col gap-2 opacity-50 transition-opacity group-hover:opacity-100">
                    <div className="h-2 w-24 bg-white/10 rounded-full"></div>
                    <div className="h-2 w-16 bg-white/20 rounded-full translate-x-3"></div>
                    <div className="h-2 w-20 bg-indigo-500/40 rounded-full translate-x-1"></div>
                    <div className="h-2 w-12 bg-white/10 rounded-full translate-x-4"></div>
                 </div>
               </div>
               <div className="relative z-10 w-full sm:w-2/3">
                  <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/20 mb-4">
                     <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-indigo-400"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" /></svg>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Lightning Synchronized Broadcasts</h3>
                  <p className="text-slate-400 leading-relaxed text-sm">
                    Don't get out-sniped. Our heavily-optimized WebSocket layer ensures millisecond accuracy across the globe. When a bid drops, your UI updates instantly without crushing your browser.
                  </p>
               </div>
             </GlassCard>
          </div>
        </section>

        {/* === VS OFFLINE AUCTIONS === */}
        <section className="space-y-8">
          <SectionHeader
            title="The Evolution of Bidding"
            subtitle="Why legacy physical auctions and outdated platforms are obsolete."
          />
          
          <div className="relative rounded-3xl border border-white/10 bg-[#0B0F19]/50 overflow-hidden shadow-2xl backdrop-blur-md">
            {/* Split glow background */}
            <div className="absolute top-0 bottom-0 left-0 w-1/2 bg-rose-500/5 blur-3xl pointer-events-none" />
            <div className="absolute top-0 bottom-0 right-0 w-1/2 bg-emerald-500/5 blur-3xl pointer-events-none" />
            
            <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/10 relative z-10">
              
              {/* Traditional Auctions */}
              <div className="p-8 sm:p-12 space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-4 py-1.5 text-sm font-medium text-rose-300">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Traditional / Offline Auctions
                </div>
                
                <ul className="space-y-5">
                  <li className="flex gap-3 text-slate-400 items-start">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-rose-400 mt-0.5 shrink-0"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    <span><strong className="text-white">Emotional Bidding Bias:</strong> High-pressure rooms force you to quickly overpay past your intended budget limit.</span>
                  </li>
                  <li className="flex gap-3 text-slate-400 items-start">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-rose-400 mt-0.5 shrink-0"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    <span><strong className="text-white">Shill Bidding & Fraud:</strong> Unregulated environments make it easy for sellers to plant fake bidders to artificially maximize sale prices.</span>
                  </li>
                  <li className="flex gap-3 text-slate-400 items-start">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-rose-400 mt-0.5 shrink-0"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    <span><strong className="text-white">Geographic Lock-in:</strong> You must be physically present or deal with heavily delayed, inefficient phone aggregators.</span>
                  </li>
                </ul>
              </div>

              {/* BidGenie */}
              <div className="p-8 sm:p-12 space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm font-medium text-emerald-300">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  The BidGenie Standard
                </div>
                
                <ul className="space-y-5">
                  <li className="flex gap-3 text-slate-400 items-start">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-emerald-400 mt-0.5 shrink-0"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                    <span><strong className="text-white">Algorithmic Ceilings:</strong> Predictive AI calculates raw maximum asset value so you physically never breach true market worth.</span>
                  </li>
                  <li className="flex gap-3 text-slate-400 items-start">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-emerald-400 mt-0.5 shrink-0"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                    <span><strong className="text-white">Zero Manipulation:</strong> ML anomalies catch and instantly reject shill bidding. Capital is protected by atomic routing escrow.</span>
                  </li>
                  <li className="flex gap-3 text-slate-400 items-start">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-emerald-400 mt-0.5 shrink-0"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                    <span><strong className="text-white">Global Millisecond Sync:</strong> Distributed WebSockets eliminate execution latency. You bid against the world faster than raising a paddle.</span>
                  </li>
                </ul>
              </div>
              
            </div>
          </div>
        </section>

        {/* === VERTICAL TIMELINE / HOW IT WORKS === */}
        <section className="space-y-12 pb-8">
           <SectionHeader title="The Intelligence Loop" subtitle="Behind the scenes of every transaction." />
           <div className="relative border-l border-white/10 ml-4 md:ml-10 space-y-12 pb-4">
              
              {/* Step 1 */}
              <div className="relative pl-8 md:pl-16">
                 <div className="absolute top-1 -left-[17px] h-8 w-8 rounded-full bg-slate-900 border-2 border-slate-700 flex items-center justify-center z-10">
                    <div className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                 </div>
                 <h4 className="text-lg font-bold text-white mb-1">1. User Interaction & Funds Lock</h4>
                 <p className="text-sm text-slate-400">Bid is submitted. Our atomic routing guarantees escrow lock without race conditions.</p>
              </div>

              {/* Step 2 */}
              <div className="relative pl-8 md:pl-16">
                 <div className="absolute top-1 -left-[17px] h-8 w-8 rounded-full bg-slate-900 border-2 border-violet-500 flex items-center justify-center z-10 shadow-[0_0_15px_rgba(124,58,237,0.5)]">
                    <div className="h-2.5 w-2.5 rounded-full bg-violet-400" />
                 </div>
                 <h4 className="text-lg font-bold text-violet-300 mb-1">2. Core Evaluation & ML Inference</h4>
                 <p className="text-sm text-slate-400">The Flask ML microservice checks for anomalous account behavior and calculates predictive ceilings instantly.</p>
              </div>

              {/* Step 3 */}
              <div className="relative pl-8 md:pl-16">
                 <div className="absolute top-1 -left-[17px] h-8 w-8 rounded-full bg-slate-900 border-2 border-emerald-500 flex items-center justify-center z-10">
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                 </div>
                 <h4 className="text-lg font-bold text-white mb-1">3. AutoBid Trigger & Broadcast</h4>
                 <p className="text-sm text-slate-400">Opponent logic is solved async. Milliseconds later, all active users receive the finalized state.</p>
              </div>

              {/* Connecting glowing line effect */}
              <div aria-hidden="true" className="absolute top-0 bottom-0 left-[-1px] w-[2px] bg-gradient-to-b from-transparent via-violet-500 to-transparent opacity-50" />
           </div>
        </section>

        {/* === BOTTOM NAVBAR / FOOTER === */}
        <footer className="mt-20 border-t border-white/10 bg-white/[0.02] py-8 backdrop-blur-sm px-4 sm:rounded-t-3xl text-center md:text-left">
          <div className="mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm font-medium text-slate-400">
             <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-center">
               <Link to="/terms" className="hover:text-white transition-colors">Terms and Conditions</Link>
               <Link to="/auction-system" className="hover:text-white transition-colors">What is Auction System?</Link>
             </div>
             <p className="text-xs text-slate-600">&copy; {new Date().getFullYear()} BidGenie. Escrow Protected.</p>
          </div>
        </footer>

      </div>
    </div>
  );
}

