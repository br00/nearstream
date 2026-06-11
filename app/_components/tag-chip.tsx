const chipClasses =
  "inline-block border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted";

interface TagChipProps {
  children: React.ReactNode;
  className?: string;
}

export function TagChip({ children, className }: TagChipProps) {
  return (
    <span className={`${chipClasses} ${className ?? ""}`}>{children}</span>
  );
}
