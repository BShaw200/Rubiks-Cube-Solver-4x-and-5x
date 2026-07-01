export const COLORS = {
  BLUE: '#0046ad',
  GREEN: '#009b48',
  WHITE: '#ffffff',
  YELLOW: '#ffd500',
  RED: '#b71234',
  ORANGE: '#ff5800',
  BLACK: '#0a0a0a',
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
