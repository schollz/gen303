import { useMidi } from './hooks/useMidi';
import { useSequencerEngine } from './hooks/useSequencerEngine';
import { useSequencerStore, TB03_CCS, type ModulationTarget } from './stores/sequencerStore';
import { SequencerGrid } from './components/SequencerGrid';
import { SequenceVisualizer } from './components/SequenceVisualizer';
import { Transport } from './components/Transport';
import { MidiSelector } from './components/MidiSelector';
import { ModulationControl } from './components/ModulationControl';
import './App.css';

const MODULATION_LABELS: Record<ModulationTarget, string> = {
  envMod: 'Env Mod',
  accentLevel: 'Accent',
  resonance: 'Resonance',
  cutoff: 'Cutoff',
  decay: 'Decay',
};

function App() {
  const midi = useMidi();
  const { play, stop } = useSequencerEngine({ midi });
  const modulations = useSequencerStore((state) => state.modulations);
  const toggleModulation = useSequencerStore((state) => state.toggleModulation);
  const setModulationParam = useSequencerStore((state) => state.setModulationParam);

  return (
    <div className="app">
      <header className="header">
        <h1 className="title">acid-line</h1>
        <span className="subtitle">TB-03 Sequencer</span>
      </header>

      <main className="main">
        <section className="top-section">
          <MidiSelector
            outputs={midi.outputs}
            selectedOutput={midi.selectedOutput}
            isConnected={midi.isConnected}
            error={midi.error}
            onSelect={midi.selectOutput}
          />
          <Transport onPlay={play} onStop={stop} />
        </section>

        <section className="sequencer-section">
          <SequenceVisualizer />
          <SequencerGrid />
        </section>

        <section className="modulation-section">
          <h2 className="section-title">Modulation</h2>
          <div className="modulation-grid">
            {(Object.keys(TB03_CCS) as ModulationTarget[]).map((target) => (
              <ModulationControl
                key={target}
                name={MODULATION_LABELS[target]}
                ccNumber={TB03_CCS[target]}
                state={modulations[target]}
                onToggle={() => toggleModulation(target)}
                onParamChange={(param, value) => setModulationParam(target, param, value)}
              />
            ))}
          </div>
        </section>
      </main>

      <footer className="footer">
        <span>Press Play to start sequencing</span>
        <span className="divider">|</span>
        <span>Click notes to randomize</span>
      </footer>
    </div>
  );
}

export default App;
