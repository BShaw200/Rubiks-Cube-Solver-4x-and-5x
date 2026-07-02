import { CubeModel } from './cubeModel.js';
import { COLORS } from '../colors.js';
import Cube from './kociemba/index.js';

// ============================================================================
// 4x4 reduction solver.
//
// Method (reduction):
//   1. (OLL parity) If the wing permutation-to-home is odd, apply one inner
//      inner-slice quarter turn first. A single slice turn toggles wing
//      permutation parity (verified). This makes wings solvable to home with
//      pure 3-cycles, which removes OLL parity (single-dedge-flip).
//   2. Solve all 24 centers to their standard home colors (uniform 2x2 blocks)
//      using a pure center 3-cycle primitive + setup moves.
//   3. Solve all 24 wings to their exact home (position + orientation) using a
//      pure wing 3-cycle primitive + setup moves. After this, all 12 dedges are
//      paired and at home (no OLL parity), and centers are untouched.
//   4. (PLL parity) If the corner permutation parity is odd (edges are now
//      identity/even, so this is a PLL-parity state, invalid for a 3x3), apply a
//      2-dedge-swap algorithm (verified: swaps two whole dedges, keeps them
//      paired, fixes corners; disturbs only some centers which we re-solve).
//      This flips edge permutation parity to match corner parity -> valid 3x3.
//   5. Solve the reduced 3x3 (corners + dedges + center blocks) with Kociemba.
//   6. Verify end-to-end on a fresh clone.
// ============================================================================

const SIZE = 4;
const EXT = SIZE - 1; // 3
const AXES = ['x', 'y', 'z'];
const AXI = { x: 0, y: 1, z: 2 };
const BLACK = COLORS.BLACK;
const COORDS = [-3, -1, 1, 3];
const ID = [1, 0, 0, 0, 1, 0, 0, 0, 1];

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
  if (n === 2) return 'wing';
  if (n === 1) return 'center';
  return 'internal';
}

// ---------- color / position helpers ----------
function posMap(model) {
  const map = new Map();
  for (const c of model.cubies) map.set(posKey(c.pos), c);
  return map;
}
// For a center piece, its single colored sticker always faces the outward
// direction of the face it currently occupies (geometric invariant, verified).
// So the first non-black color of the cubie at a face position is that face's color.
export function visibleColorAt(pmap, pos) {
  const c = pmap.get(posKey(pos));
  if (!c) return BLACK;
  for (const col of c.colors) if (col !== BLACK) return col;
  return BLACK;
}

// standard home color of a center position (the color it has when solved)
function homeFaceColor(pos) {
  if (pos[0] === EXT) return COLORS.BLUE;
  if (pos[0] === -EXT) return COLORS.GREEN;
  if (pos[1] === EXT) return COLORS.WHITE;
  if (pos[1] === -EXT) return COLORS.YELLOW;
  if (pos[2] === EXT) return COLORS.RED;
  return COLORS.ORANGE;
}

function allPositionsOfType(type) {
  const out = [];
  for (const x of COORDS) for (const y of COORDS) for (const z of COORDS) {
    const p = [x, y, z];
    if (pieceType(p) === type) out.push(p);
  }
  return out;
}

// ---------- verified primitives ----------
// Pure center 3-cycle (moves exactly 3 centers, 0 wings, 0 corners, 0 internal).
// Verified: slots [-3,1,1] -> [-1,1,-3] -> [-1,-1,-3] -> [-3,1,1]; 3x = identity (pos & R).
export const CENTER_PRIM = [
  mv('x', 0, 1), mv('y', 1, 1), mv('x', 0, -1), mv('y', 2, 1),
  mv('x', 0, 1), mv('y', 1, -1), mv('x', 0, -1), mv('y', 2, -1),
];
// Pure wing 3-cycle (moves exactly 3 wings, 0 centers, 0 corners, 0 internal).
// Verified: slots [-1,-3,-3] -> [3,-3,-1] -> [3,3,-1] -> [-1,-3,-3]; 3x = identity (pos & R).
export const WING_PRIM = [
  mv('x', 1, 1), mv('y', 3, 1), mv('x', 1, -1), mv('y', 0, 1),
  mv('x', 1, 1), mv('y', 3, -1), mv('x', 1, -1), mv('y', 0, -1),
];

// Derive the 3-cycle (b0->b1->b2->b0) of a pure primitive.
export function deriveCycle(prim, type) {
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

const CENTER_CYCLE = deriveCycle(CENTER_PRIM, 'center');
const WING_CYCLE = deriveCycle(WING_PRIM, 'wing');
const CB0 = CENTER_CYCLE[0], CB1 = CENTER_CYCLE[1], CB2 = CENTER_CYCLE[2];
const WB0 = WING_CYCLE[0], WB1 = WING_CYCLE[1], WB2 = WING_CYCLE[2];

// ---------- 3-position setup search ----------
function rotVec(axis, dir) {
  if (axis === 'x') return dir === 1 ? (p) => [p[0], -p[2], p[1]] : (p) => [p[0], p[2], -p[1]];
  if (axis === 'y') return dir === 1 ? (p) => [p[2], p[1], -p[0]] : (p) => [-p[2], p[1], p[0]];
  return dir === 1 ? (p) => [-p[1], p[0], p[2]] : (p) => [p[1], -p[0], p[2]];
}
function allQuarterMoves() {
  const out = [];
  for (const axis of AXES) for (let layer = 0; layer < SIZE; layer++) for (const d of [1, -1]) out.push(mv(axis, layer, d));
  return out;
}
// Find S with S(A)=tA, S(B)=tB, S(C)=tC.
export function findSetup3(A, tA, B, tB, C, tC, maxDepth = 8) {
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
export function permParity(p) {
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
export function decomposeEvenPerm(perm) {
  const n = perm.length;
  let R = perm.slice();
  const recorded = [];
  const cycInvArr = (t) => {
    const a = Array.from({ length: n }, (_, i) => i);
    const f = (p) => (p === t[0] ? t[2] : p === t[2] ? t[1] : p === t[1] ? t[0] : p);
    return a.map(f);
  };
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

// ============================================================================
// Stage 1: solve centers to standard home (uniform 2x2 blocks per face).
// ============================================================================
const CENTER_POSITIONS = allPositionsOfType('center');

function solveCenters(model, record) {
  const positions = CENTER_POSITIONS;
  const n = positions.length;
  const pmap = posMap(model);
  const cur = positions.map((p) => visibleColorAt(pmap, p));
  const need = positions.map((p) => homeFaceColor(p));

  // Build dest[i]=j (piece at i goes to j) with need[j]==cur[i], bijective, EVEN.
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
  // make even if needed (each color has 4 suppliers, so always possible)
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

  const cycles = decomposeEvenPerm(dest);
  for (const t of cycles) {
    const P = positions[t[0]], Q = positions[t[1]], R = positions[t[2]];
    const S = findSetup3(P, CB0, Q, CB1, R, CB2, 8);
    if (!S) return false;
    const full = S.concat(CENTER_PRIM, seqInverse(S));
    applySeq(model, full);
    for (const m of full) record.push(m);
  }
  return true;
}

export function centersSolved(model) {
  const pmap = posMap(model);
  for (const p of CENTER_POSITIONS) if (visibleColorAt(pmap, p) !== homeFaceColor(p)) return false;
  return true;
}

// ============================================================================
// Stage 2: solve wings to exact home (position + orientation).
// ============================================================================
const WING_POSITIONS = allPositionsOfType('wing');
const wingHomeIdx = new Map();
WING_POSITIONS.forEach((p, i) => wingHomeIdx.set(posKey(p), i));

export function wingPermutationParity(model) {
  const pmap = posMap(model);
  const dest = WING_POSITIONS.map((p) => wingHomeIdx.get(posKey(pmap.get(posKey(p)).home)));
  return permParity(dest);
}

function solveWingsHome(model, record) {
  const positions = WING_POSITIONS;
  const n = positions.length;
  const pmap = posMap(model);
  const dest = positions.map((p) => wingHomeIdx.get(posKey(pmap.get(posKey(p)).home)));
  if (permParity(dest) === 1) return false; // odd -> needs OLL fix first
  for (const t of decomposeEvenPerm(dest)) {
    const S = findSetup3(positions[t[0]], WB0, positions[t[1]], WB1, positions[t[2]], WB2, 8);
    if (!S) return false;
    const full = S.concat(WING_PRIM, seqInverse(S));
    applySeq(model, full);
    for (const m of full) record.push(m);
  }
  return true;
}

export function wingsHome(model) {
  for (const c of model.cubies) {
    if (pieceType(c.home) !== 'wing') continue;
    if (c.pos[0] !== c.home[0] || c.pos[1] !== c.home[1] || c.pos[2] !== c.home[2]) return false;
    if (c.R.some((v, i) => v !== ID[i])) return false;
  }
  return true;
}

// ============================================================================
// Stage 3: parity.
// ============================================================================
// Corner permutation parity (8 corners). Edges being identity after wing solve,
// an odd corner parity is a PLL-parity (invalid 3x3) state.
const CORNER_POSITIONS = allPositionsOfType('corner');
const cornerHomeIdx = new Map();
CORNER_POSITIONS.forEach((p, i) => cornerHomeIdx.set(posKey(p), i));
export function cornerPermutationParity(model) {
  const pmap = posMap(model);
  const dest = CORNER_POSITIONS.map((p) => cornerHomeIdx.get(posKey(pmap.get(posKey(p)).home)));
  return permParity(dest);
}

// PLL parity fix: 2R2 U2 2R2 u2 2R2 2U2
//   2R2 = inner right slice (x layer 2) 180
//   U2  = outer U (y layer 3) 180
//   u2  = WIDE u (y layers 2 and 3) 180
//   2U2 = inner u-slice (y layer 2) 180
// Verified effect: swaps two whole dedges (pairing preserved), fixes all corners,
// disturbs only some centers (re-solved afterwards) and internal pieces (ignored).
export const PLL_PARITY = (() => {
  const r2 = () => [mv('x', 2, 1), mv('x', 2, 1)];
  const U2 = () => [mv('y', 3, 1), mv('y', 3, 1)];
  const u2wide = () => [mv('y', 2, 1), mv('y', 2, 1), mv('y', 3, 1), mv('y', 3, 1)];
  const u2inner = () => [mv('y', 2, 1), mv('y', 2, 1)];
  return [...r2(), ...U2(), ...r2(), ...u2wide(), ...r2(), ...u2inner()];
})();

// ============================================================================
// Stage 4: reduced 4x4 -> 3x3 cubejs facelet string.
// For 4x4 the 3x3 grid cells are: corners (extreme,extreme in-face),
// edges/dedges (extreme, inner), centers (inner,inner). Map coord->cell:
//   extreme (+/-3) -> cell 0 or 2 ; inner (+/-1) -> cell 1 (middle).
// ============================================================================
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
const LOCAL_NORMALS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

function cellOf(coord, dir) {
  // coord is a world position component (±3 or ±1); map to 3x3 grid index 0..2
  const unit = Math.abs(coord) === EXT ? (coord > 0 ? 1 : -1) : 0; // inner (+/-1) -> 0
  return dir === 1 ? unit + 1 : 1 - unit;
}

export function model4ToFaceletString(model) {
  const arr = ('U'.repeat(9) + 'R'.repeat(9) + 'F'.repeat(9) + 'D'.repeat(9) + 'L'.repeat(9) + 'B'.repeat(9)).split('');
  for (const c of model.cubies) {
    const R = c.R;
    for (let i = 0; i < 6; i++) {
      const color = c.colors[i];
      if (color === BLACK) continue;
      const n = LOCAL_NORMALS[i];
      const wd = [
        R[0] * n[0] + R[1] * n[1] + R[2] * n[2],
        R[3] * n[0] + R[4] * n[1] + R[5] * n[2],
        R[6] * n[0] + R[7] * n[1] + R[8] * n[2],
      ];
      const face = worldDirToFace(wd);
      if (!face) continue;
      const info = FACE_INFO_3[face];
      const row = cellOf(c.pos[info.rowAxis], info.rowDir);
      const col = cellOf(c.pos[info.colAxis], info.colDir);
      if (row < 0 || row > 2 || col < 0 || col > 2) continue;
      const letter = COLOR_TO_FACE[color];
      if (letter) arr[info.base + row * 3 + col] = letter;
    }
  }
  return arr.join('');
}

// ---------- Kociemba solution -> 4x4 outer-layer moves ----------
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

// Solve the reduced 3x3 (centers uniform, edges paired) with Kociemba.
// Returns { moves, solved } where solved indicates the moves solve `work` (fresh-ish check).
function solveReduced3x3(work) {
  ensureKociemba();
  let facelets;
  try {
    facelets = model4ToFaceletString(work);
  } catch (e) {
    return null;
  }
  let solStr;
  try {
    const cube = Cube.fromString(facelets);
    solStr = cube.solve();
  } catch (e) {
    return null;
  }
  if (!solStr) return null;
  return parseKociemba(solStr);
}

// ============================================================================
// Main entry.
// ============================================================================
export function solve4(model) {
  if (model.size !== 4) return null;
  if (model.isSolved()) return [];

  const work = model.clone();
  const record = [];

  // --- Stage 1: OLL parity (wing permutation parity) ---
  if (wingPermutationParity(work) === 1) {
    const sl = mv('y', 1, 1);
    work.applyMove(sl);
    record.push(sl);
  }

  // --- Stage 2: solve centers to standard home ---
  if (!solveCenters(work, record)) return null;
  if (!centersSolved(work)) return null;

  // --- Stage 3: solve wings to exact home (removes OLL parity) ---
  if (!solveWingsHome(work, record)) return null;
  if (!wingsHome(work)) return null;

  // --- Stage 4: PLL parity ---
  if (cornerPermutationParity(work) === 1) {
    applySeq(work, PLL_PARITY);
    for (const m of PLL_PARITY) record.push(m);
    // re-solve the centers disturbed by the parity fix (pure; does not move wings/corners)
    if (!solveCenters(work, record)) return null;
    if (!centersSolved(work)) return null;
  }

  // --- Stage 5: solve the reduced 3x3 ---
  const moves3 = solveReduced3x3(work);
  if (!moves3) return null;
  applySeq(work, moves3);
  for (const m of moves3) record.push(m);

  // --- Stage 6: verify end-to-end on a fresh clone of the original ---
  const verify = model.clone();
  applySeq(verify, record);
  if (!verify.isSolved()) return null;

  return record;
}
