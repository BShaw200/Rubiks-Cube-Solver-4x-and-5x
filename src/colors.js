export const COLORS = {
  BLUE: '#1064ff',
  GREEN: '#00c94e',
  WHITE: '#ffffff',
  YELLOW: '#ffe000',
  RED: '#ff2038',
  ORANGE: '#ff7d1a',
  BLACK: '#111111',
};

export function cubieColors(ix, iy, iz, size) {
  return [
    ix === size - 1 ? COLORS.BLUE : COLORS.BLACK,
    ix === 0 ? COLORS.GREEN : COLORS.BLACK,
    iy === size - 1 ? COLORS.WHITE : COLORS.BLACK,
    iy === 0 ? COLORS.YELLOW : COLORS.BLACK,
    iz === size - 1 ? COLORS.RED : COLORS.BLACK,
    iz === 0 ? COLORS.ORANGE : COLORS.BLACK,
  ];
}
