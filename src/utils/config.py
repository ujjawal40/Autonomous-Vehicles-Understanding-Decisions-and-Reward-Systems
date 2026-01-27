"""
Configuration Management

Central configuration for the autonomous decision visualizer.
"""

from dataclasses import dataclass, field
from typing import Dict, Any, Optional
from pathlib import Path
import json


@dataclass
class Config:
    """Main configuration class."""

    # Environment settings
    env_type: str = "highway-v0"
    lanes_count: int = 4
    vehicles_count: int = 20
    duration: int = 60

    # Agent settings
    learning_rate: float = 5e-4
    buffer_size: int = 50000
    exploration_fraction: float = 0.3
    exploration_final_eps: float = 0.05

    # Reward weights
    reward_weights: Dict[str, float] = field(default_factory=lambda: {
        "speed": 0.4,
        "collision": -10.0,
        "lane_change": -0.1,
        "right_lane": 0.1,
        "headway": 0.2,
        "high_speed_bonus": 0.3,
    })

    # Training settings
    total_timesteps: int = 50000
    eval_episodes: int = 5

    # Visualization settings
    render: bool = True
    verbose: int = 1

    # Paths
    model_save_path: str = "./models"
    log_path: str = "./logs"

    def save(self, path: str) -> None:
        """Save configuration to JSON file."""
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        with open(path, 'w') as f:
            json.dump(self.__dict__, f, indent=2)

    @classmethod
    def load(cls, path: str) -> "Config":
        """Load configuration from JSON file."""
        with open(path, 'r') as f:
            data = json.load(f)
        return cls(**data)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return self.__dict__.copy()
