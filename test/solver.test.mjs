import { CubeModel } from '../src/solver/cubeModel.js';
import { solveCube } from '../src/solver/solve.js';
import { modelToFaceletString } from '../src/solver/facelets.js';

const AXES = ['x', 'y', 'z'];
const randInt = (n) => Math.floor(Math.random() * n);
const randomMove = (size) => ({
  axis: AXES[randInt(3)],
  layer: randInt(size),
  direction: Math.random() < 0.5 ? 1 : -1,
});

let failures = 0;
let fallbacks = 0;
let total = 0;
let maxSolutionLen = 0;

for (let t = 0; t < 300; t++) {
  for (const size of [2, 3]) {
    const m = new CubeModel(size);
    const n = size * 10;
    for (let i = 0; i < n; i++) m.applyMove(randomMove(size));

    total++;
    const sol = solveCube(m);

    if (sol === null) {
      fallbacks++;
      if (fallbacks <= 5) {
        console.log(`FALLBACK size=${size} facelets=${modelToFaceletString(m)}`);
      }
      continue;
    }

    if (sol.length > maxSolutionLen) maxSolutionLen = sol.length;

    const test = m.clone();
    for (const mv of sol) test.applyMove(mv);
    if (!test.isSolved()) {
      failures++;
      if (failures <= 5) {
        console.log(`FAIL size=${size} sol=${JSON.stringify(sol)}`);
      }
    }
  }
}

// already-solved case
{
  const m = new CubeModel(3);
  const sol = solveCube(m);
  total++;
  if (sol === null || sol.length !== 0) {
    failures++;
    console.log('FAIL already-solved should return []');
  }
}

console.log(
  `total=${total} failures=${failures} fallbacks=${fallbacks} maxSolutionLen=${maxSolutionLen}`
);
process.exit(failures === 0 && fallbacks === 0 ? 0 : 1);
