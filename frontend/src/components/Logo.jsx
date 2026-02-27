export default function Logo({ compact = false }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-r from-[#7C3AED] via-[#4F46E5] to-[#EC4899] text-sm font-semibold text-white shadow-[0_0_22px_rgba(124,58,237,0.45)]">
        BG
      </div>
      {!compact ? <span className="text-sm font-medium text-slate-200">BidGenie</span> : null}
    </div>
  );
}

