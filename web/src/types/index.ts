export interface Vehicle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  isEgo: boolean;
}

export interface Decision {
  id: number;
  step: number;
  action: string;
  reward: number;
  timestamp: number;
}

export interface RewardComponent {
  name: string;
  value: number;
  explanation: string;
}

export interface ActionProb {
  action: string;
  probability: number;
  isChosen: boolean;
}

export interface SimulationState {
  episode: number;
  step: number;
  vehicles: Vehicle[];
  decisions: Decision[];
  rewardComponents: RewardComponent[];
  actionProbabilities: ActionProb[];
  totalReward: number;
  riskLevel: number;
  isLive: boolean;
  currentAction: string;
  currentSpeed: number;
}

export interface WebSocketMessage {
  type: 'state_update' | 'episode_start' | 'episode_end' | 'connection';
  data: Partial<SimulationState>;
}
