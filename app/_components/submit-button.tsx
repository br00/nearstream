"use client";

import { useEffect, useRef, useState } from "react";
import { buttonClasses } from "./button";

interface SubmitButtonProps {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
}

export function SubmitButton({
  children,
  pendingLabel,
  className,
}: SubmitButtonProps) {
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
      className={`${buttonClasses} ${className ?? ""}`}
    >
      {pending ? (pendingLabel ?? children) : children}
    </button>
  );
}
