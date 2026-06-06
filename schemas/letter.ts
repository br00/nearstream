// The home page's "letter from Alessandro this week" — a small dated
// dispatch the site host updates as their head changes. Single record:
// there is only ever one current letter, not a list.

export type Letter = {
  /** Display string for the date — e.g. "June 6", "today", "midsummer 2026".
      Free-form so the host can be expressive about time. */
  date: string;
  /** The prose. Plain text (markdown could be supported later if needed). */
  body: string;
  /** ISO timestamp of the last update. Set by the store. */
  updatedAt: string;
};

export type NewLetter = Pick<Letter, "date" | "body">;
