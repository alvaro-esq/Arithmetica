// Shared step-reveal animation for the "press Run and watch it reveal step by
// step" islands (gradient descent, optimizer race, value iteration). The reveal
// loop — a requestAnimationFrame tick that advances a counter every `interval`
// ms and stops at `total` — was copy-pasted across several components. This owns
// it. Client-only (rAF), so callers run it inside an $effect that already guards
// on a `running` flag; the returned cleanup cancels the frame.

export interface StepLoopOpts {
  /** ms between reveals */
  interval: number;
  /** stop once the counter reaches this */
  total: number;
  /** advance one step; return the new counter value */
  step: () => number;
  /** called when the counter reaches `total` (to clear the running flag) */
  onDone: () => void;
}

/**
 * Start a rAF reveal loop. Returns a cleanup that cancels the pending frame —
 * return it from the calling $effect. requestAnimationFrame is unavailable during
 * SSR, so call this only from an effect (which never runs on the server).
 */
export function stepLoop(opts: StepLoopOpts): () => void {
  let raf = 0;
  let last = 0;
  function tick(ts: number) {
    // Seed `last` on the first frame: `ts` is a page-relative timestamp already
    // in the thousands, so comparing against 0 would fire the first step with no
    // delay. Anchoring to the first tick makes the initial reveal wait `interval`.
    if (last === 0) last = ts;
    if (ts - last >= opts.interval) {
      last = ts;
      if (opts.step() >= opts.total) {
        opts.onDone();
        return;
      }
    }
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}
