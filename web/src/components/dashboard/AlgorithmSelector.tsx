/**
 * Algorithm Selector Component
 *
 * Detailed algorithm selection with info cards.
 */

import { useState } from 'react';
import { Brain, Zap, Target, Layers, ChevronDown, ChevronUp, Check } from 'lucide-react';

interface AlgorithmInfo {
  id: string;
  name: string;
  fullName: string;
  description: string;
  type: 'value-based' | 'policy-gradient' | 'actor-critic';
  icon: React.ReactNode;
  pros: string[];
  cons: string[];
  defaultConfig: Record<string, number | string>;
}

const ALGORITHMS: AlgorithmInfo[] = [
  {
    id: 'DQN',
    name: 'DQN',
    fullName: 'Deep Q-Network',
    description: 'Standard value-based method with experience replay and target network.',
    type: 'value-based',
    icon: <Brain size={20} />,
    pros: ['Simple and stable', 'Works well with discrete actions', 'Sample efficient with replay'],
    cons: ['Can overestimate Q-values', 'Requires careful tuning'],
    defaultConfig: {
      learning_rate: 0.001,
      gamma: 0.99,
      epsilon_start: 1.0,
      epsilon_end: 0.1,
      batch_size: 32,
      buffer_size: 10000,
    },
  },
  {
    id: 'DoubleDQN',
    name: 'Double DQN',
    fullName: 'Double Deep Q-Network',
    description: 'Reduces overestimation bias by decoupling action selection from evaluation.',
    type: 'value-based',
    icon: <Layers size={20} />,
    pros: ['Reduces overestimation', 'More stable learning', 'Same complexity as DQN'],
    cons: ['Still uses epsilon-greedy', 'May converge slower'],
    defaultConfig: {
      learning_rate: 0.001,
      gamma: 0.99,
      epsilon_start: 1.0,
      epsilon_end: 0.1,
      batch_size: 32,
      buffer_size: 10000,
    },
  },
  {
    id: 'PPO',
    name: 'PPO',
    fullName: 'Proximal Policy Optimization',
    description: 'State-of-the-art policy gradient with clipped objective for stability.',
    type: 'policy-gradient',
    icon: <Target size={20} />,
    pros: ['Very stable', 'Works with continuous actions', 'Good sample efficiency'],
    cons: ['More hyperparameters', 'Can be slower per update'],
    defaultConfig: {
      learning_rate: 0.0003,
      gamma: 0.99,
      gae_lambda: 0.95,
      clip_epsilon: 0.2,
      n_epochs: 10,
      batch_size: 64,
    },
  },
  {
    id: 'A2C',
    name: 'A2C',
    fullName: 'Advantage Actor-Critic',
    description: 'Combines policy gradient with value baseline for lower variance.',
    type: 'actor-critic',
    icon: <Zap size={20} />,
    pros: ['Lower variance than REINFORCE', 'Online learning possible', 'Simpler than PPO'],
    cons: ['Can be less stable', 'Sensitive to learning rate'],
    defaultConfig: {
      learning_rate: 0.0007,
      gamma: 0.99,
      gae_lambda: 0.95,
      n_steps: 5,
      entropy_coef: 0.01,
    },
  },
];

interface AlgorithmSelectorProps {
  selected: string;
  onSelect: (algorithm: string, config: Record<string, number | string>) => void;
  disabled?: boolean;
}

export function AlgorithmSelector({
  selected,
  onSelect,
  disabled = false,
}: AlgorithmSelectorProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const handleSelect = (algo: AlgorithmInfo) => {
    if (disabled) return;
    onSelect(algo.id, algo.defaultConfig);
  };

  const TYPE_COLORS = {
    'value-based': '#00d4ff',
    'policy-gradient': '#00ff88',
    'actor-critic': '#a855f7',
  };

  return (
    <div className="space-y-2">
      {ALGORITHMS.map((algo) => {
        const isSelected = selected === algo.id;
        const isExpanded = expanded === algo.id;

        return (
          <div
            key={algo.id}
            className={`
              rounded-lg border transition-all cursor-pointer
              ${isSelected
                ? 'bg-[--color-cyber-blue]/10 border-[--color-cyber-blue]/50'
                : 'bg-[--color-space-900] border-white/5 hover:border-white/10'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {/* Header */}
            <div
              className="p-4 flex items-center gap-4"
              onClick={() => !disabled && handleSelect(algo)}
            >
              {/* Selection indicator */}
              <div
                className={`
                  w-5 h-5 rounded-full border-2 flex items-center justify-center
                  transition-colors
                  ${isSelected
                    ? 'border-[--color-cyber-blue] bg-[--color-cyber-blue]'
                    : 'border-white/20'
                  }
                `}
              >
                {isSelected && <Check size={12} className="text-black" />}
              </div>

              {/* Icon */}
              <div
                className="p-2 rounded-lg"
                style={{
                  backgroundColor: `${TYPE_COLORS[algo.type]}15`,
                  color: TYPE_COLORS[algo.type],
                }}
              >
                {algo.icon}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">{algo.name}</span>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded uppercase tracking-wider"
                    style={{
                      backgroundColor: `${TYPE_COLORS[algo.type]}20`,
                      color: TYPE_COLORS[algo.type],
                    }}
                  >
                    {algo.type}
                  </span>
                </div>
                <p className="text-xs text-white/50 mt-0.5 truncate">
                  {algo.fullName}
                </p>
              </div>

              {/* Expand button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(isExpanded ? null : algo.id);
                }}
                className="p-1 text-white/40 hover:text-white"
              >
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>

            {/* Expanded details */}
            {isExpanded && (
              <div className="px-4 pb-4 pt-0 border-t border-white/5 mt-0">
                <div className="pt-4 space-y-4">
                  <p className="text-sm text-white/70">{algo.description}</p>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-xs font-medium text-[--color-cyber-green] uppercase tracking-wider mb-2">
                        Pros
                      </h4>
                      <ul className="space-y-1">
                        {algo.pros.map((pro, i) => (
                          <li key={i} className="text-xs text-white/60 flex items-start gap-2">
                            <span className="text-[--color-cyber-green]">+</span>
                            {pro}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-xs font-medium text-[--color-cyber-orange] uppercase tracking-wider mb-2">
                        Cons
                      </h4>
                      <ul className="space-y-1">
                        {algo.cons.map((con, i) => (
                          <li key={i} className="text-xs text-white/60 flex items-start gap-2">
                            <span className="text-[--color-cyber-orange]">-</span>
                            {con}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">
                      Default Configuration
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(algo.defaultConfig).map(([key, value]) => (
                        <div
                          key={key}
                          className="flex justify-between text-xs bg-[--color-space-800] p-2 rounded"
                        >
                          <span className="text-white/50">{key}</span>
                          <span className="text-mono text-[--color-cyber-blue]">
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
