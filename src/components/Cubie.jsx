import { forwardRef, memo } from 'react';

export const Cubie = memo(
  forwardRef(function Cubie({ colors, position, onPointerDown }, ref) {
    return (
      <mesh ref={ref} position={position} onPointerDown={onPointerDown}>
        <boxGeometry args={[0.95, 0.95, 0.95]} />
        {colors.map((color, i) => (
          <meshStandardMaterial
            key={i}
            color={color}
            emissive={color}
            emissiveIntensity={0.18}
            roughness={0.35}
            metalness={0.05}
            attach={`material-${i}`}
          />
        ))}
      </mesh>
    );
  })
);
