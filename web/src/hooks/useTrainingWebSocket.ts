/**
 * Training WebSocket Hook
 *
 * Real-time updates during training via WebSocket connection.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface TrainingUpdate {
  type: 'episode_start' | 'step' | 'episode_end' | 'training_complete' | 'error';
  data: {
    run_id: number;
    episode?: number;
    step?: number;
    current_node?: number;
    target_node?: number;
    action?: number;
    action_probs?: Record<string, number>;
    reward?: number;
    total_reward?: number;
    cumulative_reward?: number;
    risk_score?: number;
    entropy?: number;
    epsilon?: number;
    path?: number[];
    success?: boolean;
    metrics?: {
      avg_reward?: number;
      best_reward?: number;
      success_rate?: number;
      avg_steps?: number;
    };
    error?: string;
  };
}

interface TrainingState {
  runId: number | null;
  episode: number;
  step: number;
  currentNode: number | null;
  targetNode: number | null;
  action: number | null;
  actionProbs: Record<string, number>;
  reward: number;
  totalReward: number;
  cumulativeReward: number;
  riskScore: number;
  entropy: number;
  epsilon: number;
  path: number[];
  success: boolean | null;
  avgReward: number;
  bestReward: number;
  successRate: number;
  avgSteps: number;
  isConnected: boolean;
  isTraining: boolean;
  error: string | null;
}

const INITIAL_STATE: TrainingState = {
  runId: null,
  episode: 0,
  step: 0,
  currentNode: null,
  targetNode: null,
  action: null,
  actionProbs: {},
  reward: 0,
  totalReward: 0,
  cumulativeReward: 0,
  riskScore: 0,
  entropy: 0,
  epsilon: 1.0,
  path: [],
  success: null,
  avgReward: 0,
  bestReward: 0,
  successRate: 0,
  avgSteps: 0,
  isConnected: false,
  isTraining: false,
  error: null,
};

export function useTrainingWebSocket(wsUrl: string = 'ws://localhost:8000/api/v1/ws/training') {
  const [state, setState] = useState<TrainingState>(INITIAL_STATE);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const currentRunIdRef = useRef<number | null>(null);

  const connect = useCallback((runId: number) => {
    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    currentRunIdRef.current = runId;

    try {
      const ws = new WebSocket(`${wsUrl}/${runId}`);

      ws.onopen = () => {
        console.log(`Training WebSocket connected for run ${runId}`);
        setState(prev => ({
          ...prev,
          runId,
          isConnected: true,
          isTraining: true,
          error: null,
        }));
      };

      ws.onmessage = (event) => {
        try {
          const update: TrainingUpdate = JSON.parse(event.data);
          handleUpdate(update);
        } catch (err) {
          console.error('Failed to parse training update:', err);
        }
      };

      ws.onclose = () => {
        console.log('Training WebSocket disconnected');
        setState(prev => ({
          ...prev,
          isConnected: false,
        }));

        // Attempt reconnect if still training
        if (currentRunIdRef.current === runId) {
          reconnectTimeoutRef.current = setTimeout(() => {
            if (currentRunIdRef.current === runId) {
              connect(runId);
            }
          }, 3000);
        }
      };

      ws.onerror = (error) => {
        console.error('Training WebSocket error:', error);
        setState(prev => ({
          ...prev,
          error: 'WebSocket connection error',
        }));
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('Failed to connect:', err);
      setState(prev => ({
        ...prev,
        error: 'Failed to establish connection',
      }));
    }
  }, [wsUrl]);

  const handleUpdate = useCallback((update: TrainingUpdate) => {
    const { type, data } = update;

    switch (type) {
      case 'episode_start':
        setState(prev => ({
          ...prev,
          episode: data.episode ?? prev.episode,
          step: 0,
          currentNode: data.current_node ?? null,
          targetNode: data.target_node ?? null,
          path: [],
          totalReward: 0,
          cumulativeReward: 0,
          success: null,
        }));
        break;

      case 'step':
        setState(prev => ({
          ...prev,
          step: data.step ?? prev.step,
          currentNode: data.current_node ?? prev.currentNode,
          action: data.action ?? prev.action,
          actionProbs: data.action_probs ?? prev.actionProbs,
          reward: data.reward ?? prev.reward,
          cumulativeReward: data.cumulative_reward ?? prev.cumulativeReward,
          riskScore: data.risk_score ?? prev.riskScore,
          entropy: data.entropy ?? prev.entropy,
          path: data.path ?? prev.path,
        }));
        break;

      case 'episode_end':
        setState(prev => ({
          ...prev,
          totalReward: data.total_reward ?? prev.totalReward,
          success: data.success ?? prev.success,
          epsilon: data.epsilon ?? prev.epsilon,
          avgReward: data.metrics?.avg_reward ?? prev.avgReward,
          bestReward: data.metrics?.best_reward ?? prev.bestReward,
          successRate: data.metrics?.success_rate ?? prev.successRate,
          avgSteps: data.metrics?.avg_steps ?? prev.avgSteps,
        }));
        break;

      case 'training_complete':
        setState(prev => ({
          ...prev,
          isTraining: false,
          avgReward: data.metrics?.avg_reward ?? prev.avgReward,
          bestReward: data.metrics?.best_reward ?? prev.bestReward,
          successRate: data.metrics?.success_rate ?? prev.successRate,
        }));
        break;

      case 'error':
        setState(prev => ({
          ...prev,
          error: data.error ?? 'Unknown error',
          isTraining: false,
        }));
        break;
    }
  }, []);

  const disconnect = useCallback(() => {
    currentRunIdRef.current = null;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setState(prev => ({
      ...prev,
      isConnected: false,
      isTraining: false,
    }));
  }, []);

  const sendCommand = useCallback((command: string, data?: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: command, ...(data || {}) }));
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    state,
    connect,
    disconnect,
    sendCommand,
    reset: () => setState(INITIAL_STATE),
  };
}

export type { TrainingState, TrainingUpdate };
