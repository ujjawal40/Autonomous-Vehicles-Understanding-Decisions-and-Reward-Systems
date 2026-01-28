import { useState, useEffect, useCallback, useRef } from 'react';
import type { SimulationState, WebSocketMessage } from '../types';

const INITIAL_STATE: SimulationState = {
  episode: 0,
  step: 0,
  vehicles: [],
  decisions: [],
  rewardComponents: [],
  actionProbabilities: [],
  totalReward: 0,
  riskLevel: 0,
  isLive: false,
  currentAction: 'IDLE',
  currentSpeed: 0,
};

export function useSimulation(wsUrl: string = 'ws://localhost:8000/ws') {
  const [state, setState] = useState<SimulationState>(INITIAL_STATE);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setState(prev => ({ ...prev, isLive: true }));
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          switch (message.type) {
            case 'state_update':
              setState(prev => ({
                ...prev,
                ...message.data,
                decisions: message.data.decisions
                  ? [...prev.decisions, ...message.data.decisions].slice(-50)
                  : prev.decisions,
              }));
              break;

            case 'episode_start':
              setState(prev => ({
                ...prev,
                ...message.data,
                decisions: [],
              }));
              break;

            case 'episode_end':
              setState(prev => ({
                ...prev,
                ...message.data,
              }));
              break;

            case 'connection':
              console.log('Connection acknowledged');
              break;
          }
        } catch (err) {
          console.error('Failed to parse message:', err);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        setState(prev => ({ ...prev, isLive: false }));

        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting to reconnect...');
          connect();
        }, 3000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('Failed to connect:', err);
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

  const sendCommand = useCallback((command: string, data?: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ command, data }));
    }
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    state,
    isConnected,
    sendCommand,
    reconnect: connect,
  };
}
