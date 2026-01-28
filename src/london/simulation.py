"""
London Navigation Simulation

Runs the RL navigation simulation with WebSocket updates to frontend.
"""

import time
import threading
from typing import Optional

import numpy as np
import uvicorn

from .environment import LondonNavigationEnv
from .agent import NavigationAgent, ProbabilityTracker, Experience
from ..api.london_server import (
    app,
    update_navigation_state,
    set_map_data,
    simulation_state
)
from ..utils import setup_logger


def run_navigation_simulation(
    episodes: int = 20,
    max_steps: int = 50,
    step_delay: float = 0.3,
    start_node: Optional[int] = None,
    end_node: Optional[int] = None,
):
    """Run the London navigation simulation."""
    logger = setup_logger()
    logger.info("Starting London Navigation Simulation")

    # Initialize environment and agent
    env = LondonNavigationEnv(max_steps=max_steps)
    agent = NavigationAgent(
        state_dim=env.observation_space.shape[0],
        n_actions=env.action_space.n,
    )
    prob_tracker = ProbabilityTracker(n_actions=env.action_space.n)

    # Send map data to frontend
    set_map_data(env.map.to_dict())

    total_rewards = []

    for episode in range(1, episodes + 1):
        logger.info(f"Episode {episode}/{episodes}")

        # Reset environment
        options = {}
        if start_node is not None and end_node is not None:
            options = {'start': start_node, 'end': end_node}

        observation, info = env.reset(options=options if options else None)

        episode_reward = 0
        terminated = False
        truncated = False

        # Update frontend with initial state
        update_navigation_state(
            episode=episode,
            step=0,
            current_node=info['start_node'],
            target_node=info['target_node'],
            path_taken=[info['start_node']],
            optimal_path=info.get('optimal_path', []),
            total_reward=0,
            agent_stats=agent.get_stats(),
            probability_evolution=prob_tracker.get_evolution_data(),
        )

        for step in range(1, max_steps + 1):
            if terminated or truncated:
                break

            # Get available actions
            available_actions = [a[0] for a in env.get_available_actions()]

            if not available_actions:
                # Dead end - should not happen in properly connected map
                logger.warning(f"No available actions at node {env.state.current_node}")
                break

            # Select action
            action, action_probs = agent.select_action(
                observation,
                available_actions,
                deterministic=False
            )

            # Execute action
            next_observation, reward, terminated, truncated, info = env.step(action)

            # Record experience
            agent.store_experience(Experience(
                state=observation,
                action=action,
                reward=reward,
                next_state=next_observation,
                done=terminated or truncated,
            ))

            # Train agent
            loss = agent.train_step()

            # Record probabilities
            prob_tracker.record(
                episode=episode,
                step=step,
                action_probs=action_probs,
                chosen_action=action,
                reward=reward,
                node_id=info['current_node'],
            )

            episode_reward += reward

            # Update frontend
            update_navigation_state(
                episode=episode,
                step=step,
                current_node=info['current_node'],
                target_node=info['target_node'],
                path_taken=info['path_taken'],
                optimal_path=info.get('optimal_path', []),
                current_action=action,
                action_probs=action_probs,
                reward=float(reward),
                total_reward=float(episode_reward),
                distance_traveled=float(info['distance_traveled']),
                current_speed=float(info['current_speed']),
                agent_stats=agent.get_stats(),
                probability_evolution=prob_tracker.get_evolution_data(),
                step_history=prob_tracker.get_full_history()[-50:],  # Last 50 steps
            )

            observation = next_observation
            time.sleep(step_delay)

        # End of episode
        agent.decay_epsilon()
        total_rewards.append(episode_reward)

        logger.info(f"Episode {episode} finished. Reward: {episode_reward:.2f}, "
                   f"Epsilon: {agent.epsilon:.3f}")

        # Brief pause between episodes
        time.sleep(1.0)

    # Simulation complete
    avg_reward = np.mean(total_rewards[-10:]) if total_rewards else 0

    logger.info(f"Simulation complete. Average reward (last 10): {avg_reward:.2f}")

    return {
        'total_episodes': episodes,
        'final_epsilon': agent.epsilon,
        'average_reward': avg_reward,
        'probability_evolution': prob_tracker.get_evolution_data(),
    }


def run_server_thread(port: int = 8001):
    """Run the FastAPI server in a separate thread."""
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="warning")


def main():
    """Main entry point for London navigation."""
    import argparse

    parser = argparse.ArgumentParser(
        description="London Navigation Simulator"
    )
    parser.add_argument("--episodes", "-e", type=int, default=20)
    parser.add_argument("--steps", "-s", type=int, default=50)
    parser.add_argument("--delay", "-d", type=float, default=0.3)
    parser.add_argument("--port", "-p", type=int, default=8001)
    args = parser.parse_args()

    # Start server in background thread
    server_thread = threading.Thread(
        target=run_server_thread,
        args=(args.port,),
        daemon=True
    )
    server_thread.start()

    print("\n" + "="*60)
    print("  LONDON NAVIGATION SIMULATOR")
    print("="*60)
    print(f"\n  Server running at: http://localhost:{args.port}")
    print(f"  WebSocket: ws://localhost:{args.port}/ws/london")
    print(f"\n  Open the frontend and select 'London Navigation' mode")
    print("\n" + "="*60 + "\n")

    # Give server time to start
    time.sleep(2)

    # Run simulation
    try:
        run_navigation_simulation(
            episodes=args.episodes,
            max_steps=args.steps,
            step_delay=args.delay,
        )

        print("\n" + "="*60)
        print("  Simulation complete!")
        print("  Server still running. Press Ctrl+C to stop.")
        print("="*60 + "\n")

        while True:
            time.sleep(1)

    except KeyboardInterrupt:
        print("\nShutting down...")


if __name__ == "__main__":
    main()
