// multilinear interpolation over the precomputed predictor grid
import type { GridAxis, PredictorGrid } from "./types";

export type ShotInput = Record<GridAxis, number>;

// index of the cell below v and how far v sits into it (0..1), clamped to the axis
function locate(axis: number[], v: number): [number, number] {
  const last = axis.length - 1;
  if (v <= axis[0]) return [0, 0];
  if (v >= axis[last]) return [last - 1, 1];
  let i = 0;
  while (axis[i + 1] < v) i++;
  return [i, (v - axis[i]) / (axis[i + 1] - axis[i])];
}

export function makePredictor(grid: PredictorGrid) {
  const axes = grid.order.map((k) => grid.axes[k]);
  const dims = axes.length;
  // row-major strides, last axis moves fastest (matches itertools.product)
  const strides = new Array<number>(dims).fill(1);
  for (let d = dims - 2; d >= 0; d--) strides[d] = strides[d + 1] * axes[d + 1].length;

  return function predict(input: ShotInput): number {
    const locs = grid.order.map((k, d) => locate(axes[d], input[k]));
    let sum = 0;
    // blend the 2^dims surrounding grid points
    for (let mask = 0; mask < 1 << dims; mask++) {
      let w = 1;
      let idx = 0;
      for (let d = 0; d < dims; d++) {
        const bit = (mask >> d) & 1;
        const [i, t] = locs[d];
        w *= bit ? t : 1 - t;
        idx += (i + bit) * strides[d];
      }
      if (w > 0) sum += w * grid.values[idx];
    }
    return sum / grid.scale;
  };
}

// histogram bin for v; the last bin includes its right edge, like numpy
function bin(edges: number[], v: number): number {
  const last = edges.length - 2;
  if (v === edges[last + 1]) return last;
  return edges.findIndex((e, k) => k <= last && v >= e && v < edges[k + 1]);
}

// real shots behind a distance x defender cell, for flagging thin regions
export function supportAt(grid: PredictorGrid, dist: number, def: number): number {
  const { dist_edges, def_edges, counts } = grid.support;
  const i = bin(dist_edges, dist);
  const j = bin(def_edges, def);
  return i < 0 || j < 0 ? 0 : counts[i][j];
}
