import { create } from 'zustand';

// TB-03 note names
export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
export type NoteName = typeof NOTE_NAMES[number];

export type ScaleType = 'major' | 'minor';

export interface Step {
  note: NoteName;
  octave: number; // -1, 0, +1 relative to base octave
  accent: boolean;
  slide: boolean;
  tie: boolean; // tied to previous step
  active: boolean; // whether this step plays a note
}

export type OscillatorType = 'sine' | 'saw' | 'square' | 'triangle';

export interface ModulationParams {
  low: number; // 0-127
  high: number; // 0-127
  speed: number; // Period in seconds (0.1 - 100)
  oscillator: OscillatorType;
}

export interface ModulationState extends ModulationParams {
  enabled: boolean; // whether modulation is active
  currentValue: number; // current modulated value
}

// TB-03 CC numbers
export const TB03_CCS = {
  envMod: 12,
  accentLevel: 16,
  resonance: 71,
  cutoff: 74,
  decay: 75,
} as const;

export type ModulationTarget = keyof typeof TB03_CCS;

const MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11] as const;
const MINOR_SCALE_INTERVALS = [0, 2, 3, 5, 7, 8, 10] as const;

interface SequencerState {
  // Sequence data
  steps: Step[];
  stepCount: number;
  rowLocks: Record<'note' | 'octave' | 'accent' | 'slide' | 'tie' | 'active', boolean>;

  // Transport
  isPlaying: boolean;
  currentStep: number;
  tempo: number; // BPM
  baseOctave: number; // MIDI octave (3 = C3)
  keyRoot: NoteName;
  scaleType: ScaleType;

  // Modulation
  modulations: Record<ModulationTarget, ModulationState>;

  // Actions
  setNote: (stepIndex: number, note: NoteName) => void;
  setOctave: (stepIndex: number, octave: number) => void;
  toggleAccent: (stepIndex: number) => void;
  toggleSlide: (stepIndex: number) => void;
  toggleTie: (stepIndex: number) => void;
  toggleActive: (stepIndex: number) => void;
  randomizeNote: (stepIndex: number) => void;

  setTempo: (tempo: number) => void;
  setBaseOctave: (octave: number) => void;
  setKeyRoot: (note: NoteName) => void;
  setScaleType: (scale: ScaleType) => void;

  play: () => void;
  stop: () => void;
  advanceStep: () => void;
  setCurrentStep: (step: number) => void;

  // Modulation actions
  toggleModulation: (target: ModulationTarget) => void;
  setModulationParam: <K extends keyof ModulationParams>(
    target: ModulationTarget,
    param: K,
    value: ModulationParams[K]
  ) => void;
  updateModulationValue: (target: ModulationTarget, value: number) => void;

  // Utility
  randomizeAll: () => void;
  clearAll: () => void;
  toggleRowLock: (row: 'note' | 'octave' | 'accent' | 'slide' | 'tie' | 'active') => void;
}

const createRandomStep = (): Step => ({
  note: NOTE_NAMES[Math.floor(Math.random() * NOTE_NAMES.length)],
  octave: Math.floor(Math.random() * 3) - 1,
  accent: Math.random() > 0.7,
  slide: Math.random() > 0.8,
  tie: false,
  active: Math.random() > 0.2,
});

const createDefaultModulation = (): ModulationState => ({
  enabled: false,
  low: 20,
  high: 100,
  speed: 2 + Math.random() * 10, // Period in seconds
  oscillator: 'sine',
  currentValue: 60,
});

const getScaleNotes = (root: NoteName, scaleType: ScaleType): NoteName[] => {
  const intervals = scaleType === 'minor' ? MINOR_SCALE_INTERVALS : MAJOR_SCALE_INTERVALS;
  const rootIndex = NOTE_NAMES.indexOf(root);
  return intervals.map((interval) => NOTE_NAMES[(rootIndex + interval) % NOTE_NAMES.length]);
};

const getRandomNote = (root: NoteName, scaleType: ScaleType): NoteName => {
  const scaleNotes = getScaleNotes(root, scaleType);
  return scaleNotes[Math.floor(Math.random() * scaleNotes.length)];
};

export const useSequencerStore = create<SequencerState>((set) => ({
  // Initial state - start with cleared sequence for debugging
  steps: Array.from({ length: 16 }, () => ({
    note: 'C' as NoteName,
    octave: 0,
    accent: false,
    slide: false,
    tie: false,
    active: true,
  })),
  stepCount: 16,
  rowLocks: {
    note: false,
    octave: false,
    accent: false,
    slide: false,
    tie: false,
    active: true,
  },
  isPlaying: false,
  currentStep: 0,
  tempo: 120,
  baseOctave: 3,
  keyRoot: 'C' as NoteName,
  scaleType: 'major' as ScaleType,

  modulations: {
    envMod: createDefaultModulation(),
    accentLevel: { ...createDefaultModulation(), low: 64, high: 127 },
    resonance: { ...createDefaultModulation(), low: 30, high: 90 },
    cutoff: { ...createDefaultModulation(), low: 40, high: 120 },
    decay: { ...createDefaultModulation(), low: 20, high: 80 },
  },

  // Step actions
  setNote: (stepIndex, note) =>
    set((state) => ({
      steps: state.steps.map((step, i) =>
        i === stepIndex ? { ...step, note } : step
      ),
    })),

  setOctave: (stepIndex, octave) =>
    set((state) => ({
      steps: state.steps.map((step, i) =>
        i === stepIndex ? { ...step, octave: Math.max(-1, Math.min(1, octave)) } : step
      ),
    })),

  toggleAccent: (stepIndex) =>
    set((state) => ({
      steps: state.steps.map((step, i) =>
        i === stepIndex ? { ...step, accent: !step.accent } : step
      ),
    })),

  toggleSlide: (stepIndex) =>
    set((state) => ({
      steps: state.steps.map((step, i) =>
        i === stepIndex ? { ...step, slide: !step.slide } : step
      ),
    })),

  toggleTie: (stepIndex) =>
    set((state) => ({
      steps: state.steps.map((step, i) =>
        i === stepIndex ? { ...step, tie: !step.tie } : step
      ),
    })),

  toggleActive: (stepIndex) =>
    set((state) => ({
      steps: state.steps.map((step, i) =>
        i === stepIndex ? { ...step, active: !step.active } : step
      ),
    })),

  randomizeNote: (stepIndex) =>
    set((state) => ({
      steps: state.steps.map((step, i) =>
        i === stepIndex
          ? {
              ...step,
              note: state.rowLocks.note ? step.note : getRandomNote(state.keyRoot, state.scaleType),
            }
          : step
      ),
    })),

  setTempo: (tempo) => set({ tempo: Math.max(30, Math.min(300, tempo)) }),
  setBaseOctave: (octave) => set({ baseOctave: Math.max(1, Math.min(6, octave)) }),
  setKeyRoot: (note) => set({ keyRoot: note }),
  setScaleType: (scale) => set({ scaleType: scale }),

  play: () => set({ isPlaying: true }),
  stop: () => set({ isPlaying: false, currentStep: 0 }),
  advanceStep: () =>
    set((state) => ({
      currentStep: (state.currentStep + 1) % state.stepCount,
    })),
  setCurrentStep: (step) => set({ currentStep: step }),

  // Modulation actions
  toggleModulation: (target) =>
    set((state) => ({
      modulations: {
        ...state.modulations,
        [target]: {
          ...state.modulations[target],
          enabled: !state.modulations[target].enabled,
        },
      },
    })),

  setModulationParam: (target, param, value) =>
    set((state) => ({
      modulations: {
        ...state.modulations,
        [target]: {
          ...state.modulations[target],
          [param]: value,
        },
      },
    })),

  updateModulationValue: (target, value) =>
    set((state) => ({
      modulations: {
        ...state.modulations,
        [target]: {
          ...state.modulations[target],
          currentValue: value,
        },
      },
    })),

  // Utility actions
  randomizeAll: () =>
    set((state) => ({
      steps: state.steps.map((step) => ({
        note: state.rowLocks.note ? step.note : getRandomNote(state.keyRoot, state.scaleType),
        octave: state.rowLocks.octave ? step.octave : Math.floor(Math.random() * 3) - 1,
        accent: state.rowLocks.accent ? step.accent : Math.random() > 0.7,
        slide: state.rowLocks.slide ? step.slide : Math.random() > 0.8,
        tie: state.rowLocks.tie ? step.tie : false,
        active: state.rowLocks.active ? step.active : Math.random() > 0.2,
      })),
    })),

  clearAll: () =>
    set({
      steps: Array.from({ length: 16 }, () => ({
        note: 'C' as NoteName,
        octave: 0,
        accent: false,
        slide: false,
        tie: false,
        active: true,
      })),
      currentStep: 0,
    }),
  toggleRowLock: (row) =>
    set((state) => ({
      rowLocks: {
        ...state.rowLocks,
        [row]: !state.rowLocks[row],
      },
    })),
}));

// Helper to convert step to MIDI note
export function stepToMidiNote(step: Step, baseOctave: number): number {
  const noteIndex = NOTE_NAMES.indexOf(step.note);
  const octave = baseOctave + step.octave;
  return (octave + 1) * 12 + noteIndex; // MIDI note number
}

// Helper to get velocity based on accent
export function getVelocity(accent: boolean): number {
  return accent ? 100 + Math.floor(Math.random() * 28) : 1 + Math.floor(Math.random() * 98);
}
