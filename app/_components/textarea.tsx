import type { ComponentProps } from "react";

const baseClasses =
  "w-full resize-none border border-border bg-transparent p-3 text-sm leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-soft/60 focus:border-foreground";

// `ComponentProps` rather than `TextareaHTMLAttributes` so `ref` comes
// through (a plain prop in React 19) — the markdown field inserts images at
// the caret and needs the element.
type TextareaProps = ComponentProps<"textarea">;

export function Textarea({ className, ...rest }: TextareaProps) {
  return (
    <textarea {...rest} className={`${baseClasses} ${className ?? ""}`} />
  );
}
