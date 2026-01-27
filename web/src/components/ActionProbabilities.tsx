interface ActionProb {
  action: string;
  probability: number;
  isChosen: boolean;
}

interface ActionProbabilitiesProps {
  probabilities: ActionProb[];
}

const ACTION_COLORS: Record<string, string> = {
  'FASTER': 'from-cyber-green/20 to-cyber-green',
  'SLOWER': 'from-cyber-orange/20 to-cyber-orange',
  'LANE_LEFT': 'from-cyber-purple/20 to-cyber-purple',
  'LANE_RIGHT': 'from-cyber-purple/20 to-cyber-purple',
  'IDLE': 'from-gray-500/20 to-gray-500',
};

export function ActionProbabilities({ probabilities }: ActionProbabilitiesProps) {
  // Sort by probability descending
  const sorted = [...probabilities].sort((a, b) => b.probability - a.probability);

  return (
    <div className="panel">
      <div className="panel-header">Action Probabilities</div>

      <div className="p-4 space-y-3">
        {sorted.map((action) => (
          <div key={action.action} className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`font-mono text-sm ${
                  action.isChosen ? 'text-cyber-cyan font-semibold' : 'text-gray-300'
                }`}>
                  {action.action}
                </span>
                {action.isChosen && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/30">
                    CHOSEN
                  </span>
                )}
              </div>
              <span className={`font-mono text-sm ${
                action.isChosen ? 'text-cyber-cyan' : 'text-gray-400'
              }`}>
                {(action.probability * 100).toFixed(1)}%
              </span>
            </div>

            {/* Probability bar */}
            <div className="h-3 bg-space-800 rounded overflow-hidden">
              <div
                className={`h-full rounded transition-all duration-500 bg-gradient-to-r ${
                  action.isChosen
                    ? 'from-cyber-cyan/30 to-cyber-cyan shadow-glow-cyan'
                    : ACTION_COLORS[action.action] || 'from-gray-500/20 to-gray-500'
                }`}
                style={{ width: `${action.probability * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
