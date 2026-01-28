"""
Training Engine

Orchestrates the training process, connecting environments, agents, and database.
"""

import asyncio
import time
from typing import Dict, Any, Optional, Callable, List
from dataclasses import dataclass, field
from datetime import datetime
import numpy as np

from src.algorithms import create_agent, DQNAgent, DoubleDQNAgent, PPOAgent, A2CAgent
from src.algorithms.base import BaseAgent
from src.london.environment import LondonNavigationEnv
from src.london.map_data import LondonMapData


@dataclass
class TrainingConfig:
    """Configuration for a training run."""
    run_id: int
    algorithm: str
    hyperparameters: Dict[str, Any]
    reward_mode: str
    reward_config: Dict[str, float]
    reward_code: Optional[str]
    total_episodes: int
    max_steps_per_episode: int
    environment: str = 'london'
    checkpoint_interval: int = 25


@dataclass
class EpisodeResult:
    """Result of a single episode."""
    episode_num: int
    start_node: int
    end_node: int
    path: List[int]
    optimal_path: List[int]
    total_reward: float
    steps: int
    success: bool
    path_length: float
    optimal_length: float
    efficiency: float
    avg_risk_score: float
    max_risk_score: float
    final_epsilon: Optional[float]
    duration_ms: int


@dataclass
class StepData:
    """Data from a single step."""
    step_num: int
    node_id: int
    action: int
    action_name: str
    action_probs: Dict[str, float]
    q_values: Optional[Dict[str, float]]
    reward: float
    cumulative_reward: float
    reward_breakdown: Optional[Dict[str, float]]
    risk_score: float
    entropy: float
    distance_to_goal: float


@dataclass
class TrainingState:
    """Current state of training."""
    status: str = 'idle'  # idle, running, paused, completed, failed
    current_episode: int = 0
    current_step: int = 0
    total_reward: float = 0
    avg_reward: float = 0
    best_reward: float = float('-inf')
    success_rate: float = 0
    avg_steps: float = 0
    episodes_completed: int = 0
    successful_episodes: int = 0
    start_time: Optional[float] = None
    elapsed_time: float = 0
    error: Optional[str] = None


class TrainingEngine:
    """
    Main training engine that orchestrates the learning process.

    Features:
    - Async training loop with pause/resume
    - Real-time callbacks for UI updates
    - Checkpoint saving
    - Multiple algorithm support
    """

    def __init__(
        self,
        config: TrainingConfig,
        on_step: Optional[Callable[[StepData], None]] = None,
        on_episode_start: Optional[Callable[[int, int, int], None]] = None,
        on_episode_end: Optional[Callable[[EpisodeResult], None]] = None,
        on_training_complete: Optional[Callable[[TrainingState], None]] = None,
    ):
        self.config = config
        self.on_step = on_step
        self.on_episode_start = on_episode_start
        self.on_episode_end = on_episode_end
        self.on_training_complete = on_training_complete

        self.state = TrainingState()
        self.agent: Optional[BaseAgent] = None
        self.env: Optional[LondonNavigationEnv] = None
        self.map_data: Optional[LondonMapData] = None

        self._pause_event = asyncio.Event()
        self._pause_event.set()  # Not paused initially
        self._stop_requested = False

        # Episode tracking
        self.episode_rewards: List[float] = []
        self.episode_steps: List[int] = []
        self.episode_successes: List[bool] = []

    async def initialize(self):
        """Initialize the environment and agent."""
        # Load map data
        self.map_data = LondonMapData()
        self.map_data.load_or_download()

        # Create environment
        self.env = LondonNavigationEnv(
            map_data=self.map_data,
            max_steps=self.config.max_steps_per_episode,
        )

        # Apply custom reward config
        if self.config.reward_mode == 'sliders':
            self.env.set_reward_config(self.config.reward_config)

        # Get state and action dimensions
        obs, _ = self.env.reset()
        state_dim = len(obs)
        action_dim = self.env.action_space.n

        # Create agent
        self.agent = create_agent(
            algorithm=self.config.algorithm,
            state_dim=state_dim,
            action_dim=action_dim,
            config=self.config.hyperparameters,
        )

        self.state.status = 'initialized'

    async def run(self):
        """Run the full training loop."""
        if self.agent is None or self.env is None:
            await self.initialize()

        self.state.status = 'running'
        self.state.start_time = time.time()
        self._stop_requested = False

        try:
            for episode in range(self.config.total_episodes):
                # Check for stop request
                if self._stop_requested:
                    self.state.status = 'cancelled'
                    break

                # Wait if paused
                await self._pause_event.wait()

                # Run episode
                result = await self._run_episode(episode)

                # Update tracking
                self.episode_rewards.append(result.total_reward)
                self.episode_steps.append(result.steps)
                self.episode_successes.append(result.success)

                # Update state
                self.state.episodes_completed = episode + 1
                self.state.current_episode = episode + 1
                self.state.total_reward = sum(self.episode_rewards)
                self.state.avg_reward = np.mean(self.episode_rewards)
                self.state.best_reward = max(self.state.best_reward, result.total_reward)
                self.state.successful_episodes += int(result.success)
                self.state.success_rate = self.state.successful_episodes / (episode + 1)
                self.state.avg_steps = np.mean(self.episode_steps)
                self.state.elapsed_time = time.time() - self.state.start_time

                # Callback
                if self.on_episode_end:
                    self.on_episode_end(result)

                # End episode for agent (epsilon decay, etc.)
                if hasattr(self.agent, 'end_episode'):
                    self.agent.end_episode()

            # Training complete
            if not self._stop_requested:
                self.state.status = 'completed'

            if self.on_training_complete:
                self.on_training_complete(self.state)

        except Exception as e:
            self.state.status = 'failed'
            self.state.error = str(e)
            raise

        return self.state

    async def _run_episode(self, episode_num: int) -> EpisodeResult:
        """Run a single episode."""
        start_time = time.time()

        obs, info = self.env.reset()
        start_node = info.get('current_node', 0)
        end_node = info.get('goal_node', 0)
        optimal_path = info.get('optimal_path', [])

        if self.on_episode_start:
            self.on_episode_start(episode_num, start_node, end_node)

        path = [start_node]
        total_reward = 0
        cumulative_reward = 0
        risk_scores = []
        step_data_list: List[StepData] = []

        for step in range(self.config.max_steps_per_episode):
            self.state.current_step = step

            # Wait if paused
            await self._pause_event.wait()
            if self._stop_requested:
                break

            # Get action from agent
            if isinstance(self.agent, (PPOAgent, A2CAgent)):
                action, log_prob, value = self.agent.select_action_with_info(obs)
            else:
                action = self.agent.select_action(obs, explore=True)

            # Get action probabilities for visualization
            action_probs = self.agent.get_action_probs(obs)
            action_probs_dict = {
                self.env.ACTION_NAMES[i]: float(p)
                for i, p in enumerate(action_probs)
            }

            # Get Q-values if available
            q_values = None
            if hasattr(self.agent, 'get_q_values'):
                q_values = self.agent.get_q_values(obs)

            # Take step in environment
            next_obs, reward, terminated, truncated, info = self.env.step(action)
            done = terminated or truncated

            # Calculate risk and entropy
            entropy = -sum(p * np.log(p + 1e-10) for p in action_probs if p > 0)
            max_entropy = np.log(len(action_probs))
            normalized_entropy = entropy / max_entropy if max_entropy > 0 else 0
            risk_score = normalized_entropy  # Simple risk metric based on uncertainty

            risk_scores.append(risk_score)
            cumulative_reward += reward
            total_reward += reward

            # Create step data
            step_data = StepData(
                step_num=step,
                node_id=info.get('current_node', 0),
                action=action,
                action_name=self.env.ACTION_NAMES[action],
                action_probs=action_probs_dict,
                q_values=q_values,
                reward=float(reward),
                cumulative_reward=float(cumulative_reward),
                reward_breakdown=info.get('reward_breakdown'),
                risk_score=float(risk_score),
                entropy=float(normalized_entropy),
                distance_to_goal=float(info.get('distance_to_goal', 0)),
            )
            step_data_list.append(step_data)

            # Callback
            if self.on_step:
                self.on_step(step_data)

            # Store transition for learning
            if isinstance(self.agent, (DQNAgent, DoubleDQNAgent)):
                self.agent.store_transition(obs, action, reward, next_obs, done)
                # Update agent
                if len(self.agent.replay_buffer) >= self.agent.batch_size:
                    self.agent.update()

            elif isinstance(self.agent, PPOAgent):
                self.agent.store_transition(obs, action, reward, value, log_prob, done)

            elif isinstance(self.agent, A2CAgent):
                self.agent.store_transition(obs, action, reward, value, log_prob, done)
                if self.agent.should_update():
                    next_value = self.agent.get_value(next_obs) if not done else 0
                    self.agent.update(next_value)

            # Update path
            current_node = info.get('current_node', 0)
            if current_node not in path:
                path.append(current_node)

            obs = next_obs

            if done:
                break

            # Small delay to allow UI updates
            await asyncio.sleep(0.001)

        # End of episode updates for policy gradient methods
        if isinstance(self.agent, PPOAgent) and len(self.agent.rollout_buffer) > 0:
            self.agent.update(last_value=0)

        # Calculate episode metrics
        duration_ms = int((time.time() - start_time) * 1000)
        success = info.get('success', False)
        path_length = info.get('path_length', 0)
        optimal_length = info.get('optimal_length', 0)
        efficiency = optimal_length / path_length if path_length > 0 else 0

        # Get epsilon if available
        epsilon = None
        if hasattr(self.agent, 'epsilon'):
            epsilon = self.agent.epsilon

        return EpisodeResult(
            episode_num=episode_num,
            start_node=start_node,
            end_node=end_node,
            path=path,
            optimal_path=optimal_path,
            total_reward=total_reward,
            steps=len(step_data_list),
            success=success,
            path_length=path_length,
            optimal_length=optimal_length,
            efficiency=efficiency,
            avg_risk_score=np.mean(risk_scores) if risk_scores else 0,
            max_risk_score=max(risk_scores) if risk_scores else 0,
            final_epsilon=epsilon,
            duration_ms=duration_ms,
        )

    def pause(self):
        """Pause training."""
        self._pause_event.clear()
        self.state.status = 'paused'

    def resume(self):
        """Resume training."""
        self._pause_event.set()
        self.state.status = 'running'

    def stop(self):
        """Stop training."""
        self._stop_requested = True
        self._pause_event.set()  # Unpause if paused

    def get_checkpoint(self) -> bytes:
        """Get current model weights as bytes."""
        if self.agent:
            return self.agent.get_weights_bytes()
        return b''

    def load_checkpoint(self, weights: bytes):
        """Load model weights from bytes."""
        if self.agent:
            self.agent.load_weights_bytes(weights)

    def get_metrics(self) -> Dict[str, Any]:
        """Get current training metrics."""
        return {
            'status': self.state.status,
            'episode': self.state.current_episode,
            'step': self.state.current_step,
            'total_reward': self.state.total_reward,
            'avg_reward': self.state.avg_reward,
            'best_reward': self.state.best_reward,
            'success_rate': self.state.success_rate,
            'avg_steps': self.state.avg_steps,
            'elapsed_time': self.state.elapsed_time,
            'episodes_completed': self.state.episodes_completed,
        }
