"""
Web-Enabled Main Entry Point

Runs the simulation with real-time WebSocket updates to the frontend.
"""

import asyncio
import threading
import time
import numpy as np
from typing import Optional

import uvicorn

from .environment import HighwayEnvironment
from .agents import DQNAgent
from .rewards import RewardCalculator
from .api.server import app, update_state, broadcast_state, simulation_state
from .utils import Config, setup_logger


def observation_to_vehicles(observation: np.ndarray, lane_count: int = 4) -> list:
    """Convert observation array to vehicle list for frontend."""
    vehicles = []

    for i, row in enumerate(observation):
        if np.all(row == 0):
            continue

        vehicles.append({
            "id": f"vehicle_{i}",
            "x": float(row[0]),
            "y": float(row[1]),
            "vx": float(row[2]),
            "vy": float(row[3]),
            "isEgo": i == 0,
        })

    return vehicles


def run_simulation(
    episodes: int = 10,
    max_steps: int = 100,
    step_delay: float = 0.1,
):
    """Run the simulation loop with WebSocket updates."""
    logger = setup_logger()
    logger.info("Starting Web-Enabled Simulation")

    # Initialize components
    config = Config()
    env = HighwayEnvironment().create()
    reward_calc = RewardCalculator(weights=config.reward_weights)

    # Initialize agent
    agent = DQNAgent(
        observation_shape=env.get_observation_shape(),
        n_actions=env.get_action_space_size()
    )

    decision_id = 0

    for episode in range(1, episodes + 1):
        logger.info(f"Episode {episode}/{episodes}")

        observation, info = env.reset()
        episode_reward = 0
        terminated = False
        truncated = False

        # Update state for episode start
        update_state(
            episode=episode,
            step=0,
            vehicles=observation_to_vehicles(observation),
            total_reward=0,
            risk_level=0,
        )

        for step in range(1, max_steps + 1):
            if terminated or truncated:
                break

            # Get action with probabilities
            action, action_probs = agent.predict(observation, deterministic=False)

            # Execute action
            next_observation, env_reward, terminated, truncated, info = env.step(action)

            # Calculate detailed reward breakdown
            reward_breakdown = reward_calc.calculate(
                observation=observation,
                action=action,
                next_observation=next_observation,
                terminated=terminated,
                info=info
            )

            # Calculate speed
            ego_speed = np.sqrt(next_observation[0, 2]**2 + next_observation[0, 3]**2)

            # Format reward components for frontend
            reward_components = [
                {"name": name, "value": value, "explanation": reward_breakdown.explanations.get(name, "")}
                for name, value in reward_breakdown.components.items()
            ]

            # Format action probabilities for frontend
            probs = action_probs.probabilities
            action_probabilities = [
                {
                    "action": env.ACTIONS[a],
                    "probability": p,
                    "isChosen": a == action
                }
                for a, p in probs.items()
            ]

            # Create decision record
            decision_id += 1
            decision = {
                "id": decision_id,
                "step": step,
                "action": env.ACTIONS[action],
                "reward": reward_breakdown.total_reward,
                "timestamp": time.time(),
            }

            # Update state
            update_state(
                episode=episode,
                step=step,
                vehicles=observation_to_vehicles(next_observation),
                decision=decision,
                reward_components=reward_components,
                action_probabilities=action_probabilities,
                total_reward=reward_breakdown.total_reward,
                risk_level=reward_breakdown.total_risk,
                current_action=env.ACTIONS[action],
                current_speed=ego_speed,
            )

            episode_reward += reward_breakdown.total_reward
            observation = next_observation

            # Small delay to allow frontend to update
            time.sleep(step_delay)

        logger.info(f"Episode {episode} finished. Reward: {episode_reward:.2f}")

        # Brief pause between episodes
        time.sleep(1.0)

    logger.info("Simulation complete")
    env.close()


def run_server_thread():
    """Run the FastAPI server in a separate thread."""
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="warning")


def main():
    """Main entry point - runs both server and simulation."""
    import argparse

    parser = argparse.ArgumentParser(
        description="Autonomous Decision Visualizer - Web Mode"
    )
    parser.add_argument("--episodes", "-e", type=int, default=10)
    parser.add_argument("--steps", "-s", type=int, default=100)
    parser.add_argument("--delay", "-d", type=float, default=0.2, help="Delay between steps (seconds)")
    args = parser.parse_args()

    # Start server in background thread
    server_thread = threading.Thread(target=run_server_thread, daemon=True)
    server_thread.start()

    print("\n" + "="*60)
    print("  AUTONOMOUS DECISION VISUALIZER - WEB MODE")
    print("="*60)
    print(f"\n  Server running at: http://localhost:8000")
    print(f"  Frontend should connect to: ws://localhost:8000/ws")
    print(f"\n  Start the frontend with:")
    print(f"    cd web && npm run dev")
    print(f"\n  Then open: http://localhost:5173")
    print("\n" + "="*60 + "\n")

    # Give server time to start
    time.sleep(2)

    # Run simulation
    run_simulation(
        episodes=args.episodes,
        max_steps=args.steps,
        step_delay=args.delay,
    )


if __name__ == "__main__":
    main()
