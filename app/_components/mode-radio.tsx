import { MODE_TAGS, type ModeTag } from "@/schemas/stream";

// A picker row for the Stream "mode" tag. Each row is a clickable label that
// wraps a hidden radio + a chip + the hint string, so the whole row is the
// hit-target. Used in both the new-stream form and the edit-stream form.

type ModeRadioRowProps = {
  value: ModeTag;
  hint: string;
  defaultChecked: boolean;
  name?: string;
};

function ModeRadioRow({
  value,
  hint,
  defaultChecked,
  name = "tag",
}: ModeRadioRowProps) {
  return (
    <label className="flex cursor-pointer items-center gap-4">
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        required
        className="peer sr-only"
      />
      <span className="block min-w-[7.5rem] border border-border px-3 py-1.5 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-muted transition-colors peer-checked:border-foreground peer-checked:text-foreground">
        {value}
      </span>
      <span className="text-sm text-muted-soft">{hint}</span>
    </label>
  );
}

type ModeRadioGroupProps = {
  /** The mode currently on the entry. Falls back to DEFAULT_MODE if unrecognised. */
  current: ModeTag;
  name?: string;
};

export function ModeRadioGroup({ current, name }: ModeRadioGroupProps) {
  return (
    <div className="flex flex-col gap-3">
      {MODE_TAGS.map((mode) => (
        <ModeRadioRow
          key={mode.value}
          value={mode.value}
          hint={mode.hint}
          defaultChecked={mode.value === current}
          name={name}
        />
      ))}
    </div>
  );
}
