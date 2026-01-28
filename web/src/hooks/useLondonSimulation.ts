import { useState, useEffect, useCallback, useRef } from 'react';

interface Intersection {
  id: number;
  x: number;
  y: number;
  neighbors: number[];
  streetNames: string[];
}

interface Road {
  startId: number;
  endId: number;
  length: number;
  name: string;
}

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface MapData {
  intersections: Intersection[];
  roads: Road[];
  bounds: Bounds;
}

interface EpisodeSummary {
  episode: number;
  avgProbs: Record<string, number>;
  totalReward: number;
  steps: number;
}

interface StepHistoryItem {
  episode: number;
  step: number;
  actionProbs: Record<string, number>;
  chosenAction: number;
  reward: number;
  nodeId: number;
}

interface LondonSimulationState {
  episode: number;
  step: number;
  currentNode: number | null;
  targetNode: number | null;
  pathTaken: number[];
  optimalPath: number[];
  currentAction: number | null;
  actionProbs: Record<string, number>;
  reward: number;
  totalReward: number;
  distanceTraveled: number;
  currentSpeed: number;
  agentStats: {
    epsilon?: number;
    buffer_size?: number;
    updates?: number;
  };
  probabilityEvolution: EpisodeSummary[];
  stepHistory: StepHistoryItem[];
  isLive: boolean;
}

interface WebSocketMessage {
  type: 'connection' | 'state_update' | 'ping';
  data?: {
    message?: string;
    mapData?: MapData;
  } & Partial<LondonSimulationState>;
}

const INITIAL_STATE: LondonSimulationState = {
  episode: 0,
  step: 0,
  currentNode: null,
  targetNode: null,
  pathTaken: [],
  optimalPath: [],
  currentAction: null,
  actionProbs: {},
  reward: 0,
  totalReward: 0,
  distanceTraveled: 0,
  currentSpeed: 0,
  agentStats: {},
  probabilityEvolution: [],
  stepHistory: [],
  isLive: false,
};

export function useLondonSimulation(wsUrl: string = 'ws://localhost:8001/ws/london') {
  const [state, setState] = useState<LondonSimulationState>(INITIAL_STATE);
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('London WebSocket connected');
        setIsConnected(true);
        setState(prev => ({ ...prev, isLive: true }));
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          switch (message.type) {
            case 'connection':
              if (message.data?.mapData) {
                setMapData(message.data.mapData);
              }
              break;

            case 'state_update':
              if (message.data) {
                setState(prev => ({
                  ...prev,
                  episode: message.data?.episode ?? prev.episode,
                  step: message.data?.step ?? prev.step,
                  currentNode: message.data?.currentNode ?? prev.currentNode,
                  targetNode: message.data?.targetNode ?? prev.targetNode,
                  pathTaken: message.data?.pathTaken ?? prev.pathTaken,
                  optimalPath: message.data?.optimalPath ?? prev.optimalPath,
                  currentAction: message.data?.currentAction ?? prev.currentAction,
                  actionProbs: message.data?.actionProbs ?? prev.actionProbs,
                  reward: message.data?.reward ?? prev.reward,
                  totalReward: message.data?.totalReward ?? prev.totalReward,
                  distanceTraveled: message.data?.distanceTraveled ?? prev.distanceTraveled,
                  currentSpeed: message.data?.currentSpeed ?? prev.currentSpeed,
                  agentStats: message.data?.agentStats ?? prev.agentStats,
                  probabilityEvolution: message.data?.probabilityEvolution ?? prev.probabilityEvolution,
                  stepHistory: message.data?.stepHistory ?? prev.stepHistory,
                  isLive: true,
                }));
              }
              break;

            case 'ping':
              // Keep-alive ping, no action needed
              break;
          }
        } catch (err) {
          console.error('Failed to parse London message:', err);
        }
      };

      ws.onclose = () => {
        console.log('London WebSocket disconnected');
        setIsConnected(false);
        setState(prev => ({ ...prev, isLive: false }));

        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting to reconnect to London server...');
          connect();
        }, 3000);
      };

      ws.onerror = (error) => {
        console.error('London WebSocket error:', error);
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('Failed to connect to London server:', err);
    }
  }, [wsUrl]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const setDestination = useCallback((start: number, end: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        command: 'set_destination',
        start,
        end,
      }));
    }
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    state,
    mapData,
    isConnected,
    setDestination,
    reconnect: connect,
  };
}
