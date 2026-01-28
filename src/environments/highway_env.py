"""
Highway Environment Wrapper

Wraps highway-env for use with our training pipeline.
"""

import numpy as np
from typing import Dict, Any, Tuple, Optional
import gymnasium as gym


class HighwayEnvWrapper:
    """
    Wrapper for the highway-env gymnasium environment.

    Provides a consistent interface for training and adds custom reward shaping.
    """

    def __init__(
        self,
        config: Optional[Dict[str, Any]] = None,
        reward_weights: Optional[Dict[str, float]] = None,
    ):
        """
        Initialize the highway environment.

        Args:
            config: Environment configuration
            reward_weights: Custom reward component weights
        """
        self.config = config or self._default_config()
        self.reward_weights = reward_weights or self._default_reward_weights()

        # Create base environment
        self.env = gym.make("highway-v0", render_mode="rgb_array")
        self.env.unwrapped.configure(self.config)

        # State
        self.current_obs = None
        self.episode_reward = 0
        self.episode_steps = 0
        self.collision_count = 0

    def _default_config(self) -> Dict[str, Any]:
        """Default environment configuration."""
        return {
            "observation": {
                "type": "Kinematics",
                "vehicles_count": 15,
                "features": ["presence", "x", "y", "vx", "vy", "heading"],
                "normalize": True,
                "absolute": False,
                "order": "sorted",
            },
            "action": {
                "type": "DiscreteMetaAction",
            },
            "lanes_count": 4,
            "vehicles_count": 15,
            "duration": 40,
            "initial_spacing": 2,
            "collision_reward": -1,
            "right_lane_reward": 0.1,
            "high_speed_reward": 0.4,
            "lane_change_reward": 0,
            "reward_speed_range": [20, 30],
            "normalize_reward": True,
            "offroad_terminal": False,
        }

    def _default_reward_weights(self) -> Dict[str, float]:
        """Default reward component weights."""
        return {
            "collision": -10.0,
            "high_speed": 1.0,
            "right_lane": 0.5,
            "heading": 0.2,
            "lane_change": -0.1,
            "time_alive": 0.01,
        }

    def reset(self, seed: Optional[int] = None) -> Tuple[np.ndarray, Dict[str, Any]]:
        """
        Reset the environment.

        Returns:
            Initial observation and info dict
        """
        self.episode_reward = 0
        self.episode_steps = 0

        obs, info = self.env.reset(seed=seed)
        self.current_obs = obs

        info["episode_reward"] = 0
        info["episode_steps"] = 0

        return obs, info

    def step(self, action: int) -> Tuple[np.ndarray, float, bool, bool, Dict[str, Any]]:
        """
        Take a step in the environment.

        Args:
            action: The action to take (0-4)
                0: Lane left
                1: Idle
                2: Lane right
                3: Faster
                4: Slower

        Returns:
            observation, reward, terminated, truncated, info
        """
        obs, base_reward, terminated, truncated, info = self.env.step(action)

        # Calculate custom reward components
        reward_components = self._calculate_reward_components(
            obs, action, terminated, info
        )

        # Calculate total reward
        total_reward = sum(
            self.reward_weights.get(k, 0) * v
            for k, v in reward_components.items()
        )

        # Update state
        self.current_obs = obs
        self.episode_reward += total_reward
        self.episode_steps += 1

        if info.get("crashed", False):
            self.collision_count += 1

        # Enrich info
        info.update({
            "reward_components": reward_components,
            "base_reward": base_reward,
            "total_reward": total_reward,
            "episode_reward": self.episode_reward,
            "episode_steps": self.episode_steps,
            "collision": info.get("crashed", False),
            "speed": info.get("speed", 0),
        })

        return obs, total_reward, terminated, truncated, info

    def _calculate_reward_components(
        self,
        obs: np.ndarray,
        action: int,
        terminated: bool,
        info: Dict[str, Any],
    ) -> Dict[str, float]:
        """Calculate individual reward components."""
        components = {}

        # Collision penalty
        components["collision"] = 1.0 if info.get("crashed", False) else 0.0

        # Speed reward (normalized)
        speed = info.get("speed", 0)
        target_speed = 25  # m/s
        speed_diff = abs(speed - target_speed) / target_speed
        components["high_speed"] = max(0, 1 - speed_diff)

        # Right lane preference (for highway driving)
        # The ego vehicle is at index 0 in the observation
        if len(obs) > 0 and len(obs[0]) > 2:
            y_position = obs[0][2]  # y position (lateral)
            # Higher reward for being in right lanes
            components["right_lane"] = max(0, y_position + 0.5)
        else:
            components["right_lane"] = 0

        # Heading alignment (should be close to 0 for straight driving)
        if len(obs) > 0 and len(obs[0]) > 5:
            heading = obs[0][5]
            components["heading"] = max(0, 1 - abs(heading) * 2)
        else:
            components["heading"] = 0

        # Lane change penalty
        components["lane_change"] = 1.0 if action in [0, 2] else 0.0

        # Time alive bonus
        components["time_alive"] = 1.0 if not terminated else 0.0

        return components

    def render(self) -> Optional[np.ndarray]:
        """Render the environment."""
        return self.env.render()

    def close(self):
        """Close the environment."""
        self.env.close()

    def get_vehicle_state(self) -> Dict[str, Any]:
        """Get the current vehicle state for visualization."""
        if self.current_obs is None:
            return {}

        ego = self.current_obs[0] if len(self.current_obs) > 0 else np.zeros(6)

        return {
            "presence": float(ego[0]) if len(ego) > 0 else 1.0,
            "x": float(ego[1]) if len(ego) > 1 else 0.0,
            "y": float(ego[2]) if len(ego) > 2 else 0.0,
            "vx": float(ego[3]) if len(ego) > 3 else 0.0,
            "vy": float(ego[4]) if len(ego) > 4 else 0.0,
            "heading": float(ego[5]) if len(ego) > 5 else 0.0,
        }

    def get_all_vehicles(self) -> list:
        """Get all vehicle states for visualization."""
        if self.current_obs is None:
            return []

        vehicles = []
        for i, vehicle in enumerate(self.current_obs):
            if vehicle[0] > 0:  # presence check
                vehicles.append({
                    "id": f"vehicle_{i}",
                    "x": float(vehicle[1]),
                    "y": float(vehicle[2]),
                    "vx": float(vehicle[3]),
                    "vy": float(vehicle[4]),
                    "heading": float(vehicle[5]) if len(vehicle) > 5 else 0.0,
                    "is_ego": i == 0,
                })

        return vehicles

    @property
    def observation_space(self):
        """Get the observation space."""
        return self.env.observation_space

    @property
    def action_space(self):
        """Get the action space."""
        return self.env.action_space

    def update_reward_weights(self, weights: Dict[str, float]):
        """Update reward weights during training."""
        self.reward_weights.update(weights)


def create_highway_env(
    config: Optional[Dict[str, Any]] = None,
    reward_weights: Optional[Dict[str, float]] = None,
) -> HighwayEnvWrapper:
    """Factory function to create a highway environment."""
    return HighwayEnvWrapper(config=config, reward_weights=reward_weights)
