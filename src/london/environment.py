"""
London Navigation Environment

A Gymnasium environment for autonomous navigation through London streets.
"""

import numpy as np
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass, field

import gymnasium as gym
from gymnasium import spaces

from .map_data import LondonMap


@dataclass
class NavigationState:
    """Current state of the navigation agent."""
    current_node: int
    target_node: int
    path_taken: List[int] = field(default_factory=list)
    distance_traveled: float = 0.0
    time_elapsed: float = 0.0
    current_speed: float = 0.0  # m/s


@dataclass
class ActionProbabilityHistory:
    """Track probability evolution over time."""
    episode: int
    step: int
    node_id: int
    action_probs: Dict[int, float]  # neighbor_id -> probability
    chosen_action: int
    reward: float


class LondonNavigationEnv(gym.Env):
    """
    London street navigation environment.

    The agent must navigate from a start intersection to a destination
    using the London road network.

    Actions: Choose which neighboring intersection to move to
    Observations: Current position, destination, available directions, distances
    Rewards: Based on progress toward goal, time efficiency, route optimality
    """

    metadata = {"render_modes": ["human", "rgb_array"]}

    # Action names for display
    ACTION_NAMES = {
        0: "NORTH",
        1: "EAST",
        2: "SOUTH",
        3: "WEST",
        4: "NORTHEAST",
        5: "SOUTHEAST",
        6: "SOUTHWEST",
        7: "NORTHWEST"
    }

    def __init__(
        self,
        render_mode: Optional[str] = None,
        max_steps: int = 100,
    ):
        super().__init__()

        self.render_mode = render_mode
        self.max_steps = max_steps

        # Load London map
        self.map = LondonMap()
        self.map.load_or_download()

        # Maximum possible neighbors (for fixed action space)
        self.max_neighbors = 8

        # Action space: choose a direction (we'll map to actual neighbors)
        self.action_space = spaces.Discrete(self.max_neighbors)

        # Observation space:
        # - Current position (normalized x, y)
        # - Target position (normalized x, y)
        # - Distance to target (normalized)
        # - Available directions (8 binary flags)
        # - Direction to target (sin/cos of angle)
        self.observation_space = spaces.Box(
            low=-1.0,
            high=1.0,
            shape=(15,),  # 2 + 2 + 1 + 8 + 2
            dtype=np.float32
        )

        # State
        self.state: Optional[NavigationState] = None
        self.optimal_path: Optional[List[int]] = None
        self.optimal_distance: float = 0.0
        self.step_count: int = 0

        # Probability history for visualization
        self.probability_history: List[ActionProbabilityHistory] = []
        self.current_episode: int = 0

    def _normalize_position(self, x: float, y: float) -> Tuple[float, float]:
        """Normalize position to [-1, 1] range."""
        if self.map.bounds is None:
            return 0.0, 0.0

        min_x, min_y, max_x, max_y = self.map.bounds
        range_x = max_x - min_x
        range_y = max_y - min_y

        norm_x = 2 * (x - min_x) / range_x - 1 if range_x > 0 else 0
        norm_y = 2 * (y - min_y) / range_y - 1 if range_y > 0 else 0

        return norm_x, norm_y

    def _get_direction_index(self, from_node: int, to_node: int) -> int:
        """Get direction index (0-7) based on relative position."""
        from_inter = self.map.intersections[from_node]
        to_inter = self.map.intersections[to_node]

        dx = to_inter.x - from_inter.x
        dy = to_inter.y - from_inter.y

        angle = np.arctan2(dy, dx)  # -pi to pi

        # Convert to 8 directions
        # 0: East, 1: NE, 2: North, 3: NW, 4: West, 5: SW, 6: South, 7: SE
        direction = int((angle + np.pi + np.pi/8) / (np.pi/4)) % 8

        # Remap to our convention: 0=N, 1=E, 2=S, 3=W, 4=NE, 5=SE, 6=SW, 7=NW
        remap = {0: 1, 1: 4, 2: 0, 3: 7, 4: 3, 5: 6, 6: 2, 7: 5}
        return remap.get(direction, 0)

    def _get_observation(self) -> np.ndarray:
        """Build observation vector."""
        current = self.map.intersections[self.state.current_node]
        target = self.map.intersections[self.state.target_node]

        # Normalized positions
        curr_x, curr_y = self._normalize_position(current.x, current.y)
        tgt_x, tgt_y = self._normalize_position(target.x, target.y)

        # Distance to target (normalized by map diagonal)
        if self.map.bounds:
            map_diagonal = np.sqrt(
                (self.map.bounds[2] - self.map.bounds[0])**2 +
                (self.map.bounds[3] - self.map.bounds[1])**2
            )
        else:
            map_diagonal = 1000

        dx = target.x - current.x
        dy = target.y - current.y
        distance = np.sqrt(dx**2 + dy**2)
        norm_distance = min(distance / map_diagonal, 1.0)

        # Available directions (8 flags)
        available = np.zeros(8, dtype=np.float32)
        for neighbor_id in current.neighbors:
            direction = self._get_direction_index(self.state.current_node, neighbor_id)
            available[direction] = 1.0

        # Direction to target
        angle_to_target = np.arctan2(dy, dx)
        dir_sin = np.sin(angle_to_target)
        dir_cos = np.cos(angle_to_target)

        obs = np.array([
            curr_x, curr_y,
            tgt_x, tgt_y,
            norm_distance,
            *available,
            dir_sin, dir_cos
        ], dtype=np.float32)

        return obs

    def _get_neighbor_for_action(self, action: int) -> Optional[int]:
        """Get the neighbor node for a given action direction."""
        current = self.map.intersections[self.state.current_node]

        for neighbor_id in current.neighbors:
            direction = self._get_direction_index(self.state.current_node, neighbor_id)
            if direction == action:
                return neighbor_id

        return None

    def reset(
        self,
        seed: Optional[int] = None,
        options: Optional[dict] = None
    ) -> Tuple[np.ndarray, dict]:
        """Reset environment to a new navigation task."""
        super().reset(seed=seed)

        self.current_episode += 1

        # Get start and end points
        if options and 'start' in options and 'end' in options:
            start_id = options['start']
            end_id = options['end']
        else:
            start_id, end_id = self.map.get_random_start_end()

        # Find optimal path
        self.optimal_path = self.map.find_shortest_path(start_id, end_id)

        if self.optimal_path is None:
            # If no path, try different points
            start_id, end_id = self.map.get_random_start_end()
            self.optimal_path = self.map.find_shortest_path(start_id, end_id)

        # Calculate optimal distance
        self.optimal_distance = 0.0
        if self.optimal_path:
            for i in range(len(self.optimal_path) - 1):
                n1 = self.map.intersections[self.optimal_path[i]]
                n2 = self.map.intersections[self.optimal_path[i + 1]]
                self.optimal_distance += np.sqrt((n2.x - n1.x)**2 + (n2.y - n1.y)**2)

        # Initialize state
        self.state = NavigationState(
            current_node=start_id,
            target_node=end_id,
            path_taken=[start_id],
            distance_traveled=0.0,
            time_elapsed=0.0,
            current_speed=0.0
        )

        self.step_count = 0

        info = {
            'start_node': start_id,
            'target_node': end_id,
            'optimal_path': self.optimal_path,
            'optimal_distance': self.optimal_distance,
            'map_data': self.map.to_dict()
        }

        return self._get_observation(), info

    def step(self, action: int) -> Tuple[np.ndarray, float, bool, bool, dict]:
        """Take a step in the environment."""
        self.step_count += 1

        current = self.map.intersections[self.state.current_node]
        target = self.map.intersections[self.state.target_node]

        # Get the neighbor for this action
        next_node = self._get_neighbor_for_action(action)

        reward = 0.0
        terminated = False
        truncated = False

        if next_node is None:
            # Invalid action - no road in that direction
            reward = -1.0  # Penalty for invalid move
            next_node = self.state.current_node  # Stay in place
        else:
            next_inter = self.map.intersections[next_node]

            # Calculate distance moved
            distance_moved = np.sqrt(
                (next_inter.x - current.x)**2 +
                (next_inter.y - current.y)**2
            )
            self.state.distance_traveled += distance_moved

            # Update speed (assume constant for now)
            self.state.current_speed = 13.4  # 30 mph

            # Calculate time
            time_step = distance_moved / self.state.current_speed
            self.state.time_elapsed += time_step

            # Check if reached target
            if next_node == self.state.target_node:
                terminated = True

                # Big reward for reaching destination
                reward = 10.0

                # Bonus for efficiency (compared to optimal path)
                if self.optimal_distance > 0:
                    efficiency = self.optimal_distance / max(self.state.distance_traveled, 1)
                    reward += 5.0 * min(efficiency, 1.0)

            else:
                # Distance-based progress reward
                old_distance = np.sqrt(
                    (target.x - current.x)**2 + (target.y - current.y)**2
                )
                new_distance = np.sqrt(
                    (target.x - next_inter.x)**2 + (target.y - next_inter.y)**2
                )

                # Reward for getting closer, penalty for getting farther
                progress = old_distance - new_distance
                reward = progress / 100.0  # Normalize

                # Small penalty for each step (encourages efficiency)
                reward -= 0.05

                # Penalty for revisiting nodes
                if next_node in self.state.path_taken:
                    reward -= 0.5

            # Update path
            self.state.current_node = next_node
            self.state.path_taken.append(next_node)

        # Check for truncation
        if self.step_count >= self.max_steps:
            truncated = True
            reward -= 2.0  # Penalty for not reaching destination

        info = {
            'current_node': self.state.current_node,
            'target_node': self.state.target_node,
            'distance_traveled': self.state.distance_traveled,
            'time_elapsed': self.state.time_elapsed,
            'path_taken': self.state.path_taken.copy(),
            'step': self.step_count,
            'current_speed': self.state.current_speed,
            'optimal_path': self.optimal_path,
            'optimal_distance': self.optimal_distance,
        }

        return self._get_observation(), reward, terminated, truncated, info

    def record_action_probabilities(
        self,
        action_probs: Dict[int, float],
        chosen_action: int,
        reward: float
    ):
        """Record action probabilities for visualization."""
        self.probability_history.append(ActionProbabilityHistory(
            episode=self.current_episode,
            step=self.step_count,
            node_id=self.state.current_node,
            action_probs=action_probs.copy(),
            chosen_action=chosen_action,
            reward=reward
        ))

    def get_probability_history(self) -> List[dict]:
        """Get probability history as list of dicts for JSON serialization."""
        return [
            {
                'episode': h.episode,
                'step': h.step,
                'nodeId': h.node_id,
                'actionProbs': {str(k): float(v) for k, v in h.action_probs.items()},
                'chosenAction': h.chosen_action,
                'reward': float(h.reward)
            }
            for h in self.probability_history
        ]

    def get_available_actions(self) -> List[Tuple[int, str, int]]:
        """Get list of available actions from current position.

        Returns: List of (action_id, direction_name, neighbor_node_id)
        """
        if self.state is None:
            return []

        current = self.map.intersections[self.state.current_node]
        actions = []

        for neighbor_id in current.neighbors:
            direction = self._get_direction_index(self.state.current_node, neighbor_id)
            name = self.ACTION_NAMES.get(direction, "UNKNOWN")
            actions.append((direction, name, neighbor_id))

        return sorted(actions, key=lambda x: x[0])

    def render(self):
        """Render the environment (not implemented for this prototype)."""
        pass

    def close(self):
        """Clean up resources."""
        pass
