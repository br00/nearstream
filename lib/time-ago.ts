// "Time since" helper, server-safe (immune to timezone mismatch between the
// Vercel function host and the user's browser). Both the stored ISO and
// `Date.now()` are absolute instants, so the duration is correct regardless
// of where this is evaluated.
//
// Output is intentionally tight and lowercase — meant to live inside small
// mono labels ("Last fetched 2m ago"). It is not an i18n function and never
// will be at this scale.

export function timeAgo(iso: string, now: number = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}
