/**
 * Reward Editor
 *
 * Dual-mode reward function configuration:
 * - Sliders: Visual parameter adjustment
 * - Code: Custom Python reward function
 */

import { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Sliders, Code, Save, RotateCcw, AlertCircle } from 'lucide-react';

interface RewardConfig {
  goal_reached: number;
  progress_bonus: number;
  wrong_direction: number;
  revisit_penalty: number;
  step_penalty: number;
  timeout_penalty: number;
}

interface RewardEditorProps {
  mode: 'sliders' | 'code';
  config: RewardConfig;
  code: string;
  onModeChange: (mode: 'sliders' | 'code') => void;
  onConfigChange: (config: RewardConfig) => void;
  onCodeChange: (code: string) => void;
  onSave: () => void;
  onReset: () => void;
  disabled?: boolean;
}

const DEFAULT_CODE = `def calculate_reward(state, action, next_state, info):
    """
    Custom reward function for navigation.

    Args:
        state: Current state dict with keys:
            - current_node: Current intersection ID
            - goal_node: Target intersection ID
            - visited_nodes: Set of visited nodes
            - distance_to_goal: Distance to destination
        action: Action taken (0-3 for directions)
        next_state: Resulting state after action
        info: Additional info dict

    Returns:
        float: Reward value
    """
    reward = 0.0

    # Goal reached
    if next_state['current_node'] == next_state['goal_node']:
        reward += 10.0

    # Progress toward goal
    distance_improvement = (
        state['distance_to_goal'] - next_state['distance_to_goal']
    )
    if distance_improvement > 0:
        reward += 0.5 * distance_improvement
    else:
        reward -= 0.3  # Wrong direction

    # Revisit penalty
    if next_state['current_node'] in state['visited_nodes']:
        reward -= 0.5

    # Step penalty (encourage efficiency)
    reward -= 0.05

    return reward
`;

const SLIDER_CONFIG = [
  {
    key: 'goal_reached' as const,
    label: 'Goal Reached',
    min: 0,
    max: 50,
    step: 1,
    color: 'cyber-green',
    description: 'Reward for reaching destination',
  },
  {
    key: 'progress_bonus' as const,
    label: 'Progress Bonus',
    min: 0,
    max: 2,
    step: 0.1,
    color: 'cyber-blue',
    description: 'Reward per unit closer to goal',
  },
  {
    key: 'wrong_direction' as const,
    label: 'Wrong Direction',
    min: -2,
    max: 0,
    step: 0.1,
    color: 'cyber-orange',
    description: 'Penalty for moving away',
  },
  {
    key: 'revisit_penalty' as const,
    label: 'Revisit Penalty',
    min: -3,
    max: 0,
    step: 0.1,
    color: 'cyber-red',
    description: 'Penalty for revisiting nodes',
  },
  {
    key: 'step_penalty' as const,
    label: 'Step Penalty',
    min: -0.5,
    max: 0,
    step: 0.01,
    color: 'cyber-purple',
    description: 'Penalty per step taken',
  },
  {
    key: 'timeout_penalty' as const,
    label: 'Timeout Penalty',
    min: -10,
    max: 0,
    step: 0.5,
    color: 'cyber-red',
    description: 'Penalty for exceeding steps',
  },
];

export function RewardEditor({
  mode,
  config,
  code,
  onModeChange,
  onConfigChange,
  onCodeChange,
  onSave,
  onReset,
  disabled = false,
}: RewardEditorProps) {
  const [codeError, setCodeError] = useState<string | null>(null);

  const handleSliderChange = (key: keyof RewardConfig, value: number) => {
    onConfigChange({ ...config, [key]: value });
  };

  const handleCodeValidate = (value: string | undefined) => {
    if (!value) return;

    // Basic validation - check for required function
    if (!value.includes('def calculate_reward')) {
      setCodeError('Missing required function: calculate_reward');
    } else if (!value.includes('return')) {
      setCodeError('Function must return a reward value');
    } else {
      setCodeError(null);
    }

    onCodeChange(value);
  };

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">
        <span>Reward Function</span>
        <div className="tab-list">
          <button
            onClick={() => onModeChange('sliders')}
            className={`tab ${mode === 'sliders' ? 'active' : ''}`}
            disabled={disabled}
          >
            <Sliders size={12} className="inline mr-1" />
            Sliders
          </button>
          <button
            onClick={() => onModeChange('code')}
            className={`tab ${mode === 'code' ? 'active' : ''}`}
            disabled={disabled}
          >
            <Code size={12} className="inline mr-1" />
            Code
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {mode === 'sliders' ? (
          <div className="p-4 space-y-4 overflow-y-auto h-full">
            {SLIDER_CONFIG.map((slider) => (
              <div key={slider.key} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm font-medium text-white">
                      {slider.label}
                    </span>
                    <p className="text-[10px] text-white/40">
                      {slider.description}
                    </p>
                  </div>
                  <span
                    className={`text-mono text-sm font-semibold`}
                    style={{
                      color: `var(--color-${slider.color})`,
                    }}
                  >
                    {config[slider.key].toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min={slider.min}
                  max={slider.max}
                  step={slider.step}
                  value={config[slider.key]}
                  onChange={(e) =>
                    handleSliderChange(slider.key, parseFloat(e.target.value))
                  }
                  disabled={disabled}
                  className="slider w-full"
                  style={{
                    accentColor: `var(--color-${slider.color})`,
                  }}
                />
                <div className="flex justify-between text-[10px] text-white/30">
                  <span>{slider.min}</span>
                  <span>{slider.max}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col">
            {codeError && (
              <div className="px-4 py-2 bg-[--color-cyber-red]/10 border-b border-[--color-cyber-red]/30 flex items-center gap-2">
                <AlertCircle size={14} className="text-[--color-cyber-red]" />
                <span className="text-xs text-[--color-cyber-red]">
                  {codeError}
                </span>
              </div>
            )}
            <div className="flex-1">
              <Editor
                height="100%"
                defaultLanguage="python"
                value={code || DEFAULT_CODE}
                onChange={handleCodeValidate}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  fontFamily: 'JetBrains Mono, monospace',
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 4,
                  readOnly: disabled,
                  padding: { top: 16, bottom: 16 },
                }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-white/5 flex gap-2">
        <button
          onClick={onReset}
          disabled={disabled}
          className="btn btn-secondary flex-1"
        >
          <RotateCcw size={14} />
          Reset
        </button>
        <button
          onClick={onSave}
          disabled={disabled || (mode === 'code' && codeError !== null)}
          className="btn btn-primary flex-1"
        >
          <Save size={14} />
          Save
        </button>
      </div>
    </div>
  );
}

export { DEFAULT_CODE };
export type { RewardConfig };
