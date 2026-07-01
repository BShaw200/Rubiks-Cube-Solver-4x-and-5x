export function moveToNotation(move, size) {
  const { axis, layer, direction } = move;

  let face;
  if (axis === 'x') {
    face = layer === size - 1 ? 'R' : layer === 0 ? 'L' : `${size - layer}R`;
  } else if (axis === 'y') {
    face = layer === size - 1 ? 'U' : layer === 0 ? 'D' : `${size - layer}U`;
  } else {
    face = layer === size - 1 ? 'F' : layer === 0 ? 'B' : `${size - layer}F`;
  }

  return direction === -1 ? `${face}'` : face;
}
