export default function GlassCard({ children, className = "", hover = true, ...props }) {
  return (
    <div
      {...props}
      className={`relative rounded-2xl border border-white/10 bg-[#111827]/75 backdrop-blur-xl shadow-[0_0_0_1px_rgba(124,58,237,0.12),0_20px_60px_rgba(0,0,0,0.45)] transition-all duration-300 ${
        hover ? "hover:-translate-y-1 hover:shadow-[0_0_0_1px_rgba(236,72,153,0.25),0_24px_70px_rgba(79,70,229,0.25)]" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
