import { useState } from 'react';
import { LondonMap } from './LondonMap';
import { ProbabilityEvolution, ProbabilityEvolution3D } from './ProbabilityEvolution';
import { NavigationPanel, ActionProbsDisplay } from './NavigationPanel';
import { useLondonSimulation } from '../../hooks/useLondonSimulation';

export function LondonPage() {
  const { state, mapData, isConnected } = useLondonSimulation();
  const [show3D, setShow3D] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-space-950">
      {/* Header */}
      <header className="h-14 bg-space-900/80 border-b border-space-700/50 flex items-center px-6">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-gradient">
            LONDON NAVIGATOR
          </h1>
          <span className="text-xs text-gray-500 font-mono">
            Autonomous Decision Visualizer
          </span>
        </div>

        <div className="ml-auto flex items-center gap-6">
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            <div className={`status-indicator ${isConnected ? 'status-live' : 'bg-gray-600'}`} />
            <span className="text-xs font-mono text-gray-400">
              {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
            </span>
          </div>

          {/* 3D Toggle */}
          <button
            onClick={() => setShow3D(!show3D)}
            className={`px-3 py-1 text-xs font-mono rounded border transition-all ${
              show3D
                ? 'bg-cyber-purple/20 border-cyber-purple text-cyber-purple'
                : 'bg-space-800 border-space-600 text-gray-400 hover:border-cyber-blue'
            }`}
          >
            {show3D ? '3D VIEW' : '2D VIEW'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 flex gap-4 overflow-hidden">
        {/* Left Column - Map */}
        <div className="flex-1 flex flex-col gap-4">
          {/* London Map */}
          <div className="flex-1 panel overflow-hidden">
            <div className="panel-header flex items-center justify-between">
              <span>London Street Map • Soho District</span>
              <span className="text-xs text-gray-500">
                {mapData?.intersections.length ?? 0} intersections
              </span>
            </div>
            <div className="h-[450px]">
              <LondonMap
                mapData={mapData}
                currentNode={state.currentNode}
                targetNode={state.targetNode}
                pathTaken={state.pathTaken}
                optimalPath={state.optimalPath}
              />
            </div>
          </div>

          {/* Action Probabilities */}
          <div className="h-48">
            <ActionProbsDisplay
              actionProbs={state.actionProbs}
              currentAction={state.currentAction}
            />
          </div>
        </div>

        {/* Right Column - Stats & Visualization */}
        <div className="w-96 flex flex-col gap-4">
          {/* Navigation Panel */}
          <div className="h-80">
            <NavigationPanel
              episode={state.episode}
              step={state.step}
              currentNode={state.currentNode}
              targetNode={state.targetNode}
              totalReward={state.totalReward}
              distanceTraveled={state.distanceTraveled}
              currentSpeed={state.currentSpeed}
              pathLength={state.pathTaken.length}
              optimalPathLength={state.optimalPath.length}
              epsilon={state.agentStats.epsilon ?? 1}
              isConnected={isConnected}
            />
          </div>

          {/* Probability Evolution */}
          <div className="flex-1 panel overflow-hidden">
            <div className="panel-header flex items-center justify-between">
              <span>Probability Evolution</span>
              <span className="text-xs text-gray-500">
                {state.probabilityEvolution.length} episodes
              </span>
            </div>
            <div className="h-[280px]">
              {show3D ? (
                <ProbabilityEvolution3D
                  data={state.probabilityEvolution}
                  currentEpisode={state.episode}
                />
              ) : (
                <ProbabilityEvolution
                  data={state.probabilityEvolution}
                  currentEpisode={state.episode}
                />
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="h-10 bg-space-900/50 border-t border-space-700/50 flex items-center justify-between px-6">
        <span className="text-xs text-gray-500 font-mono">
          London Navigation Simulator v0.1.0 • RL-based Pathfinding
        </span>
        <div className="flex items-center gap-4 text-xs font-mono text-gray-500">
          <span>Episode: {state.episode}</span>
          <span>•</span>
          <span>Step: {state.step}</span>
          <span>•</span>
          <span className={state.totalReward >= 0 ? 'text-cyber-green' : 'text-cyber-red'}>
            Reward: {state.totalReward.toFixed(2)}
          </span>
        </div>
      </footer>
    </div>
  );
}
