import { Sparkline } from './Sparkline';
import type { ModulationState, ModulationParams, OscillatorType } from '../stores/sequencerStore';
import styles from './ModulationControl.module.css';

interface ModulationControlProps {
  name: string;
  ccNumber: number;
  state: ModulationState;
  onToggle: () => void;
  onParamChange: <K extends keyof ModulationParams>(param: K, value: ModulationParams[K]) => void;
}

const OSCILLATOR_OPTIONS: OscillatorType[] = ['sine', 'saw', 'square', 'triangle'];

export function ModulationControl({
  name,
  ccNumber,
  state,
  onToggle,
  onParamChange,
}: ModulationControlProps) {
  return (
    <div className={`${styles.container} ${state.enabled ? styles.enabled : ''}`}>
      <button className={styles.header} onClick={onToggle}>
        <span className={styles.name}>{name}</span>
        <span className={styles.headerRight}>
          <span className={styles.cc}>CC {ccNumber}</span>
          <span className={`${styles.toggle} ${state.enabled ? styles.on : ''}`}>
            {state.enabled ? 'ON' : 'OFF'}
          </span>
        </span>
      </button>

      <div className={styles.content}>
        <Sparkline
          low={state.low}
          high={state.high}
          speed={state.speed}
          oscillator={state.oscillator}
          currentValue={state.currentValue}
          enabled={state.enabled}
        />

        <div className={styles.controls}>
          <div className={styles.row}>
            <label className={styles.label}>Low</label>
            <input
              type="range"
              min={0}
              max={127}
              value={state.low}
              onChange={(e) => onParamChange('low', parseInt(e.target.value))}
              className={styles.slider}
              disabled={!state.enabled}
            />
            <span className={styles.value}>{state.low}</span>
          </div>

          <div className={styles.row}>
            <label className={styles.label}>High</label>
            <input
              type="range"
              min={0}
              max={127}
              value={state.high}
              onChange={(e) => onParamChange('high', parseInt(e.target.value))}
              className={styles.slider}
              disabled={!state.enabled}
            />
            <span className={styles.value}>{state.high}</span>
          </div>

          <div className={styles.row}>
            <label className={styles.label}>Speed</label>
            <input
              type="range"
              min={1}
              max={100}
              value={state.speed * 10}
              onChange={(e) => onParamChange('speed', parseInt(e.target.value) / 10)}
              className={styles.slider}
              disabled={!state.enabled}
            />
            <span className={styles.value}>{state.speed.toFixed(1)}</span>
          </div>

          <div className={styles.row}>
            <label className={styles.label}>Wave</label>
            <select
              value={state.oscillator}
              onChange={(e) => onParamChange('oscillator', e.target.value as OscillatorType)}
              className={styles.select}
              disabled={!state.enabled}
            >
              {OSCILLATOR_OPTIONS.map((osc) => (
                <option key={osc} value={osc}>
                  {osc}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
