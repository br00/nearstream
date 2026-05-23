const chipClasses =
  "inline-block border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted";

const radioChipClasses =
  "block cursor-pointer border border-border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-muted transition-all hover:text-foreground peer-checked:border-foreground peer-checked:text-foreground";

interface TagChipProps {
  children: React.ReactNode;
  className?: string;
}

export function TagChip({ children, className }: TagChipProps) {
  return (
    <span className={`${chipClasses} ${className ?? ""}`}>{children}</span>
  );
}

interface TagRadioProps {
  name: string;
  value: string;
  defaultChecked?: boolean;
  required?: boolean;
  children: React.ReactNode;
}

export function TagRadio({
  name,
  value,
  defaultChecked,
  required,
  children,
}: TagRadioProps) {
  return (
    <label>
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        required={required}
        className="peer sr-only"
      />
      <span className={radioChipClasses}>{children}</span>
    </label>
  );
}
