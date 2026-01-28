"""
Agent Factory

Creates agents based on algorithm type and configuration.
"""

from typing import Dict, Any, Optional
import torch

from .base import BaseAgent
from .dqn import DQNAgent
from .double_dqn import DoubleDQNAgent
from .ppo import PPOAgent
from .a2c import A2CAgent


# Default configurations for each algorithm
DEFAULT_CONFIGS = {
    'DQN': {
        'learning_rate': 0.001,
        'gamma': 0.99,
        'epsilon_start': 1.0,
        'epsilon_end': 0.1,
        'epsilon_decay': 0.995,
        'batch_size': 32,
        'buffer_size': 10000,
        'target_update_freq': 100,
        'hidden_dims': [128, 128],
    },
    'DoubleDQN': {
        'learning_rate': 0.001,
        'gamma': 0.99,
        'epsilon_start': 1.0,
        'epsilon_end': 0.1,
        'epsilon_decay': 0.995,
        'batch_size': 32,
        'buffer_size': 10000,
        'target_update_freq': 100,
        'hidden_dims': [128, 128],
    },
    'PPO': {
        'learning_rate': 0.0003,
        'gamma': 0.99,
        'gae_lambda': 0.95,
        'clip_epsilon': 0.2,
        'value_coef': 0.5,
        'entropy_coef': 0.01,
        'batch_size': 64,
        'n_epochs': 10,
        'max_grad_norm': 0.5,
        'hidden_dims': [128, 128],
    },
    'A2C': {
        'learning_rate': 0.0007,
        'gamma': 0.99,
        'gae_lambda': 0.95,
        'value_coef': 0.5,
        'entropy_coef': 0.01,
        'max_grad_norm': 0.5,
        'n_steps': 5,
        'hidden_dims': [128, 128],
    },
}


# Algorithm descriptions for UI
ALGORITHM_INFO = {
    'DQN': {
        'name': 'Deep Q-Network',
        'description': 'Standard DQN with experience replay and target network. '
                      'Good baseline for discrete action spaces.',
        'type': 'value-based',
        'pros': ['Simple and stable', 'Works well with discrete actions', 'Experience replay for efficiency'],
        'cons': ['Can overestimate Q-values', 'Requires careful hyperparameter tuning'],
    },
    'DoubleDQN': {
        'name': 'Double Deep Q-Network',
        'description': 'Reduces overestimation bias by decoupling action selection '
                      'from action evaluation.',
        'type': 'value-based',
        'pros': ['Reduces overestimation', 'More stable learning', 'Same complexity as DQN'],
        'cons': ['Still uses epsilon-greedy exploration', 'May be slower to converge'],
    },
    'PPO': {
        'name': 'Proximal Policy Optimization',
        'description': 'State-of-the-art policy gradient method with clipped objective '
                      'for stable and efficient learning.',
        'type': 'policy-gradient',
        'pros': ['Very stable', 'Sample efficient', 'Works with continuous actions'],
        'cons': ['More hyperparameters', 'Can be slower per update'],
    },
    'A2C': {
        'name': 'Advantage Actor-Critic',
        'description': 'Combines policy gradient with value function baseline. '
                      'Simpler synchronous version of A3C.',
        'type': 'actor-critic',
        'pros': ['Lower variance than REINFORCE', 'Online learning possible', 'Simpler than PPO'],
        'cons': ['Can be less stable than PPO', 'Sensitive to learning rate'],
    },
}


def create_agent(
    algorithm: str,
    state_dim: int,
    action_dim: int,
    config: Optional[Dict[str, Any]] = None,
    device: Optional[torch.device] = None,
) -> BaseAgent:
    """
    Create an agent based on algorithm type.

    Args:
        algorithm: One of 'DQN', 'DoubleDQN', 'PPO', 'A2C'
        state_dim: Dimension of the state space
        action_dim: Number of possible actions
        config: Algorithm configuration (uses defaults if not provided)
        device: Torch device to use

    Returns:
        Configured agent instance
    """
    if algorithm not in DEFAULT_CONFIGS:
        raise ValueError(
            f"Unknown algorithm: {algorithm}. "
            f"Available: {list(DEFAULT_CONFIGS.keys())}"
        )

    # Merge with defaults
    final_config = DEFAULT_CONFIGS[algorithm].copy()
    if config:
        final_config.update(config)

    # Create agent
    agent_classes = {
        'DQN': DQNAgent,
        'DoubleDQN': DoubleDQNAgent,
        'PPO': PPOAgent,
        'A2C': A2CAgent,
    }

    agent_class = agent_classes[algorithm]
    return agent_class(state_dim, action_dim, final_config, device)


def get_algorithm_info(algorithm: str) -> Dict[str, Any]:
    """Get information about an algorithm."""
    if algorithm not in ALGORITHM_INFO:
        raise ValueError(f"Unknown algorithm: {algorithm}")
    return ALGORITHM_INFO[algorithm]


def get_default_config(algorithm: str) -> Dict[str, Any]:
    """Get default configuration for an algorithm."""
    if algorithm not in DEFAULT_CONFIGS:
        raise ValueError(f"Unknown algorithm: {algorithm}")
    return DEFAULT_CONFIGS[algorithm].copy()


def list_algorithms() -> Dict[str, Dict[str, Any]]:
    """List all available algorithms with their info."""
    return {
        algo: {
            'info': ALGORITHM_INFO[algo],
            'default_config': DEFAULT_CONFIGS[algo],
        }
        for algo in DEFAULT_CONFIGS.keys()
    }
