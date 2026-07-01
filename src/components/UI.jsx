import { useCubeStore } from '../store/useCubeStore.js';

export function UI() {
  const status = useCubeStore((s) => s.status);
  const cubeSize = useCubeStore((s) => s.cubeSize);
  const isSolved = useCubeStore((s) => s.isSolved);
  const displayedMove = useCubeStore((s) => s.displayedMove);

  const setCubeSize = useCubeStore((s) => s.setCubeSize);
  const startScramble = useCubeStore((s) => s.startScramble);
  const startSolve = useCubeStore((s) => s.startSolve);
  const stop = useCubeStore((s) => s.stop);
  const resume = useCubeStore((s) => s.continue);
  const resetCube = useCubeStore((s) => s.resetCube);
  const speed = useCubeStore((s) => s.speed);
  const setSpeed = useCubeStore((s) => s.setSpeed);

  return (
    <div className="ui-overlay">
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
        <button onClick={stop}>Stop</button>
      )}

      {status === 'STOPPED' && <button onClick={resume}>Continue</button>}

      <div className="move-display">{displayedMove || '\u00A0'}</div>

      <label className="speed-control">
        <span>Speed</span>
        <input
          type="range"
          min="1"
          max="16"
          step="1"
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
        />
        <span className="speed-value">{speed}x</span>
      </label>
    </div>
  );
}
