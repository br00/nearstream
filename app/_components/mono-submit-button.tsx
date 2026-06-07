"use client";

import { useEffect, useRef, useState } from "react";

// Pending-aware submit button styled like the small mono affordances —
// "Refresh", "Refresh all", section labels. Mirrors SubmitButton's submit-
// event approach so the pending state flips before navigation begins, even on
// the no-JS-required form path.

interface MonoSubmitButtonProps {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
}

const baseClasses =
  "font-mono text-[10px] uppercase tracking-[0.2em] text-muted-soft transition-colors hover:text-foreground disabled:opacity-60 disabled:hover:text-muted-soft";

export function MonoSubmitButton({
  children,
  pendingLabel = "…",
  className,
}: MonoSubmitButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const form = ref.current?.form;
    if (!form) return;
    const handler = () => setPending(true);
    form.addEventListener("submit", handler);
    return () => form.removeEventListener("submit", handler);
  }, []);

  return (
    <button
      ref={ref}
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`${baseClasses} ${className ?? ""}`}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
