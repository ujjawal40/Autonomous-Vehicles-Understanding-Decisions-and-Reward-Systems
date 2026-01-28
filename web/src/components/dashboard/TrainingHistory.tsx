/**
 * Training History Comparison
 *
 * Compare multiple training runs with:
 * - Reward curves overlay
 * - Success rate comparison
 * - Path visualization
 * - Algorithm performance comparison
 */

import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
} from 'recharts';
import { History, TrendingUp, CheckCircle, GitCompare, X } from 'lucide-react';

interface TrainingRun {
  id: number;
  name: string;
  algorithm: string;
  status: string;
  totalEpisodes: number;
  completedEpisodes: number;
  avgReward: number;
  successRate: number;
  createdAt: string;
  rewardHistory: { episode: number; reward: number }[];
}

interface TrainingHistoryProps {
  runs: TrainingRun[];
  selectedRuns: number[];
  onSelectRun: (runId: number) => void;
  onDeselectRun: (runId: number) => void;
}

type ViewMode = 'rewards' | 'success' | 'algorithms' | 'table';

const COLORS = ['#00d4ff', '#00ff88', '#ff6b35', '#a855f7', '#ffd700'];

const ALGORITHM_COLORS: Record<string, string> = {
  DQN: '#00d4ff',
  DoubleDQN: '#00ff88',
  PPO: '#ff6b35',
  A2C: '#a855f7',
};

export function TrainingHistory({
  runs,
  selectedRuns,
  onSelectRun,
  onDeselectRun,
}: TrainingHistoryProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('rewards');

  const selectedRunData = runs.filter((r) => selectedRuns.includes(r.id));

  // Prepare chart data
  const rewardChartData = prepareRewardData(selectedRunData);
  const successChartData = prepareSuccessData(selectedRunData);
  const algorithmChartData = prepareAlgorithmData(runs);

  const VIEW_MODES = [
    { id: 'rewards' as const, label: 'Rewards', icon: TrendingUp },
    { id: 'success' as const, label: 'Success', icon: CheckCircle },
    { id: 'algorithms' as const, label: 'Algorithms', icon: GitCompare },
    { id: 'table' as const, label: 'Table', icon: History },
  ];

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">
        <span className="flex items-center gap-2">
          <History size={12} />
          Training History
        </span>
        <span className="text-xs text-white/40">
          {selectedRuns.length} selected
        </span>
      </div>

      {/* View Mode Tabs */}
      <div className="px-4 pt-3">
        <div className="tab-list">
          {VIEW_MODES.map((mode) => (
            <button
              key={mode.id}
              onClick={() => setViewMode(mode.id)}
              className={`tab ${viewMode === mode.id ? 'active' : ''}`}
            >
              <mode.icon size={12} className="inline mr-1" />
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Selected Runs Pills */}
      {selectedRuns.length > 0 && (
        <div className="px-4 pt-3 flex flex-wrap gap-2">
          {selectedRunData.map((run, idx) => (
            <span
              key={run.id}
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs"
              style={{
                backgroundColor: `${COLORS[idx % COLORS.length]}20`,
                borderColor: COLORS[idx % COLORS.length],
                borderWidth: 1,
                color: COLORS[idx % COLORS.length],
              }}
            >
              {run.name}
              <button
                onClick={() => onDeselectRun(run.id)}
                className="hover:opacity-70"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Chart Area */}
      <div className="flex-1 p-4 min-h-0">
        {viewMode === 'rewards' && (
          <RewardChart data={rewardChartData} runs={selectedRunData} />
        )}

        {viewMode === 'success' && (
          <SuccessChart data={successChartData} runs={selectedRunData} />
        )}

        {viewMode === 'algorithms' && (
          <AlgorithmChart data={algorithmChartData} />
        )}

        {viewMode === 'table' && (
          <RunsTable
            runs={runs}
            selectedRuns={selectedRuns}
            onSelectRun={onSelectRun}
            onDeselectRun={onDeselectRun}
          />
        )}
      </div>
    </div>
  );
}

// Reward comparison chart
function RewardChart({
  data,
  runs,
}: {
  data: any[];
  runs: TrainingRun[];
}) {
  if (runs.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-white/40">
        Select runs to compare reward curves
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
        <XAxis
          dataKey="episode"
          stroke="#666"
          fontSize={10}
          tickLine={false}
        />
        <YAxis stroke="#666" fontSize={10} tickLine={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: '#0a0a0a',
            border: '1px solid #333',
            borderRadius: 4,
            fontSize: 12,
          }}
        />
        <Legend />
        {runs.map((run, idx) => (
          <Line
            key={run.id}
            type="monotone"
            dataKey={`run_${run.id}`}
            name={run.name}
            stroke={COLORS[idx % COLORS.length]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

// Success rate comparison
function SuccessChart({
  data,
  runs,
}: {
  data: any[];
  runs: TrainingRun[];
}) {
  if (runs.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-white/40">
        Select runs to compare success rates
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
        <XAxis
          dataKey="episode"
          stroke="#666"
          fontSize={10}
          tickLine={false}
        />
        <YAxis
          stroke="#666"
          fontSize={10}
          tickLine={false}
          domain={[0, 100]}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#0a0a0a',
            border: '1px solid #333',
            borderRadius: 4,
            fontSize: 12,
          }}
          formatter={(value: number) => [`${value.toFixed(1)}%`, 'Success Rate']}
        />
        <Legend />
        {runs.map((run, idx) => (
          <Area
            key={run.id}
            type="monotone"
            dataKey={`run_${run.id}`}
            name={run.name}
            stroke={COLORS[idx % COLORS.length]}
            fill={COLORS[idx % COLORS.length]}
            fillOpacity={0.2}
            strokeWidth={2}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

// Algorithm performance comparison
function AlgorithmChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
        <XAxis type="number" stroke="#666" fontSize={10} />
        <YAxis
          type="category"
          dataKey="algorithm"
          stroke="#666"
          fontSize={10}
          width={80}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#0a0a0a',
            border: '1px solid #333',
            borderRadius: 4,
            fontSize: 12,
          }}
        />
        <Legend />
        <Bar
          dataKey="avgReward"
          name="Avg Reward"
          fill="#00d4ff"
          radius={[0, 4, 4, 0]}
        />
        <Bar
          dataKey="successRate"
          name="Success %"
          fill="#00ff88"
          radius={[0, 4, 4, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Runs table view
function RunsTable({
  runs,
  selectedRuns,
  onSelectRun,
  onDeselectRun,
}: {
  runs: TrainingRun[];
  selectedRuns: number[];
  onSelectRun: (id: number) => void;
  onDeselectRun: (id: number) => void;
}) {
  return (
    <div className="h-full overflow-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-[--color-space-900]">
          <tr className="text-left text-white/40 text-xs uppercase tracking-wider">
            <th className="p-2 w-8"></th>
            <th className="p-2">Name</th>
            <th className="p-2">Algorithm</th>
            <th className="p-2">Episodes</th>
            <th className="p-2">Avg Reward</th>
            <th className="p-2">Success</th>
            <th className="p-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => {
            const isSelected = selectedRuns.includes(run.id);
            return (
              <tr
                key={run.id}
                className={`border-b border-white/5 hover:bg-white/5 cursor-pointer ${
                  isSelected ? 'bg-[--color-cyber-blue]/10' : ''
                }`}
                onClick={() =>
                  isSelected ? onDeselectRun(run.id) : onSelectRun(run.id)
                }
              >
                <td className="p-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="accent-[--color-cyber-blue]"
                  />
                </td>
                <td className="p-2 font-medium">{run.name}</td>
                <td className="p-2">
                  <span
                    className="px-2 py-0.5 rounded text-xs"
                    style={{
                      backgroundColor: `${ALGORITHM_COLORS[run.algorithm]}20`,
                      color: ALGORITHM_COLORS[run.algorithm],
                    }}
                  >
                    {run.algorithm}
                  </span>
                </td>
                <td className="p-2 text-mono text-xs">
                  {run.completedEpisodes}/{run.totalEpisodes}
                </td>
                <td className="p-2 text-mono text-xs text-[--color-cyber-blue]">
                  {run.avgReward?.toFixed(2) || '-'}
                </td>
                <td className="p-2 text-mono text-xs text-[--color-cyber-green]">
                  {run.successRate ? `${(run.successRate * 100).toFixed(1)}%` : '-'}
                </td>
                <td className="p-2">
                  <span
                    className={`text-xs ${
                      run.status === 'completed'
                        ? 'text-[--color-cyber-green]'
                        : run.status === 'running'
                        ? 'text-[--color-cyber-blue]'
                        : 'text-white/40'
                    }`}
                  >
                    {run.status}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Data preparation helpers
function prepareRewardData(runs: TrainingRun[]) {
  if (runs.length === 0) return [];

  const maxEpisodes = Math.max(...runs.map((r) => r.rewardHistory?.length || 0));
  const data: any[] = [];

  for (let i = 0; i < maxEpisodes; i++) {
    const point: any = { episode: i + 1 };
    runs.forEach((run) => {
      point[`run_${run.id}`] = run.rewardHistory?.[i]?.reward || null;
    });
    data.push(point);
  }

  return data;
}

function prepareSuccessData(runs: TrainingRun[]) {
  // Similar to reward data but with rolling success rate
  return prepareRewardData(runs); // Simplified for now
}

function prepareAlgorithmData(runs: TrainingRun[]) {
  const algorithmStats: Record<string, { total: number; reward: number; success: number }> = {};

  runs.forEach((run) => {
    if (!algorithmStats[run.algorithm]) {
      algorithmStats[run.algorithm] = { total: 0, reward: 0, success: 0 };
    }
    algorithmStats[run.algorithm].total++;
    algorithmStats[run.algorithm].reward += run.avgReward || 0;
    algorithmStats[run.algorithm].success += run.successRate || 0;
  });

  return Object.entries(algorithmStats).map(([algorithm, stats]) => ({
    algorithm,
    avgReward: stats.total > 0 ? stats.reward / stats.total : 0,
    successRate: stats.total > 0 ? (stats.success / stats.total) * 100 : 0,
  }));
}
