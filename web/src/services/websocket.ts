/**
 * WebSocket Service
 *
 * Handles real-time communication with the training backend.
 */

type MessageHandler = (data: unknown) => void;
type StatusHandler = (connected: boolean) => void;

interface WebSocketMessage {
  type: string;
  payload: unknown;
  timestamp: number;
}

export class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private messageHandlers: Map<string, MessageHandler[]> = new Map();
  private statusHandlers: StatusHandler[] = [];
  private isConnecting = false;

  constructor(url: string = 'ws://localhost:8000/ws/training') {
    this.url = url;
  }

  connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    if (this.isConnecting) {
      return Promise.reject(new Error('Connection already in progress'));
    }

    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.notifyStatusHandlers(true);
          resolve();
        };

        this.ws.onclose = () => {
          this.isConnecting = false;
          this.notifyStatusHandlers(false);
          this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
          this.isConnecting = false;
          console.error('WebSocket error:', error);
          reject(error);
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect().catch((error) => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }

  private handleMessage(message: WebSocketMessage): void {
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      handlers.forEach((handler) => handler(message.payload));
    }

    // Also notify wildcard handlers
    const wildcardHandlers = this.messageHandlers.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach((handler) => handler(message));
    }
  }

  on(type: string, handler: MessageHandler): () => void {
    const handlers = this.messageHandlers.get(type) || [];
    handlers.push(handler);
    this.messageHandlers.set(type, handlers);

    // Return unsubscribe function
    return () => {
      const currentHandlers = this.messageHandlers.get(type) || [];
      this.messageHandlers.set(
        type,
        currentHandlers.filter((h) => h !== handler)
      );
    };
  }

  onStatusChange(handler: StatusHandler): () => void {
    this.statusHandlers.push(handler);
    return () => {
      this.statusHandlers = this.statusHandlers.filter((h) => h !== handler);
    };
  }

  private notifyStatusHandlers(connected: boolean): void {
    this.statusHandlers.forEach((handler) => handler(connected));
  }

  send(type: string, payload: unknown): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket is not connected');
      return;
    }

    const message: WebSocketMessage = {
      type,
      payload,
      timestamp: Date.now(),
    };

    this.ws.send(JSON.stringify(message));
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Singleton instance
export const websocketService = new WebSocketService();

// Message types
export const WS_MESSAGE_TYPES = {
  // Training events
  TRAINING_STARTED: 'training_started',
  TRAINING_STOPPED: 'training_stopped',
  TRAINING_PAUSED: 'training_paused',
  TRAINING_RESUMED: 'training_resumed',

  // Step events
  STEP_COMPLETED: 'step_completed',
  EPISODE_COMPLETED: 'episode_completed',

  // State updates
  STATE_UPDATE: 'state_update',
  METRICS_UPDATE: 'metrics_update',
  REWARD_UPDATE: 'reward_update',

  // Commands (client -> server)
  START_TRAINING: 'start_training',
  STOP_TRAINING: 'stop_training',
  PAUSE_TRAINING: 'pause_training',
  RESUME_TRAINING: 'resume_training',
  UPDATE_CONFIG: 'update_config',
  UPDATE_REWARD_WEIGHTS: 'update_reward_weights',
} as const;
