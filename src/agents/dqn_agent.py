"""
DQN Agent for Autonomous Driving

A Deep Q-Network agent that learns to drive and provides
transparency into its decision-making process.
"""

import numpy as np
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple, Any
from pathlib import Path

try:
    from stable_baselines3 import DQN
    from stable_baselines3.common.callbacks import BaseCallback
    HAS_SB3 = True
except ImportError:
    HAS_SB3 = False


@dataclass
class ActionProbabilities:
    """
    Represents the probability distribution over actions.

    This is key for explainability - showing WHY one action
    was chosen over others.
    """
    action_values: Dict[int, float]  # Q-values for each action
    chosen_action: int
    confidence: float  # How confident the agent is (0-1)

    @property
    def probabilities(self) -> Dict[int, float]:
        """Convert Q-values to probabilities using softmax."""
        values = np.array(list(self.action_values.values()))
        # Softmax with temperature
        exp_values = np.exp(values - np.max(values))
        probs = exp_values / exp_values.sum()
        return {k: float(probs[i]) for i, k in enumerate(self.action_values.keys())}

    @property
    def action_ranking(self) -> List[Tuple[int, float]]:
        """Rank actions by their Q-values."""
        return sorted(self.action_values.items(), key=lambda x: x[1], reverse=True)


@dataclass
class DecisionExplanation:
    """Full explanation of a decision."""
    state_description: str
    action_taken: int
    action_name: str
    action_probs: ActionProbabilities
    reasoning: str
    alternatives: List[Dict[str, Any]]


class DQNAgent:
    """
    DQN Agent with explainability features.

    This agent not only learns to drive but also provides
    insights into its decision-making process.
    """

    ACTION_NAMES = {
        0: "LANE_LEFT",
        1: "IDLE",
        2: "LANE_RIGHT",
        3: "FASTER",
        4: "SLOWER"
    }

    def __init__(
        self,
        observation_shape: Tuple[int, ...],
        n_actions: int = 5,
        learning_rate: float = 5e-4,
        buffer_size: int = 50000,
        exploration_fraction: float = 0.3,
        exploration_final_eps: float = 0.05,
        verbose: int = 1
    ):
        """
        Initialize the DQN agent.

        Args:
            observation_shape: Shape of observation space
            n_actions: Number of available actions
            learning_rate: Learning rate for optimizer
            buffer_size: Size of replay buffer
            exploration_fraction: Fraction of training for exploration
            exploration_final_eps: Final exploration rate
            verbose: Verbosity level
        """
        self.observation_shape = observation_shape
        self.n_actions = n_actions
        self.learning_rate = learning_rate
        self.model = None
        self.is_trained = False

        # Store hyperparameters for model creation
        self._hyperparams = {
            "learning_rate": learning_rate,
            "buffer_size": buffer_size,
            "exploration_fraction": exploration_fraction,
            "exploration_final_eps": exploration_final_eps,
            "verbose": verbose
        }

        # Decision history for analysis
        self.decision_history: List[DecisionExplanation] = []

    def create_model(self, env) -> "DQNAgent":
        """
        Create the DQN model.

        Args:
            env: Gymnasium environment

        Returns:
            self for chaining
        """
        if not HAS_SB3:
            raise ImportError(
                "stable-baselines3 is required. Install with: pip install stable-baselines3"
            )

        self.model = DQN(
            "MlpPolicy",
            env,
            learning_rate=self._hyperparams["learning_rate"],
            buffer_size=self._hyperparams["buffer_size"],
            exploration_fraction=self._hyperparams["exploration_fraction"],
            exploration_final_eps=self._hyperparams["exploration_final_eps"],
            verbose=self._hyperparams["verbose"],
            tensorboard_log="./logs/tensorboard/"
        )

        return self

    def train(
        self,
        total_timesteps: int = 50000,
        callback: Optional[BaseCallback] = None
    ) -> Dict[str, Any]:
        """
        Train the agent.

        Args:
            total_timesteps: Number of steps to train
            callback: Optional callback for monitoring

        Returns:
            Training statistics
        """
        if self.model is None:
            raise RuntimeError("Model not created. Call create_model() first.")

        self.model.learn(
            total_timesteps=total_timesteps,
            callback=callback,
            progress_bar=True
        )

        self.is_trained = True

        return {
            "total_timesteps": total_timesteps,
            "final_exploration_rate": self.model.exploration_rate
        }

    def predict(
        self,
        observation: np.ndarray,
        deterministic: bool = True
    ) -> Tuple[int, ActionProbabilities]:
        """
        Predict action with full probability breakdown.

        Args:
            observation: Current state observation
            deterministic: Whether to use greedy action selection

        Returns:
            (action, action_probabilities)
        """
        if self.model is None:
            # Random policy if not trained
            action = np.random.randint(0, self.n_actions)
            q_values = {i: np.random.randn() for i in range(self.n_actions)}
            return action, ActionProbabilities(
                action_values=q_values,
                chosen_action=action,
                confidence=0.2
            )

        # Get Q-values from the model
        obs_tensor = self.model.policy.obs_to_tensor(observation)[0]
        q_values = self.model.q_net(obs_tensor).detach().cpu().numpy()[0]

        # Create action probabilities
        action_values = {i: float(q_values[i]) for i in range(self.n_actions)}

        if deterministic:
            action = int(np.argmax(q_values))
        else:
            action, _ = self.model.predict(observation, deterministic=False)
            action = int(action)

        # Calculate confidence based on Q-value spread
        q_range = np.max(q_values) - np.min(q_values)
        confidence = min(1.0, q_range / 5.0)  # Normalize to 0-1

        action_probs = ActionProbabilities(
            action_values=action_values,
            chosen_action=action,
            confidence=confidence
        )

        return action, action_probs

    def explain_decision(
        self,
        observation: np.ndarray,
        action: int,
        action_probs: ActionProbabilities
    ) -> DecisionExplanation:
        """
        Generate a human-readable explanation of a decision.

        Args:
            observation: State observation
            action: Action taken
            action_probs: Probability breakdown

        Returns:
            DecisionExplanation with full reasoning
        """
        # Describe the state
        ego_speed = np.sqrt(observation[0, 2]**2 + observation[0, 3]**2)
        ego_lane = int(observation[0, 1] / 4)

        state_desc = (
            f"Speed: {ego_speed:.1f} m/s ({ego_speed * 2.237:.1f} mph), "
            f"Lane: {ego_lane}"
        )

        # Generate reasoning based on Q-values
        ranking = action_probs.action_ranking
        best_action, best_q = ranking[0]

        if action == best_action:
            reasoning = f"Chose optimal action with Q-value {best_q:.3f}"
        else:
            reasoning = f"Exploring: chose action {action} instead of optimal {best_action}"

        # Generate alternatives
        alternatives = []
        for alt_action, q_val in ranking[1:4]:  # Top 3 alternatives
            prob = action_probs.probabilities[alt_action]
            alternatives.append({
                "action": alt_action,
                "action_name": self.ACTION_NAMES[alt_action],
                "q_value": q_val,
                "probability": prob,
                "reason": self._get_action_reason(alt_action, observation)
            })

        explanation = DecisionExplanation(
            state_description=state_desc,
            action_taken=action,
            action_name=self.ACTION_NAMES[action],
            action_probs=action_probs,
            reasoning=reasoning,
            alternatives=alternatives
        )

        self.decision_history.append(explanation)

        return explanation

    def _get_action_reason(self, action: int, observation: np.ndarray) -> str:
        """Generate reasoning for why an action might be taken."""
        reasons = {
            0: "Move left to overtake or find clearer lane",
            1: "Maintain current trajectory and speed",
            2: "Move right to follow lane discipline",
            3: "Accelerate to improve efficiency or match traffic",
            4: "Slow down for safety or obstacle ahead"
        }
        return reasons.get(action, "Unknown action")

    def save(self, path: str) -> None:
        """Save the trained model."""
        if self.model is not None:
            Path(path).parent.mkdir(parents=True, exist_ok=True)
            self.model.save(path)

    def load(self, path: str, env) -> "DQNAgent":
        """Load a trained model."""
        if not HAS_SB3:
            raise ImportError("stable-baselines3 is required")

        self.model = DQN.load(path, env=env)
        self.is_trained = True
        return self

    def get_decision_statistics(self) -> Dict[str, Any]:
        """Get statistics about decision history."""
        if not self.decision_history:
            return {}

        action_counts = {}
        total_confidence = 0

        for decision in self.decision_history:
            action = decision.action_taken
            action_counts[action] = action_counts.get(action, 0) + 1
            total_confidence += decision.action_probs.confidence

        return {
            "total_decisions": len(self.decision_history),
            "action_distribution": action_counts,
            "avg_confidence": total_confidence / len(self.decision_history)
        }
