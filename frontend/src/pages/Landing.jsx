
import { useEffect, useState } from "react";

export default function Landing() {

  const [timeLeft, setTimeLeft] = useState(12258);
  const [bids, setBids] = useState([]);
  const [highestBid, setHighestBid] = useState(10800);

  /* ---------------- TIMER ---------------- */
  useEffect(() => {
    const t = setInterval(() => {
      setTimeLeft(prev => prev > 0 ? prev - 1 : 0)
    }, 1000)
    return () => clearInterval(t)
  }, [])

  /* ----------- LIVE BIDS ON RAISED HANDS ---------- */
  useEffect(() => {
    const paddles = [
      { x: 14, y: 68, id: 21 },
      { x: 27, y: 61, id: 27 },
      { x: 49, y: 76, id: 37 },
      { x: 71, y: 62, id: 42 },
      { x: 82, y: 66, id: 13 },
      { x: 91, y: 68, id: 18 }
    ]

    const labels = [
      "New Bid!",
      "Leading",
      "Outbid!",
      "AutoBid"
    ]

    const interval = setInterval(() => {
      setBids(prev => {
        const nextAmount = highestBid + 100 * (Math.floor(Math.random() * 3) + 1)
        setHighestBid(nextAmount)

        const coord = paddles[Math.floor(Math.random() * paddles.length)]

        const newBid = {
          amount: nextAmount,
          label: labels[Math.floor(Math.random() * labels.length)],
          ...coord,
          id: Date.now() + Math.random()
        }

        return [...prev.slice(-4), newBid]
      })
    }, 2200)

    return () => clearInterval(interval)
  }, [highestBid])

  const format = (s) => ({
    h: String(Math.floor(s / 3600)).padStart(2, "0"),
    m: String(Math.floor((s % 3600) / 60)).padStart(2, "0"),
    s: String(s % 60).padStart(2, "0")
  })

  const t = format(timeLeft)

  return (
    <div className="bg-[#090112] text-white overflow-x-hidden">

      {/* ================= HERO ONLY ================= */}
      <section className="relative h-screen overflow-hidden isolate">

        {/* image confined only to hero */}
        <div className="absolute inset-0">
          <img
            src="/bg-auction.jpg"
            alt="auction"
            className="w-full h-full object-cover object-center"
          />

          {/* left readability gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#090112] via-[#090112cc] to-transparent" />

          {/* fade image before next section */}
          <div className="absolute bottom-0 left-0 w-full h-48 bg-gradient-to-b from-transparent to-[#0a0314]" />

          {/* subtle purple overlay */}
          <div className="absolute inset-0 bg-violet-900/15" />
        </div>

        {/* NAV */}
        <nav className="absolute top-0 z-50 w-full px-6 md:px-16 py-6 flex justify-between items-center">
          <div className="text-2xl font-bold">BidGenie</div>
          <div className="flex gap-4">
            <button className="border border-white/20 px-6 py-2 rounded-xl">Log In</button>
            <button className="bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-2 rounded-xl">Sign Up</button>
          </div>
        </nav>

        {/* HERO CONTENT */}
        <div className="relative z-20 h-full max-w-7xl mx-auto px-6 md:px-16 flex items-center">

          <div className="grid lg:grid-cols-2 items-center gap-12 w-full">

            {/* LEFT */}
            <div>
              <div className="inline-flex gap-4 mb-6 items-center">
                <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm">
                  ● LIVE AUCTION
                </div>
                <div className="text-sm text-slate-400">243 watching</div>
              </div>

              <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">
                Bid Smarter.<br />
                <span className="bg-gradient-to-r from-violet-300 to-fuchsia-500 bg-clip-text text-transparent">
                  Win Bigger.
                </span>
              </h1>

              <p className="text-slate-300 text-lg max-w-xl mb-10">
                Real-time bidding, AI powered AutoBid and powerful insights to help you win every auction.
              </p>

              <button className="px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-xl">
                Start Bidding →
              </button>

              <div className="flex gap-10 mt-14 text-sm flex-wrap">
                <div>
                  <div className="text-2xl font-bold">10K+</div>
                  Auctions Live
                </div>
                <div>
                  <div className="text-2xl font-bold">25K+</div>
                  Active Bidders
                </div>
                <div>
                  <div className="text-2xl font-bold">95%</div>
                  Win Accuracy
                </div>
              </div>
            </div>

            {/* RIGHT SIDE FLOATING CARDS */}
            <div className="hidden lg:block relative h-[600px]">

              <div className="absolute right-10 top-10 bg-[#0c0415]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                <div className="text-xs uppercase text-slate-400 mb-4 text-center">
                  Auction Ends In
                </div>
                <div className="text-4xl font-mono flex gap-3">
                  <span>{t.h}</span>
                  <span>:</span>
                  <span>{t.m}</span>
                  <span>:</span>
                  <span>{t.s}</span>
                </div>
              </div>

              <div className="absolute right-10 top-64 bg-[#0c0415]/80 backdrop-blur-xl rounded-3xl p-6 w-72 border border-white/10 shadow-2xl">
                <h3 className="text-2xl font-bold mb-2">Starry Peaks</h3>
                <p className="text-slate-400">Acrylic on Canvas</p>
                <p className="mb-5 text-slate-500">24 × 36 in</p>
                <button className="px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                  View Details
                </button>
              </div>

            </div>

          </div>
        </div>

        {/* Speech bubble near auctioneer */}
        <div className="hidden lg:block absolute top-[28%] left-[61%] z-30 bg-[#12061f]/90 rounded-2xl p-4 border border-white/10 shadow-xl">
          <p>Going once...</p>
          <p>Going twice...</p>
          <p className="text-fuchsia-400 font-bold text-xl">Sold!</p>
        </div>


        {/* LIVE BID POPUPS ANCHORED TO HANDS */}
        {bids.map(b => (
          <div
            key={b.id}
            className="absolute z-30 bidFloat"
            style={{ left: `${b.x}%`, top: `${b.y}%` }}
          >
            <div className="relative -translate-x-1/2 -translate-y-full">

              <div className="bg-[#12061f]/95 backdrop-blur-xl border border-fuchsia-500/40 rounded-2xl px-4 py-3 shadow-[0_0_30px_rgba(168,85,247,.35)]">
                <div className="font-bold text-lg">
                  ₹{b.amount.toLocaleString()}
                </div>
                <div className="text-fuchsia-400 text-xs font-semibold">
                  {b.label}
                </div>

                <div className="absolute left-1/2 -bottom-2 w-4 h-4 bg-[#12061f] rotate-45 -translate-x-1/2" />
              </div>

            </div>
          </div>
        ))}

      </section>


      {/* ===== REST OF SITE SIMPLE PURPLE BACKGROUND ONLY ===== */}
      <section className="bg-[#0a0314] py-32 px-6 md:px-16">

        <div className="max-w-7xl mx-auto">

          <h2 className="text-4xl font-bold mb-16">
            Smarter Than The Market
          </h2>

          <div className="grid md:grid-cols-3 gap-8 mb-32">
            <div className="bg-[#12061f] border border-white/10 p-10 rounded-3xl">
              <h3 className="text-2xl font-bold mb-4">Predictive Bidding</h3>
              <p className="text-slate-400">
                AI estimates realistic bid ceilings.
              </p>
            </div>

            <div className="bg-[#12061f] border border-white/10 p-10 rounded-3xl">
              <h3 className="text-2xl font-bold mb-4">Fraud Protection</h3>
              <p className="text-slate-400">
                Shill detection protects every auction.
              </p>
            </div>

            <div className="bg-[#12061f] border border-white/10 p-10 rounded-3xl">
              <h3 className="text-2xl font-bold mb-4">Millisecond Broadcasts</h3>
              <p className="text-slate-400">
                Real-time WebSocket bidding.
              </p>
            </div>
          </div>

        </div>

      </section>

      <style>{`
@keyframes bidFloat{
0%{
opacity:0;
transform:translateY(20px) scale(.85);
}
20%{opacity:1}
80%{opacity:1}
100%{
opacity:0;
transform:translateY(-35px) scale(1);
}
}

.bidFloat{
animation:bidFloat 2.2s ease-out forwards;
}

@media(max-width:1024px){
.bidFloat{
display:none;
}
}

@media(max-width:768px){
h1{
font-size:3rem;
}
section{
height:100svh;
}
}
`}</style>

    </div>
  )
}
