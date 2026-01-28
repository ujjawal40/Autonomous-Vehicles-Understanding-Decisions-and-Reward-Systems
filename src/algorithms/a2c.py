"""
Advantage Actor-Critic (A2C) Agent

Synchronous version of A3C, simpler but effective policy gradient method.
"""

from typing import Dict, Any, Optional, List, Tuple
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.distributions import Categorical

from .base import BaseAgent, ActorCriticNetwork


class A2CAgent(BaseAgent):
    """
    Advantage Actor-Critic Agent.

    Features:
    - Actor-Critic architecture with shared features
    - N-step returns for variance reduction
    - Entropy bonus for exploration
    - Generalized Advantage Estimation (GAE)

    Paper: "Asynchronous Methods for Deep RL" (Mnih et al., 2016)
    """

    def __init__(
        self,
        state_dim: int,
        action_dim: int,
        config: Dict[str, Any],
        device: Optional[torch.device] = None,
    ):
        super().__init__(state_dim, action_dim, config, device)

        # A2C-specific hyperparameters
        self.n_steps = config.get('n_steps', 5)
        self.gae_lambda = config.get('gae_lambda', 0.95)
        self.value_coef = config.get('value_coef', 0.5)
        self.entropy_coef = config.get('entropy_coef', 0.01)
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

        # Trajectory storage (for n-step returns)
        self.states: List[np.ndarray] = []
        self.actions: List[int] = []
        self.rewards: List[float] = []
        self.values: List[float] = []
        self.log_probs: List[torch.Tensor] = []
        self.dones: List[bool] = []

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
    ) -> Tuple[int, torch.Tensor, float]:
        """Select action and return info for training (keeps gradient)."""
        state_tensor = torch.FloatTensor(state).unsqueeze(0).to(self.device)
        logits, value = self.network(state_tensor)
        probs = torch.softmax(logits, dim=-1)

        dist = Categorical(probs)
        action = dist.sample()
        log_prob = dist.log_prob(action)

        return action.item(), log_prob, value.item()

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
        log_prob: torch.Tensor,
        done: bool,
    ):
        """Store a transition for n-step update."""
        self.states.append(state)
        self.actions.append(action)
        self.rewards.append(reward)
        self.values.append(value)
        self.log_probs.append(log_prob)
        self.dones.append(done)

    def should_update(self) -> bool:
        """Check if we have enough steps for an update."""
        return len(self.states) >= self.n_steps

    def compute_returns_and_advantages(
        self, next_value: float
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        """Compute n-step returns and GAE advantages."""
        n = len(self.rewards)
        returns = torch.zeros(n)
        advantages = torch.zeros(n)

        # Compute returns and advantages using GAE
        gae = 0
        R = next_value

        for t in reversed(range(n)):
            if self.dones[t]:
                R = 0
                gae = 0

            R = self.rewards[t] + self.gamma * R
            returns[t] = R

            # GAE
            delta = self.rewards[t] + self.gamma * (
                next_value if t == n - 1 else self.values[t + 1]
            ) * (1 - float(self.dones[t])) - self.values[t]

            gae = delta + self.gamma * self.gae_lambda * (
                1 - float(self.dones[t])
            ) * gae
            advantages[t] = gae

        return returns.to(self.device), advantages.to(self.device)

    def update(self, next_value: float = 0.0) -> Dict[str, float]:
        """Perform A2C update."""
        if len(self.states) == 0:
            return {'policy_loss': 0.0, 'value_loss': 0.0, 'entropy': 0.0}

        # Compute returns and advantages
        returns, advantages = self.compute_returns_and_advantages(next_value)

        # Normalize advantages
        advantages = (advantages - advantages.mean()) / (advantages.std() + 1e-8)

        # Stack log probs
        log_probs = torch.stack(self.log_probs).squeeze()

        # Get current values
        states_tensor = torch.FloatTensor(
            np.array(self.states)
        ).to(self.device)
        logits, values = self.network(states_tensor)
        values = values.squeeze()

        # Compute entropy
        probs = torch.softmax(logits, dim=-1)
        dist = Categorical(probs)
        entropy = dist.entropy().mean()

        # Policy loss (policy gradient with advantage)
        policy_loss = -(log_probs * advantages.detach()).mean()

        # Value loss
        value_loss = nn.functional.mse_loss(values, returns)

        # Total loss
        loss = (
            policy_loss
            + self.value_coef * value_loss
            - self.entropy_coef * entropy
        )

        # Update
        self.optimizer.zero_grad()
        loss.backward()
        nn.utils.clip_grad_norm_(self.network.parameters(), self.max_grad_norm)
        self.optimizer.step()

        # Clear trajectory
        self.clear_trajectory()
        self.training_step += 1

        return {
            'policy_loss': policy_loss.item(),
            'value_loss': value_loss.item(),
            'entropy': entropy.item(),
            'total_loss': loss.item(),
        }

    def clear_trajectory(self):
        """Clear stored trajectory."""
        self.states.clear()
        self.actions.clear()
        self.rewards.clear()
        self.values.clear()
        self.log_probs.clear()
        self.dones.clear()

    def end_episode(self):
        """Called at the end of each episode."""
        self.episode_count += 1
        # Update if we have any remaining steps
        if len(self.states) > 0:
            self.update(next_value=0.0)

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
        metrics['trajectory_length'] = len(self.states)
        return metrics
