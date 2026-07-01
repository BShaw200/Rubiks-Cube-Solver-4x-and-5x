import { forwardRef, memo } from 'react';

export const Cubie = memo(
  forwardRef(function Cubie({ colors, position, onPointerDown }, ref) {
    return (
      <mesh ref={ref} position={position} onPointerDown={onPointerDown}>
        <boxGeometry args={[0.95, 0.95, 0.95]} />
        {colors.map((color, i) => (
          <meshStandardMaterial key={i} color={color} attach={`material-${i}`} />
        ))}
      </mesh>
    );
  })
);
