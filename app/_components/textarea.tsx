import type { TextareaHTMLAttributes } from "react";

const baseClasses =
  "w-full resize-none border border-border bg-transparent p-3 text-sm leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-soft/60 focus:border-foreground";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string;
}

export function Textarea({ className, ...rest }: TextareaProps) {
  return (
    <textarea {...rest} className={`${baseClasses} ${className ?? ""}`} />
  );
}
