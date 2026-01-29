/**
 * Dashboard V3 - SpaceX-Inspired RL Visualization
 *
 * Clean, technical, modern design with proper RL metrics.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
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
} from 'lucide-react';

// ============================================
// MODERN CAR SVG COMPONENT
// ============================================

function ModernCarSVG({ className = '', color = '#00d4ff' }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 100 40" className={className} fill="none">
      {/* Car body - Tesla/SpaceX inspired sleek design */}
      <defs>
        <linearGradient id="carGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="0.6" />
        </linearGradient>
        <filter id="carGlow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Main body */}
      <path
        d="M15 25 Q5 25 5 20 L10 15 Q15 10 25 10 L75 10 Q85 10 90 15 L95 20 Q95 25 85 25 Z"
        fill="url(#carGradient)"
        filter="url(#carGlow)"
      />

      {/* Windshield */}
      <path
        d="M25 12 L35 12 Q40 12 42 15 L45 20 L25 20 Z"
        fill="rgba(0,0,0,0.4)"
      />

      {/* Rear window */}
      <path
        d="M65 12 L75 12 L78 20 L60 20 L63 15 Q65 12 65 12"
        fill="rgba(0,0,0,0.4)"
      />

      {/* Headlights */}
      <ellipse cx="88" cy="18" rx="3" ry="2" fill="#fff" opacity="0.9" />
      <ellipse cx="12" cy="18" rx="3" ry="2" fill="#ff3366" opacity="0.8" />

      {/* Wheels */}
      <circle cx="25" cy="28" r="6" fill="#1a1a2e" stroke={color} strokeWidth="2" />
      <circle cx="25" cy="28" r="2" fill={color} />
      <circle cx="75" cy="28" r="6" fill="#1a1a2e" stroke={color} strokeWidth="2" />
      <circle cx="75" cy="28" r="2" fill={color} />

      {/* Detail lines */}
      <path d="M30 15 L70 15" stroke={color} strokeWidth="0.5" opacity="0.5" />
      <path d="M20 22 L80 22" stroke={color} strokeWidth="0.5" opacity="0.3" />
    </svg>
  );
}

// ============================================
// PROBABILITY VOLCANO 3D (Simplified)
// ============================================

function ProbabilityDisplay({ probabilities }: { probabilities: { action: string; prob: number; color: string }[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sorted = [...probabilities].sort((a, b) => b.prob - a.prob);
  const maxProb = Math.max(...probabilities.map(p => p.prob));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height * 0.7;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Draw 3D bars
    const barWidth = 50;
    const barGap = 15;
    const totalWidth = sorted.length * (barWidth + barGap) - barGap;
    const startX = centerX - totalWidth / 2;

    sorted.forEach((p, i) => {
      const x = startX + i * (barWidth + barGap);
      const barHeight = (p.prob / maxProb) * (height * 0.5);
      const y = centerY - barHeight;

      // 3D effect - side
      ctx.fillStyle = p.color + '80';
      ctx.beginPath();
      ctx.moveTo(x + barWidth, centerY);
      ctx.lineTo(x + barWidth + 10, centerY - 10);
      ctx.lineTo(x + barWidth + 10, y - 10);
      ctx.lineTo(x + barWidth, y);
      ctx.closePath();
      ctx.fill();

      // 3D effect - top
      ctx.fillStyle = p.color + 'cc';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 10, y - 10);
      ctx.lineTo(x + barWidth + 10, y - 10);
      ctx.lineTo(x + barWidth, y);
      ctx.closePath();
      ctx.fill();

      // Front face
      ctx.fillStyle = p.color;
      ctx.fillRect(x, y, barWidth, barHeight);

      // Glow effect
      const gradient = ctx.createLinearGradient(x, y, x, centerY);
      gradient.addColorStop(0, p.color + '40');
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.fillRect(x - 5, y, barWidth + 10, barHeight + 5);

      // Label
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(p.action, x + barWidth / 2, centerY + 15);
      ctx.fillText(`${(p.prob * 100).toFixed(0)}%`, x + barWidth / 2, y - 15);
    });

  }, [sorted, maxProb]);

  return (
    <div className="relative">
      <canvas ref={canvasRef} width={400} height={200} className="w-full" />
      <div className="absolute top-2 left-2 text-[10px] text-white/40 uppercase tracking-widest">
        Action Probabilities
      </div>
    </div>
  );
}

// ============================================
// CITY SELECTOR
// ============================================

const CITIES = [
  { id: 'highway', name: 'Highway', description: 'Multi-lane highway simulation', complexity: 'Medium' },
  { id: 'london', name: 'London', description: 'Soho district - roundabouts & narrow streets', complexity: 'High' },
  { id: 'nyc', name: 'New York', description: 'Manhattan grid with heavy traffic', complexity: 'Very High' },
  { id: 'tokyo', name: 'Tokyo', description: 'Complex intersections & pedestrians', complexity: 'Extreme' },
  { id: 'mumbai', name: 'Mumbai', description: 'Chaotic traffic patterns', complexity: 'Extreme' },
];

function CitySelector({ selected, onChange }: { selected: string; onChange: (id: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const current = CITIES.find(c => c.id === selected) || CITIES[0];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-[#0a0a0f] border border-[#00d4ff]/30 rounded hover:border-[#00d4ff]/60 transition-all"
      >
        <MapPin size={14} className="text-[#00d4ff]" />
        <span className="text-sm font-medium">{current.name}</span>
        <ChevronDown size={12} className={`text-white/50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 w-64 bg-[#0a0a0f] border border-[#00d4ff]/30 rounded-lg shadow-2xl z-50 overflow-hidden">
          {CITIES.map(city => (
            <button
              key={city.id}
              onClick={() => { onChange(city.id); setIsOpen(false); }}
              className={`w-full px-4 py-3 text-left hover:bg-[#00d4ff]/10 transition-colors border-b border-white/5 last:border-0 ${
                city.id === selected ? 'bg-[#00d4ff]/5' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{city.name}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded ${
                  city.complexity === 'Extreme' ? 'bg-[#ff3366]/20 text-[#ff3366]' :
                  city.complexity === 'Very High' ? 'bg-[#ff6b35]/20 text-[#ff6b35]' :
                  city.complexity === 'High' ? 'bg-[#ffcc00]/20 text-[#ffcc00]' :
                  'bg-[#00ff88]/20 text-[#00ff88]'
                }`}>
                  {city.complexity}
                </span>
              </div>
              <p className="text-xs text-white/40 mt-0.5">{city.description}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// ALGORITHM SELECTOR (with clear label)
// ============================================

const ALGORITHMS = [
  { id: 'DQN', name: 'DQN', full: 'Deep Q-Network', type: 'Value-Based' },
  { id: 'DoubleDQN', name: 'Double DQN', full: 'Double Deep Q-Network', type: 'Value-Based' },
  { id: 'PPO', name: 'PPO', full: 'Proximal Policy Optimization', type: 'Policy Gradient' },
  { id: 'A2C', name: 'A2C', full: 'Advantage Actor-Critic', type: 'Actor-Critic' },
  { id: 'SAC', name: 'SAC', full: 'Soft Actor-Critic', type: 'Actor-Critic' },
  { id: 'TD3', name: 'TD3', full: 'Twin Delayed DDPG', type: 'Actor-Critic' },
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
        className="w-full flex items-center justify-between px-3 py-2 bg-[#0a0a0f] border border-white/10 rounded hover:border-[#00d4ff]/30 disabled:opacity-50 transition-all"
      >
        <div>
          <div className="text-sm font-medium text-left">{current.name}</div>
          <div className="text-[10px] text-white/40">{current.type}</div>
        </div>
        <ChevronDown size={14} className={`text-white/50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute mt-1 w-64 bg-[#0a0a0f] border border-white/20 rounded-lg shadow-2xl z-50 overflow-hidden">
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
                <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-white/50">
                  {algo.type}
                </span>
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
// TECHNICAL RL METRICS
// ============================================

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

function TechnicalMetrics({ metrics }: { metrics: RLMetrics }) {
  return (
    <div className="grid grid-cols-3 gap-2 text-xs">
      <MetricBox label="Policy Loss" value={metrics.policyLoss.toFixed(4)} trend="down" />
      <MetricBox label="Value Loss" value={metrics.valueLoss.toFixed(4)} trend="down" />
      <MetricBox label="Entropy" value={metrics.entropy.toFixed(3)} info="Exploration" />
      <MetricBox label="KL Div" value={metrics.kl_divergence.toFixed(4)} />
      <MetricBox label="Exp. Var" value={(metrics.explained_variance * 100).toFixed(1) + '%'} />
      <MetricBox label="ε-greedy" value={metrics.epsilon.toFixed(3)} />
      <MetricBox label="Mean Q" value={metrics.q_value_mean.toFixed(2)} highlight />
      <MetricBox label="Advantage" value={metrics.advantage_mean.toFixed(3)} />
      <MetricBox label="LR" value={metrics.learning_rate.toExponential(1)} />
    </div>
  );
}

function MetricBox({ label, value, trend, info, highlight }: {
  label: string;
  value: string;
  trend?: 'up' | 'down';
  info?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`p-2 rounded ${highlight ? 'bg-[#00d4ff]/10 border border-[#00d4ff]/30' : 'bg-white/5'}`}>
      <div className="text-[9px] text-white/40 uppercase tracking-wider">{label}</div>
      <div className={`font-mono ${highlight ? 'text-[#00d4ff]' : 'text-white'}`}>
        {value}
        {trend && (
          <span className={trend === 'down' ? 'text-[#00ff88]' : 'text-[#ff6b35]'}>
            {trend === 'down' ? ' ↓' : ' ↑'}
          </span>
        )}
      </div>
      {info && <div className="text-[8px] text-white/30">{info}</div>}
    </div>
  );
}

// ============================================
// REWARD CONFIGURATION WITH APPLY BUTTON
// ============================================

interface RewardConfig {
  id: string;
  name: string;
  value: number;
  description: string;
}

function RewardConfiguration({
  rewards,
  onChange,
  onApply,
  hasChanges,
  disabled,
}: {
  rewards: RewardConfig[];
  onChange: (id: string, value: number) => void;
  onApply: () => void;
  hasChanges: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] text-white/40 uppercase tracking-widest flex items-center gap-1">
          <Target size={10} />
          Reward Signal Configuration
        </h3>
        {hasChanges && (
          <button
            onClick={onApply}
            disabled={disabled}
            className="flex items-center gap-1 px-2 py-1 text-[10px] bg-[#00ff88] text-black rounded hover:bg-[#00ff88]/80 disabled:opacity-50 transition-all"
          >
            <RefreshCw size={10} />
            Apply & Retrain
          </button>
        )}
      </div>

      <div className="space-y-3">
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
// VEHICLE TELEMETRY (Cleaner)
// ============================================

function VehicleTelemetry({ speed, maxSpeed, acceleration, lane, totalLanes }: {
  speed: number;
  maxSpeed: number;
  acceleration: number;
  lane: number;
  totalLanes: number;
}) {
  const speedPct = (speed / maxSpeed) * 100;

  return (
    <div className="space-y-4">
      {/* Speed Arc Gauge */}
      <div className="relative w-40 h-20 mx-auto">
        <svg viewBox="0 0 100 50" className="w-full">
          {/* Background arc */}
          <path
            d="M 10 45 A 40 40 0 0 1 90 45"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="6"
            strokeLinecap="round"
          />
          {/* Progress arc */}
          <path
            d="M 10 45 A 40 40 0 0 1 90 45"
            fill="none"
            stroke={speedPct > 80 ? '#ff3366' : speedPct > 60 ? '#ff6b35' : '#00d4ff'}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${speedPct * 1.26} 126`}
            className="transition-all duration-300"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          <span className="text-3xl font-light tracking-tight">{Math.round(speed)}</span>
          <span className="text-[10px] text-white/40 -mt-1">km/h</span>
        </div>
      </div>

      {/* Acceleration */}
      <div className="flex items-center justify-between text-xs px-2">
        <span className="text-white/40">Acceleration</span>
        <span className={`font-mono ${acceleration > 0 ? 'text-[#00ff88]' : acceleration < 0 ? 'text-[#ff6b35]' : 'text-white/40'}`}>
          {acceleration > 0 ? '+' : ''}{acceleration.toFixed(2)} m/s²
        </span>
      </div>

      {/* Lane visualization with car */}
      <div className="px-2">
        <div className="text-[10px] text-white/40 mb-2">Lane Position</div>
        <div className="relative h-12 bg-[#1a1a2e] rounded overflow-hidden">
          {/* Lane markings */}
          <div className="absolute inset-0 flex">
            {Array.from({ length: totalLanes }).map((_, i) => (
              <div key={i} className="flex-1 border-r border-dashed border-white/20 last:border-0" />
            ))}
          </div>
          {/* Car position */}
          <div
            className="absolute top-1/2 -translate-y-1/2 transition-all duration-300"
            style={{ left: `${((lane + 0.5) / totalLanes) * 100}%`, transform: 'translate(-50%, -50%)' }}
          >
            <ModernCarSVG className="w-12 h-5" />
          </div>
        </div>
        <div className="flex justify-between text-[9px] text-white/30 mt-1">
          <span>Lane 1</span>
          <span>Lane {totalLanes}</span>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN DASHBOARD V3
// ============================================

export function DashboardV3() {
  // State
  const [city, setCity] = useState('highway');
  const [algorithm, setAlgorithm] = useState('DQN');
  const [status, setStatus] = useState<'idle' | 'training' | 'paused'>('idle');
  const [episode, setEpisode] = useState(0);
  const [totalEpisodes, setTotalEpisodes] = useState(1000);
  const [step, setStep] = useState(0);
  const [rewardsChanged, setRewardsChanged] = useState(false);

  const [rewards, setRewards] = useState<RewardConfig[]>([
    { id: 'speed', name: 'Speed Optimization', value: 1.0, description: 'Reward for maintaining target velocity' },
    { id: 'safety', name: 'Safety Distance', value: 2.0, description: 'Penalty for proximity to obstacles' },
    { id: 'lane', name: 'Lane Discipline', value: 0.5, description: 'Reward for lane centering' },
    { id: 'efficiency', name: 'Route Efficiency', value: 0.3, description: 'Bonus for optimal path selection' },
    { id: 'comfort', name: 'Ride Comfort', value: 0.2, description: 'Penalty for sudden maneuvers' },
  ]);

  const [probabilities] = useState([
    { action: 'Accel', prob: 0.45, color: '#00ff88' },
    { action: 'Brake', prob: 0.15, color: '#ff6b35' },
    { action: 'Left', prob: 0.12, color: '#00d4ff' },
    { action: 'Right', prob: 0.08, color: '#a855f7' },
    { action: 'Hold', prob: 0.20, color: '#ffcc00' },
  ]);

  const [rlMetrics] = useState<RLMetrics>({
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

  const handleRewardChange = useCallback((id: string, value: number) => {
    setRewards(prev => prev.map(r => r.id === id ? { ...r, value } : r));
    setRewardsChanged(true);
  }, []);

  const handleApplyRewards = useCallback(() => {
    setRewardsChanged(false);
    // Trigger retrain with new rewards
    setStatus('training');
  }, []);

  // Simulated training progress
  useEffect(() => {
    if (status === 'training') {
      const interval = setInterval(() => {
        setStep(s => s + 1);
        if (step > 0 && step % 100 === 0) {
          setEpisode(e => Math.min(e + 1, totalEpisodes));
        }
      }, 50);
      return () => clearInterval(interval);
    }
  }, [status, step, totalEpisodes]);

  return (
    <div className="min-h-screen bg-[#000000] text-white font-['Space_Grotesk',sans-serif]">
      {/* Header */}
      <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-[#000000]">
        <div className="flex items-center gap-6">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#00d4ff] to-[#00ff88] flex items-center justify-center">
              <Activity size={20} className="text-black" />
            </div>
            <div>
              <div className="text-lg font-semibold tracking-tight">ADV</div>
              <div className="text-[9px] text-white/30 uppercase tracking-widest">Autonomous Decision Visualizer</div>
            </div>
          </div>

          {/* City selector */}
          <CitySelector selected={city} onChange={setCity} />
        </div>

        <div className="flex items-center gap-4">
          {/* Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-white/5">
            <div className={`w-2 h-2 rounded-full ${
              status === 'training' ? 'bg-[#00ff88] animate-pulse' :
              status === 'paused' ? 'bg-[#ffcc00]' : 'bg-white/30'
            }`} />
            <span className="text-xs uppercase tracking-wider">
              {status === 'training' ? 'Training' : status === 'paused' ? 'Paused' : 'Ready'}
            </span>
          </div>

          {/* Episode counter */}
          <div className="text-xs font-mono text-white/50">
            Episode <span className="text-[#00d4ff]">{episode}</span> / {totalEpisodes}
          </div>

          <button className="p-2 text-white/40 hover:text-white transition-colors">
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Left Panel - Controls */}
        <div className="w-80 border-r border-white/5 p-4 space-y-6 overflow-y-auto bg-[#050508]">
          {/* Algorithm */}
          <AlgorithmSelector selected={algorithm} onChange={setAlgorithm} disabled={status === 'training'} />

          {/* Training controls */}
          <div className="space-y-3">
            <h3 className="text-[10px] text-white/40 uppercase tracking-widest flex items-center gap-1">
              <Zap size={10} />
              Training Configuration
            </h3>

            <div>
              <label className="text-xs text-white/50 block mb-1">Episodes</label>
              <input
                type="number"
                value={totalEpisodes}
                onChange={(e) => setTotalEpisodes(parseInt(e.target.value) || 100)}
                disabled={status === 'training'}
                className="w-full px-3 py-2 bg-[#0a0a0f] border border-white/10 rounded text-white font-mono
                  focus:border-[#00d4ff]/50 focus:outline-none disabled:opacity-50 transition-colors"
              />
            </div>

            {/* Progress */}
            <div className="p-3 bg-white/5 rounded space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-white/50">Progress</span>
                <span className="font-mono">{((episode / totalEpisodes) * 100).toFixed(1)}%</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#00d4ff] to-[#00ff88] rounded-full transition-all"
                  style={{ width: `${(episode / totalEpisodes) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-white/30">
                <span>Step {step.toLocaleString()}</span>
                <span>Best: +847</span>
              </div>
            </div>

            {/* Control buttons */}
            <div className="flex gap-2">
              {status === 'idle' && (
                <button
                  onClick={() => setStatus('training')}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#00ff88] text-black font-medium rounded hover:bg-[#00ff88]/80 transition-all"
                >
                  <Play size={16} />
                  Start Training
                </button>
              )}
              {status === 'training' && (
                <>
                  <button
                    onClick={() => setStatus('paused')}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#ffcc00] text-black font-medium rounded hover:bg-[#ffcc00]/80 transition-all"
                  >
                    <Pause size={16} />
                    Pause
                  </button>
                  <button
                    onClick={() => { setStatus('idle'); setEpisode(0); setStep(0); }}
                    className="px-4 py-3 bg-[#ff3366] text-white rounded hover:bg-[#ff3366]/80 transition-all"
                  >
                    <Square size={16} />
                  </button>
                </>
              )}
              {status === 'paused' && (
                <>
                  <button
                    onClick={() => setStatus('training')}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#00ff88] text-black font-medium rounded hover:bg-[#00ff88]/80 transition-all"
                  >
                    <Play size={16} />
                    Resume
                  </button>
                  <button
                    onClick={() => { setStatus('idle'); setEpisode(0); setStep(0); }}
                    className="px-4 py-3 bg-[#ff3366] text-white rounded hover:bg-[#ff3366]/80 transition-all"
                  >
                    <RotateCcw size={16} />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Reward Configuration */}
          <div className="border-t border-white/5 pt-4">
            <RewardConfiguration
              rewards={rewards}
              onChange={handleRewardChange}
              onApply={handleApplyRewards}
              hasChanges={rewardsChanged}
              disabled={false}
            />
          </div>
        </div>

        {/* Center - Visualization */}
        <div className="flex-1 flex flex-col">
          {/* Main canvas area */}
          <div className="flex-1 relative bg-[#030305]">
            {/* Placeholder map */}
            <div className="absolute inset-4 border border-white/5 rounded-lg flex flex-col items-center justify-center">
              <ModernCarSVG className="w-32 h-12 mb-4" />
              <p className="text-white/30 text-sm">{CITIES.find(c => c.id === city)?.name} Simulation</p>
              <p className="text-white/20 text-xs mt-1">Real-time navigation visualization</p>
            </div>
          </div>

          {/* Probability visualization */}
          <div className="h-56 border-t border-white/5 bg-[#050508]">
            <ProbabilityDisplay probabilities={probabilities} />
          </div>
        </div>

        {/* Right Panel - Telemetry & Metrics */}
        <div className="w-72 border-l border-white/5 bg-[#050508] overflow-y-auto">
          {/* Vehicle telemetry */}
          <div className="p-4 border-b border-white/5">
            <h3 className="text-[10px] text-white/40 uppercase tracking-widest mb-4 flex items-center gap-1">
              <Activity size={10} />
              Vehicle Telemetry
            </h3>
            <VehicleTelemetry
              speed={72}
              maxSpeed={120}
              acceleration={0.5}
              lane={1}
              totalLanes={4}
            />
          </div>

          {/* RL Metrics */}
          <div className="p-4 border-b border-white/5">
            <h3 className="text-[10px] text-white/40 uppercase tracking-widest mb-3 flex items-center gap-1">
              <BarChart3 size={10} />
              RL Metrics
            </h3>
            <TechnicalMetrics metrics={rlMetrics} />
          </div>

          {/* Risk Assessment */}
          <div className="p-4">
            <h3 className="text-[10px] text-white/40 uppercase tracking-widest mb-3 flex items-center gap-1">
              <AlertTriangle size={10} />
              Risk Assessment
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/50">Collision Risk</span>
                <span className="text-xs font-medium text-[#00ff88]">LOW</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full w-[25%] bg-gradient-to-r from-[#00ff88] to-[#ffcc00] rounded-full" />
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                <div className="p-2 bg-white/5 rounded">
                  <div className="text-white/40">TTC</div>
                  <div className="font-mono">8.2s</div>
                </div>
                <div className="p-2 bg-white/5 rounded">
                  <div className="text-white/40">Front</div>
                  <div className="font-mono">24m</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
