import type { EmblemId } from './config';
import type { Polygons } from './geometry/box';

type Pt = [number, number];
type Contour = Pt[];

const TAU = Math.PI * 2;
const CIRCLE_SEGS = 40;

function cleanContour(pts: Pt[], ccw = true): Contour {
  const out: Pt[] = [];
  for (const [x, y] of pts) {
    const prev = out[out.length - 1];
    if (!prev || Math.hypot(x - prev[0], y - prev[1]) > 1e-7) out.push([x, y]);
  }
  if (
    out.length > 1 &&
    Math.hypot(out[0][0] - out[out.length - 1][0], out[0][1] - out[out.length - 1][1]) <= 1e-7
  ) {
    out.pop();
  }
  let area2 = 0;
  for (let i = 0; i < out.length; i++) {
    const [x1, y1] = out[i];
    const [x2, y2] = out[(i + 1) % out.length];
    area2 += x1 * y2 - x2 * y1;
  }
  if ((ccw && area2 < 0) || (!ccw && area2 > 0)) out.reverse();
  return out;
}

function arcPts(cx: number, cy: number, r: number, a0: number, a1: number, segs?: number): Pt[] {
  let da = a1 - a0;
  while (da <= -TAU) da += TAU;
  while (da > TAU) da -= TAU;
  const n = segs ?? Math.max(6, Math.ceil((CIRCLE_SEGS * Math.abs(da)) / TAU));
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + (da * i) / n;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as Pt;
  });
}

function circle(cx: number, cy: number, r: number, ccw = true, segs = CIRCLE_SEGS): Contour {
  return Array.from({ length: segs }, (_, i) => {
    const a = ((ccw ? 1 : -1) * TAU * i) / segs;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as Pt;
  });
}

function cubicPts(p0: Pt, p1: Pt, p2: Pt, p3: Pt, segs = 16): Pt[] {
  return Array.from({ length: segs + 1 }, (_, i) => {
    const t = i / segs;
    const u = 1 - t;
    return [
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ] as Pt;
  });
}

function roundedPoly(verts: Array<{ p: Pt; r: number }>, ccw = true): Contour {
  const pts: Pt[] = [];
  const n = verts.length;
  for (let i = 0; i < n; i++) {
    const A = verts[(i - 1 + n) % n].p;
    const B = verts[i].p;
    const C = verts[(i + 1) % n].p;
    const r = verts[i].r;
    if (r <= 0) {
      pts.push(B);
      continue;
    }
    const ux = A[0] - B[0],
      uy = A[1] - B[1];
    const vx = C[0] - B[0],
      vy = C[1] - B[1];
    const lu = Math.hypot(ux, uy),
      lv = Math.hypot(vx, vy);
    const u: Pt = [ux / lu, uy / lu];
    const v: Pt = [vx / lv, vy / lv];
    const bx = u[0] + v[0],
      by = u[1] + v[1];
    const lb = Math.hypot(bx, by);
    if (lb < 1e-6) {
      pts.push(B);
      continue;
    }
    const dir: Pt = [bx / lb, by / lb];
    const cosA = Math.min(0.999, Math.max(-0.999, u[0] * dir[0] + u[1] * dir[1]));
    const sinA = Math.sqrt(1 - cosA * cosA);
    const t = (r * cosA) / sinA;
    const ox = B[0] + dir[0] * (r / sinA);
    const oy = B[1] + dir[1] * (r / sinA);
    let a1 = Math.atan2(B[1] + u[1] * t - oy, B[0] + u[0] * t - ox);
    let a2 = Math.atan2(B[1] + v[1] * t - oy, B[0] + v[0] * t - ox);
    if (u[0] * v[1] - u[1] * v[0] < 0) {
      while (a2 <= a1) a2 += TAU;
    } else {
      while (a2 >= a1) a2 -= TAU;
    }
    pts.push(...arcPts(ox, oy, r, a1, a2));
  }
  return cleanContour(pts, ccw);
}

function buildFuoco(): Polygons {
  return [
    cleanContour([
      ...cubicPts([0, -11.5], [6.8, -11.5], [9.4, -6.5], [8.8, -0.5], 16),
      ...cubicPts([8.8, -0.5], [8.5, 2.5], [7.8, 4.4], [6.6, 5.2], 12),
      ...arcPts(5.9, 4.5, 1.0, 0.75, 2.7, 8),
      ...cubicPts([5.0, 4.9], [4.4, 3.0], [3.9, 1.8], [3.5, 1.8], 10),
      ...cubicPts([3.5, 1.8], [3.1, 1.8], [2.4, 6.5], [1.1, 10.6], 16),
      ...arcPts(0.0, 10.4, 1.1, 0.18, Math.PI - 0.18, 12),
      ...cubicPts([-1.1, 10.6], [-2.4, 6.8], [-3.2, 2.8], [-3.8, 2.8], 14),
      ...cubicPts([-3.8, 2.8], [-4.3, 2.8], [-4.8, 4.5], [-5.5, 5.6], 10),
      ...arcPts(-6.2, 4.9, 1.0, 0.75, 2.85, 8),
      ...cubicPts([-7.1, 5.2], [-9.4, 1.0], [-9.4, -6.5], [0, -11.5], 20),
    ]),
  ];
}

function buildAcqua(): Polygons {
  const cy = -3.5,
    R = 8.0,
    ty = 10.3,
    r = 1.2;
  const a = Math.asin((R - r) / (ty - cy));
  return [
    cleanContour([
      ...arcPts(0, cy, R, Math.PI - a, TAU + a, 32),
      ...arcPts(0, ty, r, a, Math.PI - a, 12),
    ]),
  ];
}

function buildSole(): Polygons {
  const polys: Polygons = [circle(0, 0, 5.2, true, 48)];
  const ray: Pt[] = [
    [6.8, -1.55],
    ...arcPts(10.65, 0, 0.85, -Math.PI / 2, Math.PI / 2, 12),
    [6.8, 1.55],
  ];
  for (let i = 0; i < 8; i++) {
    const theta = (i * TAU) / 8;
    const c = Math.cos(theta),
      s = Math.sin(theta);
    polys.push(cleanContour(ray.map(([x, y]): Pt => [x * c - y * s, x * s + y * c])));
  }
  return polys;
}

function buildCorona(): Polygons {
  const body = roundedPoly([
    { p: [-8.5, -5.3], r: 0.8 },
    { p: [8.5, -5.3], r: 0.8 },
    { p: [11.6, 8.2], r: 1.0 },
    { p: [4.8, -0.5], r: 0.9 },
    { p: [0, 10.7], r: 1.1 },
    { p: [-4.8, -0.5], r: 0.9 },
    { p: [-11.6, 8.2], r: 1.0 },
  ]);
  const band = roundedPoly([
    { p: [-8.5, -9.5], r: 1.1 },
    { p: [8.5, -9.5], r: 1.1 },
    { p: [8.5, -7.0], r: 1.1 },
    { p: [-8.5, -7.0], r: 1.1 },
  ]);
  return [body, band];
}

function shieldContour(inset: number, ccw: boolean): Contour {
  const w = 9.5 - inset,
    top = 11.2 - inset,
    sideY = 1.8,
    bot = -11.5 + inset * 1.15;
  const rC = 1.0,
    rB = 1.0;
  return cleanContour(
    [
      ...arcPts(-w + rC, top - rC, rC, Math.PI / 2, Math.PI, 8),
      [-w, sideY],
      ...cubicPts([-w, sideY], [-w, -4.5], [-w * 0.55, -8.8], [-rB * 0.72, bot + rB * 0.3], 16),
      ...arcPts(0, bot + rB, rB, -Math.PI * 0.75, -Math.PI * 0.25, 8),
      ...cubicPts([rB * 0.72, bot + rB * 0.3], [w * 0.55, -8.8], [w, -4.5], [w, sideY], 16),
      ...arcPts(w - rC, top - rC, rC, 0, Math.PI / 2, 8),
    ],
    ccw,
  );
}

function buildStella(): Polygons {
  const cy = -1.0,
    R = 12.75,
    rIn = 6.2;
  const verts = Array.from({ length: 10 }, (_, i) => {
    const a = Math.PI / 2 + (i * TAU) / 10;
    const rad = i % 2 === 0 ? R : rIn;
    return { p: [rad * Math.cos(a), cy + rad * Math.sin(a)] as Pt, r: i % 2 === 0 ? 1.0 : 0.6 };
  });
  return [roundedPoly(verts)];
}

export const EMBLEMS: Record<EmblemId, { label: string; polygons: Polygons }> = {
  fuoco: { label: 'Fuoco', polygons: buildFuoco() },
  acqua: { label: 'Acqua', polygons: buildAcqua() },
  sole: { label: 'Sole', polygons: buildSole() },
  corona: { label: 'Corona', polygons: buildCorona() },
  scudo: { label: 'Scudo', polygons: [shieldContour(0, true), shieldContour(2.6, false)] },
  stella: { label: 'Stella', polygons: buildStella() },
};
