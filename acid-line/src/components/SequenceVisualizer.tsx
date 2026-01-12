import { useRef, useEffect } from 'react';
import { useSequencerStore, NOTE_NAMES } from '../stores/sequencerStore';
import styles from './SequenceVisualizer.module.css';

export function SequenceVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const { steps, currentStep, isPlaying } = useSequencerStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set up high DPI canvas
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const barWidth = width / 16;
    const padding = 4;

    const draw = () => {
      // Clear
      ctx.fillStyle = '#141310';
      ctx.fillRect(0, 0, width, height);

      // Draw steps as bars
      steps.forEach((step, i) => {
        const x = i * barWidth + padding / 2;
        const noteIndex = NOTE_NAMES.indexOf(step.note);
        const noteHeight = (noteIndex + 1) / 12;
        const octaveOffset = (step.octave + 1) / 3;
        const combinedHeight = (noteHeight * 0.6 + octaveOffset * 0.4);

        const barHeight = step.active ? combinedHeight * (height - 20) : 4;
        const y = height - barHeight - 10;

        // Base bar color
        let barColor = 'rgba(201, 166, 107, 0.3)';

        if (step.active) {
          if (isPlaying && currentStep === i) {
            barColor = '#e8c547'; // Active/playing
          } else if (step.accent) {
            barColor = 'rgba(179, 93, 75, 0.7)'; // Accented
          } else {
            barColor = 'rgba(201, 166, 107, 0.5)'; // Normal active
          }
        }

        // Draw bar
        ctx.fillStyle = barColor;
        ctx.fillRect(x, y, barWidth - padding, barHeight);

        // Draw slide indicator (connecting line to next)
        if (step.slide && step.active) {
          const nextIndex = (i + 1) % 16;
          const nextStep = steps[nextIndex];
          if (nextStep.active) {
            const nextNoteIndex = NOTE_NAMES.indexOf(nextStep.note);
            const nextNoteHeight = (nextNoteIndex + 1) / 12;
            const nextOctaveOffset = (nextStep.octave + 1) / 3;
            const nextCombinedHeight = (nextNoteHeight * 0.6 + nextOctaveOffset * 0.4);
            const nextBarHeight = nextCombinedHeight * (height - 20);
            const nextY = height - nextBarHeight - 10;

            ctx.beginPath();
            ctx.strokeStyle = 'rgba(201, 166, 107, 0.4)';
            ctx.lineWidth = 2;
            ctx.moveTo(x + barWidth - padding, y);
            ctx.lineTo(x + barWidth + padding / 2, nextY);
            ctx.stroke();
          }
        }

        // Draw tie indicator (horizontal line from previous)
        if (step.tie && i > 0) {
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(201, 166, 107, 0.6)';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 2]);
          ctx.moveTo(x - padding, y + barHeight / 2);
          ctx.lineTo(x, y + barHeight / 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Draw accent marker (small triangle above)
        if (step.accent && step.active) {
          ctx.beginPath();
          ctx.fillStyle = 'rgba(179, 93, 75, 0.8)';
          const triangleX = x + (barWidth - padding) / 2;
          ctx.moveTo(triangleX - 4, y - 4);
          ctx.lineTo(triangleX + 4, y - 4);
          ctx.lineTo(triangleX, y - 10);
          ctx.closePath();
          ctx.fill();
        }
      });

      // Draw playhead
      if (isPlaying) {
        const playheadX = currentStep * barWidth + barWidth / 2;
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(232, 197, 71, 0.5)';
        ctx.lineWidth = 2;
        ctx.moveTo(playheadX, 0);
        ctx.lineTo(playheadX, height);
        ctx.stroke();
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [steps, currentStep, isPlaying]);

  return (
    <div className={styles.container}>
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
}
