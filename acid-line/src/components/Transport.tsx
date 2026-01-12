import { useEffect, useState } from 'react';
import { NOTE_NAMES, type NoteName, type ScaleType, useSequencerStore } from '../stores/sequencerStore';
import styles from './Transport.module.css';

interface TransportProps {
  onPlay: () => void;
  onStop: () => void;
}

export function Transport({ onPlay, onStop }: TransportProps) {
  const {
    isPlaying,
    tempo,
    setTempo,
    baseOctave,
    setBaseOctave,
    keyRoot,
    setKeyRoot,
    scaleType,
    setScaleType,
    randomizeAll,
    clearAll,
  } =
    useSequencerStore();

  const [tempoInput, setTempoInput] = useState(`${tempo}`);

  useEffect(() => {
    setTempoInput(`${tempo}`);
  }, [tempo]);

  const handleTempoChange = (value: string) => {
    setTempoInput(value);
    if (/^\d+$/.test(value)) {
      setTempo(parseInt(value, 10));
    }
  };

  const handleTempoBlur = () => {
    const parsed = parseInt(tempoInput, 10);
    if (Number.isFinite(parsed)) {
      setTempo(parsed);
      setTempoInput(`${Math.max(30, Math.min(300, parsed))}`);
      return;
    }
    setTempoInput(`${tempo}`);
  };

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
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={tempoInput}
            onChange={(e) => handleTempoChange(e.target.value)}
            onBlur={handleTempoBlur}
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

        <div className={styles.control}>
          <label className={styles.label}>KEY</label>
          <select
            value={keyRoot}
            onChange={(e) => setKeyRoot(e.target.value as NoteName)}
            className={styles.selectInput}
          >
            {NOTE_NAMES.map((note) => (
              <option key={note} value={note}>
                {note}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.control}>
          <label className={styles.label}>SCALE</label>
          <select
            value={scaleType}
            onChange={(e) => setScaleType(e.target.value as ScaleType)}
            className={styles.selectInput}
          >
            <option value="major">Major</option>
            <option value="minor">Minor</option>
          </select>
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
