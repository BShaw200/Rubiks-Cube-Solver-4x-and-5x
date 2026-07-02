import { CubeModel } from '../src/solver/cubeModel.js';
import { solve4 } from '../src/solver/solve4.js';

const AXES = ['x', 'y', 'z'];
const randInt = (n) => Math.floor(Math.random() * n);
const randomMove = (size) => ({
  axis: AXES[randInt(3)],
  layer: randInt(size),
  direction: Math.random() < 0.5 ? 1 : -1,
});

// "Scramble button" style: avoids immediate cancellations (length = size*10).
function generateScramble(size) {
  const moves = [];
  const length = size * 10;
  let prev = null;
  while (moves.length < length) {
    const axis = AXES[randInt(3)];
    const layer = randInt(size);
    const direction = Math.random() < 0.5 ? 1 : -1;
    if (prev && prev.axis === axis && prev.layer === layer && prev.direction === -direction) continue;
    const move = { axis, layer, direction };
    moves.push(move);
    prev = move;
  }
  return moves;
}

let pass = 0,
  fail = 0,
  nul = 0,
  maxLen = 0;
const failures = [];

function runCase(label, m) {
  const sol = solve4(m);
  if (sol === null) {
    nul++;
    return;
  }
  maxLen = Math.max(maxLen, sol.length);
  const test = m.clone();
  for (const mv of sol) test.applyMove(mv);
  if (test.isSolved()) pass++;
  else {
    fail++;
    if (failures.length < 5) failures.push({ label, len: sol.length });
  }
}

// ~40 fully random 4x4 scrambles (all layers 0..3, all axes, +/- direction).
// Mix odd and even scramble lengths so all four parity combinations occur.
for (let t = 0; t < 40; t++) {
  const m = new CubeModel(4);
  const len = 40 + (t % 2);
  for (let i = 0; i < len; i++) m.applyMove(randomMove(4));
  runCase('random#' + t, m);
}

// A couple of "scramble button" style cases (no immediate cancels, length = size*10).
for (let t = 0; t < 4; t++) {
  const m = new CubeModel(4);
  for (const mv of generateScramble(4)) m.applyMove(mv);
  runCase('scrambleBtn#' + t, m);
}

// Already-solved case must return [].
{
  const m = new CubeModel(4);
  const sol = solve4(m);
  if (sol === null || sol.length !== 0) {
    fail++;
    failures.push({ label: 'solved-should-be-empty', len: sol ? sol.length : -1 });
  } else pass++;
}

console.log(`solve4: total=${45} pass=${pass} fail=${fail} null=${nul} maxSolutionLen=${maxLen}`);
if (failures.length) console.log('failures:', JSON.stringify(failures));
process.exit(fail === 0 ? 0 : 1);
