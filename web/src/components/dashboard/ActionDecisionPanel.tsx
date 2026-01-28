/**
 * Action Decision Panel Component
 *
 * Displays detailed breakdown of action decisions with probabilities and reasoning.
 */

import { useMemo } from 'react';
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Minus,
  Brain,
  Target,
  Zap,
} from 'lucide-react';

interface ActionDecision {
  action: number;
  probability: number;
  qValue?: number;
  advantage?: number;
  selected: boolean;
}

interface DecisionContext {
  speed: number;
  lanePosition: number;
  nearestObstacle: number;
  timeToCollision: number;
}

interface ActionDecisionPanelProps {
  decisions: ActionDecision[];
  context?: DecisionContext;
  algorithm: 'DQN' | 'DoubleDQN' | 'PPO' | 'A2C';
  confidence: number;
}

const ACTION_CONFIG = [
  { id: 0, label: 'Accelerate', icon: ArrowUp, color: '#00ff88' },
  { id: 1, label: 'Decelerate', icon: ArrowDown, color: '#ff6b35' },
  { id: 2, label: 'Lane Left', icon: ArrowLeft, color: '#00d4ff' },
  { id: 3, label: 'Lane Right', icon: ArrowRight, color: '#00d4ff' },
  { id: 4, label: 'Maintain', icon: Minus, color: '#a855f7' },
];

export function ActionDecisionPanel({
  decisions,
  context,
  algorithm,
  confidence,
}: ActionDecisionPanelProps) {
  const selectedAction = useMemo(
    () => decisions.find((d) => d.selected),
    [decisions]
  );

  const sortedDecisions = useMemo(
    () => [...decisions].sort((a, b) => b.probability - a.probability),
    [decisions]
  );

  const isValueBased = algorithm === 'DQN' || algorithm === 'DoubleDQN';

  return (
    <div className="space-y-4">
      {/* Selected Action Highlight */}
      {selectedAction && (
        <div className="p-4 bg-gradient-to-r from-[--color-cyber-blue]/10 to-transparent border border-[--color-cyber-blue]/30 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{
                  backgroundColor: `${ACTION_CONFIG[selectedAction.action]?.color}20`,
                }}
              >
                {(() => {
                  const Icon = ACTION_CONFIG[selectedAction.action]?.icon || Minus;
                  return <Icon size={24} style={{ color: ACTION_CONFIG[selectedAction.action]?.color }} />;
                })()}
              </div>
              <div>
                <div className="text-lg font-semibold text-white">
                  {ACTION_CONFIG[selectedAction.action]?.label || 'Unknown'}
                </div>
                <div className="text-xs text-white/50">
                  {isValueBased ? 'Q-Value Selection' : 'Policy Selection'}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-mono text-[--color-cyber-blue]">
                {(selectedAction.probability * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-white/40">probability</div>
            </div>
          </div>
        </div>
      )}

      {/* Decision Context */}
      {context && (
        <div className="grid grid-cols-4 gap-2">
          <div className="p-3 bg-[--color-space-800] rounded-lg text-center">
            <div className="text-xs text-white/40 mb-1">Speed</div>
            <div className="text-sm font-mono text-white">
              {context.speed.toFixed(1)} <span className="text-xs text-white/40">m/s</span>
            </div>
          </div>
          <div className="p-3 bg-[--color-space-800] rounded-lg text-center">
            <div className="text-xs text-white/40 mb-1">Lane</div>
            <div className="text-sm font-mono text-white">{context.lanePosition}</div>
          </div>
          <div className="p-3 bg-[--color-space-800] rounded-lg text-center">
            <div className="text-xs text-white/40 mb-1">Obstacle</div>
            <div className="text-sm font-mono text-white">
              {context.nearestObstacle.toFixed(0)} <span className="text-xs text-white/40">m</span>
            </div>
          </div>
          <div className="p-3 bg-[--color-space-800] rounded-lg text-center">
            <div className="text-xs text-white/40 mb-1">TTC</div>
            <div className={`text-sm font-mono ${context.timeToCollision < 2 ? 'text-[--color-cyber-orange]' : 'text-white'}`}>
              {context.timeToCollision.toFixed(1)} <span className="text-xs text-white/40">s</span>
            </div>
          </div>
        </div>
      )}

      {/* All Actions Breakdown */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-white/50 uppercase tracking-wider">
          <Brain size={12} />
          Action Probabilities
        </div>

        {sortedDecisions.map((decision) => {
          const config = ACTION_CONFIG[decision.action];
          const Icon = config?.icon || Minus;

          return (
            <div
              key={decision.action}
              className={`
                p-3 rounded-lg border transition-all
                ${decision.selected
                  ? 'bg-[--color-cyber-blue]/10 border-[--color-cyber-blue]/30'
                  : 'bg-[--color-space-800] border-white/5'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded flex items-center justify-center"
                  style={{ backgroundColor: `${config?.color}20` }}
                >
                  <Icon size={16} style={{ color: config?.color }} />
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">
                      {config?.label || `Action ${decision.action}`}
                    </span>
                    {decision.selected && (
                      <span className="px-1.5 py-0.5 text-[10px] bg-[--color-cyber-blue] text-black rounded uppercase">
                        Selected
                      </span>
                    )}
                  </div>

                  <div className="mt-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${decision.probability * 100}%`,
                        backgroundColor: config?.color,
                      }}
                    />
                  </div>
                </div>

                <div className="text-right min-w-[60px]">
                  <div className="text-sm font-mono" style={{ color: config?.color }}>
                    {(decision.probability * 100).toFixed(1)}%
                  </div>
                  {decision.qValue !== undefined && (
                    <div className="text-xs text-white/40">
                      Q: {decision.qValue.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confidence Meter */}
      <div className="p-4 bg-[--color-space-800] rounded-lg border border-white/5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Target size={14} className="text-[--color-cyber-purple]" />
            <span className="text-xs text-white/50 uppercase tracking-wider">Decision Confidence</span>
          </div>
          <span className="text-sm font-mono text-[--color-cyber-purple]">
            {(confidence * 100).toFixed(0)}%
          </span>
        </div>

        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[--color-cyber-orange] via-[--color-cyber-blue] to-[--color-cyber-green] transition-all duration-300"
            style={{ width: `${confidence * 100}%` }}
          />
        </div>

        <div className="flex justify-between mt-1 text-[10px] text-white/30">
          <span>Uncertain</span>
          <span>Confident</span>
        </div>
      </div>

      {/* Algorithm Info */}
      <div className="flex items-center gap-2 p-3 bg-[--color-space-900] rounded-lg">
        <Zap size={14} className="text-[--color-cyber-blue]" />
        <span className="text-xs text-white/50">
          {isValueBased
            ? 'Using ε-greedy exploration with Q-value maximization'
            : 'Using stochastic policy sampling with entropy bonus'
          }
        </span>
      </div>
    </div>
  );
}
