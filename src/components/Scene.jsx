import { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Cube } from './Cube.jsx';
import { useCubeStore } from '../store/useCubeStore.js';

export function Scene({ cubeRef }) {
  const size = useCubeStore((s) => s.cubeSize);
  const controlsRef = useRef(null);

  return (
    <Canvas
      style={{ background: '#000' }}
      camera={{ position: [size * 1.6, size * 1.6, size * 2.2], fov: 50 }}
    >
      <ambientLight intensity={0.6} />
      <pointLight position={[10, 10, 10]} />
      <Cube ref={cubeRef} controlsRef={controlsRef} />
      <OrbitControls ref={controlsRef} enablePan={false} />
    </Canvas>
  );
}
