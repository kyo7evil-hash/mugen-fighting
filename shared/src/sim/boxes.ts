import type { Box } from './types.js';

/** World-space rectangle: x0<x1, y0<y1 (units). y up. */
export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/**
 * Resolve a fighter-local box to world space.
 * Local box origin is the foot point; +y up. facing 1 = right (no flip), -1 flips x.
 */
export function toWorld(box: Box, originX: number, originY: number, facing: 1 | -1): Rect {
  let lx0 = box.x;
  let lx1 = box.x + box.w;
  if (facing === -1) {
    const nx0 = -lx1;
    const nx1 = -lx0;
    lx0 = nx0;
    lx1 = nx1;
  }
  return {
    x0: originX + lx0,
    x1: originX + lx1,
    y0: originY + box.y,
    y1: originY + box.y + box.h,
  };
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
}

export function rectCentre(r: Rect): { x: number; y: number } {
  return { x: (r.x0 + r.x1) >> 1, y: (r.y0 + r.y1) >> 1 };
}

/** Overlap of two intervals, or 0. */
export function overlapX(a: Rect, b: Rect): number {
  return Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0));
}
