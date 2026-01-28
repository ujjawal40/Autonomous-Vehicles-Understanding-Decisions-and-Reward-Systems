/**
 * Metrics Panel
 *
 * Real-time training metrics display with:
 * - Current episode/step counters
 * - Reward statistics
 * - Performance indicators
 */

import { Trophy, Target, Footprints, Clock, Zap, TrendingUp } from 'lucide-react';

interface MetricsPanelProps {
  episode: number;
  step: number;
  totalReward: number;
  avgReward: number;
  bestReward: number;
  successRate: number;
  stepsPerEpisode: number;
  trainingTime: number;
  epsilon?: number;
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  color: string;
}

function MetricCard({ icon, label, value, subValue, color }: MetricCardProps) {
  return (
    <div className="bg-[--color-space-900] border border-white/5 rounded p-4">
      <div className="flex items-start justify-between">
        <div
          className="p-2 rounded"
          style={{ backgroundColor: `${color}15` }}
        >
          <span style={{ color }}>{icon}</span>
        </div>
        {subValue && (
          <span className="text-[10px] text-white/40 uppercase tracking-wider">
            {subValue}
          </span>
        )}
      </div>
      <div className="mt-3">
        <div
          className="data-value"
          style={{ color }}
        >
          {value}
        </div>
        <div className="data-label mt-1">{label}</div>
      </div>
    </div>
  );
}

export function MetricsPanel({
  episode,
  step,
  totalReward,
  avgReward,
  bestReward,
  successRate,
  stepsPerEpisode,
  trainingTime,
  epsilon,
}: MetricsPanelProps) {
  // Format time
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <span>Training Metrics</span>
        <span className="text-mono text-xs text-[--color-cyber-blue]">
          Live
        </span>
      </div>

      <div className="p-4">
        {/* Primary Metrics */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <MetricCard
            icon={<Target size={16} />}
            label="Episode"
            value={episode}
            color="#00d4ff"
          />
          <MetricCard
            icon={<Footprints size={16} />}
            label="Step"
            value={step}
            color="#00fff2"
          />
        </div>

        {/* Reward Metrics */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <MetricCard
            icon={<Zap size={16} />}
            label="Current"
            value={totalReward.toFixed(2)}
            color="#ffd700"
          />
          <MetricCard
            icon={<TrendingUp size={16} />}
            label="Average"
            value={avgReward.toFixed(2)}
            color="#00ff88"
          />
          <MetricCard
            icon={<Trophy size={16} />}
            label="Best"
            value={bestReward.toFixed(2)}
            color="#ff6b35"
          />
        </div>

        {/* Performance Metrics */}
        <div className="space-y-3">
          {/* Success Rate */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="data-label">Success Rate</span>
              <span className="text-mono text-sm text-[--color-cyber-green]">
                {(successRate * 100).toFixed(1)}%
              </span>
            </div>
            <div className="h-2 bg-[--color-space-800] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-[--color-cyber-green] transition-all duration-500"
                style={{ width: `${successRate * 100}%` }}
              />
            </div>
          </div>

          {/* Epsilon (exploration rate) */}
          {epsilon !== undefined && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="data-label">Exploration (ε)</span>
                <span className="text-mono text-sm text-[--color-cyber-purple]">
                  {(epsilon * 100).toFixed(1)}%
                </span>
              </div>
              <div className="h-2 bg-[--color-space-800] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-[--color-cyber-purple] transition-all duration-500"
                  style={{ width: `${epsilon * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Bottom Stats */}
        <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 gap-4">
          <div>
            <div className="data-label">Avg Steps/Episode</div>
            <div className="text-mono text-lg text-white mt-1">
              {stepsPerEpisode.toFixed(1)}
            </div>
          </div>
          <div>
            <div className="data-label flex items-center gap-1">
              <Clock size={10} />
              Training Time
            </div>
            <div className="text-mono text-lg text-white mt-1">
              {formatTime(trainingTime)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
