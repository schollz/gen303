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
  const {
    steps,
    isPlaying,
    currentStep,
    tempo,
    baseOctave,
    modulations,
    advanceStep,
    setCurrentStep,
    play,
    stop,
    updateModulationValue,
  } = useSequencerStore();

  const intervalRef = useRef<number | null>(null);
  const lastNoteRef = useRef<number | null>(null);
  const modulationPhaseRef = useRef<Record<ModulationTarget, number>>({
    envMod: 0,
    accentLevel: 0,
    resonance: 0,
    cutoff: 0,
    decay: 0,
  });
  const lastModulationTimeRef = useRef<number>(0);

  // Calculate step duration in ms (sixteenth notes)
  const getStepDuration = useCallback(() => {
    // BPM is quarter notes per minute
    // 16th note = 1/4 of a quarter note
    return (60000 / tempo) / 4;
  }, [tempo]);

  // Modulation oscillator value
  const getOscillatorValue = useCallback(
    (target: ModulationTarget, phase: number): number => {
      const mod = modulations[target];
      let waveValue: number;

      switch (mod.oscillator) {
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

      // Map -1..1 to low..high
      const normalizedValue = (waveValue + 1) / 2;
      return Math.round(mod.low + normalizedValue * (mod.high - mod.low));
    },
    [modulations]
  );

  // Send modulation CCs
  const sendModulations = useCallback(() => {
    if (!midi.isConnected) return;

    const now = performance.now();
    const deltaTime = (now - lastModulationTimeRef.current) / 1000;
    lastModulationTimeRef.current = now;

    const targets: ModulationTarget[] = ['envMod', 'accentLevel', 'resonance', 'cutoff', 'decay'];

    for (const target of targets) {
      const mod = modulations[target];

      // Only process if enabled
      if (!mod.enabled) continue;

      // Advance phase based on speed (Hz)
      modulationPhaseRef.current[target] += mod.speed * deltaTime;

      const value = getOscillatorValue(target, modulationPhaseRef.current[target]);
      midi.controlChange(TB03_CCS[target], value);
      updateModulationValue(target, value);
    }
  }, [midi, modulations, getOscillatorValue, updateModulationValue]);

  // Play a step
  const playStep = useCallback(
    (stepIndex: number) => {
      const step = steps[stepIndex];

      // Release previous note if not sliding and not tied
      if (lastNoteRef.current !== null && !step.tie) {
        midi.noteOff(lastNoteRef.current);
        lastNoteRef.current = null;
      }

      // If step is not active (rest), skip
      if (!step.active) {
        // If tied, we still hold the previous note
        if (!step.tie && lastNoteRef.current !== null) {
          midi.noteOff(lastNoteRef.current);
          lastNoteRef.current = null;
        }
        return;
      }

      // If tied to previous note, don't retrigger
      if (step.tie && lastNoteRef.current !== null) {
        // Just continue holding the note
        return;
      }

      const midiNote = stepToMidiNote(step, baseOctave);
      const velocity = getVelocity(step.accent);

      // Handle slide (pitch bend to next note)
      if (step.slide) {
        const nextStepIndex = (stepIndex + 1) % steps.length;
        const nextStep = steps[nextStepIndex];
        if (nextStep.active) {
          const nextMidiNote = stepToMidiNote(nextStep, baseOctave);
          const bendSemitones = nextMidiNote - midiNote;
          // Bend range is typically +/- 2 semitones for TB-03
          // Full bend = 12 semitones, so calculate ratio
          const bendValue = Math.max(-1, Math.min(1, bendSemitones / 12));

          // Start at 0, ramp to target during step
          midi.pitchBend(0);
          setTimeout(() => {
            midi.pitchBend(bendValue);
          }, getStepDuration() * 0.7);
        }
      } else {
        // Reset pitch bend
        midi.pitchBend(0);
      }

      // Send note on
      midi.noteOn(midiNote, velocity);
      lastNoteRef.current = midiNote;
    },
    [steps, baseOctave, midi, getStepDuration]
  );

  // Main sequencer tick
  const tick = useCallback(() => {
    playStep(currentStep);
    sendModulations();
    advanceStep();
  }, [currentStep, playStep, sendModulations, advanceStep]);

  // Start playback
  const handlePlay = useCallback(() => {
    if (isPlaying) return;

    lastModulationTimeRef.current = performance.now();
    setCurrentStep(0);
    play();

    // Immediate first tick
    setTimeout(() => {
      const stepDuration = getStepDuration();
      playStep(0);
      sendModulations();

      intervalRef.current = window.setInterval(() => {
        const state = useSequencerStore.getState();
        const nextStep = (state.currentStep + 1) % state.stepCount;

        playStep(nextStep);
        sendModulations();
        advanceStep();
      }, stepDuration);
    }, 0);
  }, [isPlaying, setCurrentStep, play, getStepDuration, playStep, sendModulations, advanceStep]);

  // Stop playback
  const handleStop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Release any held note
    if (lastNoteRef.current !== null) {
      midi.noteOff(lastNoteRef.current);
      lastNoteRef.current = null;
    }

    // Reset pitch bend
    midi.pitchBend(0);

    // All notes off
    midi.allNotesOff();

    stop();
  }, [midi, stop]);

  // Update interval when tempo changes during playback
  useEffect(() => {
    if (isPlaying && intervalRef.current) {
      clearInterval(intervalRef.current);
      const stepDuration = getStepDuration();
      intervalRef.current = window.setInterval(() => {
        tick();
      }, stepDuration);
    }
  }, [tempo, isPlaying, tick, getStepDuration]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (midi.isConnected && lastNoteRef.current !== null) {
        midi.noteOff(lastNoteRef.current);
        midi.allNotesOff();
      }
    };
  }, [midi]);

  return {
    play: handlePlay,
    stop: handleStop,
  };
}
