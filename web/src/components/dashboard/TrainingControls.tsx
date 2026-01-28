/**
 * Training Controls Panel
 *
 * Start/Stop/Pause training, configure episodes, select algorithm
 */

import { Play, Pause, Square, RotateCcw, Settings } from 'lucide-react';

interface TrainingControlsProps {
  status: 'idle' | 'running' | 'paused' | 'completed';
  currentEpisode: number;
  totalEpisodes: number;
  algorithm: string;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onReset: () => void;
  onEpisodesChange: (episodes: number) => void;
  onAlgorithmChange: (algorithm: string) => void;
}

const ALGORITHMS = [
  { id: 'DQN', name: 'DQN', description: 'Deep Q-Network' },
  { id: 'DoubleDQN', name: 'Double DQN', description: 'Reduces overestimation' },
  { id: 'PPO', name: 'PPO', description: 'Proximal Policy Optimization' },
  { id: 'A2C', name: 'A2C', description: 'Advantage Actor-Critic' },
];

export function TrainingControls({
  status,
  currentEpisode,
  totalEpisodes,
  algorithm,
  onStart,
  onPause,
  onResume,
  onStop,
  onReset,
  onEpisodesChange,
  onAlgorithmChange,
}: TrainingControlsProps) {
  const progress = totalEpisodes > 0 ? (currentEpisode / totalEpisodes) * 100 : 0;
  const isRunning = status === 'running';
  const isPaused = status === 'paused';
  const isIdle = status === 'idle';

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="flex items-center gap-2">
          <Settings size={12} />
          Training Controls
        </span>
        <div className="flex items-center gap-2">
          <div className={`status-dot ${
            isRunning ? 'status-live' :
            isPaused ? 'status-warning' :
            'status-idle'
          }`} />
          <span className="text-[10px] uppercase tracking-wider">
            {status}
          </span>
        </div>
      </div>

      <div className="panel-content space-y-6">
        {/* Progress */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="data-label">Progress</span>
            <span className="text-mono text-sm text-[--color-cyber-blue]">
              {currentEpisode} / {totalEpisodes}
            </span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-right mt-1">
            <span className="text-mono text-xs text-white/40">
              {progress.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Algorithm Selection */}
        <div>
          <label className="data-label block mb-2">Algorithm</label>
          <div className="grid grid-cols-2 gap-2">
            {ALGORITHMS.map((algo) => (
              <button
                key={algo.id}
                onClick={() => onAlgorithmChange(algo.id)}
                disabled={isRunning || isPaused}
                className={`p-3 rounded text-left transition-all ${
                  algorithm === algo.id
                    ? 'bg-[--color-cyber-blue]/10 border border-[--color-cyber-blue]/50'
                    : 'bg-[--color-space-800] border border-white/5 hover:border-white/10'
                } ${(isRunning || isPaused) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="text-mono text-xs font-medium text-white">
                  {algo.name}
                </div>
                <div className="text-[10px] text-white/40 mt-0.5">
                  {algo.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Episodes Configuration */}
        <div>
          <label className="data-label block mb-2">Total Episodes</label>
          <div className="flex gap-2">
            {[50, 100, 200, 500].map((ep) => (
              <button
                key={ep}
                onClick={() => onEpisodesChange(ep)}
                disabled={isRunning || isPaused}
                className={`flex-1 py-2 text-mono text-xs rounded transition-all ${
                  totalEpisodes === ep
                    ? 'bg-[--color-cyber-blue] text-black'
                    : 'bg-[--color-space-800] text-white/60 hover:text-white'
                } ${(isRunning || isPaused) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {ep}
              </button>
            ))}
          </div>
          <input
            type="number"
            value={totalEpisodes}
            onChange={(e) => onEpisodesChange(parseInt(e.target.value) || 100)}
            disabled={isRunning || isPaused}
            className="input w-full mt-2"
            placeholder="Custom episodes..."
          />
        </div>

        {/* Control Buttons */}
        <div className="flex gap-2">
          {isIdle && (
            <button onClick={onStart} className="btn btn-success flex-1">
              <Play size={14} />
              Start
            </button>
          )}

          {isRunning && (
            <>
              <button onClick={onPause} className="btn btn-secondary flex-1">
                <Pause size={14} />
                Pause
              </button>
              <button onClick={onStop} className="btn btn-danger flex-1">
                <Square size={14} />
                Stop
              </button>
            </>
          )}

          {isPaused && (
            <>
              <button onClick={onResume} className="btn btn-success flex-1">
                <Play size={14} />
                Resume
              </button>
              <button onClick={onStop} className="btn btn-danger flex-1">
                <Square size={14} />
                Stop
              </button>
            </>
          )}

          {status === 'completed' && (
            <button onClick={onReset} className="btn btn-primary flex-1">
              <RotateCcw size={14} />
              New Training
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
