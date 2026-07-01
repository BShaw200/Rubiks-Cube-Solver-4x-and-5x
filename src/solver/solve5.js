import { CubeModel } from './cubeModel.js';
import { COLORS } from '../colors.js';
import Cube from './kociemba/index.js';

const SIZE = 5;
const AXES = ['x', 'y', 'z'];
const AXI = { x: 0, y: 1, z: 2 };
const BLACK = COLORS.BLACK;

const EXT = SIZE - 1; // 4
const COORDS = [-4, -2, 0, 2, 4];

// ---------- low level move helpers ----------
export function mv(axis, layer, direction) {
  return { axis, layer, direction };
}
export function inv(m) {
  return { axis: m.axis, layer: m.layer, direction: -m.direction };
}
export function applySeq(model, seq) {
  for (const m of seq) model.applyMove(m);
}
export function seqInverse(seq) {
  return seq.map(inv).reverse();
}

function posKey(p) {
  return p[0] + ',' + p[1] + ',' + p[2];
}
function parseKey(k) {
  return k.split(',').map(Number);
}

// ---------- classification ----------
function numExt(c) {
  return (Math.abs(c[0]) === EXT ? 1 : 0) + (Math.abs(c[1]) === EXT ? 1 : 0) + (Math.abs(c[2]) === EXT ? 1 : 0);
}
export function pieceType(pos) {
  const n = numExt(pos);
  if (n === 3) return 'corner';
  if (n === 2) {
    const inner = pos.filter((v) => Math.abs(v) !== EXT);
    return inner[0] === 0 ? 'midedge' : 'wing';
  }
  if (n === 1) {
    const inner = pos.filter((v) => Math.abs(v) !== EXT);
    return inner[0] === 0 && inner[1] === 0 ? 'centerFixed' : 'center';
  }
  return 'internal';
}
export function centerSubtype(pos) {
  const inner = pos.filter((v) => Math.abs(v) !== EXT);
  return inner[0] !== 0 && inner[1] !== 0 ? 'x' : 'p';
}

// ---------- color helpers ----------

// Build a position -> cubie map for a model
function posMap(model) {
  const map = new Map();
  for (const c of model.cubies) map.set(posKey(c.pos), c);
  return map;
}
// color visible (non-black) of the cubie at a position; for centers/corners/edges/midedges
function visibleColorAt(pmap, pos) {
  const c = pmap.get(posKey(pos));
  if (!c) return BLACK;
  for (const col of c.colors) if (col !== BLACK) return col;
  return BLACK;
}

// ---------- lists of positions ----------
function allCenterPositions(subtype) {
  const out = [];
  for (const x of COORDS)
    for (const y of COORDS)
      for (const z of COORDS) {
        const p = [x, y, z];
        if (pieceType(p) === 'center' && centerSubtype(p) === subtype) out.push(p);
      }
  return out;
}

// ---------- verified center 3-cycle primitives ----------
// Derived via commutator search; each is a PURE center 3-cycle (only 3 centers move).
// X-centers: P=[x0+, y1+, x0-], Q=[y3+]
const X_PRIM = [
  mv('x', 0, 1), mv('y', 1, 1), mv('x', 0, -1), mv('y', 3, 1),
  mv('x', 0, 1), mv('y', 1, -1), mv('x', 0, -1), mv('y', 3, -1),
];
// +-centers: P=[x0+, y1+, x0-], Q=[y2+]
const P_PRIM = [
  mv('x', 0, 1), mv('y', 1, 1), mv('x', 0, -1), mv('y', 2, 1),
  mv('x', 0, 1), mv('y', 1, -1), mv('x', 0, -1), mv('y', 2, -1),
];

// ---------- wing 3-cycle primitive (center-exact-fixed, pure wing) ----------
// P=[x0+, y0+, x0-], Q=[y1+]  -> cycles 3 wings, fixes everything else.
export const WING_PRIM = [
  mv('x', 0, 1), mv('y', 0, 1), mv('x', 0, -1), mv('y', 1, 1),
  mv('x', 0, 1), mv('y', 0, -1), mv('x', 0, -1), mv('y', 1, -1),
];

// Derive the 3-cycle (b0->b1->b2->b0) of a pure center primitive.
function deriveCycle(prim, type = 'center') {
  const m = new CubeModel(SIZE);
  applySeq(m, prim);
  const map = new Map();
  for (const c of m.cubies) {
    if (pieceType(c.home) !== type) continue;
    if (c.pos[0] !== c.home[0] || c.pos[1] !== c.home[1] || c.pos[2] !== c.home[2]) {
      map.set(posKey(c.home), posKey(c.pos));
    }
  }
  const homes = [...map.keys()];
  if (homes.length !== 3) throw new Error('primitive not a clean ' + type + ' 3-cycle: ' + homes.length);
  const h0 = homes[0];
  const cyc = [h0];
  let cur = map.get(h0);
  while (cur !== h0) {
    cyc.push(cur);
    cur = map.get(cur);
  }
  return cyc.map(parseKey); // [b0,b1,b2]
}

// ---------- move generators ----------
function allQuarterMoves() {
  const out = [];
  for (const axis of AXES)
    for (let layer = 0; layer < SIZE; layer++)
      for (const d of [1, -1]) out.push(mv(axis, layer, d));
  return out;
}
function rotVec(axis, dir) {
  // returns function p->rotated p for a 90deg turn of that layer
  if (axis === 'x')
    return dir === 1 ? (p) => [p[0], -p[2], p[1]] : (p) => [p[0], p[2], -p[1]];
  if (axis === 'y')
    return dir === 1 ? (p) => [p[2], p[1], -p[0]] : (p) => [-p[2], p[1], p[0]];
  return dir === 1 ? (p) => [-p[1], p[0], p[2]] : (p) => [p[1], -p[0], p[2]];
}

// ---------- 3-position setup search: S with S(A)=tA, S(B)=tB, S(C)=tC ----------
function findSetup3(A, tA, B, tB, C, tC, maxDepth = 7) {
  const k = (a, b, c) => a[0] + ',' + a[1] + ',' + a[2] + '|' + b[0] + ',' + b[1] + ',' + b[2] + '|' + c[0] + ',' + c[1] + ',' + c[2];
  const goal = k(tA, tB, tC);
  const start = k(A, B, C);
  if (start === goal) return [];
  const moves = allQuarterMoves();
  const seen = new Map();
  seen.set(start, []);
  let frontier = [[A, B, C]];
  for (let depth = 0; depth < maxDepth; depth++) {
    const next = [];
    for (const st of frontier) {
      const path = seen.get(k(st[0], st[1], st[2]));
      for (const mm of moves) {
        const ai = AXI[mm.axis];
        const tgt = 2 * mm.layer - (SIZE - 1);
        const rot = rotVec(mm.axis, mm.direction);
        const na = st[0][ai] === tgt ? rot(st[0]) : st[0];
        const nb = st[1][ai] === tgt ? rot(st[1]) : st[1];
        const nc = st[2][ai] === tgt ? rot(st[2]) : st[2];
        const key = k(na, nb, nc);
        if (seen.has(key)) continue;
        const npath = path.concat(mm);
        if (key === goal) return npath;
        seen.set(key, npath);
        next.push([na, nb, nc]);
      }
    }
    frontier = next;
    if (frontier.length === 0) break;
  }
  return null;
}

// ---------- permutation parity & even decomposition into 3-cycles ----------
function permParity(p) {
  const n = p.length;
  const v = new Array(n).fill(false);
  let c = 0;
  for (let i = 0; i < n; i++) {
    if (!v[i]) {
      let j = i, len = 0;
      while (!v[j]) { v[j] = true; j = p[j]; len++; }
      c += len - 1;
    }
  }
  return c % 2;
}
// perm[i] = destination of piece currently at i. Returns 3-cycles [a,b,c] (a->b->c->a)
// in apply-order (first applied first) whose net == perm. perm must be even.
function decomposeEvenPerm(perm) {
  const n = perm.length;
  let R = perm.slice();
  const recorded = [];
  const cycInvArr = (t) => { const a = Array.from({ length: n }, (_, i) => i); const f = (p) => (p === t[0] ? t[2] : p === t[2] ? t[1] : p === t[1] ? t[0] : p); return a.map(f); };
  let guard = 0;
  const isId = (p) => p.every((x, i) => x === i);
  while (!isId(R) && guard++ < n * n + 10) {
    let i = 0; while (i < n && R[i] === i) i++;
    if (i >= n) break;
    const x = R[i];
    let c1;
    if (R[x] !== i) { c1 = [i, x, R[x]]; }
    else {
      let z = i + 1; while (z < n && (R[z] === z || z === x)) z++;
      if (z >= n) { z = 0; while (z < n && (R[z] === z || z === i || z === x)) z++; }
      c1 = [i, x, z];
    }
    recorded.push(c1);
    const cinv = cycInvArr(c1);
    const nR = new Array(n);
    for (let q = 0; q < n; q++) nR[q] = cinv[R[q]];
    R = nR;
  }
  return recorded.slice().reverse();
}

// ---------- center solving via even-permutation decomposition ----------
// Face colors are determined by the FIXED (dead-center) cubies, which middle-slice
// scrambles can relocate. Non-fixed centers must be solved to match each face's fixed center.
const FIXED_CENTERS = [
  [EXT, 0, 0], [-EXT, 0, 0], [0, EXT, 0], [0, -EXT, 0], [0, 0, EXT], [0, 0, -EXT],
];
function faceKeyOf(pos) {
  if (pos[0] === EXT) return '0+';
  if (pos[0] === -EXT) return '0-';
  if (pos[1] === EXT) return '1+';
  if (pos[1] === -EXT) return '1-';
  if (pos[2] === EXT) return '2+';
  return '2-';
}
function computeFaceColors(model) {
  const pmap = posMap(model);
  const fc = {};
  for (const f of FIXED_CENTERS) fc[faceKeyOf(f)] = visibleColorAt(pmap, f);
  return fc;
}
function needColorForFace(fc, pos) {
  return fc[faceKeyOf(pos)];
}

function solveCentersOfType(model, subtype, record, fc) {
  const prim = subtype === 'x' ? X_PRIM : P_PRIM;
  const cycle = deriveCycle(prim, 'center'); // [b0,b1,b2]
  const b0 = cycle[0], b1 = cycle[1], b2 = cycle[2];
  const positions = allCenterPositions(subtype);
  const n = positions.length;

  // current colors and needed colors per position index
  const pmap = posMap(model);
  const cur = positions.map((p) => visibleColorAt(pmap, p));
  const need = positions.map((p) => needColorForFace(fc, p));

  // Build a matching dest[i]=j (piece at i goes to j) with need[j]==cur[i], bijective, EVEN.
  const dest = new Array(n);
  const demByColor = new Map();
  for (let j = 0; j < n; j++) {
    const c = need[j];
    if (!demByColor.has(c)) demByColor.set(c, []);
    demByColor.get(c).push(j);
  }
  const demPtr = new Map();
  for (const c of demByColor.keys()) demPtr.set(c, 0);
  for (let i = 0; i < n; i++) {
    const list = demByColor.get(cur[i]);
    const ptr = demPtr.get(cur[i]);
    dest[i] = list[ptr];
    demPtr.set(cur[i], ptr + 1);
  }
  // make even if needed: flip parity by swapping two demanders of a color with >=2 suppliers
  if (permParity(dest) === 1) {
    outer: for (const c of demByColor.keys()) {
      const suppliers = [];
      for (let i = 0; i < n; i++) if (cur[i] === c) suppliers.push(i);
      if (suppliers.length >= 2) {
        const i0 = suppliers[0], i1 = suppliers[1];
        const tmp = dest[i0]; dest[i0] = dest[i1]; dest[i1] = tmp;
        break outer;
      }
    }
  }

  const cycles = decomposeEvenPerm(dest); // list of index-triples
  for (const t of cycles) {
    const P = positions[t[0]], Q = positions[t[1]], R = positions[t[2]];
    const S = findSetup3(P, b0, Q, b1, R, b2, 7);
    if (!S) return false;
    const full = S.concat(prim, seqInverse(S));
    applySeq(model, full);
    for (const m of full) record.push(m);
  }
  return true;
}

function centersSolved(model) {
  const fc = computeFaceColors(model);
  const pmap = posMap(model);
  for (const p of allCenterPositions('x')) if (visibleColorAt(pmap, p) !== needColorForFace(fc, p)) return false;
  for (const p of allCenterPositions('p')) if (visibleColorAt(pmap, p) !== needColorForFace(fc, p)) return false;
  return true;
}

// ---------- exported partials (for testing) ----------
export {
  deriveCycle,
  findSetup3,
  decomposeEvenPerm,
  permParity,
  allCenterPositions as _allCenterPositions,
  visibleColorAt as _visibleColorAt,
  posMap as _posMap,
  solveCentersOfType as _solveCentersOfType,
  restoreFixedCenters as _restoreFixedCenters,
  computeFaceColors as _computeFaceColors,
  wingPermutationParity as _wingParity,
  solveWingsHome as _solveWingsHome,
  centersSolved as _centersSolved,
  X_PRIM,
  P_PRIM,
};

export function _solveCentersStage(model) {
  const m = model.clone();
  const record = [];
  const fc = computeFaceColors(m);
  const okX = solveCentersOfType(m, 'x', record, fc);
  const okP = solveCentersOfType(m, 'p', record, fc);
  return { model: m, moves: record, ok: okX && okP && centersSolved(m) };
}

// ---------- wing solving (phase 1) ----------
const WING_CYCLE = deriveCycle(WING_PRIM, 'wing');
const WB0 = WING_CYCLE[0], WB1 = WING_CYCLE[1], WB2 = WING_CYCLE[2];

// ---------- restore FIXED centers to standard via middle-slice BFS ----------
// Fixed (dead-center) cubies move ONLY under middle-slice (layer 2) turns. Restoring them
// to their home positions makes every face's target color standard, which lets wings be
// solved to standard home (correct orientation) and lets Kociemba solve a standard 3x3.
const MID_SLICES = [
  mv('x', 2, 1), mv('x', 2, -1),
  mv('y', 2, 1), mv('y', 2, -1),
  mv('z', 2, 1), mv('z', 2, -1),
];
function restoreFixedCenters(model, record) {
  // BFS over middle slices to bring each fixed (dead-center) cubie back to its home.
  // Track the CURRENT position of each of the 6 fixed-center cubies.
  const cubieByHome = new Map();
  for (const c of model.cubies) if (pieceType(c.home) === 'centerFixed') cubieByHome.set(posKey(c.home), c);
  const start = FIXED_CENTERS.map((h) => cubieByHome.get(posKey(h)).pos.slice());
  const goalKey = FIXED_CENTERS.map((h) => posKey(h)).join('|');
  const startKey = start.map(posKey).join('|');
  if (startKey === goalKey) return true;
  const seen = new Set([startKey]);
  let frontier = [{ state: start, path: [] }];
  for (let depth = 0; depth < 16; depth++) {
    const next = [];
    for (const st of frontier) {
      for (const mm of MID_SLICES) {
        const ai = AXI[mm.axis];
        const tgt = 2 * mm.layer - (SIZE - 1);
        const rot = rotVec(mm.axis, mm.direction);
        const ns = st.state.map((p) => (p[ai] === tgt ? rot(p) : p));
        const key = ns.map(posKey).join('|');
        if (seen.has(key)) continue;
        seen.add(key);
        const npath = st.path.concat(mm);
        if (key === goalKey) {
          applySeq(model, npath);
          for (const m of npath) record.push(m);
          return true;
        }
        next.push({ state: ns, path: npath });
      }
    }
    frontier = next;
    if (!frontier.length) break;
  }
  return false;
}

function allWingPositions() {
  const out = [];
  for (const x of COORDS) for (const y of COORDS) for (const z of COORDS) {
    const p = [x, y, z];
    if (pieceType(p) === 'wing') out.push(p);
  }
  return out;
}

// parity (mod 2) of the wing permutation "piece at position i -> its home"
function wingPermutationParity(model) {
  const positions = allWingPositions();
  const homeIdx = new Map();
  positions.forEach((p, i) => homeIdx.set(posKey(p), i));
  const pmap = posMap(model);
  const dest = positions.map((p) => homeIdx.get(posKey(pmap.get(posKey(p)).home)));
  return permParity(dest);
}

// Place every wing at its exact home (orientation is automatic for even parity).
function solveWingsHome(model, record) {
  const positions = allWingPositions();
  const n = positions.length;
  const homeIdx = new Map();
  positions.forEach((p, i) => homeIdx.set(posKey(p), i));
  const pmap = posMap(model);
  const dest = positions.map((p) => homeIdx.get(posKey(pmap.get(posKey(p)).home)));
  for (const t of decomposeEvenPerm(dest)) {
    const S = findSetup3(positions[t[0]], WB0, positions[t[1]], WB1, positions[t[2]], WB2, 7);
    if (!S) return false;
    const full = S.concat(WING_PRIM, seqInverse(S));
    applySeq(model, full);
    for (const m of full) record.push(m);
  }
  return true;
}

// ---------- 5x5 reduced cube -> 3x3 cubejs facelet string ----------
// Reuses the per-face row/col conventions from facelets.js, but only places stickers
// whose in-face grid coordinates are integral (0,1,2): corners, midedges, and fixed centers.
const COLOR_TO_FACE = {
  [COLORS.WHITE]: 'U', [COLORS.YELLOW]: 'D', [COLORS.RED]: 'F',
  [COLORS.ORANGE]: 'B', [COLORS.BLUE]: 'R', [COLORS.GREEN]: 'L',
};
const FACE_INFO_3 = {
  U: { base: 0, rowAxis: 2, rowDir: 1, colAxis: 0, colDir: 1 },
  R: { base: 9, rowAxis: 1, rowDir: -1, colAxis: 2, colDir: -1 },
  F: { base: 18, rowAxis: 1, rowDir: -1, colAxis: 0, colDir: 1 },
  D: { base: 27, rowAxis: 2, rowDir: -1, colAxis: 0, colDir: 1 },
  L: { base: 36, rowAxis: 1, rowDir: -1, colAxis: 2, colDir: 1 },
  B: { base: 45, rowAxis: 1, rowDir: -1, colAxis: 0, colDir: -1 },
};
function worldDirToFace(wd) {
  if (wd[0] === 1) return 'R';
  if (wd[0] === -1) return 'L';
  if (wd[1] === 1) return 'U';
  if (wd[1] === -1) return 'D';
  if (wd[2] === 1) return 'F';
  if (wd[2] === -1) return 'B';
  return null;
}
function gridIdx(unit, dir) { return dir === 1 ? unit + 1 : 1 - unit; }

export function model5ToFaceletString(model) {
  const denom = SIZE - 1; // 4
  const arr = ('U'.repeat(9) + 'R'.repeat(9) + 'F'.repeat(9) + 'D'.repeat(9) + 'L'.repeat(9) + 'B'.repeat(9)).split('');
  const LN2 = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  for (const c of model.cubies) {
    const unit = [c.pos[0] / denom, c.pos[1] / denom, c.pos[2] / denom];
    const R = c.R;
    for (let i = 0; i < 6; i++) {
      const color = c.colors[i];
      if (color === BLACK) continue;
      const n = LN2[i];
      const wd = [
        R[0] * n[0] + R[1] * n[1] + R[2] * n[2],
        R[3] * n[0] + R[4] * n[1] + R[5] * n[2],
        R[6] * n[0] + R[7] * n[1] + R[8] * n[2],
      ];
      const face = worldDirToFace(wd);
      if (!face) continue;
      const info = FACE_INFO_3[face];
      const row = gridIdx(unit[info.rowAxis], info.rowDir);
      const col = gridIdx(unit[info.colAxis], info.colDir);
      // only integral grid cells (corners/midedges/fixed-centers); skip wings & movable centers
      if (row !== Math.round(row) || col !== Math.round(col)) continue;
      if (row < 0 || row > 2 || col < 0 || col > 2) continue;
      const letter = COLOR_TO_FACE[color];
      if (letter) arr[info.base + row * 3 + col] = letter;
    }
  }
  return arr.join('');
}

// ---------- Kociemba solution -> 5x5 outer-layer moves ----------
const FACE_AXIS_SIGN = {
  R: { axis: 'x', plus: true }, L: { axis: 'x', plus: false },
  U: { axis: 'y', plus: true }, D: { axis: 'y', plus: false },
  F: { axis: 'z', plus: true }, B: { axis: 'z', plus: false },
};
function parseKociemba(str) {
  const moves = [];
  for (const tok of str.trim().split(/\s+/).filter(Boolean)) {
    const face = tok[0];
    const mod = tok.slice(1);
    const info = FACE_AXIS_SIGN[face];
    if (!info) continue;
    const layer = info.plus ? SIZE - 1 : 0;
    const base = info.plus ? -1 : 1;
    if (mod === '') moves.push({ axis: info.axis, layer, direction: base });
    else if (mod === "'") moves.push({ axis: info.axis, layer, direction: -base });
    else if (mod === '2') { moves.push({ axis: info.axis, layer, direction: base }); moves.push({ axis: info.axis, layer, direction: base }); }
  }
  return moves;
}

let kociembaInit = false;
function ensureKociemba() { if (!kociembaInit) { Cube.initSolver(); kociembaInit = true; } }

export function solve5(model) {
  if (model.size !== 5) return null;
  if (model.isSolved()) return [];
  const work = model.clone();
  const record = [];

  // Phase A: restore FIXED centers to standard via middle slices. This makes every face's
  // target color standard, so wings can be solved to standard home (correct orientation)
  // and the reduced 3x3 has standard centers.
  if (!restoreFixedCenters(work, record)) return null;

  // Phase B: if the wing permutation to home is odd, flip wing-parity (== center-parity) to
  // even with a single inner-slice turn. This guarantees the reduced 3x3 is a valid state.
  if (wingPermutationParity(work) === 1) {
    const sl = mv('y', 1, 1);
    work.applyMove(sl);
    record.push(sl);
  }

  // Phase C: solve non-fixed centers to match the (now standard) fixed centers.
  const fc = computeFaceColors(work);
  const okX = solveCentersOfType(work, 'x', record, fc);
  const okP = solveCentersOfType(work, 'p', record, fc);
  if (!okX || !okP || !centersSolved(work)) return null;

  // Phase D: solve the reduced 3x3 (corners + midedges, standard centers) with Kociemba.
  ensureKociemba();
  let moves3;
  try {
    const facelets = model5ToFaceletString(work);
    const cube = Cube.fromString(facelets);
    const solStr = cube.solve();
    if (!solStr) return null;
    moves3 = parseKociemba(solStr);
  } catch (e) {
    return null;
  }
  applySeq(work, moves3);
  for (const m of moves3) record.push(m);

  // Phase E: solve wings to standard home (pure-wing primitive; does not disturb the now
  // solved centers / midedges / corners). Orientation is automatic for even parity.
  if (!solveWingsHome(work, record)) return null;

  // Verify end-to-end on a fresh clone of the original model.
  const verify = model.clone();
  applySeq(verify, record);
  if (!verify.isSolved()) return null;

  return record;
}
