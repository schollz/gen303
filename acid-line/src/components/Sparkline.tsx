import { useRef, useEffect } from 'react';
import type { OscillatorType } from '../stores/sequencerStore';

interface SparklineProps {
  low: number;
  high: number;
  speed: number;
  oscillator: OscillatorType;
  currentValue: number;
  enabled?: boolean;
  width?: number;
  height?: number;
}

export function Sparkline({
  low,
  high,
  speed,
  oscillator,
  currentValue,
  enabled = true,
  width = 120,
  height = 32,
}: SparklineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const phaseRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High DPI support
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Colors based on enabled state
      const rangeColor = enabled ? 'rgba(201, 166, 107, 0.15)' : 'rgba(90, 86, 78, 0.1)';
      const waveColor = enabled ? 'rgba(201, 166, 107, 0.5)' : 'rgba(90, 86, 78, 0.3)';
      const markerColor = enabled ? '#c9a66b' : '#5a564e';

      // Draw range background
      const lowY = height - (low / 127) * height;
      const highY = height - (high / 127) * height;
      ctx.fillStyle = rangeColor;
      ctx.fillRect(0, highY, width, lowY - highY);

      // Draw waveform
      ctx.beginPath();
      ctx.strokeStyle = waveColor;
      ctx.lineWidth = 1;

      const points = 60;
      for (let i = 0; i <= points; i++) {
        const x = (i / points) * width;
        const t = (i / points) * Math.PI * 2 + phaseRef.current;

        let waveValue: number;
        switch (oscillator) {
          case 'sine':
            waveValue = Math.sin(t);
            break;
          case 'saw':
            waveValue = ((t % (Math.PI * 2)) / Math.PI) - 1;
            break;
          case 'square':
            waveValue = Math.sin(t) > 0 ? 1 : -1;
            break;
          case 'triangle':
            waveValue = (2 / Math.PI) * Math.asin(Math.sin(t));
            break;
          default:
            waveValue = Math.sin(t);
        }

        // Map to low-high range
        const normalizedValue = (waveValue + 1) / 2;
        const mappedValue = low + normalizedValue * (high - low);
        const y = height - (mappedValue / 127) * height;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      // Draw current value marker
      const currentY = height - (currentValue / 127) * height;
      ctx.beginPath();
      ctx.arc(width - 8, currentY, 4, 0, Math.PI * 2);
      ctx.fillStyle = markerColor;
      ctx.fill();

      // Update phase for animation (only when enabled)
      if (enabled) {
        phaseRef.current += speed * 0.05;
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [low, high, speed, oscillator, currentValue, enabled, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width,
        height,
        borderRadius: 4,
        background: 'var(--bg-elevated)',
        opacity: enabled ? 1 : 0.5,
        transition: 'opacity 0.15s',
      }}
    />
  );
}
