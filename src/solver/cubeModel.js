import { cubieColors, COLORS } from '../colors.js';

const AXIS_INDEX = { x: 0, y: 1, z: 2 };
const IDENTITY = [1, 0, 0, 0, 1, 0, 0, 0, 1];

const LOCAL_NORMALS = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];

function rotMatrix(axis, dir) {
  if (axis === 'x') {
    return dir === 1
      ? [1, 0, 0, 0, 0, -1, 0, 1, 0]
      : [1, 0, 0, 0, 0, 1, 0, -1, 0];
  }
  if (axis === 'y') {
    return dir === 1
      ? [0, 0, 1, 0, 1, 0, -1, 0, 0]
      : [0, 0, -1, 0, 1, 0, 1, 0, 0];
  }
  return dir === 1
    ? [0, -1, 0, 1, 0, 0, 0, 0, 1]
    : [0, 1, 0, -1, 0, 0, 0, 0, 1];
}

function mulMat(A, B) {
  const C = new Array(9);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      C[i * 3 + j] =
        A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j];
    }
  }
  return C;
}

function mulMatVec(A, v) {
  return [
    A[0] * v[0] + A[1] * v[1] + A[2] * v[2],
    A[3] * v[0] + A[4] * v[1] + A[5] * v[2],
    A[6] * v[0] + A[7] * v[1] + A[8] * v[2],
  ];
}

export class CubeModel {
  constructor(size) {
    this.reset(size);
  }

  reset(size) {
    this.size = size;
    const cubies = [];
    let id = 0;
    for (let ix = 0; ix < size; ix++) {
      for (let iy = 0; iy < size; iy++) {
        for (let iz = 0; iz < size; iz++) {
          const home = [2 * ix - (size - 1), 2 * iy - (size - 1), 2 * iz - (size - 1)];
          cubies.push({
            id: id++,
            home: home.slice(),
            pos: home.slice(),
            R: IDENTITY.slice(),
            colors: cubieColors(ix, iy, iz, size),
          });
        }
      }
    }
    this.cubies = cubies;
  }

  applyMove(move) {
    const ai = AXIS_INDEX[move.axis];
    const target = 2 * move.layer - (this.size - 1);
    const rot = rotMatrix(move.axis, move.direction);
    for (const c of this.cubies) {
      if (c.pos[ai] === target) {
        c.pos = mulMatVec(rot, c.pos);
        c.R = mulMat(rot, c.R);
      }
    }
  }

  isSolved() {
    const faceColor = [undefined, undefined, undefined, undefined, undefined, undefined];
    for (const c of this.cubies) {
      const R = c.R;
      for (let i = 0; i < 6; i++) {
        const color = c.colors[i];
        if (color === COLORS.BLACK) continue;
        const n = LOCAL_NORMALS[i];
        const wx = R[0] * n[0] + R[1] * n[1] + R[2] * n[2];
        const wy = R[3] * n[0] + R[4] * n[1] + R[5] * n[2];
        const wz = R[6] * n[0] + R[7] * n[1] + R[8] * n[2];
        const fi =
          wx === 1 ? 0 : wx === -1 ? 1 : wy === 1 ? 2 : wy === -1 ? 3 : wz === 1 ? 4 : 5;
        if (faceColor[fi] === undefined) faceColor[fi] = color;
        else if (faceColor[fi] !== color) return false;
      }
    }
    return true;
  }

  clone() {
    const m = new CubeModel(this.size);
    m.cubies = this.cubies.map((c) => ({
      id: c.id,
      home: c.home.slice(),
      pos: c.pos.slice(),
      R: c.R.slice(),
      colors: c.colors.slice(),
    }));
    return m;
  }
}
