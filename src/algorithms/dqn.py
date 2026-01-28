"""
Deep Q-Network (DQN) Agent

Standard DQN with experience replay and target network.
"""

from typing import Dict, Any, Optional
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim

from .base import BaseAgent, QNetwork, ReplayBuffer


class DQNAgent(BaseAgent):
    """
    Deep Q-Network Agent.

    Features:
    - Experience replay buffer
    - Target network for stable learning
    - Epsilon-greedy exploration
    """

    def __init__(
        self,
        state_dim: int,
        action_dim: int,
        config: Dict[str, Any],
        device: Optional[torch.device] = None,
    ):
        super().__init__(state_dim, action_dim, config, device)

        # DQN-specific hyperparameters
        self.epsilon = config.get('epsilon_start', 1.0)
        self.epsilon_end = config.get('epsilon_end', 0.1)
        self.epsilon_decay = config.get('epsilon_decay', 0.995)
        self.batch_size = config.get('batch_size', 32)
        self.buffer_size = config.get('buffer_size', 10000)
        self.target_update_freq = config.get('target_update_freq', 100)

        # Networks
        hidden_dims = config.get('hidden_dims', [128, 128])
        self.q_network = QNetwork(state_dim, action_dim, hidden_dims).to(self.device)
        self.target_network = QNetwork(state_dim, action_dim, hidden_dims).to(self.device)
        self.target_network.load_state_dict(self.q_network.state_dict())
        self.target_network.eval()

        # Optimizer
        self.optimizer = optim.Adam(
            self.q_network.parameters(),
            lr=self.learning_rate,
        )

        # Replay buffer
        self.replay_buffer = ReplayBuffer(self.buffer_size)

        # Loss function
        self.loss_fn = nn.MSELoss()

    def select_action(self, state: np.ndarray, explore: bool = True) -> int:
        """Select action using epsilon-greedy policy."""
        if explore and np.random.random() < self.epsilon:
            return np.random.randint(self.action_dim)

        with torch.no_grad():
            state_tensor = torch.FloatTensor(state).unsqueeze(0).to(self.device)
            q_values = self.q_network(state_tensor)
            return q_values.argmax(dim=1).item()

    def get_action_probs(self, state: np.ndarray) -> np.ndarray:
        """Get Q-values for all actions (for visualization)."""
        with torch.no_grad():
            state_tensor = torch.FloatTensor(state).unsqueeze(0).to(self.device)
            q_values = self.q_network(state_tensor)
            return q_values.cpu().numpy().flatten()

    def get_q_values(self, state: np.ndarray) -> Dict[str, float]:
        """Get Q-values as a dictionary."""
        q_values = self.get_action_probs(state)
        return {f'action_{i}': float(q) for i, q in enumerate(q_values)}

    def store_transition(
        self,
        state: np.ndarray,
        action: int,
        reward: float,
        next_state: np.ndarray,
        done: bool,
    ):
        """Store a transition in the replay buffer."""
        self.replay_buffer.push(state, action, reward, next_state, done)

    def update(self) -> Dict[str, float]:
        """Perform a learning update using sampled transitions."""
        if len(self.replay_buffer) < self.batch_size:
            return {'loss': 0.0}

        # Sample batch
        states, actions, rewards, next_states, dones = \
            self.replay_buffer.sample_tensors(self.batch_size, self.device)

        # Compute current Q-values
        current_q = self.q_network(states).gather(1, actions.unsqueeze(1)).squeeze(1)

        # Compute target Q-values
        with torch.no_grad():
            next_q = self.target_network(next_states).max(dim=1)[0]
            target_q = rewards + self.gamma * next_q * (1 - dones)

        # Compute loss and update
        loss = self.loss_fn(current_q, target_q)

        self.optimizer.zero_grad()
        loss.backward()
        torch.nn.utils.clip_grad_norm_(self.q_network.parameters(), 1.0)
        self.optimizer.step()

        # Update target network
        self.training_step += 1
        if self.training_step % self.target_update_freq == 0:
            self.target_network.load_state_dict(self.q_network.state_dict())

        return {
            'loss': loss.item(),
            'q_mean': current_q.mean().item(),
            'q_max': current_q.max().item(),
        }

    def decay_epsilon(self):
        """Decay exploration rate."""
        self.epsilon = max(self.epsilon_end, self.epsilon * self.epsilon_decay)

    def end_episode(self):
        """Called at the end of each episode."""
        self.episode_count += 1
        self.decay_epsilon()

    def save(self, path: str):
        """Save model weights."""
        torch.save({
            'q_network': self.q_network.state_dict(),
            'target_network': self.target_network.state_dict(),
            'optimizer': self.optimizer.state_dict(),
            'epsilon': self.epsilon,
            'training_step': self.training_step,
            'episode_count': self.episode_count,
        }, path)

    def load(self, path: str):
        """Load model weights."""
        checkpoint = torch.load(path, map_location=self.device)
        self.q_network.load_state_dict(checkpoint['q_network'])
        self.target_network.load_state_dict(checkpoint['target_network'])
        self.optimizer.load_state_dict(checkpoint['optimizer'])
        self.epsilon = checkpoint['epsilon']
        self.training_step = checkpoint['training_step']
        self.episode_count = checkpoint['episode_count']

    def get_state_dict(self) -> Dict[str, Any]:
        """Get full state dictionary."""
        return {
            'q_network': self.q_network.state_dict(),
            'target_network': self.target_network.state_dict(),
            'optimizer': self.optimizer.state_dict(),
            'epsilon': self.epsilon,
            'training_step': self.training_step,
            'episode_count': self.episode_count,
        }

    def set_state_dict(self, state_dict: Dict[str, Any]):
        """Set full state dictionary."""
        self.q_network.load_state_dict(state_dict['q_network'])
        self.target_network.load_state_dict(state_dict['target_network'])
        self.optimizer.load_state_dict(state_dict['optimizer'])
        self.epsilon = state_dict['epsilon']
        self.training_step = state_dict['training_step']
        self.episode_count = state_dict['episode_count']

    def get_metrics(self) -> Dict[str, Any]:
        """Get current agent metrics."""
        metrics = super().get_metrics()
        metrics.update({
            'epsilon': self.epsilon,
            'buffer_size': len(self.replay_buffer),
        })
        return metrics
