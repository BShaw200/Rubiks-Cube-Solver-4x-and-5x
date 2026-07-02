import Cube from './kociemba/index.js';
import { modelToFaceletString } from './facelets.js';
import { solve5 } from './solve5.js';
import { solve4 } from './solve4.js';

let initialized = false;

function ensureInit() {
  if (!initialized) {
    Cube.initSolver();
    initialized = true;
  }
}

const FACE_AXIS_SIGN = {
  R: { axis: 'x', plus: true },
  L: { axis: 'x', plus: false },
  U: { axis: 'y', plus: true },
  D: { axis: 'y', plus: false },
  F: { axis: 'z', plus: true },
  B: { axis: 'z', plus: false },
};

function parseSolution(str, size) {
  const moves = [];
  const tokens = str.trim().split(/\s+/).filter(Boolean);
  for (const tok of tokens) {
    const face = tok[0];
    const mod = tok.slice(1);
    const info = FACE_AXIS_SIGN[face];
    if (!info) continue;
    const layer = info.plus ? size - 1 : 0;
    const base = info.plus ? -1 : 1;
    if (mod === '') {
      moves.push({ axis: info.axis, layer, direction: base });
    } else if (mod === "'") {
      moves.push({ axis: info.axis, layer, direction: -base });
    } else if (mod === '2') {
      moves.push({ axis: info.axis, layer, direction: base });
      moves.push({ axis: info.axis, layer, direction: base });
    }
  }
  return moves;
}

export function solveCube(model) {
  const size = model.size;
  if (size === 5) {
    return solve5(model);
  }
  if (size === 4) {
    return solve4(model);
  }
  if (size !== 2 && size !== 3) return null;
  if (model.isSolved()) return [];

  ensureInit();

  let facelets;
  try {
    facelets = modelToFaceletString(model);
  } catch (e) {
    return null;
  }

  let cube;
  try {
    cube = Cube.fromString(facelets);
  } catch (e) {
    return null;
  }

  let solStr;
  try {
    solStr = cube.solve();
  } catch (e) {
    return null;
  }

  if (!solStr) return [];

  const moves = parseSolution(solStr, size);

  const test = model.clone();
  for (const m of moves) test.applyMove(m);
  if (!test.isSolved()) return null;

  return moves;
}
