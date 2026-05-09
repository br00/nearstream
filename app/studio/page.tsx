import { DISCIPLINE_TAGS } from "@/schemas/stream";

export const metadata = {
  title: "Studio · Nearstream",
};

export default function StudioPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-16">
      <header className="mb-10 flex items-baseline justify-between">
        <h1 className="font-mono text-sm uppercase tracking-widest text-zinc-500">
          Studio
        </h1>
        <a
          href="/"
          className="font-mono text-xs uppercase tracking-widest text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          ← Stream
        </a>
      </header>

      <form
        action="/api/stream"
        method="POST"
        className="flex flex-col gap-6"
      >
        <label className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-widest text-zinc-500">
            Entry
          </span>
          <textarea
            name="text"
            required
            rows={5}
            placeholder="What are you doing right now?"
            className="resize-none rounded-md border border-zinc-200 bg-white p-3 text-base leading-relaxed text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </label>

        <fieldset className="flex flex-col gap-2">
          <legend className="font-mono text-xs uppercase tracking-widest text-zinc-500">
            Discipline
          </legend>
          <div className="flex flex-wrap gap-2">
            {DISCIPLINE_TAGS.map((tag, i) => (
              <label
                key={tag}
                className="cursor-pointer font-mono text-xs uppercase tracking-widest"
              >
                <input
                  type="radio"
                  name="tag"
                  value={tag}
                  defaultChecked={i === 0}
                  required
                  className="peer sr-only"
                />
                <span className="block rounded-full border border-zinc-200 px-3 py-1 text-zinc-500 peer-checked:border-zinc-900 peer-checked:bg-zinc-900 peer-checked:text-white dark:border-zinc-800 dark:peer-checked:border-zinc-100 dark:peer-checked:bg-zinc-100 dark:peer-checked:text-zinc-900">
                  {tag}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <button
          type="submit"
          className="self-start rounded-full bg-zinc-900 px-5 py-2 font-mono text-xs uppercase tracking-widest text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Post
        </button>
      </form>
    </div>
  );
}
