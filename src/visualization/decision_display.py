"""
Decision Display Module

Formats and displays decision-making information in various formats.
"""

from typing import Dict, Any, List
from dataclasses import dataclass


@dataclass
class DecisionFrame:
    """A single frame of decision information."""
    step: int
    state_summary: str
    action: int
    action_name: str
    reward: float
    reward_components: Dict[str, float]
    risk: float
    confidence: float


class DecisionDisplay:
    """
    Manages the display of decision-making information.

    Can output to terminal, file, or prepare data for web UI.
    """

    def __init__(self):
        self.frames: List[DecisionFrame] = []

    def add_frame(self, frame: DecisionFrame) -> None:
        """Add a decision frame to history."""
        self.frames.append(frame)

    def get_recent_frames(self, n: int = 10) -> List[DecisionFrame]:
        """Get the n most recent frames."""
        return self.frames[-n:]

    def to_dict_list(self) -> List[Dict[str, Any]]:
        """Convert all frames to list of dicts (for JSON export)."""
        return [
            {
                "step": f.step,
                "state": f.state_summary,
                "action": f.action,
                "action_name": f.action_name,
                "reward": f.reward,
                "components": f.reward_components,
                "risk": f.risk,
                "confidence": f.confidence
            }
            for f in self.frames
        ]

    def get_statistics(self) -> Dict[str, Any]:
        """Calculate statistics over all frames."""
        if not self.frames:
            return {}

        rewards = [f.reward for f in self.frames]
        risks = [f.risk for f in self.frames]
        confidences = [f.confidence for f in self.frames]

        action_counts = {}
        for f in self.frames:
            action_counts[f.action_name] = action_counts.get(f.action_name, 0) + 1

        return {
            "total_frames": len(self.frames),
            "avg_reward": sum(rewards) / len(rewards),
            "max_reward": max(rewards),
            "min_reward": min(rewards),
            "avg_risk": sum(risks) / len(risks),
            "avg_confidence": sum(confidences) / len(confidences),
            "action_distribution": action_counts
        }

    def clear(self) -> None:
        """Clear all frames."""
        self.frames = []
