// The plates kept for e2e. Province 00 does not exist, so they never meet a real plate and read
// as test data in the QA kho. They gather history run after run, so checks hold whatever a run
// before left behind: a colour that one rating decides, a count that grows by one.

/** Seeded by preflight, never rated by any test. A single rating of it breaks the lookup test. */
export const UNRATED = '00E000001';
/** Seeded rated; the rating test adds a bad rating each run. */
export const RATED = '00E000002';
/** Rated "Tốt" through a notification each run. */
export const REMINDED = '00E000003';
/** One character off the plates above, met by no one. A single lookup-then-rating of it breaks the lookup test. */
export const NEAR = '00E000009';
