export default function GlowButton({
  children,
  className = "",
  variant = "primary",
  ...props
}) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-5 py-2.5 font-medium transition-all duration-300";

  const styles =
    variant === "ghost"
      ? "border border-white/15 bg-white/5 text-slate-100 hover:bg-white/10 hover:-translate-y-0.5"
      : "bg-gradient-to-r from-[#7C3AED] via-[#4F46E5] to-[#EC4899] text-white shadow-[0_10px_35px_rgba(124,58,237,0.35)] hover:-translate-y-0.5 hover:shadow-[0_14px_40px_rgba(236,72,153,0.35)]";

  return (
    <button className={`${base} ${styles} ${className}`} {...props}>
      {children}
    </button>
  );
}

