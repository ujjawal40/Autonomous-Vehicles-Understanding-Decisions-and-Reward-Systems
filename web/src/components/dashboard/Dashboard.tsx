/**
 * Main Dashboard Page
 *
 * Combines all dashboard components into a cohesive training interface.
 */

import { useState, useCallback } from 'react';
import { DashboardHeader } from './DashboardHeader';
import { TrainingControls } from './TrainingControls';
import { RewardEditor, DEFAULT_CODE } from './RewardEditor';
import type { RewardConfig } from './RewardEditor';
import { ProbabilityVolcano } from './ProbabilityVolcano';
import { RiskGauge } from './RiskGauge';
import { MetricsPanel } from './MetricsPanel';
import { TrainingHistory } from './TrainingHistory';
import { Map, BarChart2, History as HistoryIcon, Settings } from 'lucide-react';

type TabId = 'training' | 'history' | 'settings';

// Mock data for demonstration
const MOCK_RUNS = [
  {
    id: 1,
    name: 'DQN Baseline',
    algorithm: 'DQN',
    status: 'completed',
    totalEpisodes: 100,
    completedEpisodes: 100,
    avgReward: 8.5,
    successRate: 0.72,
    createdAt: '2024-01-15',
    rewardHistory: Array.from({ length: 100 }, (_, i) => ({
      episode: i + 1,
      reward: Math.random() * 5 + i * 0.1,
    })),
  },
  {
    id: 2,
    name: 'PPO Experiment',
    algorithm: 'PPO',
    status: 'completed',
    totalEpisodes: 100,
    completedEpisodes: 100,
    avgReward: 12.3,
    successRate: 0.85,
    createdAt: '2024-01-16',
    rewardHistory: Array.from({ length: 100 }, (_, i) => ({
      episode: i + 1,
      reward: Math.random() * 4 + i * 0.15,
    })),
  },
];

export function Dashboard() {
  // Tab state
  const [activeTab, setActiveTab] = useState<TabId>('training');

  // Training state
  const [trainingStatus, setTrainingStatus] = useState<
    'idle' | 'running' | 'paused' | 'completed'
  >('idle');
  const [currentEpisode, setCurrentEpisode] = useState(0);
  const [totalEpisodes, setTotalEpisodes] = useState(100);
  const [algorithm, setAlgorithm] = useState('DQN');
  const [currentStep, setCurrentStep] = useState(0);

  // Reward configuration
  const [rewardMode, setRewardMode] = useState<'sliders' | 'code'>('sliders');
  const [rewardConfig, setRewardConfig] = useState<RewardConfig>({
    goal_reached: 10.0,
    progress_bonus: 0.5,
    wrong_direction: -0.3,
    revisit_penalty: -0.5,
    step_penalty: -0.05,
    timeout_penalty: -2.0,
  });
  const [rewardCode, setRewardCode] = useState(DEFAULT_CODE);

  // Metrics
  const [metrics, setMetrics] = useState({
    totalReward: 0,
    avgReward: 0,
    bestReward: 0,
    successRate: 0,
    stepsPerEpisode: 0,
    trainingTime: 0,
    epsilon: 1.0,
  });

  // Probability data
  const [currentProbs, _setCurrentProbs] = useState([0.25, 0.25, 0.25, 0.25]);
  const [episodeHistory, _setEpisodeHistory] = useState<
    { step: number; probs: number[]; action: number }[]
  >([]);
  const [allEpisodes, _setAllEpisodes] = useState<
    { episode: number; steps: { step: number; probs: number[]; action: number }[] }[]
  >([]);

  // Risk data
  const [riskScore, _setRiskScore] = useState(0.3);
  const [entropy, _setEntropy] = useState(0.5);

  // History
  const [selectedRuns, setSelectedRuns] = useState<number[]>([]);

  // Handlers
  const handleStart = useCallback(() => {
    setTrainingStatus('running');
    // TODO: Call API to start training
  }, []);

  const handlePause = useCallback(() => {
    setTrainingStatus('paused');
    // TODO: Call API to pause training
  }, []);

  const handleResume = useCallback(() => {
    setTrainingStatus('running');
    // TODO: Call API to resume training
  }, []);

  const handleStop = useCallback(() => {
    setTrainingStatus('idle');
    setCurrentEpisode(0);
    setCurrentStep(0);
    // TODO: Call API to stop training
  }, []);

  const handleReset = useCallback(() => {
    setTrainingStatus('idle');
    setCurrentEpisode(0);
    setCurrentStep(0);
    setMetrics({
      totalReward: 0,
      avgReward: 0,
      bestReward: 0,
      successRate: 0,
      stepsPerEpisode: 0,
      trainingTime: 0,
      epsilon: 1.0,
    });
  }, []);

  const isTraining = trainingStatus === 'running' || trainingStatus === 'paused';

  const TABS = [
    { id: 'training' as const, label: 'Training', icon: BarChart2 },
    { id: 'history' as const, label: 'History', icon: HistoryIcon },
    { id: 'settings' as const, label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[--color-void] flex flex-col">
      {/* Header */}
      <DashboardHeader
        isConnected={true}
        isTraining={trainingStatus === 'running'}
        runName={trainingStatus !== 'idle' ? `${algorithm} Run #${currentEpisode}` : undefined}
      />

      {/* Tab Navigation */}
      <div className="bg-[--color-space-950] border-b border-white/5 px-6">
        <div className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-xs font-medium uppercase tracking-wider flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'text-[--color-cyber-blue] border-[--color-cyber-blue]'
                  : 'text-white/40 border-transparent hover:text-white/60'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 overflow-auto">
        {activeTab === 'training' && (
          <div className="grid grid-cols-12 gap-4 h-full">
            {/* Left Column - Controls & Reward Editor */}
            <div className="col-span-12 lg:col-span-3 flex flex-col gap-4">
              <TrainingControls
                status={trainingStatus}
                currentEpisode={currentEpisode}
                totalEpisodes={totalEpisodes}
                algorithm={algorithm}
                onStart={handleStart}
                onPause={handlePause}
                onResume={handleResume}
                onStop={handleStop}
                onReset={handleReset}
                onEpisodesChange={setTotalEpisodes}
                onAlgorithmChange={setAlgorithm}
              />

              <div className="flex-1 min-h-[400px]">
                <RewardEditor
                  mode={rewardMode}
                  config={rewardConfig}
                  code={rewardCode}
                  onModeChange={setRewardMode}
                  onConfigChange={setRewardConfig}
                  onCodeChange={setRewardCode}
                  onSave={() => console.log('Save reward config')}
                  onReset={() => {
                    setRewardConfig({
                      goal_reached: 10.0,
                      progress_bonus: 0.5,
                      wrong_direction: -0.3,
                      revisit_penalty: -0.5,
                      step_penalty: -0.05,
                      timeout_penalty: -2.0,
                    });
                    setRewardCode(DEFAULT_CODE);
                  }}
                  disabled={isTraining}
                />
              </div>
            </div>

            {/* Center Column - 3D Visualization */}
            <div className="col-span-12 lg:col-span-6 flex flex-col gap-4">
              <div className="flex-1 min-h-[500px]">
                <ProbabilityVolcano
                  currentProbs={currentProbs}
                  currentStep={currentStep}
                  episodeHistory={episodeHistory}
                  allEpisodes={allEpisodes}
                />
              </div>

              {/* Metrics */}
              <MetricsPanel
                episode={currentEpisode}
                step={currentStep}
                totalReward={metrics.totalReward}
                avgReward={metrics.avgReward}
                bestReward={metrics.bestReward}
                successRate={metrics.successRate}
                stepsPerEpisode={metrics.stepsPerEpisode}
                trainingTime={metrics.trainingTime}
                epsilon={metrics.epsilon}
              />
            </div>

            {/* Right Column - Risk Gauge */}
            <div className="col-span-12 lg:col-span-3 flex flex-col gap-4">
              <RiskGauge
                riskScore={riskScore}
                entropy={entropy}
                components={[
                  { name: 'Path Uncertainty', value: 0.4, max: 1 },
                  { name: 'Revisit Risk', value: 0.2, max: 1 },
                  { name: 'Distance Factor', value: 0.6, max: 1 },
                ]}
                trend="stable"
              />

              {/* Quick Stats */}
              <div className="panel flex-1">
                <div className="panel-header">
                  <span>Map Overview</span>
                </div>
                <div className="panel-content flex items-center justify-center h-48">
                  <div className="text-center">
                    <Map size={48} className="text-white/20 mx-auto mb-2" />
                    <p className="text-xs text-white/40">
                      London Soho District
                    </p>
                    <p className="text-xs text-white/30 mt-1">
                      240 intersections • 429 roads
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="h-[calc(100vh-180px)]">
            <TrainingHistory
              runs={MOCK_RUNS}
              selectedRuns={selectedRuns}
              onSelectRun={(id) => setSelectedRuns([...selectedRuns, id])}
              onDeselectRun={(id) =>
                setSelectedRuns(selectedRuns.filter((r) => r !== id))
              }
            />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="panel max-w-2xl mx-auto">
            <div className="panel-header">
              <span>Settings</span>
            </div>
            <div className="panel-content space-y-6">
              <div>
                <label className="data-label block mb-2">API Endpoint</label>
                <input
                  type="text"
                  className="input w-full"
                  defaultValue="http://localhost:8000"
                />
              </div>
              <div>
                <label className="data-label block mb-2">WebSocket URL</label>
                <input
                  type="text"
                  className="input w-full"
                  defaultValue="ws://localhost:8000/ws"
                />
              </div>
              <div>
                <label className="data-label block mb-2">Auto-save Checkpoints</label>
                <select className="input w-full">
                  <option value="10">Every 10 episodes</option>
                  <option value="25">Every 25 episodes</option>
                  <option value="50">Every 50 episodes</option>
                  <option value="100">Every 100 episodes</option>
                </select>
              </div>
              <button className="btn btn-primary">Save Settings</button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="h-8 bg-[--color-void] border-t border-white/5 flex items-center justify-center px-6">
        <span className="text-[10px] text-white/30 font-mono uppercase tracking-wider">
          Autonomous Decision Visualizer v1.0.0 • Phase 2: SpaceX UI
        </span>
      </footer>
    </div>
  );
}
