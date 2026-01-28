/**
 * Training API Hook
 *
 * React hook for interacting with the training API endpoints.
 */

import { useState, useCallback } from 'react';

const API_BASE = 'http://localhost:8000/api/v1';

interface TrainingConfig {
  name: string;
  description?: string;
  algorithm: 'DQN' | 'DoubleDQN' | 'PPO' | 'A2C';
  hyperparameters?: Record<string, unknown>;
  reward_mode: 'sliders' | 'code';
  reward_config?: Record<string, number>;
  reward_code?: string;
  total_episodes: number;
  max_steps_per_episode?: number;
  environment?: string;
}

interface TrainingRun {
  id: number;
  uuid: string;
  name: string;
  description: string | null;
  status: string;
  algorithm: string;
  hyperparameters: Record<string, unknown>;
  reward_mode: string;
  reward_config: Record<string, number>;
  total_episodes: number;
  completed_episodes: number;
  avg_reward: number | null;
  success_rate: number | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

interface RewardPreset {
  id: number;
  uuid: string;
  name: string;
  description: string | null;
  mode: string;
  config: Record<string, number>;
  code: string | null;
  is_default: boolean;
  is_system: boolean;
  created_at: string;
}

interface AlgorithmConfig {
  id: number;
  algorithm: string;
  name: string;
  description: string | null;
  config: Record<string, unknown>;
  is_default: boolean;
}

interface APIError {
  detail: string;
}

async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error: APIError = await response.json();
    throw new Error(error.detail || 'API request failed');
  }

  return response.json();
}

export function useTrainingAPI() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clear error
  const clearError = useCallback(() => setError(null), []);

  // Create a new training run
  const createRun = useCallback(async (config: TrainingConfig): Promise<TrainingRun | null> => {
    setLoading(true);
    setError(null);
    try {
      const run = await apiRequest<TrainingRun>('/runs', {
        method: 'POST',
        body: JSON.stringify(config),
      });
      return run;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create run');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get training runs
  const getRuns = useCallback(async (
    status?: string,
    algorithm?: string,
    limit = 50
  ): Promise<TrainingRun[]> => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (algorithm) params.append('algorithm', algorithm);
      params.append('limit', String(limit));

      const runs = await apiRequest<TrainingRun[]>(`/runs?${params}`);
      return runs;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch runs');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Get a single run
  const getRun = useCallback(async (runId: number): Promise<TrainingRun | null> => {
    setLoading(true);
    setError(null);
    try {
      const run = await apiRequest<TrainingRun>(`/runs/${runId}`);
      return run;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch run');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete a run
  const deleteRun = useCallback(async (runId: number): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await apiRequest(`/runs/${runId}`, { method: 'DELETE' });
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete run');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Training controls
  const startTraining = useCallback(async (runId: number): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await apiRequest(`/runs/${runId}/start`, { method: 'POST' });
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start training');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const pauseTraining = useCallback(async (runId: number): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await apiRequest(`/runs/${runId}/pause`, { method: 'POST' });
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause training');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const resumeTraining = useCallback(async (runId: number): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await apiRequest(`/runs/${runId}/resume`, { method: 'POST' });
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume training');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const stopTraining = useCallback(async (runId: number): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await apiRequest(`/runs/${runId}/stop`, { method: 'POST' });
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop training');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get reward history for plotting
  const getRewardHistory = useCallback(async (
    runId: number
  ): Promise<{ episode: number; reward: number; success: boolean }[]> => {
    try {
      return await apiRequest(`/runs/${runId}/reward-history`);
    } catch {
      return [];
    }
  }, []);

  // Get risk history
  const getRiskHistory = useCallback(async (
    runId: number
  ): Promise<{ episode: number; avg_risk: number; max_risk: number }[]> => {
    try {
      return await apiRequest(`/runs/${runId}/risk-history`);
    } catch {
      return [];
    }
  }, []);

  // Reward presets
  const getRewardPresets = useCallback(async (): Promise<RewardPreset[]> => {
    try {
      return await apiRequest<RewardPreset[]>('/reward-presets');
    } catch {
      return [];
    }
  }, []);

  const createRewardPreset = useCallback(async (
    preset: Omit<RewardPreset, 'id' | 'uuid' | 'created_at' | 'is_default' | 'is_system'>
  ): Promise<RewardPreset | null> => {
    setLoading(true);
    setError(null);
    try {
      return await apiRequest<RewardPreset>('/reward-presets', {
        method: 'POST',
        body: JSON.stringify(preset),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create preset');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Algorithm configs
  const getAlgorithmConfigs = useCallback(async (
    algorithm?: string
  ): Promise<AlgorithmConfig[]> => {
    try {
      const params = algorithm ? `?algorithm=${algorithm}` : '';
      return await apiRequest<AlgorithmConfig[]>(`/algorithms${params}`);
    } catch {
      return [];
    }
  }, []);

  const getDefaultConfig = useCallback(async (
    algorithm: string
  ): Promise<AlgorithmConfig | null> => {
    try {
      return await apiRequest<AlgorithmConfig>(`/algorithms/${algorithm}/default`);
    } catch {
      return null;
    }
  }, []);

  // Compare runs
  const compareRuns = useCallback(async (runIds: number[]): Promise<{
    runs: TrainingRun[];
    reward_histories: Record<number, { episode: number; reward: number }[]>;
    risk_histories: Record<number, { episode: number; avg_risk: number; max_risk: number }[]>;
  } | null> => {
    setLoading(true);
    setError(null);
    try {
      return await apiRequest('/compare', {
        method: 'POST',
        body: JSON.stringify({ run_ids: runIds }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compare runs');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    clearError,
    // Runs
    createRun,
    getRuns,
    getRun,
    deleteRun,
    // Training controls
    startTraining,
    pauseTraining,
    resumeTraining,
    stopTraining,
    // Data
    getRewardHistory,
    getRiskHistory,
    // Presets & configs
    getRewardPresets,
    createRewardPreset,
    getAlgorithmConfigs,
    getDefaultConfig,
    // Comparison
    compareRuns,
  };
}

export type { TrainingConfig, TrainingRun, RewardPreset, AlgorithmConfig };
