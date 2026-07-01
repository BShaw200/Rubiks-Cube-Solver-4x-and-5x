import { useEffect, useRef } from 'react';
import { Scene } from './components/Scene.jsx';
import { UI } from './components/UI.jsx';
import { useCubeStore } from './store/useCubeStore.js';
import { moveToNotation } from './utils/notation.js';

export default function App() {
  const cubeRef = useRef(null);

  const status = useCubeStore((s) => s.status);
  const currentMoveIndex = useCubeStore((s) => s.currentMoveIndex);
  const scrambleSequence = useCubeStore((s) => s.scrambleSequence);
  const solveSequence = useCubeStore((s) => s.solveSequence);
  const cubeSize = useCubeStore((s) => s.cubeSize);

  const nextMove = useCubeStore((s) => s.nextMove);
  const finish = useCubeStore((s) => s.finish);
  const setDisplayedMove = useCubeStore((s) => s.setDisplayedMove);

  useEffect(() => {
    if (status !== 'SCRAMBLING' && status !== 'SOLVING') return;
    if (!cubeRef.current) return;

    const sequence =
      status === 'SCRAMBLING' ? scrambleSequence : solveSequence;

    if (currentMoveIndex >= sequence.length) {
      finish({ clearSequence: status === 'SOLVING' });
      return;
    }

    const move = sequence[currentMoveIndex];
    setDisplayedMove(moveToNotation(move, cubeSize));
    cubeRef.current.doMove(move, () => nextMove());
  }, [status, currentMoveIndex]);

  return (
    <>
      <Scene cubeRef={cubeRef} />
      <UI />
    </>
  );
}
