"""
Proximal Policy Optimization (PPO) Agent

State-of-the-art policy gradient method with clipped objective.
"""

from typing import Dict, Any, Optional, List, Tuple
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.distributions import Categorical

from .base import BaseAgent, ActorCriticNetwork


class RolloutBuffer:
    """Buffer for storing trajectories during rollout."""

    def __init__(self):
        self.states: List[np.ndarray] = []
        self.actions: List[int] = []
        self.rewards: List[float] = []
        self.values: List[float] = []
        self.log_probs: List[float] = []
        self.dones: List[bool] = []

    def add(
        self,
        state: np.ndarray,
        action: int,
        reward: float,
        value: float,
        log_prob: float,
        done: bool,
    ):
        """Add a transition to the buffer."""
        self.states.append(state)
        self.actions.append(action)
        self.rewards.append(reward)
        self.values.append(value)
        self.log_probs.append(log_prob)
        self.dones.append(done)

    def clear(self):
        """Clear the buffer."""
        self.states.clear()
        self.actions.clear()
        self.rewards.clear()
        self.values.clear()
        self.log_probs.clear()
        self.dones.clear()

    def __len__(self) -> int:
        return len(self.states)


class PPOAgent(BaseAgent):
    """
    Proximal Policy Optimization Agent.

    Features:
    - Clipped surrogate objective for stable updates
    - Generalized Advantage Estimation (GAE)
    - Entropy bonus for exploration

    Paper: "Proximal Policy Optimization Algorithms" (Schulman et al., 2017)
    """

    def __init__(
        self,
        state_dim: int,
        action_dim: int,
        config: Dict[str, Any],
        device: Optional[torch.device] = None,
    ):
        super().__init__(state_dim, action_dim, config, device)

        # PPO-specific hyperparameters
        self.clip_epsilon = config.get('clip_epsilon', 0.2)
        self.gae_lambda = config.get('gae_lambda', 0.95)
        self.value_coef = config.get('value_coef', 0.5)
        self.entropy_coef = config.get('entropy_coef', 0.01)
        self.batch_size = config.get('batch_size', 64)
        self.n_epochs = config.get('n_epochs', 10)
        self.max_grad_norm = config.get('max_grad_norm', 0.5)

        # Network
        hidden_dims = config.get('hidden_dims', [128, 128])
        self.network = ActorCriticNetwork(
            state_dim, action_dim, hidden_dims
        ).to(self.device)

        # Optimizer
        self.optimizer = optim.Adam(
            self.network.parameters(),
            lr=self.learning_rate,
        )

        # Rollout buffer
        self.rollout_buffer = RolloutBuffer()

    def select_action(self, state: np.ndarray, explore: bool = True) -> int:
        """Select action using current policy."""
        with torch.no_grad():
            state_tensor = torch.FloatTensor(state).unsqueeze(0).to(self.device)
            logits, _ = self.network(state_tensor)
            probs = torch.softmax(logits, dim=-1)

            if explore:
                dist = Categorical(probs)
                action = dist.sample()
            else:
                action = probs.argmax(dim=-1)

            return action.item()

    def select_action_with_info(
        self, state: np.ndarray
    ) -> Tuple[int, float, float]:
        """Select action and return additional info for training."""
        with torch.no_grad():
            state_tensor = torch.FloatTensor(state).unsqueeze(0).to(self.device)
            logits, value = self.network(state_tensor)
            probs = torch.softmax(logits, dim=-1)

            dist = Categorical(probs)
            action = dist.sample()
            log_prob = dist.log_prob(action)

            return action.item(), log_prob.item(), value.item()

    def get_action_probs(self, state: np.ndarray) -> np.ndarray:
        """Get action probabilities for visualization."""
        with torch.no_grad():
            state_tensor = torch.FloatTensor(state).unsqueeze(0).to(self.device)
            probs = self.network.get_action_probs(state_tensor)
            return probs.cpu().numpy().flatten()

    def get_value(self, state: np.ndarray) -> float:
        """Get state value estimate."""
        with torch.no_grad():
            state_tensor = torch.FloatTensor(state).unsqueeze(0).to(self.device)
            value = self.network.get_value(state_tensor)
            return value.item()

    def store_transition(
        self,
        state: np.ndarray,
        action: int,
        reward: float,
        value: float,
        log_prob: float,
        done: bool,
    ):
        """Store a transition in the rollout buffer."""
        self.rollout_buffer.add(state, action, reward, value, log_prob, done)

    def compute_gae(
        self,
        rewards: List[float],
        values: List[float],
        dones: List[bool],
        last_value: float,
    ) -> Tuple[np.ndarray, np.ndarray]:
        """Compute Generalized Advantage Estimation."""
        n_steps = len(rewards)
        advantages = np.zeros(n_steps)
        returns = np.zeros(n_steps)

        gae = 0
        for t in reversed(range(n_steps)):
            if t == n_steps - 1:
                next_value = last_value
                next_non_terminal = 1.0 - float(dones[t])
            else:
                next_value = values[t + 1]
                next_non_terminal = 1.0 - float(dones[t])

            delta = rewards[t] + self.gamma * next_value * next_non_terminal - values[t]
            gae = delta + self.gamma * self.gae_lambda * next_non_terminal * gae
            advantages[t] = gae
            returns[t] = advantages[t] + values[t]

        return advantages, returns

    def update(self, last_value: float = 0.0) -> Dict[str, float]:
        """Perform PPO update using collected rollout."""
        if len(self.rollout_buffer) == 0:
            return {'policy_loss': 0.0, 'value_loss': 0.0, 'entropy': 0.0}

        # Compute advantages and returns
        advantages, returns = self.compute_gae(
            self.rollout_buffer.rewards,
            self.rollout_buffer.values,
            self.rollout_buffer.dones,
            last_value,
        )

        # Convert to tensors
        states = torch.FloatTensor(
            np.array(self.rollout_buffer.states)
        ).to(self.device)
        actions = torch.LongTensor(
            self.rollout_buffer.actions
        ).to(self.device)
        old_log_probs = torch.FloatTensor(
            self.rollout_buffer.log_probs
        ).to(self.device)
        advantages_tensor = torch.FloatTensor(advantages).to(self.device)
        returns_tensor = torch.FloatTensor(returns).to(self.device)

        # Normalize advantages
        advantages_tensor = (advantages_tensor - advantages_tensor.mean()) / (
            advantages_tensor.std() + 1e-8
        )

        # PPO update epochs
        total_policy_loss = 0.0
        total_value_loss = 0.0
        total_entropy = 0.0
        n_updates = 0

        n_samples = len(states)
        indices = np.arange(n_samples)

        for _ in range(self.n_epochs):
            np.random.shuffle(indices)

            for start in range(0, n_samples, self.batch_size):
                end = start + self.batch_size
                batch_indices = indices[start:end]

                batch_states = states[batch_indices]
                batch_actions = actions[batch_indices]
                batch_old_log_probs = old_log_probs[batch_indices]
                batch_advantages = advantages_tensor[batch_indices]
                batch_returns = returns_tensor[batch_indices]

                # Forward pass
                logits, values = self.network(batch_states)
                probs = torch.softmax(logits, dim=-1)
                dist = Categorical(probs)

                new_log_probs = dist.log_prob(batch_actions)
                entropy = dist.entropy().mean()

                # Policy loss (clipped surrogate)
                ratio = torch.exp(new_log_probs - batch_old_log_probs)
                surr1 = ratio * batch_advantages
                surr2 = torch.clamp(
                    ratio, 1.0 - self.clip_epsilon, 1.0 + self.clip_epsilon
                ) * batch_advantages
                policy_loss = -torch.min(surr1, surr2).mean()

                # Value loss
                value_loss = nn.functional.mse_loss(
                    values.squeeze(), batch_returns
                )

                # Total loss
                loss = (
                    policy_loss
                    + self.value_coef * value_loss
                    - self.entropy_coef * entropy
                )

                # Update
                self.optimizer.zero_grad()
                loss.backward()
                nn.utils.clip_grad_norm_(
                    self.network.parameters(), self.max_grad_norm
                )
                self.optimizer.step()

                total_policy_loss += policy_loss.item()
                total_value_loss += value_loss.item()
                total_entropy += entropy.item()
                n_updates += 1

        # Clear buffer
        self.rollout_buffer.clear()
        self.training_step += 1

        return {
            'policy_loss': total_policy_loss / max(n_updates, 1),
            'value_loss': total_value_loss / max(n_updates, 1),
            'entropy': total_entropy / max(n_updates, 1),
        }

    def end_episode(self):
        """Called at the end of each episode."""
        self.episode_count += 1

    def save(self, path: str):
        """Save model weights."""
        torch.save({
            'network': self.network.state_dict(),
            'optimizer': self.optimizer.state_dict(),
            'training_step': self.training_step,
            'episode_count': self.episode_count,
        }, path)

    def load(self, path: str):
        """Load model weights."""
        checkpoint = torch.load(path, map_location=self.device)
        self.network.load_state_dict(checkpoint['network'])
        self.optimizer.load_state_dict(checkpoint['optimizer'])
        self.training_step = checkpoint['training_step']
        self.episode_count = checkpoint['episode_count']

    def get_state_dict(self) -> Dict[str, Any]:
        """Get full state dictionary."""
        return {
            'network': self.network.state_dict(),
            'optimizer': self.optimizer.state_dict(),
            'training_step': self.training_step,
            'episode_count': self.episode_count,
        }

    def set_state_dict(self, state_dict: Dict[str, Any]):
        """Set full state dictionary."""
        self.network.load_state_dict(state_dict['network'])
        self.optimizer.load_state_dict(state_dict['optimizer'])
        self.training_step = state_dict['training_step']
        self.episode_count = state_dict['episode_count']

    def get_metrics(self) -> Dict[str, Any]:
        """Get current agent metrics."""
        metrics = super().get_metrics()
        metrics['rollout_size'] = len(self.rollout_buffer)
        return metrics
