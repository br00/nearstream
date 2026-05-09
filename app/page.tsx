import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const date = d.toISOString().slice(0, 10);
  const time = d.toTimeString().slice(0, 5);
  return `${date} ${time}`;
}

export default async function Home() {
  const entries = await store.list();

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-16">
      <header className="mb-12 flex items-baseline justify-between">
        <h1 className="font-mono text-sm uppercase tracking-widest text-zinc-500">
          Stream
        </h1>
        <a
          href="/studio"
          className="font-mono text-xs uppercase tracking-widest text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          Studio →
        </a>
      </header>

      {entries.length === 0 ? (
        <p className="font-mono text-sm text-zinc-400">
          No entries yet. Post one from the{" "}
          <a href="/studio" className="underline hover:text-zinc-900 dark:hover:text-zinc-100">
            studio
          </a>
          .
        </p>
      ) : (
        <ol className="flex flex-col gap-10">
          {entries.map((entry) => (
            <li key={entry.id} className="flex flex-col gap-2">
              <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-widest text-zinc-500">
                <time dateTime={entry.publishedAt}>
                  {formatTimestamp(entry.publishedAt)}
                </time>
                <span aria-hidden>·</span>
                <span>{entry.tag}</span>
              </div>
              <p className="whitespace-pre-wrap text-base leading-relaxed text-zinc-900 dark:text-zinc-100">
                {entry.text}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
