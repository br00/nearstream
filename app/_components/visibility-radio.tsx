import { Kicker } from "./kicker";
import { VISIBILITY_LEVELS, type Visibility } from "@/schemas/visibility";

const DESCRIPTIONS: Record<Visibility, string> = {
  public: "Anyone with the URL.",
  private: "Only you. Hidden from the public site and from your RSS feed.",
};

interface Props {
  /** Form field name. Default "visibility". */
  name?: string;
  /** Initial value for edit pages. Default "public". */
  defaultValue?: Visibility;
}

export function VisibilityRadio({
  name = "visibility",
  defaultValue = "public",
}: Props) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend>
        <Kicker>Visibility</Kicker>
      </legend>
      <div className="flex flex-col gap-2">
        {VISIBILITY_LEVELS.map((level) => (
          <label
            key={level}
            className="flex items-baseline gap-3 cursor-pointer"
          >
            <input
              type="radio"
              name={name}
              value={level}
              defaultChecked={level === defaultValue}
              className="accent-foreground"
            />
            <span className="flex flex-col gap-0.5">
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-foreground">
                {level}
              </span>
              <span className="text-[12px] text-muted-soft">
                {DESCRIPTIONS[level]}
              </span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
