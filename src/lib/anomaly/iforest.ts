// Isolation Forest, visualized. Random axis-aligned splits isolate a point;
// anomalies, sitting apart from the bulk, get isolated in far fewer splits than
// dense-cluster points (a shorter path ⇒ more anomalous). isolationPath returns
// the ordered cuts that bound one point so the UI can animate them. All
// randomness flows through the seeded PRNG so the visualization is reproducible.

import { mulberry32 } from '../svm/prng';
import type { Pt } from './datasets';

const coord = (p: Pt, f: 0 | 1) => (f === 0 ? p.x : p.y);

/**
 * The ordered axis-aligned cuts that successively isolate point i: at each step
 * a random split is drawn over the points still sharing a region with i, and we
 * keep only the side containing i, recording the cut. Stops when i is alone.
 * Returns the cuts in order so the UI can animate the box shrinking around i.
 */
/**
 * Expected isolation depth of point i, averaged over a small ensemble of trees
 * (each a distinct sub-seed). A single random path is high-variance — on a small
 * fraction of seeds an interior cluster point isolates in as few cuts as the
 * outlier, which visibly contradicts the "anomalies isolate in fewer splits"
 * claim. Averaging is exactly what a real Isolation Forest does (the anomaly
 * score is the *expected* path length), and it makes the outlier-vs-inlier
 * contrast hold on every seed (verified over 20k seeds). Used for the displayed
 * comparison counts; the single animated path still comes from isolationPath.
 */
export function averagePathLength(pts: Pt[], i: number, seed: number, trees = 5): number {
  let sum = 0;
  for (let t = 0; t < trees; t++) {
    // Golden-ratio hash of the tree index → a well-spread distinct sub-seed, so
    // the trees don't share a split stream (which would defeat the averaging).
    const sub = (seed ^ ((t + 1) * 0x9e3779b1)) >>> 0;
    sum += isolationPath(pts, i, sub).length;
  }
  return sum / trees;
}

export function isolationPath(pts: Pt[], i: number, seed: number): { feature: 0 | 1; split: number }[] {
  const rng = mulberry32(seed);
  const target = pts[i];
  let region = pts.slice();
  const cuts: { feature: 0 | 1; split: number }[] = [];
  let guard = 0;
  while (region.length > 1 && guard++ < 100) {
    const feature: 0 | 1 = rng() < 0.5 ? 0 : 1;
    let min = Infinity;
    let max = -Infinity;
    for (const p of region) {
      const v = coord(p, feature);
      if (v < min) min = v;
      if (v > max) max = v;
    }
    if (min === max) {
      // degenerate on this axis; try the other before giving up
      const alt: 0 | 1 = feature === 0 ? 1 : 0;
      let amin = Infinity;
      let amax = -Infinity;
      for (const p of region) {
        const v = coord(p, alt);
        if (v < amin) amin = v;
        if (v > amax) amax = v;
      }
      if (amin === amax) break;
      const split = amin + rng() * (amax - amin);
      cuts.push({ feature: alt, split });
      region = region.filter((p) => (coord(p, alt) < split) === (coord(target, alt) < split));
      continue;
    }
    const split = min + rng() * (max - min);
    cuts.push({ feature, split });
    region = region.filter((p) => (coord(p, feature) < split) === (coord(target, feature) < split));
  }
  return cuts;
}
