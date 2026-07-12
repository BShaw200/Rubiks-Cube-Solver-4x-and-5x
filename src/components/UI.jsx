import { useCubeStore } from '../store/useCubeStore.js';

export function UI({ onStepForward, onStepBackward }) {
  const status = useCubeStore((s) => s.status);
  const cubeSize = useCubeStore((s) => s.cubeSize);
  const isSolved = useCubeStore((s) => s.isSolved);
  const displayedMove = useCubeStore((s) => s.displayedMove);
  const currentMoveIndex = useCubeStore((s) => s.currentMoveIndex);
  const activeLength = useCubeStore((s) => s.activeLength);
  const scrambleSequence = useCubeStore((s) => s.scrambleSequence);

  const setCubeSize = useCubeStore((s) => s.setCubeSize);
  const startScramble = useCubeStore((s) => s.startScramble);
  const startSolve = useCubeStore((s) => s.startSolve);
  const stop = useCubeStore((s) => s.stop);
  const resume = useCubeStore((s) => s.continue);
  const resetCube = useCubeStore((s) => s.resetCube);
  const speed = useCubeStore((s) => s.speed);
  const setSpeed = useCubeStore((s) => s.setSpeed);

  // Stepping is available while paused, or from IDLE once a scramble path
  // exists to walk through.
  const canStep =
    status === 'STOPPED' || (status === 'IDLE' && scrambleSequence.length > 0);

  return (
    <div className="ui-overlay">
      <div className="ui-primary">
        <select
          value={cubeSize}
          disabled={status !== 'IDLE'}
          onChange={(e) => setCubeSize(Number(e.target.value))}
        >
          <option value={2}>2×2×2</option>
          <option value={3}>3×3×3</option>
          <option value={4}>4×4×4</option>
          <option value={5}>5×5×5</option>
        </select>

        {status === 'IDLE' && (
          <>
            <button onClick={startScramble}>Scramble</button>
            <button disabled={isSolved} onClick={startSolve}>
              Solve
            </button>
            <button disabled={isSolved} onClick={resetCube}>
              Reset
            </button>
          </>
        )}

        {(status === 'SCRAMBLING' || status === 'SOLVING') && (
          <button onClick={stop} title="Spacebar">
            Stop
          </button>
        )}

        {canStep && (
          <>
            <button
              onClick={onStepBackward}
              disabled={currentMoveIndex <= 0}
              title="Left arrow"
            >
              ◀ Step
            </button>
            <button
              onClick={onStepForward}
              disabled={currentMoveIndex >= activeLength}
              title="Right arrow"
            >
              Step ▶
            </button>
          </>
        )}

        {status === 'STOPPED' && (
          <button onClick={resume} title="Spacebar">
            Continue
          </button>
        )}
      </div>

      <div className="ui-secondary">
        <div className="move-display">{displayedMove || ' '}</div>

        {(status === 'SCRAMBLING' || status === 'SOLVING' || canStep) && (
          <div className="move-counter">
            {currentMoveIndex} / {activeLength}
          </div>
        )}

        <label className="speed-control">
          <span>Speed</span>
          <input
            type="range"
            min="0.25"
            max="16"
            step="0.25"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
          />
          <span className="speed-value">{speed}x</span>
        </label>
      </div>
    </div>
  );
}
