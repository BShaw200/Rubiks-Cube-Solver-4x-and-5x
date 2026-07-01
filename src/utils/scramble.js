const AXES = ['x', 'y', 'z'];

export function generateScramble(size) {
  const moves = [];
  const length = size * 10;
  let prev = null;

  while (moves.length < length) {
    const axis = AXES[Math.floor(Math.random() * AXES.length)];
    const layer = Math.floor(Math.random() * size);
    const direction = Math.random() < 0.5 ? 1 : -1;

    if (
      prev &&
      prev.axis === axis &&
      prev.layer === layer &&
      prev.direction === -direction
    ) {
      continue;
    }

    const move = { axis, layer, direction };
    moves.push(move);
    prev = move;
  }

  return moves;
}
