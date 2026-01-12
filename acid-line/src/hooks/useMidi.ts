import { useState, useEffect, useCallback, useRef } from 'react';

export interface MidiOutput {
  id: string;
  name: string;
  output: MIDIOutput;
}

export interface UseMidiReturn {
  outputs: MidiOutput[];
  selectedOutput: MidiOutput | null;
  isConnected: boolean;
  error: string | null;
  selectOutput: (id: string) => void;
  noteOn: (note: number, velocity: number, channel?: number) => void;
  noteOff: (note: number, channel?: number) => void;
  pitchBend: (value: number, channel?: number) => void;
  controlChange: (cc: number, value: number, channel?: number) => void;
  allNotesOff: (channel?: number) => void;
}

// TB-03 uses channel 1 by default
const DEFAULT_CHANNEL = 1;

export function useMidi(): UseMidiReturn {
  const [outputs, setOutputs] = useState<MidiOutput[]>([]);
  const [selectedOutput, setSelectedOutput] = useState<MidiOutput | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const midiAccessRef = useRef<MIDIAccess | null>(null);

  useEffect(() => {
    async function initMidi() {
      if (!navigator.requestMIDIAccess) {
        setError('WebMIDI not supported in this browser');
        return;
      }

      try {
        const access = await navigator.requestMIDIAccess({ sysex: false });
        midiAccessRef.current = access;

        const updateOutputs = () => {
          const newOutputs: MidiOutput[] = [];
          access.outputs.forEach((output) => {
            newOutputs.push({
              id: output.id,
              name: output.name || 'Unknown Device',
              output,
            });
          });
          setOutputs(newOutputs);

          // Auto-select TB-03 or Boutique device if found
          const preferredDevice = newOutputs.find((o) => {
            const name = o.name.toLowerCase();
            return (
              name.includes('tb-03') ||
              name.includes('tb03') ||
              name.includes('boutique')
            );
          });
          if (preferredDevice && !selectedOutput) {
            setSelectedOutput(preferredDevice);
            setIsConnected(true);
          }
        };

        updateOutputs();
        access.onstatechange = updateOutputs;
      } catch (err) {
        setError(`Failed to initialize MIDI: ${err}`);
      }
    }

    initMidi();
  }, []);

  const selectOutput = useCallback(
    (id: string) => {
      const output = outputs.find((o) => o.id === id);
      if (output) {
        setSelectedOutput(output);
        setIsConnected(true);
        setError(null);
      }
    },
    [outputs]
  );

  const send = useCallback(
    (data: number[]) => {
      if (selectedOutput?.output) {
        try {
          selectedOutput.output.send(data);
        } catch (err) {
          console.error('MIDI send error:', err);
        }
      }
    },
    [selectedOutput]
  );

  const noteOn = useCallback(
    (note: number, velocity: number, channel: number = DEFAULT_CHANNEL) => {
      const status = 0x90 | (channel - 1);
      const vel = Math.max(0, Math.min(127, Math.round(velocity)));
      send([status, note, vel]);
    },
    [send]
  );

  const noteOff = useCallback(
    (note: number, channel: number = DEFAULT_CHANNEL) => {
      const status = 0x80 | (channel - 1);
      send([status, note, 0]);
    },
    [send]
  );

  const pitchBend = useCallback(
    (value: number, channel: number = DEFAULT_CHANNEL) => {
      // value: -1 to 1, convert to 14-bit (0-16383, center at 8192)
      const bendValue = Math.max(0, Math.min(16383, Math.round((value + 1) * 8191.5)));
      const lsb = bendValue & 0x7f;
      const msb = (bendValue >> 7) & 0x7f;
      const status = 0xe0 | (channel - 1);
      send([status, lsb, msb]);
    },
    [send]
  );

  const controlChange = useCallback(
    (cc: number, value: number, channel: number = DEFAULT_CHANNEL) => {
      const status = 0xb0 | (channel - 1);
      const ccNum = Math.max(0, Math.min(127, cc));
      const ccVal = Math.max(0, Math.min(127, Math.round(value)));
      send([status, ccNum, ccVal]);
    },
    [send]
  );

  const allNotesOff = useCallback(
    (channel: number = DEFAULT_CHANNEL) => {
      // CC 123 = All Notes Off
      controlChange(123, 0, channel);
      // Also reset pitch bend
      pitchBend(0, channel);
    },
    [controlChange, pitchBend]
  );

  return {
    outputs,
    selectedOutput,
    isConnected,
    error,
    selectOutput,
    noteOn,
    noteOff,
    pitchBend,
    controlChange,
    allNotesOff,
  };
}
