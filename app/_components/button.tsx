import type { ButtonHTMLAttributes } from "react";

export const buttonClasses =
  "inline-flex cursor-pointer items-center justify-center border border-border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted transition-all hover:border-foreground hover:text-foreground hover:shadow-[0_0_12px_rgba(255,255,255,0.06)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:text-muted disabled:hover:shadow-none";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
}

export function Button({ className, children, ...rest }: ButtonProps) {
  return (
    <button
      type={rest.type ?? "button"}
      {...rest}
      className={`${buttonClasses} ${className ?? ""}`}
    >
      {children}
    </button>
  );
}
