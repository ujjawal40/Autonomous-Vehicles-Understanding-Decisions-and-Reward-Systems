interface NavigationPanelProps {
  episode: number;
  step: number;
  currentNode: number | null;
  targetNode: number | null;
  totalReward: number;
  distanceTraveled: number;
  currentSpeed: number;
  pathLength: number;
  optimalPathLength: number;
  epsilon: number;
  isConnected: boolean;
}

export function NavigationPanel({
  episode,
  step,
  currentNode,
  targetNode,
  totalReward,
  distanceTraveled,
  currentSpeed,
  pathLength,
  optimalPathLength,
  epsilon,
  isConnected,
}: NavigationPanelProps) {
  const efficiency = optimalPathLength > 0
    ? Math.min((optimalPathLength / Math.max(pathLength, 1)) * 100, 100)
    : 0;

  const efficiencyColor = efficiency > 80
    ? 'text-cyber-green'
    : efficiency > 50
      ? 'text-cyber-orange'
      : 'text-cyber-red';

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header flex items-center justify-between">
        <span>Navigation Status</span>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-cyber-green animate-pulse' : 'bg-gray-600'}`} />
          <span className="text-xs text-gray-400">
            {isConnected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-4 overflow-auto">
        {/* Episode & Step */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-space-800/50 rounded-lg p-3">
            <div className="text-xs text-gray-500 uppercase tracking-wider">Episode</div>
            <div className="text-2xl font-mono font-bold text-cyber-blue">{episode}</div>
          </div>
          <div className="bg-space-800/50 rounded-lg p-3">
            <div className="text-xs text-gray-500 uppercase tracking-wider">Step</div>
            <div className="text-2xl font-mono font-bold text-cyber-cyan">{step}</div>
          </div>
        </div>

        {/* Route Info */}
        <div className="bg-space-800/50 rounded-lg p-3">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Route</div>
          <div className="flex items-center gap-2 text-sm font-mono">
            <span className="text-cyber-orange">📍 {currentNode ?? '—'}</span>
            <span className="text-gray-500">→</span>
            <span className="text-cyber-green">🏁 {targetNode ?? '—'}</span>
          </div>
        </div>

        {/* Metrics */}
        <div className="space-y-3">
          {/* Reward */}
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500 uppercase">Total Reward</span>
            <span className={`font-mono font-bold ${totalReward >= 0 ? 'text-cyber-green' : 'text-cyber-red'}`}>
              {totalReward >= 0 ? '+' : ''}{totalReward.toFixed(2)}
            </span>
          </div>

          {/* Distance */}
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500 uppercase">Distance</span>
            <span className="font-mono text-white">
              {distanceTraveled.toFixed(0)}m
            </span>
          </div>

          {/* Speed */}
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500 uppercase">Speed</span>
            <span className="font-mono text-cyber-blue">
              {(currentSpeed * 2.237).toFixed(0)} mph
            </span>
          </div>

          {/* Path Efficiency */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-gray-500 uppercase">Path Efficiency</span>
              <span className={`font-mono font-bold ${efficiencyColor}`}>
                {efficiency.toFixed(0)}%
              </span>
            </div>
            <div className="h-2 bg-space-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  efficiency > 80 ? 'bg-cyber-green' :
                  efficiency > 50 ? 'bg-cyber-orange' : 'bg-cyber-red'
                }`}
                style={{ width: `${efficiency}%` }}
              />
            </div>
          </div>

          {/* Exploration Rate */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-gray-500 uppercase">Exploration (ε)</span>
              <span className="font-mono text-cyber-purple">
                {(epsilon * 100).toFixed(1)}%
              </span>
            </div>
            <div className="h-2 bg-space-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyber-purple transition-all duration-300"
                style={{ width: `${epsilon * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Path Stats */}
        <div className="bg-space-800/50 rounded-lg p-3">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Path Analysis</div>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div>
              <span className="text-gray-500">Taken: </span>
              <span className="text-white">{pathLength} nodes</span>
            </div>
            <div>
              <span className="text-gray-500">Optimal: </span>
              <span className="text-cyber-green">{optimalPathLength} nodes</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Action probabilities display for current step
interface ActionProbsDisplayProps {
  actionProbs: Record<string, number>;
  currentAction: number | null;
}

const ACTION_NAMES: Record<string, string> = {
  '0': 'NORTH',
  '1': 'EAST',
  '2': 'SOUTH',
  '3': 'WEST',
  '4': 'NE',
  '5': 'SE',
  '6': 'SW',
  '7': 'NW',
};

const ACTION_COLORS: Record<string, string> = {
  '0': 'bg-cyan-500',
  '1': 'bg-green-500',
  '2': 'bg-orange-500',
  '3': 'bg-red-500',
  '4': 'bg-purple-500',
  '5': 'bg-yellow-500',
  '6': 'bg-teal-500',
  '7': 'bg-pink-500',
};

export function ActionProbsDisplay({ actionProbs, currentAction }: ActionProbsDisplayProps) {
  const sortedActions = Object.entries(actionProbs)
    .filter(([_, prob]) => prob > 0.001)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="panel">
      <div className="panel-header">Current Action Probabilities</div>
      <div className="p-4 space-y-2">
        {sortedActions.length === 0 ? (
          <div className="text-gray-500 text-sm">No actions available</div>
        ) : (
          sortedActions.map(([action, prob]) => {
            const isChosen = parseInt(action) === currentAction;
            return (
              <div key={action} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className={`font-mono ${isChosen ? 'text-cyber-blue font-bold' : 'text-gray-400'}`}>
                    {ACTION_NAMES[action] || action}
                    {isChosen && ' ← CHOSEN'}
                  </span>
                  <span className={`font-mono ${isChosen ? 'text-cyber-blue' : 'text-gray-500'}`}>
                    {(prob * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 bg-space-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-200 ${
                      isChosen ? 'bg-cyber-blue shadow-glow-blue' : ACTION_COLORS[action] || 'bg-gray-500'
                    }`}
                    style={{ width: `${prob * 100}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
