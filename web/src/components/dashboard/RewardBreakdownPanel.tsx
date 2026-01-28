/**
 * Reward Breakdown Panel Component
 *
 * Visualizes the composition of rewards with individual component contributions.
 */

import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, Award, AlertTriangle, Zap, Target, Timer } from 'lucide-react';

interface RewardComponent {
  id: string;
  name: string;
  value: number;
  weight: number;
  description?: string;
  category: 'safety' | 'efficiency' | 'comfort' | 'goal';
}

interface RewardBreakdownPanelProps {
  components: RewardComponent[];
  totalReward: number;
  previousTotal?: number;
  showTrend?: boolean;
}

const CATEGORY_CONFIG = {
  safety: {
    color: '#ff3366',
    icon: AlertTriangle,
    label: 'Safety',
  },
  efficiency: {
    color: '#00d4ff',
    icon: Zap,
    label: 'Efficiency',
  },
  comfort: {
    color: '#a855f7',
    icon: Target,
    label: 'Comfort',
  },
  goal: {
    color: '#00ff88',
    icon: Award,
    label: 'Goal',
  },
};

export function RewardBreakdownPanel({
  components,
  totalReward,
  previousTotal,
  showTrend = true,
}: RewardBreakdownPanelProps) {
  const sortedComponents = useMemo(
    () => [...components].sort((a, b) => Math.abs(b.value * b.weight) - Math.abs(a.value * a.weight)),
    [components]
  );

  const groupedByCategory = useMemo(() => {
    const groups: Record<string, RewardComponent[]> = {
      safety: [],
      efficiency: [],
      comfort: [],
      goal: [],
    };
    components.forEach((c) => {
      if (groups[c.category]) {
        groups[c.category].push(c);
      }
    });
    return groups;
  }, [components]);

  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    Object.entries(groupedByCategory).forEach(([cat, comps]) => {
      totals[cat] = comps.reduce((sum, c) => sum + c.value * c.weight, 0);
    });
    return totals;
  }, [groupedByCategory]);

  const maxAbsValue = useMemo(
    () => Math.max(...components.map((c) => Math.abs(c.value * c.weight)), 0.1),
    [components]
  );

  const trend = previousTotal !== undefined ? totalReward - previousTotal : 0;
  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend > 0 ? '#00ff88' : trend < 0 ? '#ff3366' : '#ffffff50';

  return (
    <div className="space-y-4">
      {/* Total Reward Display */}
      <div className="p-4 bg-gradient-to-r from-[--color-space-800] to-[--color-space-900] rounded-lg border border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-white/50 uppercase tracking-wider mb-1">Total Reward</div>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-3xl font-mono font-bold ${totalReward >= 0 ? 'text-[--color-cyber-green]' : 'text-[--color-cyber-orange]'}`}
              >
                {totalReward >= 0 ? '+' : ''}{totalReward.toFixed(3)}
              </span>
              {showTrend && previousTotal !== undefined && (
                <span className="flex items-center gap-1 text-sm" style={{ color: trendColor }}>
                  <TrendIcon size={14} />
                  {Math.abs(trend).toFixed(3)}
                </span>
              )}
            </div>
          </div>
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
            <Award size={24} className={totalReward >= 0 ? 'text-[--color-cyber-green]' : 'text-[--color-cyber-orange]'} />
          </div>
        </div>
      </div>

      {/* Category Overview */}
      <div className="grid grid-cols-4 gap-2">
        {Object.entries(CATEGORY_CONFIG).map(([cat, config]) => {
          const Icon = config.icon;
          const value = categoryTotals[cat] || 0;

          return (
            <div
              key={cat}
              className="p-3 rounded-lg text-center"
              style={{ backgroundColor: `${config.color}10` }}
            >
              <Icon size={16} style={{ color: config.color }} className="mx-auto mb-1" />
              <div className="text-[10px] text-white/50 uppercase">{config.label}</div>
              <div
                className="text-sm font-mono"
                style={{ color: value >= 0 ? config.color : '#ff3366' }}
              >
                {value >= 0 ? '+' : ''}{value.toFixed(2)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Component Details */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-white/50 uppercase tracking-wider">
          <Timer size={12} />
          Component Breakdown
        </div>

        {sortedComponents.map((component) => {
          const config = CATEGORY_CONFIG[component.category];
          const weightedValue = component.value * component.weight;
          const barWidth = (Math.abs(weightedValue) / maxAbsValue) * 100;
          const isPositive = weightedValue >= 0;

          return (
            <div
              key={component.id}
              className="p-3 bg-[--color-space-800] rounded-lg border border-white/5"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: config.color }}
                  />
                  <span className="text-sm text-white">{component.name}</span>
                  <span className="text-[10px] text-white/30">
                    ×{component.weight.toFixed(1)}
                  </span>
                </div>
                <span
                  className="text-sm font-mono"
                  style={{ color: isPositive ? '#00ff88' : '#ff3366' }}
                >
                  {isPositive ? '+' : ''}{weightedValue.toFixed(3)}
                </span>
              </div>

              {/* Bar visualization */}
              <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`absolute h-full rounded-full transition-all duration-300 ${isPositive ? 'left-1/2' : 'right-1/2'}`}
                  style={{
                    width: `${barWidth / 2}%`,
                    backgroundColor: isPositive ? '#00ff88' : '#ff3366',
                  }}
                />
                <div className="absolute left-1/2 top-0 h-full w-px bg-white/20" />
              </div>

              {component.description && (
                <p className="text-[10px] text-white/40 mt-2">{component.description}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Reward Formula */}
      <div className="p-3 bg-[--color-space-900] rounded-lg border border-white/5">
        <div className="text-xs text-white/40 mb-2">Reward Formula</div>
        <div className="text-xs font-mono text-white/70 overflow-x-auto">
          R = {components.map((c, i) => (
            <span key={c.id}>
              {i > 0 && ' + '}
              <span style={{ color: CATEGORY_CONFIG[c.category].color }}>
                {c.weight.toFixed(1)}×{c.name.replace(/\s+/g, '_')}
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
