import { useSequencerStore, NOTE_NAMES, type NoteName } from '../stores/sequencerStore';
import styles from './SequencerGrid.module.css';

export function SequencerGrid() {
  const {
    steps,
    currentStep,
    isPlaying,
    setNote,
    setOctave,
    toggleAccent,
    toggleSlide,
    toggleTie,
    toggleActive,
    randomizeNote,
  } = useSequencerStore();

  const handleNoteClick = (stepIndex: number) => {
    randomizeNote(stepIndex);
  };

  const handleNoteSelect = (stepIndex: number, note: NoteName) => {
    setNote(stepIndex, note);
  };

  const cycleOctave = (stepIndex: number, currentOctave: number) => {
    const nextOctave = currentOctave >= 1 ? -1 : currentOctave + 1;
    setOctave(stepIndex, nextOctave);
  };

  return (
    <div className={styles.container}>
      {/* Step numbers */}
      <div className={styles.row}>
        <div className={styles.label}>STEP</div>
        {steps.map((_, i) => (
          <div
            key={i}
            className={`${styles.stepNumber} ${isPlaying && currentStep === i ? styles.active : ''}`}
          >
            {i + 1}
          </div>
        ))}
      </div>

      {/* Note row */}
      <div className={styles.row}>
        <div className={styles.label}>NOTE</div>
        {steps.map((step, i) => (
          <div
            key={i}
            className={`${styles.cell} ${styles.noteCell} ${!step.active ? styles.inactive : ''} ${
              isPlaying && currentStep === i ? styles.playing : ''
            }`}
          >
            <select
              value={step.note}
              onChange={(e) => handleNoteSelect(i, e.target.value as NoteName)}
              className={styles.noteSelect}
              onClick={(e) => e.stopPropagation()}
            >
              {NOTE_NAMES.map((note) => (
                <option key={note} value={note}>
                  {note}
                </option>
              ))}
            </select>
            <button
              className={styles.randomBtn}
              onClick={() => handleNoteClick(i)}
              title="Randomize note"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Octave row */}
      <div className={styles.row}>
        <div className={styles.label}>OCT</div>
        {steps.map((step, i) => (
          <button
            key={i}
            className={`${styles.cell} ${styles.octaveCell} ${
              step.octave !== 0 ? styles.octaveActive : ''
            }`}
            onClick={() => cycleOctave(i, step.octave)}
          >
            {step.octave > 0 ? `+${step.octave}` : step.octave === 0 ? '0' : step.octave}
          </button>
        ))}
      </div>

      {/* Accent row */}
      <div className={styles.row}>
        <div className={styles.label}>ACC</div>
        {steps.map((step, i) => (
          <button
            key={i}
            className={`${styles.cell} ${styles.toggleCell} ${step.accent ? styles.on : ''}`}
            onClick={() => toggleAccent(i)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L4 12h5v8h6v-8h5L12 2z" />
            </svg>
          </button>
        ))}
      </div>

      {/* Slide row */}
      <div className={styles.row}>
        <div className={styles.label}>SLD</div>
        {steps.map((step, i) => (
          <button
            key={i}
            className={`${styles.cell} ${styles.toggleCell} ${step.slide ? styles.on : ''}`}
            onClick={() => toggleSlide(i)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6h-6z" />
            </svg>
          </button>
        ))}
      </div>

      {/* Tie row */}
      <div className={styles.row}>
        <div className={styles.label}>TIE</div>
        {steps.map((step, i) => (
          <button
            key={i}
            className={`${styles.cell} ${styles.toggleCell} ${step.tie ? styles.on : ''} ${
              i === 0 ? styles.disabled : ''
            }`}
            onClick={() => i > 0 && toggleTie(i)}
            disabled={i === 0}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4 15h16v-2H4v2zm0 4h16v-2H4v2zm0-8h16V9H4v2zm0-6v2h16V5H4z" />
            </svg>
          </button>
        ))}
      </div>

      {/* Active/Rest row */}
      <div className={styles.row}>
        <div className={styles.label}>ON</div>
        {steps.map((step, i) => (
          <button
            key={i}
            className={`${styles.cell} ${styles.activeCell} ${step.active ? styles.on : ''}`}
            onClick={() => toggleActive(i)}
          >
            {step.active ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="8" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
