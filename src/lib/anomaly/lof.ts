// Local Outlier Factor (LOF). LOF compares a point's local density to that of
// its neighbors: a point sitting in a sparser region than the points around it
// scores LOF > 1 and is flagged as a local anomaly. All functions are pure and
// operate on a flat point array indexed by position.

import type { Pt } from './datasets';

export function dist(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Indices of the k nearest neighbors of point i (excluding i itself). */
export function kNearest(pts: Pt[], i: number, k: number): number[] {
  const order = pts
    .map((p, j) => ({ j, d: dist(pts[i], p) }))
    .filter((o) => o.j !== i)
    .sort((a, b) => a.d - b.d);
  return order.slice(0, k).map((o) => o.j);
}

/** k-distance(i): distance from i to its k-th nearest neighbor. */
export function kDistance(pts: Pt[], i: number, k: number): number {
  const nn = kNearest(pts, i, k);
  if (nn.length === 0) return 0;
  return dist(pts[i], pts[nn[nn.length - 1]]);
}

/** reach-dist_k(a, b) = max( k-distance(b), dist(a, b) ). */
export function reachabilityDistance(pts: Pt[], a: number, b: number, k: number): number {
  return Math.max(kDistance(pts, b, k), dist(pts[a], pts[b]));
}

/**
 * Local reachability density: the inverse of the mean reachability distance
 * from i to its k neighbors. High lrd ⇒ i sits in a dense region.
 */
export function lrd(pts: Pt[], i: number, k: number): number {
  const nn = kNearest(pts, i, k);
  if (nn.length === 0) return 0;
  let sum = 0;
  for (const b of nn) sum += reachabilityDistance(pts, i, b, k);
  const mean = sum / nn.length;
  return mean === 0 ? Infinity : 1 / mean;
}

/** LOF(i) = mean over neighbors B of lrd(B) / lrd(i). ≈1 normal, >1 anomalous. */
export function lof(pts: Pt[], i: number, k: number): number {
  const nn = kNearest(pts, i, k);
  if (nn.length === 0) return 1;
  const lrdI = lrd(pts, i, k);
  if (!isFinite(lrdI) || lrdI === 0) return 1;
  let sum = 0;
  for (const b of nn) sum += lrd(pts, b, k) / lrdI;
  return sum / nn.length;
}

/**
 * LOF for every point, aligned to the input array. Computed with the neighbor
 * lists and k-distances cached once per call — the naive `pts.map((_, i) => lof(...))`
 * re-sorts the whole array O(n) times inside every nested lrd/reach-dist call,
 * making it ~O(k²·n²·log n) and janky to recompute each drag frame. Here each
 * point's kNN is found once, then k-distance / lrd / LOF read from those arrays.
 */
export function lofAll(pts: Pt[], k: number): number[] {
  const n = pts.length;
  if (n === 0) return [];

  // 1. kNN of every point, once (the only sorts in the whole computation).
  const nn: number[][] = pts.map((_, i) => kNearest(pts, i, k));

  // 2. k-distance(i) = distance to i's k-th (last) neighbor.
  const kdist = nn.map((list, i) => (list.length === 0 ? 0 : dist(pts[i], pts[list[list.length - 1]])));

  // 3. reach-dist_k(a, b) = max(k-distance(b), dist(a, b)) — read kdist from cache.
  const reach = (a: number, b: number) => Math.max(kdist[b], dist(pts[a], pts[b]));

  // 4. lrd(i) = 1 / mean reach-dist from i to its neighbors.
  const lrd = nn.map((list, i) => {
    if (list.length === 0) return 0;
    let sum = 0;
    for (const b of list) sum += reach(i, b);
    const mean = sum / list.length;
    return mean === 0 ? Infinity : 1 / mean;
  });

  // 5. LOF(i) = mean over neighbors of lrd(neighbor) / lrd(i).
  return nn.map((list, i) => {
    if (list.length === 0) return 1;
    const lrdI = lrd[i];
    if (!isFinite(lrdI) || lrdI === 0) return 1;
    let sum = 0;
    for (const b of list) sum += lrd[b] / lrdI;
    return sum / list.length;
  });
}
