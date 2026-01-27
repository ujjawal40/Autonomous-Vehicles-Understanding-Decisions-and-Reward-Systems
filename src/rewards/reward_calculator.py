"""
Reward Calculator with Decomposition

Breaks down rewards into interpretable components so users can
understand WHY an autonomous system made a particular decision.
"""

import numpy as np
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from enum import Enum


class RewardComponent(Enum):
    """Types of reward components."""
    SPEED = "speed"
    COLLISION = "collision"
    LANE_CHANGE = "lane_change"
    RIGHT_LANE = "right_lane"
    HEADWAY = "headway"
    SAFETY = "safety"
    EFFICIENCY = "efficiency"
    COMFORT = "comfort"


@dataclass
class RewardBreakdown:
    """
    Detailed breakdown of a reward signal.

    This is the core data structure for explainability - it shows
    exactly how each component contributed to the final reward.
    """
    total_reward: float
    components: Dict[str, float] = field(default_factory=dict)
    explanations: Dict[str, str] = field(default_factory=dict)
    risk_factors: Dict[str, float] = field(default_factory=dict)

    def add_component(
        self,
        name: str,
        value: float,
        explanation: str,
        risk: float = 0.0
    ) -> None:
        """Add a reward component with explanation."""
        self.components[name] = value
        self.explanations[name] = explanation
        if risk > 0:
            self.risk_factors[name] = risk

    @property
    def positive_components(self) -> Dict[str, float]:
        """Get all positive reward components."""
        return {k: v for k, v in self.components.items() if v > 0}

    @property
    def negative_components(self) -> Dict[str, float]:
        """Get all negative reward components (penalties)."""
        return {k: v for k, v in self.components.items() if v < 0}

    @property
    def total_risk(self) -> float:
        """Calculate total risk score (0-1)."""
        if not self.risk_factors:
            return 0.0
        return min(1.0, sum(self.risk_factors.values()))

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "total_reward": self.total_reward,
            "components": self.components,
            "explanations": self.explanations,
            "risk_factors": self.risk_factors,
            "total_risk": self.total_risk
        }


class RewardCalculator:
    """
    Calculates and decomposes rewards for autonomous driving decisions.

    This class provides transparency into the reward function,
    showing exactly how each factor contributes to the decision.
    """

    # Default reward weights (tunable)
    DEFAULT_WEIGHTS = {
        "speed": 0.4,           # Reward for maintaining good speed
        "collision": -10.0,     # Heavy penalty for collisions
        "lane_change": -0.1,    # Small penalty for lane changes (prefer stability)
        "right_lane": 0.1,      # Small reward for staying in right lanes
        "headway": 0.2,         # Reward for maintaining safe following distance
        "high_speed_bonus": 0.3,  # Bonus for efficient high-speed driving
    }

    # Speed thresholds (m/s)
    TARGET_SPEED = 30.0  # ~108 km/h or ~67 mph
    MIN_SAFE_SPEED = 20.0
    MAX_SPEED = 40.0

    # Safety thresholds
    MIN_HEADWAY = 15.0  # meters
    SAFE_HEADWAY = 30.0  # meters

    def __init__(self, weights: Optional[Dict[str, float]] = None):
        """
        Initialize the reward calculator.

        Args:
            weights: Custom reward weights (uses defaults if not provided)
        """
        self.weights = {**self.DEFAULT_WEIGHTS, **(weights or {})}
        self.history: List[RewardBreakdown] = []

    def calculate(
        self,
        observation: np.ndarray,
        action: int,
        next_observation: np.ndarray,
        terminated: bool,
        info: Dict[str, Any]
    ) -> RewardBreakdown:
        """
        Calculate reward with full decomposition.

        Args:
            observation: State before action
            action: Action taken (0-4)
            next_observation: State after action
            terminated: Whether episode ended (usually collision)
            info: Additional info from environment

        Returns:
            RewardBreakdown with all components explained
        """
        breakdown = RewardBreakdown(total_reward=0.0)

        # Extract ego vehicle info
        ego_speed = np.sqrt(next_observation[0, 2]**2 + next_observation[0, 3]**2)
        ego_y = next_observation[0, 1]

        # 1. Speed reward
        speed_reward = self._calculate_speed_reward(ego_speed, breakdown)

        # 2. Collision penalty
        collision_penalty = self._calculate_collision_penalty(terminated, breakdown)

        # 3. Lane change penalty
        lane_penalty = self._calculate_lane_change_penalty(action, breakdown)

        # 4. Right lane preference
        lane_reward = self._calculate_lane_preference(ego_y, breakdown)

        # 5. Headway (following distance) reward
        headway_reward = self._calculate_headway_reward(next_observation, breakdown)

        # Calculate total
        breakdown.total_reward = (
            speed_reward +
            collision_penalty +
            lane_penalty +
            lane_reward +
            headway_reward
        )

        # Store in history
        self.history.append(breakdown)

        return breakdown

    def _calculate_speed_reward(
        self,
        speed: float,
        breakdown: RewardBreakdown
    ) -> float:
        """Calculate reward based on speed."""
        # Normalize speed to target
        speed_ratio = speed / self.TARGET_SPEED

        if speed < self.MIN_SAFE_SPEED:
            # Penalty for going too slow
            reward = self.weights["speed"] * (speed_ratio - 0.5)
            breakdown.add_component(
                "speed",
                reward,
                f"Too slow ({speed:.1f} m/s) - slowing traffic",
                risk=0.1
            )
        elif speed > self.MAX_SPEED:
            # Penalty for going too fast
            reward = self.weights["speed"] * (1.0 - (speed - self.MAX_SPEED) / 10)
            breakdown.add_component(
                "speed",
                reward,
                f"Too fast ({speed:.1f} m/s) - reduced control",
                risk=0.3
            )
        else:
            # Reward for good speed
            reward = self.weights["speed"] * min(speed_ratio, 1.2)
            if speed_ratio > 0.9:
                reward += self.weights["high_speed_bonus"]
            breakdown.add_component(
                "speed",
                reward,
                f"Good speed ({speed:.1f} m/s) - efficient travel",
                risk=0.0
            )

        return reward

    def _calculate_collision_penalty(
        self,
        terminated: bool,
        breakdown: RewardBreakdown
    ) -> float:
        """Calculate penalty for collision."""
        if terminated:
            penalty = self.weights["collision"]
            breakdown.add_component(
                "collision",
                penalty,
                "COLLISION DETECTED - severe safety violation",
                risk=1.0
            )
            return penalty

        breakdown.add_component(
            "collision",
            0.0,
            "No collision - safe operation",
            risk=0.0
        )
        return 0.0

    def _calculate_lane_change_penalty(
        self,
        action: int,
        breakdown: RewardBreakdown
    ) -> float:
        """Calculate penalty for lane changes (prefer stability)."""
        if action in [0, 2]:  # LANE_LEFT or LANE_RIGHT
            penalty = self.weights["lane_change"]
            direction = "left" if action == 0 else "right"
            breakdown.add_component(
                "lane_change",
                penalty,
                f"Lane change ({direction}) - minor instability",
                risk=0.05
            )
            return penalty

        breakdown.add_component(
            "lane_change",
            0.0,
            "Maintained lane - stable driving",
            risk=0.0
        )
        return 0.0

    def _calculate_lane_preference(
        self,
        y_position: float,
        breakdown: RewardBreakdown
    ) -> float:
        """Calculate reward for lane position (prefer right lanes in US)."""
        # Estimate lane (assuming 4m lane width)
        lane = int(y_position / 4)

        # Right lanes are 0, 1; Left lanes are 2, 3
        if lane <= 1:
            reward = self.weights["right_lane"]
            breakdown.add_component(
                "lane_position",
                reward,
                f"Right lane ({lane}) - proper lane discipline",
                risk=0.0
            )
        else:
            reward = 0.0
            breakdown.add_component(
                "lane_position",
                reward,
                f"Left lane ({lane}) - passing lane usage",
                risk=0.0
            )

        return reward

    def _calculate_headway_reward(
        self,
        observation: np.ndarray,
        breakdown: RewardBreakdown
    ) -> float:
        """Calculate reward based on following distance."""
        ego_x = observation[0, 0]
        ego_y = observation[0, 1]

        # Find closest vehicle ahead in same lane
        min_headway = float('inf')

        for i in range(1, len(observation)):
            if np.all(observation[i] == 0):
                continue

            other_x = observation[i, 0]
            other_y = observation[i, 1]

            # Check if in same lane (within 2m) and ahead
            if abs(other_y - ego_y) < 2.0 and other_x > ego_x:
                headway = other_x - ego_x
                min_headway = min(min_headway, headway)

        if min_headway == float('inf'):
            # No vehicle ahead
            reward = self.weights["headway"]
            breakdown.add_component(
                "headway",
                reward,
                "Clear road ahead - optimal conditions",
                risk=0.0
            )
        elif min_headway < self.MIN_HEADWAY:
            # Too close - dangerous
            reward = -self.weights["headway"] * 2
            risk = min(1.0, (self.MIN_HEADWAY - min_headway) / self.MIN_HEADWAY)
            breakdown.add_component(
                "headway",
                reward,
                f"Following too closely ({min_headway:.1f}m) - collision risk!",
                risk=risk
            )
        elif min_headway < self.SAFE_HEADWAY:
            # Moderate distance
            reward = self.weights["headway"] * 0.5
            breakdown.add_component(
                "headway",
                reward,
                f"Moderate following distance ({min_headway:.1f}m)",
                risk=0.1
            )
        else:
            # Safe distance
            reward = self.weights["headway"]
            breakdown.add_component(
                "headway",
                reward,
                f"Safe following distance ({min_headway:.1f}m)",
                risk=0.0
            )

        return reward

    def get_statistics(self) -> Dict[str, Any]:
        """Get statistics from reward history."""
        if not self.history:
            return {}

        total_rewards = [b.total_reward for b in self.history]

        return {
            "episodes": len(self.history),
            "avg_reward": np.mean(total_rewards),
            "max_reward": np.max(total_rewards),
            "min_reward": np.min(total_rewards),
            "std_reward": np.std(total_rewards),
            "avg_risk": np.mean([b.total_risk for b in self.history])
        }

    def reset_history(self) -> None:
        """Clear reward history."""
        self.history = []
