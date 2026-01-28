/**
 * Hyperparameter Editor Component
 *
 * Fine-tune algorithm-specific parameters with sliders and inputs.
 */

import { useState, useEffect } from 'react';
import { Settings, RotateCcw, Save, AlertTriangle } from 'lucide-react';

interface ParameterConfig {
  key: string;
  label: string;
  type: 'number' | 'slider' | 'select';
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string | number; label: string }[];
  description?: string;
  warning?: string;
}

interface HyperparameterEditorProps {
  algorithm: string;
  config: Record<string, number | string>;
  onChange: (config: Record<string, number | string>) => void;
  disabled?: boolean;
}

const PARAMETER_CONFIGS: Record<string, ParameterConfig[]> = {
  DQN: [
    { key: 'learning_rate', label: 'Learning Rate', type: 'slider', min: 0.0001, max: 0.01, step: 0.0001, description: 'Step size for gradient descent' },
    { key: 'gamma', label: 'Discount Factor (γ)', type: 'slider', min: 0.9, max: 0.999, step: 0.001, description: 'Future reward discount' },
    { key: 'epsilon_start', label: 'Epsilon Start', type: 'slider', min: 0.5, max: 1.0, step: 0.1, description: 'Initial exploration rate' },
    { key: 'epsilon_end', label: 'Epsilon End', type: 'slider', min: 0.01, max: 0.2, step: 0.01, description: 'Final exploration rate' },
    { key: 'batch_size', label: 'Batch Size', type: 'select', options: [
      { value: 16, label: '16' },
      { value: 32, label: '32' },
      { value: 64, label: '64' },
      { value: 128, label: '128' },
    ]},
    { key: 'buffer_size', label: 'Buffer Size', type: 'number', min: 1000, max: 100000, description: 'Experience replay buffer capacity' },
  ],
  DoubleDQN: [
    { key: 'learning_rate', label: 'Learning Rate', type: 'slider', min: 0.0001, max: 0.01, step: 0.0001 },
    { key: 'gamma', label: 'Discount Factor (γ)', type: 'slider', min: 0.9, max: 0.999, step: 0.001 },
    { key: 'epsilon_start', label: 'Epsilon Start', type: 'slider', min: 0.5, max: 1.0, step: 0.1 },
    { key: 'epsilon_end', label: 'Epsilon End', type: 'slider', min: 0.01, max: 0.2, step: 0.01 },
    { key: 'batch_size', label: 'Batch Size', type: 'select', options: [
      { value: 16, label: '16' },
      { value: 32, label: '32' },
      { value: 64, label: '64' },
      { value: 128, label: '128' },
    ]},
    { key: 'buffer_size', label: 'Buffer Size', type: 'number', min: 1000, max: 100000 },
  ],
  PPO: [
    { key: 'learning_rate', label: 'Learning Rate', type: 'slider', min: 0.00001, max: 0.001, step: 0.00001, description: 'Actor and critic learning rate' },
    { key: 'gamma', label: 'Discount Factor (γ)', type: 'slider', min: 0.9, max: 0.999, step: 0.001 },
    { key: 'gae_lambda', label: 'GAE Lambda', type: 'slider', min: 0.9, max: 1.0, step: 0.01, description: 'Generalized Advantage Estimation' },
    { key: 'clip_epsilon', label: 'Clip Epsilon', type: 'slider', min: 0.1, max: 0.3, step: 0.05, description: 'PPO clipping parameter', warning: 'Values outside 0.1-0.3 may destabilize training' },
    { key: 'n_epochs', label: 'Update Epochs', type: 'select', options: [
      { value: 3, label: '3' },
      { value: 5, label: '5' },
      { value: 10, label: '10' },
      { value: 20, label: '20' },
    ]},
    { key: 'batch_size', label: 'Batch Size', type: 'select', options: [
      { value: 32, label: '32' },
      { value: 64, label: '64' },
      { value: 128, label: '128' },
      { value: 256, label: '256' },
    ]},
  ],
  A2C: [
    { key: 'learning_rate', label: 'Learning Rate', type: 'slider', min: 0.0001, max: 0.01, step: 0.0001 },
    { key: 'gamma', label: 'Discount Factor (γ)', type: 'slider', min: 0.9, max: 0.999, step: 0.001 },
    { key: 'gae_lambda', label: 'GAE Lambda', type: 'slider', min: 0.9, max: 1.0, step: 0.01 },
    { key: 'n_steps', label: 'N-Steps', type: 'select', options: [
      { value: 5, label: '5' },
      { value: 10, label: '10' },
      { value: 20, label: '20' },
      { value: 50, label: '50' },
    ], description: 'Steps before update' },
    { key: 'entropy_coef', label: 'Entropy Coefficient', type: 'slider', min: 0.001, max: 0.1, step: 0.001, description: 'Encourages exploration' },
  ],
};

const DEFAULT_CONFIGS: Record<string, Record<string, number | string>> = {
  DQN: { learning_rate: 0.001, gamma: 0.99, epsilon_start: 1.0, epsilon_end: 0.1, batch_size: 32, buffer_size: 10000 },
  DoubleDQN: { learning_rate: 0.001, gamma: 0.99, epsilon_start: 1.0, epsilon_end: 0.1, batch_size: 32, buffer_size: 10000 },
  PPO: { learning_rate: 0.0003, gamma: 0.99, gae_lambda: 0.95, clip_epsilon: 0.2, n_epochs: 10, batch_size: 64 },
  A2C: { learning_rate: 0.0007, gamma: 0.99, gae_lambda: 0.95, n_steps: 5, entropy_coef: 0.01 },
};

export function HyperparameterEditor({
  algorithm,
  config,
  onChange,
  disabled = false,
}: HyperparameterEditorProps) {
  const [localConfig, setLocalConfig] = useState(config);
  const [hasChanges, setHasChanges] = useState(false);

  const params = PARAMETER_CONFIGS[algorithm] || [];

  useEffect(() => {
    setLocalConfig(config);
    setHasChanges(false);
  }, [config, algorithm]);

  const handleChange = (key: string, value: number | string) => {
    const newConfig = { ...localConfig, [key]: value };
    setLocalConfig(newConfig);
    setHasChanges(JSON.stringify(newConfig) !== JSON.stringify(config));
  };

  const handleReset = () => {
    const defaults = DEFAULT_CONFIGS[algorithm] || {};
    setLocalConfig(defaults);
    onChange(defaults);
    setHasChanges(false);
  };

  const handleSave = () => {
    onChange(localConfig);
    setHasChanges(false);
  };

  const formatValue = (value: number | string, param: ParameterConfig): string => {
    if (typeof value === 'string') return value;
    if (param.step && param.step < 0.01) {
      return value.toExponential(1);
    }
    return value.toString();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings size={16} className="text-[--color-cyber-blue]" />
          <span className="text-sm font-medium text-white">Hyperparameters</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            disabled={disabled}
            className="p-1.5 text-white/40 hover:text-white disabled:opacity-50 transition-colors"
            title="Reset to defaults"
          >
            <RotateCcw size={14} />
          </button>
          {hasChanges && (
            <button
              onClick={handleSave}
              disabled={disabled}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-[--color-cyber-blue] text-black rounded hover:bg-[--color-cyber-blue]/80 disabled:opacity-50 transition-colors"
            >
              <Save size={12} />
              Apply
            </button>
          )}
        </div>
      </div>

      {/* Parameters */}
      <div className="space-y-4">
        {params.map((param) => {
          const value = localConfig[param.key] ?? DEFAULT_CONFIGS[algorithm]?.[param.key] ?? 0;

          return (
            <div key={param.key} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs text-white/70">{param.label}</label>
                <span className="text-xs font-mono text-[--color-cyber-blue]">
                  {formatValue(value, param)}
                </span>
              </div>

              {param.type === 'slider' && (
                <input
                  type="range"
                  min={param.min}
                  max={param.max}
                  step={param.step}
                  value={Number(value)}
                  onChange={(e) => handleChange(param.key, parseFloat(e.target.value))}
                  disabled={disabled}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:w-3
                    [&::-webkit-slider-thumb]:h-3
                    [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:bg-[--color-cyber-blue]
                    disabled:opacity-50 disabled:cursor-not-allowed"
                />
              )}

              {param.type === 'number' && (
                <input
                  type="number"
                  min={param.min}
                  max={param.max}
                  value={Number(value)}
                  onChange={(e) => handleChange(param.key, parseFloat(e.target.value))}
                  disabled={disabled}
                  className="w-full px-2 py-1 text-xs bg-[--color-space-800] border border-white/10 rounded
                    text-white font-mono focus:border-[--color-cyber-blue] focus:outline-none
                    disabled:opacity-50 disabled:cursor-not-allowed"
                />
              )}

              {param.type === 'select' && param.options && (
                <select
                  value={value}
                  onChange={(e) => {
                    const opt = param.options?.find((o) => o.value.toString() === e.target.value);
                    handleChange(param.key, opt?.value ?? e.target.value);
                  }}
                  disabled={disabled}
                  className="w-full px-2 py-1 text-xs bg-[--color-space-800] border border-white/10 rounded
                    text-white font-mono focus:border-[--color-cyber-blue] focus:outline-none
                    disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {param.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              )}

              {param.description && (
                <p className="text-[10px] text-white/40">{param.description}</p>
              )}

              {param.warning && (
                <div className="flex items-center gap-1 text-[10px] text-[--color-cyber-orange]">
                  <AlertTriangle size={10} />
                  {param.warning}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {params.length === 0 && (
        <p className="text-xs text-white/40 text-center py-4">
          No parameters available for {algorithm}
        </p>
      )}
    </div>
  );
}
