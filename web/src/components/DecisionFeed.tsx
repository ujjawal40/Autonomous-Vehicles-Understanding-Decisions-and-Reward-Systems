interface Decision {
  id: number;
  step: number;
  action: string;
  reward: number;
  timestamp: number;
}

interface DecisionFeedProps {
  decisions: Decision[];
}

const ACTION_COLORS: Record<string, string> = {
  'FASTER': 'text-cyber-green',
  'SLOWER': 'text-cyber-orange',
  'LANE_LEFT': 'text-cyber-purple',
  'LANE_RIGHT': 'text-cyber-purple',
  'IDLE': 'text-gray-400',
};

const ACTION_ICONS: Record<string, string> = {
  'FASTER': '↑',
  'SLOWER': '↓',
  'LANE_LEFT': '←',
  'LANE_RIGHT': '→',
  'IDLE': '•',
};

export function DecisionFeed({ decisions }: DecisionFeedProps) {
  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header flex items-center justify-between">
        <span>Decision Feed</span>
        <span className="text-gray-500">{decisions.length} actions</span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {decisions.slice().reverse().map((decision) => (
          <div
            key={decision.id}
            className="flex items-center gap-3 px-3 py-2 rounded bg-space-800/50 hover:bg-space-700/50 transition-colors animate-slide-up"
          >
            {/* Step number */}
            <span className="font-mono text-xs text-gray-500 w-8">
              #{decision.step}
            </span>

            {/* Action icon */}
            <span className={`text-lg ${ACTION_COLORS[decision.action] || 'text-gray-400'}`}>
              {ACTION_ICONS[decision.action] || '?'}
            </span>

            {/* Action name */}
            <span className={`font-mono text-sm flex-1 ${ACTION_COLORS[decision.action] || 'text-gray-400'}`}>
              {decision.action}
            </span>

            {/* Reward */}
            <span className={`font-mono text-sm font-semibold ${
              decision.reward >= 0 ? 'text-cyber-green' : 'text-cyber-red'
            }`}>
              {decision.reward >= 0 ? '+' : ''}{decision.reward.toFixed(2)}
            </span>
          </div>
        ))}

        {decisions.length === 0 && (
          <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
            Waiting for decisions...
          </div>
        )}
      </div>
    </div>
  );
}
