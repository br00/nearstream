import type { InputHTMLAttributes } from "react";

const baseClasses =
  "w-full border-b border-border bg-transparent px-0 py-2 font-mono text-sm text-foreground outline-none transition-colors placeholder:text-muted-soft/60 focus:border-foreground";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export function Input({ className, ...rest }: InputProps) {
  return <input {...rest} className={`${baseClasses} ${className ?? ""}`} />;
}
