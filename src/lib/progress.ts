// Lightweight learning-progress store backed by localStorage. No state library,
// no backend — a browser API guarded for SSR (Astro renders these components on
// the server first). Tracks which lesson sections are completed and a simple
// daily streak. Goal-Gradient + Zeigarnik: visible, persistent progress pulls the
// learner back to finish.

const KEY = 'arithmetica:progress';

type Store = {
  done: Record<string, true>; // completed section ids
  lastVisit: string | null; // YYYY-MM-DD of last activity
  streak: number; // consecutive days
};

const empty: Store = { done: {}, lastVisit: null, streak: 0 };

const hasStorage = () => typeof window !== 'undefined' && !!window.localStorage;

function read(): Store {
  if (!hasStorage()) return { ...empty, done: {} };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...empty, done: {} };
    return { ...empty, ...JSON.parse(raw) } as Store;
  } catch {
    return { ...empty, done: {} };
  }
}

function write(s: Store) {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* quota / privacy mode — progress is best-effort, never blocks the UI */
  }
}

// Local calendar date (YYYY-MM-DD), not UTC — the streak day must roll over at
// the learner's local midnight, not at UTC midnight. Runs client-side only.
function localDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Record today's visit and update the consecutive-day streak. */
export function touchStreak(): number {
  const s = read();
  const now = new Date();
  const t = localDay(now);
  if (s.lastVisit === t) return s.streak; // already counted today
  const yesterday = localDay(new Date(now.getTime() - 864e5));
  s.streak = s.lastVisit === yesterday ? s.streak + 1 : 1;
  s.lastVisit = t;
  write(s);
  return s.streak;
}

export function getStreak(): number {
  return read().streak;
}

export function isComplete(id: string): boolean {
  return !!read().done[id];
}

const EVENT = 'arithmetica:progress-change';

/** Subscribe to progress changes (mark-complete / streak). Returns an unsubscribe
 *  fn. Lets the UI update immediately on change instead of polling localStorage. */
export function onProgressChange(fn: () => void): () => void {
  if (!hasStorage()) return () => {};
  window.addEventListener(EVENT, fn);
  return () => window.removeEventListener(EVENT, fn);
}

function emitChange() {
  if (hasStorage()) window.dispatchEvent(new CustomEvent(EVENT));
}

/** Mark a section complete. Returns true only on the first transition (so callers
 *  can fire a one-time celebration without re-triggering on every render). */
export function markComplete(id: string): boolean {
  const s = read();
  if (s.done[id]) return false;
  s.done[id] = true;
  write(s);
  emitChange();
  return true;
}

/** Fraction (0–1) of the given section ids that are complete. */
export function progress(ids: string[]): number {
  if (ids.length === 0) return 0;
  const s = read();
  const n = ids.filter((id) => s.done[id]).length;
  return n / ids.length;
}

export function completedCount(ids: string[]): number {
  const s = read();
  return ids.filter((id) => s.done[id]).length;
}
