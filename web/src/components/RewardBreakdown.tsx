interface RewardComponent {
  name: string;
  value: number;
  explanation: string;
}

interface RewardBreakdownProps {
  components: RewardComponent[];
  totalReward: number;
  riskLevel: number;
}

export function RewardBreakdown({ components, totalReward, riskLevel }: RewardBreakdownProps) {
  const maxAbsValue = Math.max(...components.map(c => Math.abs(c.value)), 0.5);

  const getRiskColor = (risk: number) => {
    if (risk < 0.3) return 'text-cyber-green';
    if (risk < 0.7) return 'text-cyber-orange';
    return 'text-cyber-red';
  };

  const getRiskLabel = (risk: number) => {
    if (risk < 0.1) return 'Very Safe';
    if (risk < 0.3) return 'Normal';
    if (risk < 0.5) return 'Elevated';
    if (risk < 0.7) return 'High Risk';
    return 'Critical';
  };

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">Reward Breakdown</div>

      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        {components.map((component) => (
          <div key={component.name} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-gray-400">
                {component.name}
              </span>
              <span className={`font-mono text-sm font-semibold ${
                component.value >= 0 ? 'text-cyber-green' : 'text-cyber-red'
              }`}>
                {component.value >= 0 ? '+' : ''}{component.value.toFixed(3)}
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-space-800 rounded-full overflow-hidden">
              {component.value >= 0 ? (
                <div
                  className="h-full bg-gradient-to-r from-cyber-green/50 to-cyber-green rounded-full transition-all duration-300"
                  style={{ width: `${(component.value / maxAbsValue) * 100}%` }}
                />
              ) : (
                <div className="h-full flex justify-end">
                  <div
                    className="h-full bg-gradient-to-l from-cyber-red/50 to-cyber-red rounded-full transition-all duration-300"
                    style={{ width: `${(Math.abs(component.value) / maxAbsValue) * 100}%` }}
                  />
                </div>
              )}
            </div>

            <p className="text-xs text-gray-500 truncate">{component.explanation}</p>
          </div>
        ))}
      </div>

      {/* Total and Risk */}
      <div className="border-t border-space-700/50 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-white">Total Reward</span>
          <span className={`font-mono text-xl font-bold ${
            totalReward >= 0 ? 'glow-text-green' : 'glow-text-red'
          }`}>
            {totalReward >= 0 ? '+' : ''}{totalReward.toFixed(3)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Risk Level</span>
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-space-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  riskLevel < 0.3 ? 'bg-cyber-green' :
                  riskLevel < 0.7 ? 'bg-cyber-orange' : 'bg-cyber-red'
                }`}
                style={{ width: `${riskLevel * 100}%` }}
              />
            </div>
            <span className={`font-mono text-sm ${getRiskColor(riskLevel)}`}>
              {getRiskLabel(riskLevel)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
