// The home page's "letter from Alessandro this week" — a small dispatch
// the site host updates as their head changes. Single record: there is
// only ever one current letter, not a list.
//
// The displayed date is derived from `updatedAt` at render time, so the
// host doesn't have to write a date by hand — updating IS dating.

export type Letter = {
  /** The prose. Plain text. */
  body: string;
  /** ISO timestamp of the last update. Set by the store; rendered as the
      displayed date ("JUNE 6") at request time. */
  updatedAt: string;
};

export type NewLetter = Pick<Letter, "body">;
