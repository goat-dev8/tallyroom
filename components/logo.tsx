export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-semibold tracking-tight ${className}`}>
      <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden><rect width="32" height="32" rx="8" fill="#16181d" />
        <g strokeLinecap="round" strokeWidth="2.6"><path d="M9 8v16M14 8v16M19 8v16" stroke="#eceef1" /><path d="M24 8v16" stroke="#f5b83d" /><path d="M6 21L27 11" stroke="#f5b83d" /></g></svg>
      Tallyroom
    </span>
  );
}
