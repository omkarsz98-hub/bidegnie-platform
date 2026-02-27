export default function HeatGauge({ value = 0, size = 96, label = "Heat" }) {
  const safe = Math.max(0, Math.min(100, Number(value) || 0));
  const inner = Math.max(16, size - 16);

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="grid place-items-center rounded-full"
        style={{
          width: size,
          height: size,
          background: `conic-gradient(#7C3AED ${safe}%, rgba(255,255,255,0.08) ${safe}% 100%)`,
          boxShadow: "0 0 24px rgba(124,58,237,0.28)"
        }}
      >
        <div
          className="grid place-items-center rounded-full bg-[#0F172A] text-sm font-semibold text-slate-100"
          style={{ width: inner, height: inner }}
        >
          {safe}%
        </div>
      </div>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}

