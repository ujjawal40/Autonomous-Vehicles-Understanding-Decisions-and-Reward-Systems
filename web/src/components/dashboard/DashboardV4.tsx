/**
 * Dashboard V4 - Full Integration
 *
 * Complete RL visualization with neural flow, highway/city maps, and dynamic updates.
 */

import { useState, useCallback, useEffect } from 'react';
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Settings,
  ChevronDown,
  AlertTriangle,
  Zap,
  Target,
  Activity,
  Cpu,
  BarChart3,
  RefreshCw,
  MapPin,
  Layers,
} from 'lucide-react';
import { NeuralFlowViz } from '../visualization/NeuralFlowViz';
import { Highway2D } from '../visualization/Highway2D';
import { CityMap } from '../visualization/CityMap';

// ============================================
// TYPES
// ============================================

interface ActionProbability {
  id: string;
  name: string;
  probability: number;
  color: string;
}

interface RLMetrics {
  policyLoss: number;
  valueLoss: number;
  entropy: number;
  kl_divergence: number;
  explained_variance: number;
  learning_rate: number;
  epsilon: number;
  q_value_mean: number;
  advantage_mean: number;
}

interface RewardConfig {
  id: string;
  name: string;
  value: number;
  description: string;
}

// ============================================
// CITY SELECTOR
// ============================================

const ENVIRONMENTS = [
  { id: 'highway', name: 'Highway', type: 'simulation', complexity: 'Medium' },
  { id: 'london', name: 'London', type: 'city', complexity: 'High' },
  { id: 'nyc', name: 'New York', type: 'city', complexity: 'Very High' },
  { id: 'tokyo', name: 'Tokyo', type: 'city', complexity: 'Extreme' },
  { id: 'mumbai', name: 'Mumbai', type: 'city', complexity: 'Extreme' },
];

function EnvironmentSelector({ selected, onChange }: { selected: string; onChange: (id: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const current = ENVIRONMENTS.find(e => e.id === selected) || ENVIRONMENTS[0];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-[#0a0a0f] border border-[#00d4ff]/30 rounded-lg hover:border-[#00d4ff]/60 transition-all"
      >
        <Layers size={16} className="text-[#00d4ff]" />
        <span className="font-medium">{current.name}</span>
        <span className={`text-[10px] px-2 py-0.5 rounded ${
          current.complexity === 'Extreme' ? 'bg-[#ff3366]/20 text-[#ff3366]' :
          current.complexity === 'Very High' ? 'bg-[#ff6b35]/20 text-[#ff6b35]' :
          current.complexity === 'High' ? 'bg-[#ffcc00]/20 text-[#ffcc00]' :
          'bg-[#00ff88]/20 text-[#00ff88]'
        }`}>
          {current.complexity}
        </span>
        <ChevronDown size={14} className={`text-white/50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 w-72 bg-[#0a0a0f] border border-white/10 rounded-lg shadow-2xl z-50 overflow-hidden">
          {ENVIRONMENTS.map(env => (
            <button
              key={env.id}
              onClick={() => { onChange(env.id); setIsOpen(false); }}
              className={`w-full px-4 py-3 text-left hover:bg-[#00d4ff]/10 transition-colors border-b border-white/5 last:border-0 ${
                env.id === selected ? 'bg-[#00d4ff]/5' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {env.type === 'city' ? <MapPin size={14} /> : <Activity size={14} />}
                  <span className="font-medium">{env.name}</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded ${
                  env.complexity === 'Extreme' ? 'bg-[#ff3366]/20 text-[#ff3366]' :
                  env.complexity === 'Very High' ? 'bg-[#ff6b35]/20 text-[#ff6b35]' :
                  env.complexity === 'High' ? 'bg-[#ffcc00]/20 text-[#ffcc00]' :
                  'bg-[#00ff88]/20 text-[#00ff88]'
                }`}>
                  {env.complexity}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// ALGORITHM SELECTOR
// ============================================

const ALGORITHMS = [
  { id: 'DQN', name: 'DQN', full: 'Deep Q-Network', type: 'Value-Based' },
  { id: 'DoubleDQN', name: 'Double DQN', full: 'Double Deep Q-Network', type: 'Value-Based' },
  { id: 'PPO', name: 'PPO', full: 'Proximal Policy Optimization', type: 'Policy Gradient' },
  { id: 'A2C', name: 'A2C', full: 'Advantage Actor-Critic', type: 'Actor-Critic' },
  { id: 'SAC', name: 'SAC', full: 'Soft Actor-Critic', type: 'Actor-Critic' },
];

function AlgorithmSelector({ selected, onChange, disabled }: { selected: string; onChange: (id: string) => void; disabled?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const current = ALGORITHMS.find(a => a.id === selected) || ALGORITHMS[0];

  return (
    <div className="space-y-1">
      <label className="text-[10px] text-white/40 uppercase tracking-widest flex items-center gap-1">
        <Cpu size={10} />
        RL Algorithm
      </label>
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full flex items-center justify-between px-3 py-2 bg-[#0a0a0f] border border-white/10 rounded-lg hover:border-[#00d4ff]/30 disabled:opacity-50 transition-all"
      >
        <div className="text-left">
          <div className="font-medium">{current.name}</div>
          <div className="text-[10px] text-white/40">{current.type}</div>
        </div>
        <ChevronDown size={14} className={`text-white/50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute mt-1 w-64 bg-[#0a0a0f] border border-white/20 rounded-lg shadow-2xl z-50">
          {ALGORITHMS.map(algo => (
            <button
              key={algo.id}
              onClick={() => { onChange(algo.id); setIsOpen(false); }}
              className={`w-full px-3 py-2 text-left hover:bg-[#00d4ff]/10 transition-colors ${
                algo.id === selected ? 'bg-[#00d4ff]/5 border-l-2 border-[#00d4ff]' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{algo.name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-white/50">{algo.type}</span>
              </div>
              <p className="text-[10px] text-white/40">{algo.full}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// REWARD CONFIGURATION
// ============================================

function RewardConfiguration({
  rewards,
  onChange,
  disabled,
}: {
  rewards: RewardConfig[];
  onChange: (id: string, value: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-[10px] text-white/40 uppercase tracking-widest flex items-center gap-1">
        <Target size={10} />
        Reward Configuration
      </h3>

      <div className="space-y-2">
        {rewards.map(reward => (
          <div key={reward.id} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/70">{reward.name}</span>
              <span className="text-xs font-mono text-[#00d4ff]">{reward.value.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="-2"
              max="2"
              step="0.1"
              value={reward.value}
              onChange={(e) => onChange(reward.id, parseFloat(e.target.value))}
              disabled={disabled}
              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-3
                [&::-webkit-slider-thumb]:h-3
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-[#00d4ff]
                [&::-webkit-slider-thumb]:shadow-[0_0_10px_#00d4ff]
                disabled:opacity-50"
            />
            <p className="text-[9px] text-white/30">{reward.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// TECHNICAL METRICS
// ============================================

function TechnicalMetrics({ metrics }: { metrics: RLMetrics }) {
  return (
    <div className="grid grid-cols-3 gap-1.5 text-xs">
      <MetricBox label="Policy Loss" value={metrics.policyLoss.toFixed(4)} />
      <MetricBox label="Value Loss" value={metrics.valueLoss.toFixed(4)} />
      <MetricBox label="Entropy" value={metrics.entropy.toFixed(3)} />
      <MetricBox label="KL Div" value={metrics.kl_divergence.toFixed(4)} />
      <MetricBox label="Exp. Var" value={(metrics.explained_variance * 100).toFixed(0) + '%'} />
      <MetricBox label="ε" value={metrics.epsilon.toFixed(2)} />
      <MetricBox label="Q-value" value={metrics.q_value_mean.toFixed(2)} highlight />
      <MetricBox label="Advantage" value={metrics.advantage_mean.toFixed(3)} />
      <MetricBox label="LR" value={metrics.learning_rate.toExponential(0)} />
    </div>
  );
}

function MetricBox({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`p-1.5 rounded ${highlight ? 'bg-[#00d4ff]/10 border border-[#00d4ff]/20' : 'bg-white/5'}`}>
      <div className="text-[8px] text-white/40 uppercase">{label}</div>
      <div className={`font-mono text-[11px] ${highlight ? 'text-[#00d4ff]' : 'text-white'}`}>{value}</div>
    </div>
  );
}

// ============================================
// HELPERS
// ============================================

const CITY_DATA: Record<string, {
  center: { lat: number; lng: number };
  route: [number, number][];
  destination: { lat: number; lng: number; name: string };
}> = {
  london: {
    center: { lat: 51.5137, lng: -0.1337 },
    route: [[51.5137, -0.1337], [51.515, -0.130], [51.517, -0.125], [51.518, -0.120]],
    destination: { lat: 51.518, lng: -0.120, name: 'Covent Garden' },
  },
  nyc: {
    center: { lat: 40.758, lng: -73.9855 },
    route: [[40.758, -73.9855], [40.760, -73.983], [40.762, -73.980], [40.765, -73.978]],
    destination: { lat: 40.765, lng: -73.978, name: 'Central Park' },
  },
  tokyo: {
    center: { lat: 35.6595, lng: 139.7004 },
    route: [[35.6595, 139.7004], [35.661, 139.702], [35.663, 139.705], [35.665, 139.708]],
    destination: { lat: 35.665, lng: 139.708, name: 'Harajuku' },
  },
  mumbai: {
    center: { lat: 19.076, lng: 72.8777 },
    route: [[19.076, 72.8777], [19.078, 72.880], [19.080, 72.883], [19.082, 72.886]],
    destination: { lat: 19.082, lng: 72.886, name: 'Marine Drive' },
  },
};

function getCityVehicle(city: string, speed: number) {
  const data = CITY_DATA[city] || CITY_DATA.london;
  return { lat: data.center.lat, lng: data.center.lng, heading: 45, speed };
}

function getCityRoute(city: string) {
  return CITY_DATA[city]?.route || CITY_DATA.london.route;
}

function getCityDestination(city: string) {
  return CITY_DATA[city]?.destination || CITY_DATA.london.destination;
}

// ============================================
// MAIN DASHBOARD V4
// ============================================

export function DashboardV4() {
  // State
  const [environment, setEnvironment] = useState('highway');
  const [algorithm, setAlgorithm] = useState('DQN');
  const [status, setStatus] = useState<'idle' | 'training' | 'paused'>('idle');
  const [episode, setEpisode] = useState(0);
  const [totalEpisodes, setTotalEpisodes] = useState(1000);
  const [step, setStep] = useState(0);
  const [rewardsChanged, setRewardsChanged] = useState(false);

  // Dynamic simulation state
  const [egoSpeed, setEgoSpeed] = useState(80);
  const [egoLane, setEgoLane] = useState(1);
  const [selectedAction, setSelectedAction] = useState('accel');

  const [rewards, setRewards] = useState<RewardConfig[]>([
    { id: 'speed', name: 'Speed Optimization', value: 1.0, description: 'Reward for maintaining target velocity' },
    { id: 'safety', name: 'Safety Distance', value: 2.0, description: 'Penalty for proximity to obstacles' },
    { id: 'lane', name: 'Lane Discipline', value: 0.5, description: 'Reward for lane centering' },
    { id: 'efficiency', name: 'Route Efficiency', value: 0.3, description: 'Bonus for optimal path selection' },
    { id: 'comfort', name: 'Ride Comfort', value: 0.2, description: 'Penalty for sudden maneuvers' },
  ]);

  const [probabilities, setProbabilities] = useState<ActionProbability[]>([
    { id: 'accel', name: 'Accelerate', probability: 0.35, color: '#00ff88' },
    { id: 'brake', name: 'Brake', probability: 0.15, color: '#ff6b35' },
    { id: 'left', name: 'Left', probability: 0.15, color: '#00d4ff' },
    { id: 'right', name: 'Right', probability: 0.15, color: '#a855f7' },
    { id: 'hold', name: 'Hold', probability: 0.20, color: '#ffcc00' },
  ]);

  const [rlMetrics, setRlMetrics] = useState<RLMetrics>({
    policyLoss: 0.0234,
    valueLoss: 0.0156,
    entropy: 0.892,
    kl_divergence: 0.0012,
    explained_variance: 0.87,
    learning_rate: 0.0003,
    epsilon: 0.15,
    q_value_mean: 12.45,
    advantage_mean: 0.023,
  });

  // Dynamic probability updates during training
  useEffect(() => {
    if (status !== 'training') return;

    const interval = setInterval(() => {
      // Simulate probability changes
      setProbabilities(prev => {
        const newProbs = prev.map(p => ({
          ...p,
          probability: Math.max(0.05, Math.min(0.6, p.probability + (Math.random() - 0.5) * 0.1)),
        }));

        // Normalize
        const total = newProbs.reduce((sum, p) => sum + p.probability, 0);
        const normalized = newProbs.map(p => ({ ...p, probability: p.probability / total }));

        // Select action with highest probability
        const maxProb = Math.max(...normalized.map(p => p.probability));
        const selected = normalized.find(p => p.probability === maxProb);
        if (selected) setSelectedAction(selected.id);

        return normalized;
      });

      // Update vehicle state based on selected action
      setEgoSpeed(s => {
        if (selectedAction === 'accel') return Math.min(120, s + 2);
        if (selectedAction === 'brake') return Math.max(40, s - 3);
        return s + (Math.random() - 0.5) * 2;
      });

      setEgoLane(l => {
        if (selectedAction === 'left' && l > 0) return l - 1;
        if (selectedAction === 'right' && l < 3) return l + 1;
        return l;
      });

      // Update metrics
      setRlMetrics(m => ({
        ...m,
        policyLoss: Math.max(0.001, m.policyLoss + (Math.random() - 0.52) * 0.002),
        valueLoss: Math.max(0.001, m.valueLoss + (Math.random() - 0.52) * 0.001),
        entropy: Math.max(0.1, Math.min(1, m.entropy + (Math.random() - 0.5) * 0.02)),
        q_value_mean: m.q_value_mean + (Math.random() - 0.48) * 0.5,
        epsilon: Math.max(0.01, m.epsilon - 0.0001),
      }));

      // Update step/episode
      setStep(s => s + 1);
    }, 200);

    return () => clearInterval(interval);
  }, [status, selectedAction]);

  // Episode progression
  useEffect(() => {
    if (step > 0 && step % 200 === 0 && status === 'training') {
      setEpisode(e => Math.min(e + 1, totalEpisodes));
    }
  }, [step, status, totalEpisodes]);

  const handleRewardChange = useCallback((id: string, value: number) => {
    setRewards(prev => prev.map(r => r.id === id ? { ...r, value } : r));
    setRewardsChanged(true);
  }, []);

  const isCity = environment !== 'highway';

  return (
    <div className="min-h-screen bg-[#000000] text-white font-['Space_Grotesk',sans-serif]">
      {/* Header */}
      <header className="h-14 border-b border-white/5 flex items-center justify-between px-4 bg-[#000000]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-[#00d4ff] to-[#00ff88] flex items-center justify-center">
              <Activity size={16} className="text-black" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight">ADV</div>
              <div className="text-[8px] text-white/30 uppercase tracking-widest">RL Visualizer</div>
            </div>
          </div>

          <EnvironmentSelector selected={environment} onChange={setEnvironment} />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded bg-white/5">
            <div className={`w-2 h-2 rounded-full ${
              status === 'training' ? 'bg-[#00ff88] animate-pulse' :
              status === 'paused' ? 'bg-[#ffcc00]' : 'bg-white/30'
            }`} />
            <span className="text-xs uppercase tracking-wider">
              {status === 'training' ? 'Training' : status === 'paused' ? 'Paused' : 'Ready'}
            </span>
          </div>
          <div className="text-xs font-mono text-white/40">
            Ep <span className="text-[#00d4ff]">{episode}</span>/{totalEpisodes} • Step {step.toLocaleString()}
          </div>
          <button className="p-1.5 text-white/40 hover:text-white"><Settings size={16} /></button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* Left Panel */}
        <div className="w-72 border-r border-white/5 p-3 space-y-4 overflow-y-auto bg-[#030305]">
          <AlgorithmSelector selected={algorithm} onChange={setAlgorithm} disabled={status === 'training'} />

          {/* Training controls */}
          <div className="space-y-2">
            <label className="text-[10px] text-white/40 uppercase tracking-widest flex items-center gap-1">
              <Zap size={10} />
              Training
            </label>

            <input
              type="number"
              value={totalEpisodes}
              onChange={(e) => setTotalEpisodes(parseInt(e.target.value) || 100)}
              disabled={status === 'training'}
              className="w-full px-3 py-2 bg-[#0a0a0f] border border-white/10 rounded text-sm font-mono
                focus:border-[#00d4ff]/50 focus:outline-none disabled:opacity-50"
              placeholder="Episodes"
            />

            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#00d4ff] to-[#00ff88] transition-all"
                style={{ width: `${(episode / totalEpisodes) * 100}%` }}
              />
            </div>

            <div className="flex gap-2">
              {status === 'idle' && (
                <button
                  onClick={() => {
                    if (rewardsChanged) setRewardsChanged(false);
                    setStatus('training');
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded transition-all ${
                    rewardsChanged
                      ? 'bg-[#ffcc00] text-black hover:bg-[#ffcc00]/80'
                      : 'bg-[#00ff88] text-black hover:bg-[#00ff88]/80'
                  }`}
                >
                  {rewardsChanged ? <><RefreshCw size={14} /> Apply & Retrain</> : <><Play size={14} /> Start</>}
                </button>
              )}
              {status === 'training' && (
                <>
                  <button
                    onClick={() => setStatus('paused')}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#ffcc00] text-black text-sm font-medium rounded"
                  >
                    <Pause size={14} /> Pause
                  </button>
                  <button
                    onClick={() => { setStatus('idle'); setEpisode(0); setStep(0); }}
                    className="px-3 py-2 bg-[#ff3366] text-white rounded"
                  >
                    <Square size={14} />
                  </button>
                </>
              )}
              {status === 'paused' && (
                <>
                  <button
                    onClick={() => setStatus('training')}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#00ff88] text-black text-sm font-medium rounded"
                  >
                    <Play size={14} /> Resume
                  </button>
                  <button
                    onClick={() => { setStatus('idle'); setEpisode(0); setStep(0); }}
                    className="px-3 py-2 bg-white/10 text-white rounded"
                  >
                    <RotateCcw size={14} />
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="border-t border-white/5 pt-3">
            <RewardConfiguration
              rewards={rewards}
              onChange={handleRewardChange}
            />
          </div>
        </div>

        {/* Center - Visualization */}
        <div className="flex-1 flex flex-col p-3 gap-3">
          {/* Map/Highway */}
          <div className="flex-1 relative rounded-lg overflow-hidden border border-white/10">
            {isCity ? (
              <CityMap
                city={environment}
                vehicle={getCityVehicle(environment, egoSpeed)}
                route={getCityRoute(environment)}
                destination={getCityDestination(environment)}
                isSimulating={status === 'training'}
              />
            ) : (
              <Highway2D
                lanes={4}
                egoSpeed={egoSpeed}
                egoLane={egoLane}
                isSimulating={status === 'training'}
              />
            )}
          </div>

          {/* Neural Flow */}
          <div className="h-64 border-t border-white/5">
            <NeuralFlowViz
              probabilities={probabilities}
              selectedAction={selectedAction}
              isAnimating={status === 'training'}
            />
          </div>
        </div>

        {/* Right Panel - Metrics */}
        <div className="w-80 border-l border-white/5 bg-[#030305] overflow-y-auto">
          {/* Speed */}
          <div className="p-3 border-b border-white/5">
            <div className="text-[10px] text-white/40 uppercase tracking-widest mb-2">Speed</div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-light text-[#00d4ff]">{Math.round(egoSpeed)}</span>
              <span className="text-sm text-white/40">km/h</span>
            </div>
            <div className="h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-[#00d4ff]" style={{ width: `${(egoSpeed / 120) * 100}%` }} />
            </div>
          </div>

          {/* Lane - only for highway */}
          {!isCity && (
            <div className="p-3 border-b border-white/5">
              <div className="text-[10px] text-white/40 uppercase tracking-widest mb-2">Lane</div>
              <div className="flex gap-1">
                {[0, 1, 2, 3].map(l => (
                  <div
                    key={l}
                    className={`flex-1 h-8 rounded flex items-center justify-center text-xs font-mono ${
                      l === egoLane ? 'bg-[#00d4ff]/20 border border-[#00d4ff] text-[#00d4ff]' : 'bg-white/5 text-white/30'
                    }`}
                  >
                    {l + 1}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RL Metrics */}
          <div className="p-3 border-b border-white/5">
            <div className="text-[10px] text-white/40 uppercase tracking-widest mb-2 flex items-center gap-1">
              <BarChart3 size={10} />
              RL Metrics
            </div>
            <TechnicalMetrics metrics={rlMetrics} />
          </div>

          {/* Risk */}
          <div className="p-3">
            <div className="text-[10px] text-white/40 uppercase tracking-widest mb-2 flex items-center gap-1">
              <AlertTriangle size={10} />
              Risk
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/50">Collision</span>
              <span className="text-xs font-medium text-[#00ff88]">LOW</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full w-[20%] bg-gradient-to-r from-[#00ff88] to-[#ffcc00] rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
