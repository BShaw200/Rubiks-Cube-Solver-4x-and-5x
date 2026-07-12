import { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { TrackballControls } from '@react-three/drei';
import { Cube } from './Cube.jsx';
import { useCubeStore } from '../store/useCubeStore.js';

export function Scene({ cubeRef }) {
  const size = useCubeStore((s) => s.cubeSize);
  const controlsRef = useRef(null);

  return (
    <Canvas
      flat
      style={{ background: '#000' }}
      camera={{ position: [size * 1.6, size * 1.6, size * 2.2], fov: 50 }}
    >
      <ambientLight intensity={0.9} />
      <hemisphereLight color="#ffffff" groundColor="#555555" intensity={0.5} />
      <directionalLight position={[6, 9, 7]} intensity={1.5} />
      <directionalLight position={[-7, -4, -6]} intensity={0.6} />
      <Cube ref={cubeRef} controlsRef={controlsRef} />
      <TrackballControls ref={controlsRef} noPan rotateSpeed={3} />
    </Canvas>
  );
}
