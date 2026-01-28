"""
Navigation Agent for London Streets

DQN-based agent that learns to navigate London streets.
"""

import numpy as np
from typing import Dict, Tuple, List, Optional
from dataclasses import dataclass
from collections import deque
import random


@dataclass
class Experience:
    """Single experience tuple for replay buffer."""
    state: np.ndarray
    action: int
    reward: float
    next_state: np.ndarray
    done: bool


class NavigationAgent:
    """
    DQN Agent for London street navigation.

    Uses a simple neural network approximation for the Q-function
    without requiring deep learning libraries.
    """

    def __init__(
        self,
        state_dim: int = 15,
        n_actions: int = 8,
        learning_rate: float = 0.001,
        gamma: float = 0.99,
        epsilon_start: float = 1.0,
        epsilon_end: float = 0.1,
        epsilon_decay: float = 0.995,
        buffer_size: int = 10000,
        batch_size: int = 32,
    ):
        self.state_dim = state_dim
        self.n_actions = n_actions
        self.learning_rate = learning_rate
        self.gamma = gamma

        self.epsilon = epsilon_start
        self.epsilon_end = epsilon_end
        self.epsilon_decay = epsilon_decay

        self.buffer_size = buffer_size
        self.batch_size = batch_size
        self.replay_buffer = deque(maxlen=buffer_size)

        # Simple linear Q-function: Q(s, a) = s @ W[:, a] + b[a]
        # Using random initialization
        np.random.seed(42)
        self.W = np.random.randn(state_dim, n_actions) * 0.1
        self.b = np.zeros(n_actions)

        # Target network (for stability)
        self.W_target = self.W.copy()
        self.b_target = self.b.copy()

        self.update_counter = 0
        self.target_update_freq = 100

    def get_q_values(self, state: np.ndarray, use_target: bool = False) -> np.ndarray:
        """Compute Q-values for all actions given state."""
        if use_target:
            return state @ self.W_target + self.b_target
        return state @ self.W + self.b

    def select_action(
        self,
        state: np.ndarray,
        available_actions: List[int],
        deterministic: bool = False
    ) -> Tuple[int, Dict[int, float]]:
        """
        Select action using epsilon-greedy policy.

        Returns:
            action: Selected action
            action_probs: Probability distribution over actions
        """
        q_values = self.get_q_values(state)

        # Mask unavailable actions with very negative values
        masked_q = np.full(self.n_actions, -1e9)
        for a in available_actions:
            masked_q[a] = q_values[a]

        # Compute softmax probabilities for available actions
        available_q = [q_values[a] for a in available_actions]
        exp_q = np.exp(available_q - np.max(available_q))  # Subtract max for numerical stability
        probs = exp_q / exp_q.sum()

        action_probs = {a: 0.0 for a in range(self.n_actions)}
        for i, a in enumerate(available_actions):
            action_probs[a] = float(probs[i])

        if deterministic or random.random() > self.epsilon:
            # Greedy action among available actions
            action = available_actions[np.argmax(available_q)]
        else:
            # Random action among available actions
            action = random.choice(available_actions)

        return action, action_probs

    def store_experience(self, experience: Experience):
        """Store experience in replay buffer."""
        self.replay_buffer.append(experience)

    def train_step(self) -> Optional[float]:
        """Perform one training step using experience replay."""
        if len(self.replay_buffer) < self.batch_size:
            return None

        # Sample batch
        batch = random.sample(self.replay_buffer, self.batch_size)

        states = np.array([e.state for e in batch])
        actions = np.array([e.action for e in batch])
        rewards = np.array([e.reward for e in batch])
        next_states = np.array([e.next_state for e in batch])
        dones = np.array([e.done for e in batch])

        # Compute target Q-values
        next_q_values = self.get_q_values(next_states, use_target=True)
        max_next_q = np.max(next_q_values, axis=1)
        targets = rewards + self.gamma * max_next_q * (1 - dones)

        # Compute current Q-values
        current_q = self.get_q_values(states)
        current_q_selected = current_q[np.arange(self.batch_size), actions]

        # Compute loss (MSE)
        td_errors = targets - current_q_selected
        loss = np.mean(td_errors ** 2)

        # Gradient update (simple gradient descent)
        for i in range(self.batch_size):
            gradient = -2 * td_errors[i] / self.batch_size
            self.W[:, actions[i]] -= self.learning_rate * gradient * states[i]
            self.b[actions[i]] -= self.learning_rate * gradient

        # Update target network periodically
        self.update_counter += 1
        if self.update_counter % self.target_update_freq == 0:
            self.W_target = self.W.copy()
            self.b_target = self.b.copy()

        return float(loss)

    def decay_epsilon(self):
        """Decay exploration rate."""
        self.epsilon = max(self.epsilon_end, self.epsilon * self.epsilon_decay)

    def get_stats(self) -> Dict:
        """Get agent statistics."""
        return {
            'epsilon': self.epsilon,
            'buffer_size': len(self.replay_buffer),
            'updates': self.update_counter,
        }


class ProbabilityTracker:
    """
    Tracks action probability evolution over episodes.

    Used for 3D visualization of how the agent's decision-making evolves.
    """

    def __init__(self, n_actions: int = 8):
        self.n_actions = n_actions
        self.history: List[Dict] = []

    def record(
        self,
        episode: int,
        step: int,
        action_probs: Dict[int, float],
        chosen_action: int,
        reward: float,
        node_id: int,
    ):
        """Record a decision point."""
        self.history.append({
            'episode': episode,
            'step': step,
            'actionProbs': {str(k): float(v) for k, v in action_probs.items()},
            'chosenAction': chosen_action,
            'reward': float(reward),
            'nodeId': node_id,
        })

    def get_episode_summary(self, episode: int) -> Dict:
        """Get summary of action probabilities for an episode."""
        episode_data = [h for h in self.history if h['episode'] == episode]

        if not episode_data:
            return {}

        # Average probabilities across steps
        avg_probs = {str(i): 0.0 for i in range(self.n_actions)}
        for h in episode_data:
            for action, prob in h['actionProbs'].items():
                avg_probs[action] += prob

        n = len(episode_data)
        for action in avg_probs:
            avg_probs[action] /= n

        # Total reward
        total_reward = sum(h['reward'] for h in episode_data)

        return {
            'episode': episode,
            'avgProbs': avg_probs,
            'totalReward': total_reward,
            'steps': n,
        }

    def get_evolution_data(self) -> List[Dict]:
        """
        Get data for 3D probability evolution visualization.

        Returns list of episode summaries showing how probabilities evolved.
        """
        episodes = set(h['episode'] for h in self.history)
        return [self.get_episode_summary(ep) for ep in sorted(episodes)]

    def get_full_history(self) -> List[Dict]:
        """Get complete history for detailed analysis."""
        return self.history.copy()

    def clear(self):
        """Clear history."""
        self.history = []
