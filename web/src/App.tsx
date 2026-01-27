import { useState } from 'react';
import {
  Header,
  HighwayCanvas,
  DecisionFeed,
  RewardBreakdown,
  ActionProbabilities,
  AgentTooltip,
} from './components';
import { useSimulation } from './hooks/useSimulation';

function App() {
  const { state, isConnected } = useSimulation();
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const handleEgoHover = (isHovering: boolean, x: number, y: number) => {
    setTooltipVisible(isHovering);
    setTooltipPos({ x, y });
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <Header
        isLive={state.isLive}
        isRecording={false}
        episodeNumber={state.episode}
        stepNumber={state.step}
      />

      {/* Main Content */}
      <main className="flex-1 p-4 flex gap-4">
        {/* Left Column - Highway Visualization */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Highway Canvas */}
          <div className="flex-1 panel overflow-hidden">
            <div className="panel-header flex items-center justify-between">
              <span>Highway Simulation</span>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-cyber-green' : 'bg-gray-600'}`} />
                <span className="text-xs text-gray-400">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
            <div className="h-[400px]">
              <HighwayCanvas
                vehicles={state.vehicles}
                laneCount={4}
                onEgoHover={handleEgoHover}
              />
            </div>
          </div>

          {/* Action Probabilities */}
          <ActionProbabilities probabilities={state.actionProbabilities} />
        </div>

        {/* Right Column - Stats */}
        <div className="w-80 flex flex-col gap-4">
          {/* Reward Breakdown */}
          <div className="flex-1">
            <RewardBreakdown
              components={state.rewardComponents}
              totalReward={state.totalReward}
              riskLevel={state.riskLevel}
            />
          </div>

          {/* Decision Feed */}
          <div className="h-72">
            <DecisionFeed decisions={state.decisions} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="h-10 bg-space-900/50 border-t border-space-700/50 flex items-center justify-center">
        <span className="text-xs text-gray-500 font-mono">
          Autonomous Decision Visualizer v0.1.0 • Reinforcement Learning Visualization
        </span>
      </footer>

      {/* Agent Tooltip */}
      <AgentTooltip
        visible={tooltipVisible}
        x={tooltipPos.x}
        y={tooltipPos.y}
        speed={state.currentSpeed}
        action={state.currentAction}
        reward={state.totalReward}
        risk={state.riskLevel}
      />
    </div>
  );
}

export default App;
