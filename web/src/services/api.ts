/**
 * API Service
 *
 * REST API client for training management and data retrieval.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

interface TrainingConfig {
  algorithm: string;
  hyperparameters: Record<string, number | string>;
  rewardWeights: Record<string, number>;
  maxEpisodes: number;
  maxSteps: number;
  environment: string;
}

interface TrainingRun {
  id: string;
  name: string;
  algorithm: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  startTime: string;
  endTime?: string;
  episodes: number;
  totalSteps: number;
  bestReward: number;
  avgReward: number;
  config: TrainingConfig;
}

interface Episode {
  id: string;
  runId: string;
  number: number;
  totalReward: number;
  steps: number;
  duration: number;
  collision: boolean;
  success: boolean;
  startTime: string;
}

interface Metrics {
  episodeRewards: number[];
  avgReward: number;
  bestReward: number;
  worstReward: number;
  successRate: number;
  collisionRate: number;
  avgStepsPerEpisode: number;
  learningProgress: number[];
}

interface RewardPreset {
  id: string;
  name: string;
  description: string;
  weights: Record<string, number>;
  code?: string;
  createdAt: string;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `HTTP error ${response.status}`);
  }

  const data = await response.json();
  return { data, success: true };
}

export const api = {
  // Training Management
  training: {
    start: (config: TrainingConfig) =>
      request<TrainingRun>('/training/start', {
        method: 'POST',
        body: JSON.stringify(config),
      }),

    stop: (runId: string) =>
      request<void>(`/training/${runId}/stop`, { method: 'POST' }),

    pause: (runId: string) =>
      request<void>(`/training/${runId}/pause`, { method: 'POST' }),

    resume: (runId: string) =>
      request<void>(`/training/${runId}/resume`, { method: 'POST' }),

    getStatus: (runId: string) =>
      request<TrainingRun>(`/training/${runId}`),

    getAll: () => request<TrainingRun[]>('/training'),

    delete: (runId: string) =>
      request<void>(`/training/${runId}`, { method: 'DELETE' }),
  },

  // Episodes
  episodes: {
    getByRun: (runId: string, limit = 100, offset = 0) =>
      request<Episode[]>(`/training/${runId}/episodes?limit=${limit}&offset=${offset}`),

    get: (episodeId: string) =>
      request<Episode>(`/episodes/${episodeId}`),

    getSteps: (episodeId: string) =>
      request<unknown[]>(`/episodes/${episodeId}/steps`),
  },

  // Metrics
  metrics: {
    getByRun: (runId: string) =>
      request<Metrics>(`/training/${runId}/metrics`),

    getLive: () => request<Metrics>('/metrics/live'),

    compare: (runIds: string[]) =>
      request<Record<string, Metrics>>('/metrics/compare', {
        method: 'POST',
        body: JSON.stringify({ runIds }),
      }),
  },

  // Reward Presets
  presets: {
    getAll: () => request<RewardPreset[]>('/presets'),

    get: (presetId: string) =>
      request<RewardPreset>(`/presets/${presetId}`),

    create: (preset: Omit<RewardPreset, 'id' | 'createdAt'>) =>
      request<RewardPreset>('/presets', {
        method: 'POST',
        body: JSON.stringify(preset),
      }),

    update: (presetId: string, preset: Partial<RewardPreset>) =>
      request<RewardPreset>(`/presets/${presetId}`, {
        method: 'PUT',
        body: JSON.stringify(preset),
      }),

    delete: (presetId: string) =>
      request<void>(`/presets/${presetId}`, { method: 'DELETE' }),
  },

  // Algorithms
  algorithms: {
    getAll: () =>
      request<{ id: string; name: string; description: string; defaultConfig: Record<string, number | string> }[]>(
        '/algorithms'
      ),

    getConfig: (algorithmId: string) =>
      request<Record<string, number | string>>(`/algorithms/${algorithmId}/config`),
  },

  // Environment
  environment: {
    getConfig: () =>
      request<{ lanes: number; maxSpeed: number; vehicleCount: number }>('/environment/config'),

    updateConfig: (config: Record<string, unknown>) =>
      request<void>('/environment/config', {
        method: 'PUT',
        body: JSON.stringify(config),
      }),

    reset: () => request<void>('/environment/reset', { method: 'POST' }),
  },

  // Health check
  health: () => request<{ status: string; version: string }>('/health'),
};

export type { TrainingConfig, TrainingRun, Episode, Metrics, RewardPreset };
