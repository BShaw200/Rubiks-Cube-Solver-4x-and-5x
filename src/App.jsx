import { useCallback, useEffect, useRef } from 'react';
import { Scene } from './components/Scene.jsx';
import { UI } from './components/UI.jsx';
import { useCubeStore } from './store/useCubeStore.js';
import { moveToNotation } from './utils/notation.js';

// Duration (seconds) for a single manual step animation, independent of the
// speed slider so stepping always feels snappy.
const STEP_DURATION = 0.25;

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
  const speed = useCubeStore((s) => s.speed);

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
    const duration = 1 / speed;
    setDisplayedMove(moveToNotation(move, cubeSize));
    cubeRef.current.doMove(move, () => nextMove(), duration);
  }, [status, currentMoveIndex]);

  // The pre-calculated path currently available for stepping: while paused
  // (STOPPED) it's whichever sequence was playing; from IDLE after a scramble
  // it's the scramble path. Returns null when nothing is steppable.
  const stepContext = (s) => {
    if (s.status === 'STOPPED')
      return s.prevStatus === 'SOLVING' ? s.solveSequence : s.scrambleSequence;
    if (s.status === 'IDLE' && s.scrambleSequence.length > 0) return s.scrambleSequence;
    return null;
  };

  // Read from the store at call time so the handlers stay stable and never see
  // stale indices.
  const stepForward = useCallback(() => {
    const s = useCubeStore.getState();
    const seq = stepContext(s);
    if (!seq || !cubeRef.current || s.currentMoveIndex >= seq.length) return;
    const move = seq[s.currentMoveIndex];
    const started = cubeRef.current.doMove(move, () => s.nextMove(), STEP_DURATION);
    if (started) s.setDisplayedMove(moveToNotation(move, s.cubeSize));
  }, []);

  const stepBackward = useCallback(() => {
    const s = useCubeStore.getState();
    const seq = stepContext(s);
    if (!seq || !cubeRef.current || s.currentMoveIndex <= 0) return;
    const move = seq[s.currentMoveIndex - 1];
    const inverse = { ...move, direction: -move.direction };
    const started = cubeRef.current.doMove(inverse, () => s.prevMove(), STEP_DURATION);
    if (started) s.setDisplayedMove(moveToNotation(inverse, s.cubeSize));
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      // Leave arrow behaviour on form controls (e.g. the speed slider) alone.
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        stepForward();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        stepBackward();
      } else if (e.key === ' ') {
        // Space toggles play/pause: stop a running sequence, resume a paused one.
        const s = useCubeStore.getState();
        if (s.status === 'SCRAMBLING' || s.status === 'SOLVING') {
          e.preventDefault();
          s.stop();
        } else if (s.status === 'STOPPED') {
          e.preventDefault();
          s.continue();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stepForward, stepBackward]);

  return (
    <>
      <Scene cubeRef={cubeRef} />
      <UI onStepForward={stepForward} onStepBackward={stepBackward} />
    </>
  );
}
