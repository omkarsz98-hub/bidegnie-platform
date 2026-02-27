export default function ConfidenceBar({ value = 0, className = "" }) {
  const safe = Math.max(0, Math.min(100, Number(value) || 0));

  return (
    <div className={`w-full ${className}`}>
      <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-2.5 rounded-full bg-gradient-to-r from-[#7C3AED] via-[#4F46E5] to-[#EC4899] transition-all duration-300"
          style={{ width: `${safe}%` }}
        />
      </div>
    </div>
  );
}

