import { COLORS } from '../colors.js';

const BLACK = COLORS.BLACK;

const COLOR_TO_FACE = {
  [COLORS.WHITE]: 'U',
  [COLORS.YELLOW]: 'D',
  [COLORS.RED]: 'F',
  [COLORS.ORANGE]: 'B',
  [COLORS.BLUE]: 'R',
  [COLORS.GREEN]: 'L',
};

const FACE_INFO = {
  U: { base: 0, rowAxis: 2, rowDir: 1, colAxis: 0, colDir: 1 },
  R: { base: 9, rowAxis: 1, rowDir: -1, colAxis: 2, colDir: -1 },
  F: { base: 18, rowAxis: 1, rowDir: -1, colAxis: 0, colDir: 1 },
  D: { base: 27, rowAxis: 2, rowDir: -1, colAxis: 0, colDir: 1 },
  L: { base: 36, rowAxis: 1, rowDir: -1, colAxis: 2, colDir: 1 },
  B: { base: 45, rowAxis: 1, rowDir: -1, colAxis: 0, colDir: -1 },
};

const LOCAL_NORMALS = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];

function worldDirToFace(wd) {
  if (wd[0] === 1) return 'R';
  if (wd[0] === -1) return 'L';
  if (wd[1] === 1) return 'U';
  if (wd[1] === -1) return 'D';
  if (wd[2] === 1) return 'F';
  if (wd[2] === -1) return 'B';
  return null;
}

function gridIdx(unit, dir) {
  return dir === 1 ? unit + 1 : 1 - unit;
}

export function modelToFaceletString(model) {
  const size = model.size;
  const denom = size - 1;
  const arr = (
    'U'.repeat(9) +
    'R'.repeat(9) +
    'F'.repeat(9) +
    'D'.repeat(9) +
    'L'.repeat(9) +
    'B'.repeat(9)
  ).split('');

  for (const c of model.cubies) {
    const unit = [c.pos[0] / denom, c.pos[1] / denom, c.pos[2] / denom];
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
      const info = FACE_INFO[face];
      const row = gridIdx(unit[info.rowAxis], info.rowDir);
      const col = gridIdx(unit[info.colAxis], info.colDir);
      if (row < 0 || row > 2 || col < 0 || col > 2) continue;
      const letter = COLOR_TO_FACE[color];
      if (letter) arr[info.base + row * 3 + col] = letter;
    }
  }

  return arr.join('');
}
