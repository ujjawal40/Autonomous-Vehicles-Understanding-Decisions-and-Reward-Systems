interface AgentTooltipProps {
  visible: boolean;
  x: number;
  y: number;
  speed: number;
  action: string;
  reward: number;
  risk: number;
}

export function AgentTooltip({ visible, x, y, speed, action, reward, risk }: AgentTooltipProps) {
  if (!visible) return null;

  const getRiskColor = (r: number) => {
    if (r < 0.3) return 'text-cyber-green';
    if (r < 0.7) return 'text-cyber-orange';
    return 'text-cyber-red';
  };

  return (
    <div
      className="fixed z-50 pointer-events-none animate-fade-in"
      style={{
        left: x + 15,
        top: y - 10,
      }}
    >
      <div className="bg-space-900/95 backdrop-blur-md border border-cyber-blue/30 rounded-lg p-3 shadow-glow-blue min-w-48">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-space-700/50">
          <div className="w-2 h-2 rounded-full bg-cyber-cyan animate-pulse" />
          <span className="font-mono text-xs uppercase tracking-wider text-cyber-cyan">
            Ego Vehicle
          </span>
        </div>

        {/* Stats */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Speed</span>
            <span className="font-mono text-sm text-white">
              {speed.toFixed(1)} m/s
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Action</span>
            <span className="font-mono text-sm text-cyber-blue">
              {action}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Reward</span>
            <span className={`font-mono text-sm font-semibold ${
              reward >= 0 ? 'text-cyber-green' : 'text-cyber-red'
            }`}>
              {reward >= 0 ? '+' : ''}{reward.toFixed(3)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Risk</span>
            <span className={`font-mono text-sm ${getRiskColor(risk)}`}>
              {(risk * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
