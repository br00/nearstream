interface KickerProps {
  children: React.ReactNode;
  tone?: "soft" | "default";
  className?: string;
}

export function Kicker({ children, tone = "soft", className }: KickerProps) {
  const toneClass = tone === "soft" ? "text-muted-soft" : "text-muted";
  return (
    <p
      className={`font-mono text-[11px] uppercase tracking-[0.25em] ${toneClass} ${className ?? ""}`}
    >
      {children}
    </p>
  );
}
