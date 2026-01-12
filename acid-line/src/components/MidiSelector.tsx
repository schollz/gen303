import type { MidiOutput } from '../hooks/useMidi';
import styles from './MidiSelector.module.css';

interface MidiSelectorProps {
  outputs: MidiOutput[];
  selectedOutput: MidiOutput | null;
  isConnected: boolean;
  error: string | null;
  onSelect: (id: string) => void;
}

export function MidiSelector({
  outputs,
  selectedOutput,
  isConnected,
  error,
  onSelect,
}: MidiSelectorProps) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.label}>MIDI OUT</span>
        <span className={`${styles.status} ${isConnected ? styles.connected : ''}`}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <select
        value={selectedOutput?.id || ''}
        onChange={(e) => onSelect(e.target.value)}
        className={styles.select}
      >
        <option value="">Select MIDI device...</option>
        {outputs.map((output) => (
          <option key={output.id} value={output.id}>
            {output.name}
          </option>
        ))}
      </select>
    </div>
  );
}
