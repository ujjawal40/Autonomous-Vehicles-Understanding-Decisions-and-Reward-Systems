/**
 * Episode Viewer Component
 *
 * Visualizes individual training episodes with step-by-step playback.
 */

import { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  FastForward,
  Rewind,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface StepData {
  step: number;
  state: number[];
  action: number;
  reward: number;
  cumulativeReward: number;
  actionProbabilities?: number[];
  qValues?: number[];
}

interface Episode {
  id: string;
  episodeNumber: number;
  totalReward: number;
  steps: StepData[];
  startTime: string;
  duration: number;
}

interface EpisodeViewerProps {
  episodes: Episode[];
  currentEpisode?: Episode;
  onSelectEpisode?: (episode: Episode) => void;
}

const ACTION_LABELS = ['Accelerate', 'Decelerate', 'Left', 'Right', 'Maintain'];

export function EpisodeViewer({
  episodes,
  currentEpisode,
  onSelectEpisode,
}: EpisodeViewerProps) {
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(
    currentEpisode || null
  );
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showEpisodeList, setShowEpisodeList] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    if (currentEpisode) {
      setSelectedEpisode(currentEpisode);
      setCurrentStep(0);
    }
  }, [currentEpisode]);

  useEffect(() => {
    if (isPlaying && selectedEpisode) {
      intervalRef.current = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= selectedEpisode.steps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 500 / playbackSpeed);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, selectedEpisode]);

  const handleSelectEpisode = (episode: Episode) => {
    setSelectedEpisode(episode);
    setCurrentStep(0);
    setIsPlaying(false);
    setShowEpisodeList(false);
    onSelectEpisode?.(episode);
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleStepBack = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  const handleStepForward = () => {
    if (selectedEpisode) {
      setCurrentStep((prev) => Math.min(selectedEpisode.steps.length - 1, prev + 1));
    }
  };

  const handleSeekStart = () => {
    setCurrentStep(0);
    setIsPlaying(false);
  };

  const handleSeekEnd = () => {
    if (selectedEpisode) {
      setCurrentStep(selectedEpisode.steps.length - 1);
      setIsPlaying(false);
    }
  };

  const step = selectedEpisode?.steps[currentStep];

  return (
    <div className="space-y-4">
      {/* Episode Selector */}
      <div className="relative">
        <button
          onClick={() => setShowEpisodeList(!showEpisodeList)}
          className="w-full flex items-center justify-between p-3 bg-[--color-space-800] border border-white/10 rounded-lg hover:border-white/20 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[--color-cyber-blue]/10 flex items-center justify-center">
              <span className="text-xs font-mono text-[--color-cyber-blue]">
                {selectedEpisode?.episodeNumber ?? '#'}
              </span>
            </div>
            <div className="text-left">
              <div className="text-sm font-medium text-white">
                {selectedEpisode
                  ? `Episode ${selectedEpisode.episodeNumber}`
                  : 'Select Episode'}
              </div>
              {selectedEpisode && (
                <div className="text-xs text-white/50">
                  Reward: {selectedEpisode.totalReward.toFixed(2)} | {selectedEpisode.steps.length} steps
                </div>
              )}
            </div>
          </div>
          {showEpisodeList ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showEpisodeList && episodes.length > 0 && (
          <div className="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto bg-[--color-space-800] border border-white/10 rounded-lg shadow-xl">
            {episodes.map((ep) => (
              <button
                key={ep.id}
                onClick={() => handleSelectEpisode(ep)}
                className={`
                  w-full flex items-center gap-3 p-3 text-left hover:bg-white/5 transition-colors
                  ${selectedEpisode?.id === ep.id ? 'bg-[--color-cyber-blue]/10' : ''}
                `}
              >
                <span className="text-xs font-mono text-white/50 w-8">
                  #{ep.episodeNumber}
                </span>
                <div className="flex-1">
                  <div className="text-sm text-white">
                    Reward: <span className="text-[--color-cyber-green]">{ep.totalReward.toFixed(2)}</span>
                  </div>
                  <div className="text-xs text-white/40">
                    {ep.steps.length} steps | {(ep.duration / 1000).toFixed(1)}s
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Playback Controls */}
      {selectedEpisode && (
        <>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={handleSeekStart}
              className="p-2 text-white/50 hover:text-white transition-colors"
            >
              <Rewind size={16} />
            </button>
            <button
              onClick={handleStepBack}
              className="p-2 text-white/50 hover:text-white transition-colors"
            >
              <SkipBack size={16} />
            </button>
            <button
              onClick={handlePlayPause}
              className="p-3 bg-[--color-cyber-blue] text-black rounded-full hover:bg-[--color-cyber-blue]/80 transition-colors"
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <button
              onClick={handleStepForward}
              className="p-2 text-white/50 hover:text-white transition-colors"
            >
              <SkipForward size={16} />
            </button>
            <button
              onClick={handleSeekEnd}
              className="p-2 text-white/50 hover:text-white transition-colors"
            >
              <FastForward size={16} />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="absolute h-full bg-[--color-cyber-blue] transition-all"
                style={{
                  width: `${((currentStep + 1) / selectedEpisode.steps.length) * 100}%`,
                }}
              />
              <input
                type="range"
                min={0}
                max={selectedEpisode.steps.length - 1}
                value={currentStep}
                onChange={(e) => setCurrentStep(parseInt(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
            <div className="flex justify-between text-xs text-white/50">
              <span>Step {currentStep + 1}</span>
              <span>{selectedEpisode.steps.length} total</span>
            </div>
          </div>

          {/* Speed Control */}
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs text-white/50">Speed:</span>
            {[0.5, 1, 2, 4].map((speed) => (
              <button
                key={speed}
                onClick={() => setPlaybackSpeed(speed)}
                className={`
                  px-2 py-1 text-xs rounded transition-colors
                  ${playbackSpeed === speed
                    ? 'bg-[--color-cyber-blue] text-black'
                    : 'bg-white/10 text-white/50 hover:text-white'
                  }
                `}
              >
                {speed}x
              </button>
            ))}
          </div>

          {/* Step Details */}
          {step && (
            <div className="p-4 bg-[--color-space-800] rounded-lg border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/50 uppercase tracking-wider">Step {currentStep + 1}</span>
                <span className={`text-sm font-mono ${step.reward >= 0 ? 'text-[--color-cyber-green]' : 'text-[--color-cyber-orange]'}`}>
                  {step.reward >= 0 ? '+' : ''}{step.reward.toFixed(3)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs text-white/40">Action Taken</span>
                  <div className="text-sm text-white font-medium">
                    {ACTION_LABELS[step.action] || `Action ${step.action}`}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-white/40">Cumulative Reward</span>
                  <div className="text-sm text-[--color-cyber-blue] font-mono">
                    {step.cumulativeReward.toFixed(2)}
                  </div>
                </div>
              </div>

              {step.actionProbabilities && (
                <div>
                  <span className="text-xs text-white/40">Action Probabilities</span>
                  <div className="mt-2 space-y-1">
                    {step.actionProbabilities.map((prob, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs text-white/50 w-20 truncate">
                          {ACTION_LABELS[i]}
                        </span>
                        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${i === step.action ? 'bg-[--color-cyber-green]' : 'bg-[--color-cyber-blue]/50'}`}
                            style={{ width: `${prob * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono text-white/40 w-10 text-right">
                          {(prob * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {step.qValues && (
                <div>
                  <span className="text-xs text-white/40">Q-Values</span>
                  <div className="mt-2 grid grid-cols-5 gap-1">
                    {step.qValues.map((q, i) => (
                      <div
                        key={i}
                        className={`
                          p-2 rounded text-center
                          ${i === step.action
                            ? 'bg-[--color-cyber-blue]/20 border border-[--color-cyber-blue]/30'
                            : 'bg-white/5'
                          }
                        `}
                      >
                        <div className="text-[10px] text-white/40 truncate">
                          {ACTION_LABELS[i]?.substring(0, 3)}
                        </div>
                        <div className="text-xs font-mono text-white">
                          {q.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {!selectedEpisode && episodes.length === 0 && (
        <div className="text-center py-8 text-white/40 text-sm">
          No episodes available yet.
          <br />
          Start training to see episode data.
        </div>
      )}
    </div>
  );
}
