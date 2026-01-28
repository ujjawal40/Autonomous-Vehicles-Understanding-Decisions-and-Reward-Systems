"""
Double Deep Q-Network (Double DQN) Agent

Reduces overestimation bias by decoupling action selection from evaluation.
"""

from typing import Dict, Any, Optional
import numpy as np
import torch

from .dqn import DQNAgent


class DoubleDQNAgent(DQNAgent):
    """
    Double DQN Agent.

    Key difference from DQN: Uses online network to select actions,
    but target network to evaluate them. This reduces overestimation bias.

    Paper: "Deep Reinforcement Learning with Double Q-learning" (van Hasselt et al., 2015)
    """

    def __init__(
        self,
        state_dim: int,
        action_dim: int,
        config: Dict[str, Any],
        device: Optional[torch.device] = None,
    ):
        super().__init__(state_dim, action_dim, config, device)

    def update(self) -> Dict[str, float]:
        """
        Perform a learning update using Double DQN.

        The key difference: action selection uses online network,
        but Q-value evaluation uses target network.
        """
        if len(self.replay_buffer) < self.batch_size:
            return {'loss': 0.0}

        # Sample batch
        states, actions, rewards, next_states, dones = \
            self.replay_buffer.sample_tensors(self.batch_size, self.device)

        # Compute current Q-values
        current_q = self.q_network(states).gather(1, actions.unsqueeze(1)).squeeze(1)

        # Double DQN: Use online network to select actions, target network to evaluate
        with torch.no_grad():
            # Select best actions using online network
            next_actions = self.q_network(next_states).argmax(dim=1, keepdim=True)

            # Evaluate those actions using target network
            next_q = self.target_network(next_states).gather(1, next_actions).squeeze(1)

            # Compute target
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
