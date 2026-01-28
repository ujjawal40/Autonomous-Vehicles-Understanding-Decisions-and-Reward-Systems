"""
Base Agent and Common Components

Provides base classes and utilities used by all RL algorithms.
"""

import random
from abc import ABC, abstractmethod
from collections import deque
from dataclasses import dataclass
from typing import List, Dict, Any, Tuple, Optional

import numpy as np
import torch
import torch.nn as nn


@dataclass
class Transition:
    """A single transition in the environment."""
    state: np.ndarray
    action: int
    reward: float
    next_state: np.ndarray
    done: bool


class ReplayBuffer:
    """
    Experience replay buffer for off-policy algorithms.

    Stores transitions and samples mini-batches for training.
    """

    def __init__(self, capacity: int = 10000):
        self.buffer = deque(maxlen=capacity)
        self.capacity = capacity

    def push(self, state: np.ndarray, action: int, reward: float,
             next_state: np.ndarray, done: bool):
        """Add a transition to the buffer."""
        self.buffer.append(Transition(state, action, reward, next_state, done))

    def sample(self, batch_size: int) -> List[Transition]:
        """Sample a random batch of transitions."""
        return random.sample(self.buffer, min(batch_size, len(self.buffer)))

    def sample_tensors(self, batch_size: int, device: torch.device) -> Tuple[
        torch.Tensor, torch.Tensor, torch.Tensor, torch.Tensor, torch.Tensor
    ]:
        """Sample and return as tensors ready for training."""
        transitions = self.sample(batch_size)

        states = torch.FloatTensor(
            np.array([t.state for t in transitions])
        ).to(device)
        actions = torch.LongTensor(
            [t.action for t in transitions]
        ).to(device)
        rewards = torch.FloatTensor(
            [t.reward for t in transitions]
        ).to(device)
        next_states = torch.FloatTensor(
            np.array([t.next_state for t in transitions])
        ).to(device)
        dones = torch.FloatTensor(
            [float(t.done) for t in transitions]
        ).to(device)

        return states, actions, rewards, next_states, dones

    def __len__(self) -> int:
        return len(self.buffer)

    def clear(self):
        """Clear the buffer."""
        self.buffer.clear()


class BaseAgent(ABC):
    """
    Abstract base class for all RL agents.

    Defines the interface that all algorithms must implement.
    """

    def __init__(
        self,
        state_dim: int,
        action_dim: int,
        config: Dict[str, Any],
        device: Optional[torch.device] = None,
    ):
        self.state_dim = state_dim
        self.action_dim = action_dim
        self.config = config
        self.device = device or torch.device(
            "cuda" if torch.cuda.is_available() else "cpu"
        )

        # Common hyperparameters
        self.gamma = config.get('gamma', 0.99)
        self.learning_rate = config.get('learning_rate', 0.001)

        # Training state
        self.training_step = 0
        self.episode_count = 0

    @abstractmethod
    def select_action(self, state: np.ndarray, explore: bool = True) -> int:
        """
        Select an action given the current state.

        Args:
            state: Current environment state
            explore: Whether to use exploration (e.g., epsilon-greedy)

        Returns:
            Selected action index
        """
        pass

    @abstractmethod
    def get_action_probs(self, state: np.ndarray) -> np.ndarray:
        """
        Get action probabilities/values for visualization.

        Args:
            state: Current environment state

        Returns:
            Array of probabilities or Q-values for each action
        """
        pass

    @abstractmethod
    def update(self, *args, **kwargs) -> Dict[str, float]:
        """
        Perform a learning update.

        Returns:
            Dictionary of metrics (loss, etc.)
        """
        pass

    @abstractmethod
    def save(self, path: str):
        """Save model weights to file."""
        pass

    @abstractmethod
    def load(self, path: str):
        """Load model weights from file."""
        pass

    def get_weights_bytes(self) -> bytes:
        """Get model weights as bytes for database storage."""
        import io
        buffer = io.BytesIO()
        torch.save(self.get_state_dict(), buffer)
        return buffer.getvalue()

    def load_weights_bytes(self, data: bytes):
        """Load model weights from bytes."""
        import io
        buffer = io.BytesIO(data)
        state_dict = torch.load(buffer, map_location=self.device)
        self.set_state_dict(state_dict)

    @abstractmethod
    def get_state_dict(self) -> Dict[str, Any]:
        """Get the model's state dictionary."""
        pass

    @abstractmethod
    def set_state_dict(self, state_dict: Dict[str, Any]):
        """Set the model's state dictionary."""
        pass

    def get_metrics(self) -> Dict[str, Any]:
        """Get current agent metrics for logging."""
        return {
            'training_step': self.training_step,
            'episode_count': self.episode_count,
        }


class QNetwork(nn.Module):
    """
    Q-Network for value-based methods (DQN, Double DQN).

    A simple MLP that outputs Q-values for each action.
    """

    def __init__(
        self,
        state_dim: int,
        action_dim: int,
        hidden_dims: List[int] = [128, 128],
    ):
        super().__init__()

        layers = []
        prev_dim = state_dim

        for hidden_dim in hidden_dims:
            layers.extend([
                nn.Linear(prev_dim, hidden_dim),
                nn.ReLU(),
            ])
            prev_dim = hidden_dim

        layers.append(nn.Linear(prev_dim, action_dim))

        self.network = nn.Sequential(*layers)

    def forward(self, state: torch.Tensor) -> torch.Tensor:
        """Forward pass returning Q-values."""
        return self.network(state)


class ActorCriticNetwork(nn.Module):
    """
    Actor-Critic Network for policy gradient methods (PPO, A2C).

    Shared feature extractor with separate policy and value heads.
    """

    def __init__(
        self,
        state_dim: int,
        action_dim: int,
        hidden_dims: List[int] = [128, 128],
    ):
        super().__init__()

        # Shared feature extractor
        layers = []
        prev_dim = state_dim

        for hidden_dim in hidden_dims:
            layers.extend([
                nn.Linear(prev_dim, hidden_dim),
                nn.ReLU(),
            ])
            prev_dim = hidden_dim

        self.shared = nn.Sequential(*layers)

        # Policy head (actor)
        self.policy_head = nn.Linear(prev_dim, action_dim)

        # Value head (critic)
        self.value_head = nn.Linear(prev_dim, 1)

    def forward(self, state: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        """Forward pass returning policy logits and state value."""
        features = self.shared(state)
        policy_logits = self.policy_head(features)
        value = self.value_head(features)
        return policy_logits, value

    def get_action_probs(self, state: torch.Tensor) -> torch.Tensor:
        """Get action probabilities."""
        features = self.shared(state)
        logits = self.policy_head(features)
        return torch.softmax(logits, dim=-1)

    def get_value(self, state: torch.Tensor) -> torch.Tensor:
        """Get state value."""
        features = self.shared(state)
        return self.value_head(features)
