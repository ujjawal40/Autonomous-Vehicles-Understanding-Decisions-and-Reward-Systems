/**
 * Training Context
 *
 * Global state management for training sessions.
 */

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { websocketService, WS_MESSAGE_TYPES } from '../services';
import type { TrainingRun, Episode, Metrics } from '../services';

// State types
interface TrainingState {
  // Connection
  isConnected: boolean;

  // Current training
  currentRun: TrainingRun | null;
  status: 'idle' | 'running' | 'paused' | 'stopped';

  // Episode data
  currentEpisode: number;
  currentStep: number;
  episodes: Episode[];

  // Metrics
  metrics: Metrics | null;
  realtimeReward: number;
  cumulativeReward: number;

  // Vehicle state
  vehicleState: {
    speed: number;
    position: { x: number; y: number };
    heading: number;
    lane: number;
  } | null;

  // Action data
  actionProbabilities: number[];
  qValues: number[];
  selectedAction: number;

  // History
  rewardHistory: { step: number; reward: number }[];
  trainingRuns: TrainingRun[];

  // UI state
  isLoading: boolean;
  error: string | null;
}

// Action types
type TrainingAction =
  | { type: 'SET_CONNECTED'; payload: boolean }
  | { type: 'SET_CURRENT_RUN'; payload: TrainingRun | null }
  | { type: 'SET_STATUS'; payload: TrainingState['status'] }
  | { type: 'SET_EPISODE'; payload: number }
  | { type: 'SET_STEP'; payload: number }
  | { type: 'ADD_EPISODE'; payload: Episode }
  | { type: 'SET_METRICS'; payload: Metrics }
  | { type: 'SET_REALTIME_REWARD'; payload: number }
  | { type: 'SET_CUMULATIVE_REWARD'; payload: number }
  | { type: 'SET_VEHICLE_STATE'; payload: TrainingState['vehicleState'] }
  | { type: 'SET_ACTION_PROBABILITIES'; payload: number[] }
  | { type: 'SET_Q_VALUES'; payload: number[] }
  | { type: 'SET_SELECTED_ACTION'; payload: number }
  | { type: 'ADD_REWARD_HISTORY'; payload: { step: number; reward: number } }
  | { type: 'RESET_REWARD_HISTORY' }
  | { type: 'SET_TRAINING_RUNS'; payload: TrainingRun[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET' };

// Initial state
const initialState: TrainingState = {
  isConnected: false,
  currentRun: null,
  status: 'idle',
  currentEpisode: 0,
  currentStep: 0,
  episodes: [],
  metrics: null,
  realtimeReward: 0,
  cumulativeReward: 0,
  vehicleState: null,
  actionProbabilities: [0.2, 0.2, 0.2, 0.2, 0.2],
  qValues: [],
  selectedAction: 4,
  rewardHistory: [],
  trainingRuns: [],
  isLoading: false,
  error: null,
};

// Reducer
function trainingReducer(state: TrainingState, action: TrainingAction): TrainingState {
  switch (action.type) {
    case 'SET_CONNECTED':
      return { ...state, isConnected: action.payload };
    case 'SET_CURRENT_RUN':
      return { ...state, currentRun: action.payload };
    case 'SET_STATUS':
      return { ...state, status: action.payload };
    case 'SET_EPISODE':
      return { ...state, currentEpisode: action.payload };
    case 'SET_STEP':
      return { ...state, currentStep: action.payload };
    case 'ADD_EPISODE':
      return { ...state, episodes: [...state.episodes, action.payload] };
    case 'SET_METRICS':
      return { ...state, metrics: action.payload };
    case 'SET_REALTIME_REWARD':
      return { ...state, realtimeReward: action.payload };
    case 'SET_CUMULATIVE_REWARD':
      return { ...state, cumulativeReward: action.payload };
    case 'SET_VEHICLE_STATE':
      return { ...state, vehicleState: action.payload };
    case 'SET_ACTION_PROBABILITIES':
      return { ...state, actionProbabilities: action.payload };
    case 'SET_Q_VALUES':
      return { ...state, qValues: action.payload };
    case 'SET_SELECTED_ACTION':
      return { ...state, selectedAction: action.payload };
    case 'ADD_REWARD_HISTORY':
      return {
        ...state,
        rewardHistory: [...state.rewardHistory.slice(-500), action.payload],
      };
    case 'RESET_REWARD_HISTORY':
      return { ...state, rewardHistory: [] };
    case 'SET_TRAINING_RUNS':
      return { ...state, trainingRuns: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'RESET':
      return {
        ...initialState,
        isConnected: state.isConnected,
        trainingRuns: state.trainingRuns,
      };
    default:
      return state;
  }
}

// Context
interface TrainingContextType {
  state: TrainingState;
  dispatch: React.Dispatch<TrainingAction>;
  connect: () => Promise<void>;
  disconnect: () => void;
  startTraining: (config: unknown) => void;
  stopTraining: () => void;
  pauseTraining: () => void;
  resumeTraining: () => void;
  updateRewardWeights: (weights: Record<string, number>) => void;
}

const TrainingContext = createContext<TrainingContextType | null>(null);

// Provider
interface TrainingProviderProps {
  children: ReactNode;
}

export function TrainingProvider({ children }: TrainingProviderProps) {
  const [state, dispatch] = useReducer(trainingReducer, initialState);

  // Connect to WebSocket
  const connect = useCallback(async () => {
    try {
      await websocketService.connect();
    } catch (error) {
      console.error('Failed to connect:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to connect to server' });
    }
  }, []);

  const disconnect = useCallback(() => {
    websocketService.disconnect();
  }, []);

  // Training commands
  const startTraining = useCallback((config: unknown) => {
    websocketService.send(WS_MESSAGE_TYPES.START_TRAINING, config);
    dispatch({ type: 'SET_STATUS', payload: 'running' });
    dispatch({ type: 'RESET_REWARD_HISTORY' });
  }, []);

  const stopTraining = useCallback(() => {
    websocketService.send(WS_MESSAGE_TYPES.STOP_TRAINING, {});
    dispatch({ type: 'SET_STATUS', payload: 'stopped' });
  }, []);

  const pauseTraining = useCallback(() => {
    websocketService.send(WS_MESSAGE_TYPES.PAUSE_TRAINING, {});
    dispatch({ type: 'SET_STATUS', payload: 'paused' });
  }, []);

  const resumeTraining = useCallback(() => {
    websocketService.send(WS_MESSAGE_TYPES.RESUME_TRAINING, {});
    dispatch({ type: 'SET_STATUS', payload: 'running' });
  }, []);

  const updateRewardWeights = useCallback((weights: Record<string, number>) => {
    websocketService.send(WS_MESSAGE_TYPES.UPDATE_REWARD_WEIGHTS, weights);
  }, []);

  // Set up WebSocket listeners
  useEffect(() => {
    const unsubStatus = websocketService.onStatusChange((connected) => {
      dispatch({ type: 'SET_CONNECTED', payload: connected });
    });

    const unsubStep = websocketService.on(WS_MESSAGE_TYPES.STEP_COMPLETED, (data) => {
      const stepData = data as {
        step: number;
        reward: number;
        cumulativeReward: number;
        actionProbabilities?: number[];
        qValues?: number[];
        action: number;
        vehicleState?: TrainingState['vehicleState'];
      };

      dispatch({ type: 'SET_STEP', payload: stepData.step });
      dispatch({ type: 'SET_REALTIME_REWARD', payload: stepData.reward });
      dispatch({ type: 'SET_CUMULATIVE_REWARD', payload: stepData.cumulativeReward });
      dispatch({
        type: 'ADD_REWARD_HISTORY',
        payload: { step: stepData.step, reward: stepData.reward },
      });

      if (stepData.actionProbabilities) {
        dispatch({ type: 'SET_ACTION_PROBABILITIES', payload: stepData.actionProbabilities });
      }
      if (stepData.qValues) {
        dispatch({ type: 'SET_Q_VALUES', payload: stepData.qValues });
      }
      if (stepData.vehicleState) {
        dispatch({ type: 'SET_VEHICLE_STATE', payload: stepData.vehicleState });
      }
      dispatch({ type: 'SET_SELECTED_ACTION', payload: stepData.action });
    });

    const unsubEpisode = websocketService.on(WS_MESSAGE_TYPES.EPISODE_COMPLETED, (data) => {
      const episodeData = data as Episode & { episodeNumber: number };
      dispatch({ type: 'SET_EPISODE', payload: episodeData.episodeNumber });
      dispatch({ type: 'ADD_EPISODE', payload: episodeData });
    });

    const unsubMetrics = websocketService.on(WS_MESSAGE_TYPES.METRICS_UPDATE, (data) => {
      dispatch({ type: 'SET_METRICS', payload: data as Metrics });
    });

    const unsubStopped = websocketService.on(WS_MESSAGE_TYPES.TRAINING_STOPPED, () => {
      dispatch({ type: 'SET_STATUS', payload: 'stopped' });
    });

    return () => {
      unsubStatus();
      unsubStep();
      unsubEpisode();
      unsubMetrics();
      unsubStopped();
    };
  }, []);

  const value: TrainingContextType = {
    state,
    dispatch,
    connect,
    disconnect,
    startTraining,
    stopTraining,
    pauseTraining,
    resumeTraining,
    updateRewardWeights,
  };

  return (
    <TrainingContext.Provider value={value}>{children}</TrainingContext.Provider>
  );
}

// Hook
export function useTraining() {
  const context = useContext(TrainingContext);
  if (!context) {
    throw new Error('useTraining must be used within a TrainingProvider');
  }
  return context;
}
