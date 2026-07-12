import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { useThree } from '@react-three/fiber';
import { Cubie } from './Cubie.jsx';
import { useCubeStore } from '../store/useCubeStore.js';

const DRAG_THRESHOLD = 0.5;

function dominantAxis(v) {
  const ax = Math.abs(v.x);
  const ay = Math.abs(v.y);
  const az = Math.abs(v.z);
  if (ax >= ay && ax >= az) return { name: 'x', index: 0, sign: v.x >= 0 ? 1 : -1 };
  if (ay >= az) return { name: 'y', index: 1, sign: v.y >= 0 ? 1 : -1 };
  return { name: 'z', index: 2, sign: v.z >= 0 ? 1 : -1 };
}

export const Cube = forwardRef(function Cube({ controlsRef }, ref) {
  const rootRef = useRef(null);
  const cubieRefs = useRef(new Map());
  const animating = useRef(false);
  const gesture = useRef(null);
  const commitMoveRef = useRef(() => {});
  const statusRef = useRef('IDLE');

  const cubeSize = useCubeStore((s) => s.cubeSize);
  const generation = useCubeStore((s) => s.generation);
  const cubies = useCubeStore((s) => s.cubies);
  const commitMove = useCubeStore((s) => s.commitMove);
  const status = useCubeStore((s) => s.status);
  const { camera, raycaster, gl } = useThree();

  useEffect(() => {
    commitMoveRef.current = commitMove;
  }, [commitMove]);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const setRef = (id) => (mesh) => {
    if (mesh) cubieRefs.current.set(id, mesh);
    else cubieRefs.current.delete(id);
  };

  const doMove = useCallback(
    (move, onDone, duration = 0.333) => {
      if (animating.current) return false;
      const root = rootRef.current;
      if (!root) return false;
      animating.current = true;

      const target = move.layer - (cubeSize - 1) / 2;
      const eps = 0.01;
      const v = new THREE.Vector3();
      const selected = [];
      cubieRefs.current.forEach((mesh) => {
        mesh.getWorldPosition(v);
        if (Math.abs(v[move.axis] - target) < eps) selected.push(mesh);
      });

      const pivot = new THREE.Group();
      root.add(pivot);
      selected.forEach((mesh) => pivot.attach(mesh));

      gsap.to(pivot.rotation, {
        [move.axis]: move.direction * (Math.PI / 2),
        duration,
        ease: 'power2.inOut',
        onComplete: () => {
          selected.forEach((mesh) => root.attach(mesh));
          root.remove(pivot);
          animating.current = false;
          commitMoveRef.current(move);
          if (onDone) onDone();
        },
      });

      return true;
    },
    [cubeSize]
  );

  useImperativeHandle(ref, () => ({ doMove }), [doMove]);

  const endGesture = useCallback(() => {
    gesture.current = null;
    if (controlsRef && controlsRef.current) controlsRef.current.enabled = true;
  }, [controlsRef]);

  const handlePointerDown = useCallback(
    (e) => {
      if (statusRef.current !== 'IDLE') return;
      if (animating.current || gesture.current) return;
      if (!e.face) return;
      e.stopPropagation();

      const mesh = e.object;
      const worldNormal = e.face.normal.clone().transformDirection(mesh.matrixWorld);
      const dom = dominantAxis(worldNormal);
      const normal = new THREE.Vector3().setComponent(dom.index, dom.sign);
      const downPoint = e.point.clone();
      const cubiePos = new THREE.Vector3();
      mesh.getWorldPosition(cubiePos);

      gesture.current = { normal, downPoint, cubiePos, fired: false };
      if (controlsRef && controlsRef.current) controlsRef.current.enabled = false;
    },
    [controlsRef]
  );

  useEffect(() => {
    const onMove = (e) => {
      const g = gesture.current;
      if (!g || g.fired || animating.current) return;

      const rect = gl.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(ndc, camera);
      const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(g.normal, g.downPoint);
      const hit = new THREE.Vector3();
      if (!raycaster.ray.intersectPlane(plane, hit)) return;

      const drag = hit.clone().sub(g.downPoint);
      if (drag.length() < DRAG_THRESHOLD) return;

      const cross = new THREE.Vector3().crossVectors(g.normal, drag);
      const dom = dominantAxis(cross);
      const coord = g.cubiePos.getComponent(dom.index);
      const layer = Math.round(coord + (cubeSize - 1) / 2);
      if (layer < 0 || layer >= cubeSize) {
        endGesture();
        return;
      }

      g.fired = true;
      // A manual turn desyncs the cube from the scramble path — drop it so
      // stale step controls disappear.
      useCubeStore.getState().clearPath();
      doMove({ axis: dom.name, layer, direction: dom.sign });
    };

    const onUp = () => endGesture();

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [gl, camera, raycaster, cubeSize, doMove, endGesture]);

  return (
    <group ref={rootRef}>
      {cubies.map((c) => (
        <Cubie
          key={`${generation}-${c.id}`}
          ref={setRef(c.id)}
          colors={c.colors}
          position={c.home}
          onPointerDown={handlePointerDown}
        />
      ))}
    </group>
  );
});
