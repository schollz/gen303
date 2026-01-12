import { useSequencerStore } from '../stores/sequencerStore';
import styles from './Transport.module.css';

interface TransportProps {
  onPlay: () => void;
  onStop: () => void;
}

export function Transport({ onPlay, onStop }: TransportProps) {
  const { isPlaying, tempo, setTempo, baseOctave, setBaseOctave, randomizeAll, clearAll } =
    useSequencerStore();

  return (
    <div className={styles.container}>
      <div className={styles.section}>
        <button
          className={`${styles.transportBtn} ${isPlaying ? styles.playing : ''}`}
          onClick={isPlaying ? onStop : onPlay}
        >
          {isPlaying ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <button className={styles.transportBtn} onClick={onStop} title="Stop">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" />
          </svg>
        </button>
      </div>

      <div className={styles.divider} />

      <div className={styles.section}>
        <div className={styles.control}>
          <label className={styles.label}>BPM</label>
          <input
            type="number"
            min={30}
            max={300}
            value={tempo}
            onChange={(e) => setTempo(parseInt(e.target.value) || 120)}
            className={styles.numberInput}
          />
        </div>

        <div className={styles.control}>
          <label className={styles.label}>OCT</label>
          <input
            type="number"
            min={1}
            max={6}
            value={baseOctave}
            onChange={(e) => setBaseOctave(parseInt(e.target.value) || 3)}
            className={styles.numberInput}
          />
        </div>
      </div>

      <div className={styles.divider} />

      <div className={styles.section}>
        <button className={styles.actionBtn} onClick={randomizeAll} title="Randomize all">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
          </svg>
          <span>Random</span>
        </button>

        <button className={styles.actionBtn} onClick={clearAll} title="Clear all">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
          <span>Clear</span>
        </button>
      </div>
    </div>
  );
}
