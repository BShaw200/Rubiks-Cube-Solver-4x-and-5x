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
  speed: 5,

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
    }));
  },

  startScramble: () =>
    set({
      scrambleSequence: generateScramble(get().cubeSize),
      solveSequence: [],
      currentMoveIndex: 0,
      status: 'SCRAMBLING',
      isSolved: false,
      speed: 5,
    }),

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

    set({ solveSequence: sol, currentMoveIndex: 0, status: 'SOLVING', speed: 1 });
  },

  stop: () => set({ prevStatus: get().status, status: 'STOPPED' }),

  continue: () => set({ status: get().prevStatus }),

  nextMove: () => set({ currentMoveIndex: get().currentMoveIndex + 1 }),

  commitMove: (move) => {
    const model = get().model;
    model.applyMove(move);
    if (get().status === 'IDLE') {
      set({ isSolved: model.isSolved() });
    }
  },

  finish: ({ clearSequence = false } = {}) =>
    set((state) => ({
      status: 'IDLE',
      scrambleSequence: clearSequence ? [] : state.scrambleSequence,
      solveSequence: [],
      currentMoveIndex: 0,
      displayedMove: '',
      isSolved: state.model.isSolved(),
    })),

  setDisplayedMove: (str) => set({ displayedMove: str }),

  setSpeed: (v) => set({ speed: v }),
}));
