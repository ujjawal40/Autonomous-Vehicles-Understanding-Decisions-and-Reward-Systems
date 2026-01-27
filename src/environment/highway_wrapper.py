"""
Highway Environment Wrapper

Wraps the highway-env gymnasium environment with additional
functionality for reward decomposition and decision tracking.
"""

import gymnasium as gym
import numpy as np

# Import highway_env to register the environments with gymnasium
import highway_env  # noqa: F401
from dataclasses import dataclass
from typing import Any, Dict, Optional, Tuple


@dataclass
class VehicleState:
    """Represents the state of a vehicle in the environment."""
    x: float  # Position x
    y: float  # Position y (lane)
    vx: float  # Velocity x
    vy: float  # Velocity y
    heading: float  # Heading angle

    @property
    def speed(self) -> float:
        """Calculate total speed."""
        return np.sqrt(self.vx**2 + self.vy**2)

    @property
    def lane(self) -> int:
        """Estimate current lane (assuming 4m lane width)."""
        return int(self.y / 4)


@dataclass
class EnvironmentSnapshot:
    """A snapshot of the environment state for visualization."""
    ego_vehicle: VehicleState
    nearby_vehicles: list[VehicleState]
    action_taken: int
    action_name: str
    raw_observation: np.ndarray
    info: Dict[str, Any]


class HighwayEnvironment:
    """
    Wrapper around highway-env that provides:
    - Clean interface for RL agents
    - State extraction for visualization
    - Reward component tracking
    """

    # Action mappings for highway-env
    ACTIONS = {
        0: "LANE_LEFT",
        1: "IDLE",
        2: "LANE_RIGHT",
        3: "FASTER",
        4: "SLOWER"
    }

    ACTION_DESCRIPTIONS = {
        0: "Change to left lane",
        1: "Maintain current state",
        2: "Change to right lane",
        3: "Accelerate",
        4: "Decelerate"
    }

    def __init__(
        self,
        env_type: str = "highway-v0",
        config: Optional[Dict[str, Any]] = None
    ):
        """
        Initialize the highway environment.

        Args:
            env_type: Type of highway-env environment
            config: Custom configuration overrides
        """
        self.env_type = env_type

        # Default configuration optimized for visualization
        self.config = {
            "observation": {
                "type": "Kinematics",
                "vehicles_count": 10,
                "features": ["x", "y", "vx", "vy", "heading"],
                "absolute": True,
                "normalize": False,
            },
            "action": {
                "type": "DiscreteMetaAction",
            },
            "lanes_count": 4,
            "vehicles_count": 20,
            "duration": 60,  # seconds
            "initial_spacing": 2,
            "simulation_frequency": 15,
            "policy_frequency": 1,
            "render_mode": "rgb_array",
        }

        # Apply custom config overrides
        if config:
            self._update_config(config)

        self.env = None
        self.current_observation = None
        self.step_count = 0
        self.episode_count = 0

    def _update_config(self, config: Dict[str, Any]) -> None:
        """Recursively update configuration."""
        for key, value in config.items():
            if isinstance(value, dict) and key in self.config:
                self.config[key].update(value)
            else:
                self.config[key] = value

    def create(self) -> "HighwayEnvironment":
        """Create and configure the environment."""
        self.env = gym.make(self.env_type, render_mode="rgb_array")
        self.env.unwrapped.configure(self.config)
        return self

    def reset(self) -> Tuple[np.ndarray, Dict[str, Any]]:
        """Reset the environment for a new episode."""
        self.step_count = 0
        self.episode_count += 1
        observation, info = self.env.reset()
        self.current_observation = observation
        return observation, info

    def step(self, action: int) -> Tuple[np.ndarray, float, bool, bool, Dict[str, Any]]:
        """
        Execute one step in the environment.

        Args:
            action: Action index (0-4)

        Returns:
            observation, reward, terminated, truncated, info
        """
        observation, reward, terminated, truncated, info = self.env.step(action)
        self.current_observation = observation
        self.step_count += 1

        # Add action info to the info dict
        info["action_taken"] = action
        info["action_name"] = self.ACTIONS.get(action, "UNKNOWN")
        info["step_count"] = self.step_count

        return observation, reward, terminated, truncated, info

    def get_snapshot(self, action: int = 1) -> EnvironmentSnapshot:
        """
        Get a snapshot of the current environment state.

        Args:
            action: The action that was taken

        Returns:
            EnvironmentSnapshot with all relevant state information
        """
        obs = self.current_observation

        # Extract ego vehicle state (first row of observation)
        ego = VehicleState(
            x=obs[0, 0],
            y=obs[0, 1],
            vx=obs[0, 2],
            vy=obs[0, 3],
            heading=obs[0, 4] if obs.shape[1] > 4 else 0.0
        )

        # Extract nearby vehicles
        nearby = []
        for i in range(1, len(obs)):
            if np.any(obs[i] != 0):  # Skip empty slots
                nearby.append(VehicleState(
                    x=obs[i, 0],
                    y=obs[i, 1],
                    vx=obs[i, 2],
                    vy=obs[i, 3],
                    heading=obs[i, 4] if obs.shape[1] > 4 else 0.0
                ))

        return EnvironmentSnapshot(
            ego_vehicle=ego,
            nearby_vehicles=nearby,
            action_taken=action,
            action_name=self.ACTIONS.get(action, "UNKNOWN"),
            raw_observation=obs,
            info={"step": self.step_count, "episode": self.episode_count}
        )

    def get_action_space_size(self) -> int:
        """Get the number of available actions."""
        return len(self.ACTIONS)

    def get_observation_shape(self) -> Tuple[int, ...]:
        """Get the shape of observations."""
        if self.current_observation is not None:
            return self.current_observation.shape
        return (10, 5)  # Default shape

    def render(self) -> np.ndarray:
        """Render the environment and return the image."""
        return self.env.render()

    def close(self) -> None:
        """Clean up the environment."""
        if self.env:
            self.env.close()

    @property
    def action_meanings(self) -> Dict[int, str]:
        """Get human-readable action meanings."""
        return self.ACTION_DESCRIPTIONS.copy()
