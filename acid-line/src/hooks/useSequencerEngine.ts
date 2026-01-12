import { useEffect, useRef, useCallback } from 'react';
import {
  useSequencerStore,
  stepToMidiNote,
  getVelocity,
  TB03_CCS,
  type ModulationTarget,
} from '../stores/sequencerStore';
import type { UseMidiReturn } from './useMidi';

interface UseSequencerEngineProps {
  midi: UseMidiReturn;
}

export function useSequencerEngine({ midi }: UseSequencerEngineProps) {
  const intervalRef = useRef<number | null>(null);
  const noteOffTimeoutRef = useRef<number | null>(null);
  const lastNoteRef = useRef<number | null>(null);
  const modulationPhaseRef = useRef<Record<ModulationTarget, number>>({
    envMod: 0,
    accentLevel: 0,
    resonance: 0,
    cutoff: 0,
    decay: 0,
  });
  const lastModulationTimeRef = useRef<number>(0);

  // Get store actions (these are stable)
  const tempo = useSequencerStore((s) => s.tempo);
  const isPlaying = useSequencerStore((s) => s.isPlaying);
  const play = useSequencerStore((s) => s.play);
  const stop = useSequencerStore((s) => s.stop);
  const advanceStep = useSequencerStore((s) => s.advanceStep);
  const setCurrentStep = useSequencerStore((s) => s.setCurrentStep);

  // Calculate step duration in ms (sixteenth notes)
  const getStepDuration = useCallback((tempo: number) => {
    return (60000 / tempo) / 4;
  }, []);

  // Modulation oscillator value
  const getOscillatorValue = useCallback(
    (phase: number, low: number, high: number, oscillator: string): number => {
      let waveValue: number;

      switch (oscillator) {
        case 'sine':
          waveValue = Math.sin(phase * Math.PI * 2);
          break;
        case 'saw':
          waveValue = ((phase % 1) * 2) - 1;
          break;
        case 'square':
          waveValue = phase % 1 < 0.5 ? 1 : -1;
          break;
        case 'triangle':
          waveValue = Math.abs((phase % 1) * 4 - 2) - 1;
          break;
        default:
          waveValue = Math.sin(phase * Math.PI * 2);
      }

      const normalizedValue = (waveValue + 1) / 2;
      return Math.round(low + normalizedValue * (high - low));
    },
    []
  );

  // Send modulation CCs
  const sendModulations = useCallback(() => {
    if (!midi.isConnected) return;

    const state = useSequencerStore.getState();
    const now = performance.now();
    const deltaTime = (now - lastModulationTimeRef.current) / 1000;
    lastModulationTimeRef.current = now;

    const targets: ModulationTarget[] = ['envMod', 'accentLevel', 'resonance', 'cutoff', 'decay'];

    for (const target of targets) {
      const mod = state.modulations[target];

      if (!mod.enabled) continue;

      modulationPhaseRef.current[target] += deltaTime / mod.speed;

      const value = getOscillatorValue(
        modulationPhaseRef.current[target],
        mod.low,
        mod.high,
        mod.oscillator
      );
      midi.controlChange(TB03_CCS[target], value);
    }
  }, [midi, getOscillatorValue]);

  // Play a single step - reads everything from store to avoid stale closures
  const playStep = useCallback(() => {
    const state = useSequencerStore.getState();
    const stepIndex = state.currentStep;
    const step = state.steps[stepIndex];
    const tempo = state.tempo;
    const baseOctave = state.baseOctave;
    const steps = state.steps;

    const stepDuration = getStepDuration(tempo);
    const gateTime = stepDuration * 0.85;

    console.log(`[${performance.now().toFixed(0)}ms] playStep() - step ${stepIndex}`);

    // Clear any pending note-off
    if (noteOffTimeoutRef.current !== null) {
      console.log(`[${performance.now().toFixed(0)}ms] Clearing pending timeout`);
      clearTimeout(noteOffTimeoutRef.current);
      noteOffTimeoutRef.current = null;
    }

    // If step is not active (rest), just skip
    if (!step.active) {
      console.log(`[${performance.now().toFixed(0)}ms] Step ${stepIndex} is REST`);
      return;
    }

    // If tied to previous note, don't retrigger
    if (step.tie && lastNoteRef.current !== null) {
      console.log(`[${performance.now().toFixed(0)}ms] Step ${stepIndex} is TIED`);
      return;
    }

    const midiNote = stepToMidiNote(step, baseOctave);
    const velocity = getVelocity(step.accent);

    // Handle slide - CC 102 controls slide on TB-03
    if (step.slide) {
      midi.controlChange(102, 127);
    } else {
      midi.controlChange(102, 0);
    }

    // Send note-on
    console.log(`[${performance.now().toFixed(0)}ms] Step ${stepIndex}: note-on ${midiNote}, vel ${velocity}`);
    midi.noteOn(midiNote, velocity);
    lastNoteRef.current = midiNote;

    // Schedule note-off
    const nextStepIndex = (stepIndex + 1) % steps.length;
    const nextStep = steps[nextStepIndex];
    if (!nextStep.tie) {
      console.log(`[${performance.now().toFixed(0)}ms] Scheduling note-off in ${gateTime.toFixed(0)}ms`);
      noteOffTimeoutRef.current = window.setTimeout(() => {
        console.log(`[${performance.now().toFixed(0)}ms] Timeout: note-off ${midiNote}`);
        midi.noteOff(midiNote);
        noteOffTimeoutRef.current = null;
      }, gateTime);
    }
  }, [midi, getStepDuration]);

  // Start playback
  const handlePlay = useCallback(() => {
    const state = useSequencerStore.getState();
    if (state.isPlaying) return;

    console.log(`[${performance.now().toFixed(0)}ms] handlePlay()`);

    lastModulationTimeRef.current = performance.now();
    setCurrentStep(0);
    play();

    // Play first step immediately
    setTimeout(() => {
      playStep();
      sendModulations();

      // Set up interval for subsequent steps
      const tempo = useSequencerStore.getState().tempo;
      const stepDuration = getStepDuration(tempo);

      intervalRef.current = window.setInterval(() => {
        advanceStep();
        playStep();
        sendModulations();
      }, stepDuration);
    }, 10);
  }, [setCurrentStep, play, playStep, sendModulations, advanceStep, getStepDuration]);

  // Stop playback
  const handleStop = useCallback(() => {
    console.log(`[${performance.now().toFixed(0)}ms] handleStop()`);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (noteOffTimeoutRef.current !== null) {
      clearTimeout(noteOffTimeoutRef.current);
      noteOffTimeoutRef.current = null;
    }

    if (lastNoteRef.current !== null) {
      midi.noteOff(lastNoteRef.current);
      lastNoteRef.current = null;
    }

    midi.pitchBend(0);
    midi.allNotesOff();

    stop();
  }, [midi, stop]);

  useEffect(() => {
    if (!isPlaying || intervalRef.current === null) return;

    clearInterval(intervalRef.current);
    const stepDuration = getStepDuration(tempo);
    intervalRef.current = window.setInterval(() => {
      advanceStep();
      playStep();
      sendModulations();
    }, stepDuration);
  }, [tempo, isPlaying, advanceStep, playStep, sendModulations, getStepDuration]);

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (noteOffTimeoutRef.current) {
        clearTimeout(noteOffTimeoutRef.current);
      }
    };
  }, []);

  return {
    play: handlePlay,
    stop: handleStop,
  };
}
