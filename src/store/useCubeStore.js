import { create } from 'zustand';
import { generateScramble } from '../utils/scramble.js';
import { cubieColors } from '../colors.js';
import { CubeModel } from '../solver/cubeModel.js';
import { solveCube } from '../solver/solve.js';

function createCubies(size) {
  const cubies = [];
  let id = 0;
  const offset = (size - 1) / 2;
  for (let ix = 0; ix < size; ix++) {
    for (let iy = 0; iy < size; iy++) {
      for (let iz = 0; iz < size; iz++) {
        cubies.push({
          id: id++,
          home: [ix - offset, iy - offset, iz - offset],
          colors: cubieColors(ix, iy, iz, size),
        });
      }
    }
  }
  return cubies;
}

export const useCubeStore = create((set, get) => ({
  cubeSize: 3,
  cubies: createCubies(3),
  model: new CubeModel(3),
  generation: 0,
  scrambleSequence: [],
  solveSequence: [],
  currentMoveIndex: 0,
  status: 'IDLE',
  prevStatus: 'IDLE',
  displayedMove: '',
  isSolved: true,
  speed: 2,
  activeLength: 0,

  setCubeSize: (size) => {
    get().model.reset(size);
    set((s) => ({
      cubeSize: size,
      cubies: createCubies(size),
      generation: s.generation + 1,
      scrambleSequence: [],
      solveSequence: [],
      currentMoveIndex: 0,
      status: 'IDLE',
      prevStatus: 'IDLE',
      displayedMove: '',
      isSolved: true,
    }));
  },

  resetCube: () => {
    const size = get().cubeSize;
    get().model.reset(size);
    set((s) => ({
      cubies: createCubies(size),
      generation: s.generation + 1,
      scrambleSequence: [],
      solveSequence: [],
      currentMoveIndex: 0,
      status: 'IDLE',
      prevStatus: 'IDLE',
      displayedMove: '',
      isSolved: true,
      speed: 2,
    }));
  },

  startScramble: () => {
    const seq = generateScramble(get().cubeSize);
    set({
      scrambleSequence: seq,
      solveSequence: [],
      currentMoveIndex: 0,
      status: 'SCRAMBLING',
      isSolved: false,
      activeLength: seq.length,
    });
  },

  startSolve: () => {
    const state = get();
    const model = state.model;

    let sol = solveCube(model);
    if (sol === null) {
      const inverse = state.scrambleSequence
        .slice()
        .reverse()
        .map((m) => ({ ...m, direction: -m.direction }));
      const test = model.clone();
      for (const m of inverse) test.applyMove(m);
      sol = test.isSolved() ? inverse : [];
    }

    set({ solveSequence: sol, currentMoveIndex: 0, status: 'SOLVING', activeLength: sol.length });
  },

  stop: () => set({ prevStatus: get().status, status: 'STOPPED' }),

  continue: () => set({ status: get().prevStatus }),

  nextMove: () => set({ currentMoveIndex: get().currentMoveIndex + 1 }),

  prevMove: () => set({ currentMoveIndex: Math.max(0, get().currentMoveIndex - 1) }),

  commitMove: (move) => {
    const model = get().model;
    model.applyMove(move);
    if (get().status === 'IDLE') {
      set({ isSolved: model.isSolved() });
    }
  },

  finish: ({ clearSequence = false } = {}) =>
    set((state) => {
      // After a solve we discard the path (cube is solved, nothing to step).
      if (clearSequence) {
        return {
          status: 'IDLE',
          scrambleSequence: [],
          solveSequence: [],
          currentMoveIndex: 0,
          displayedMove: '',
          isSolved: state.model.isSolved(),
          activeLength: 0,
        };
      }
      // After a scramble we keep the path and park at its end, so the user can
      // step backward (unwind) / forward (rewind) through it from IDLE.
      const len = state.scrambleSequence.length;
      return {
        status: 'IDLE',
        solveSequence: [],
        currentMoveIndex: len,
        displayedMove: '',
        isSolved: state.model.isSolved(),
        activeLength: len,
      };
    }),

  // Invalidate the steppable path — used when a manual turn desyncs the cube
  // from the pre-calculated scramble sequence.
  clearPath: () =>
    set({ scrambleSequence: [], currentMoveIndex: 0, displayedMove: '', activeLength: 0 }),

  setDisplayedMove: (str) => set({ displayedMove: str }),

  setSpeed: (v) => set({ speed: v }),
}));
