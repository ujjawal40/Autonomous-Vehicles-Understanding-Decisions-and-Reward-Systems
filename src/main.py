"""
Main Entry Point

Run the Autonomous Decision Visualizer demo.
"""

import argparse
import numpy as np
from typing import Optional

from .environment import HighwayEnvironment
from .agents import DQNAgent
from .rewards import RewardCalculator
from .visualization import TerminalVisualizer, DecisionDisplay
from .visualization.decision_display import DecisionFrame
from .utils import Config, setup_logger


def run_demo(
    episodes: int = 3,
    max_steps: int = 100,
    render: bool = False,
    train_first: bool = False,
    training_steps: int = 10000
) -> None:
    """
    Run the demonstration showing RL decision-making.

    Args:
        episodes: Number of episodes to run
        max_steps: Maximum steps per episode
        render: Whether to render the environment
        train_first: Whether to train the agent before demo
        training_steps: Number of training steps if train_first=True
    """
    logger = setup_logger()
    logger.info("Starting Autonomous Decision Visualizer Demo")

    # Initialize components
    config = Config()
    env = HighwayEnvironment().create()
    reward_calc = RewardCalculator(weights=config.reward_weights)
    visualizer = TerminalVisualizer()
    decision_display = DecisionDisplay()

    # Initialize agent
    agent = DQNAgent(
        observation_shape=env.get_observation_shape(),
        n_actions=env.get_action_space_size()
    )

    # Train if requested
    if train_first:
        logger.info(f"Training agent for {training_steps} steps...")
        agent.create_model(env.env)
        agent.train(total_timesteps=training_steps)
        logger.info("Training complete!")

    # Run demo episodes
    for episode in range(1, episodes + 1):
        logger.info(f"\n{'='*50}")
        logger.info(f"Episode {episode}/{episodes}")
        logger.info('='*50)

        observation, info = env.reset()
        episode_reward = 0
        terminated = False
        truncated = False

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

            # Visualize the decision
            visualizer.display_step(
                step=step,
                action=action,
                action_name=env.ACTIONS[action],
                reward_breakdown=reward_breakdown.to_dict(),
                action_probs=action_probs.probabilities
            )

            # Show action probabilities
            visualizer.display_action_probabilities(
                action_probs=action_probs.probabilities,
                chosen_action=action,
                action_names=env.ACTIONS
            )

            # Store frame
            ego_speed = np.sqrt(next_observation[0, 2]**2 + next_observation[0, 3]**2)
            decision_display.add_frame(DecisionFrame(
                step=step,
                state_summary=f"Speed: {ego_speed:.1f} m/s",
                action=action,
                action_name=env.ACTIONS[action],
                reward=reward_breakdown.total_reward,
                reward_components=reward_breakdown.components,
                risk=reward_breakdown.total_risk,
                confidence=action_probs.confidence
            ))

            episode_reward += reward_breakdown.total_reward
            observation = next_observation

            # Render if requested
            if render:
                env.render()

        # Episode summary
        visualizer.display_episode_summary(
            episode=episode,
            total_steps=step,
            total_reward=episode_reward,
            terminated_by_collision=terminated
        )

    # Final statistics
    stats = decision_display.get_statistics()
    logger.info("\n" + "="*50)
    logger.info("DEMO COMPLETE - Statistics:")
    logger.info(f"  Total decisions: {stats.get('total_frames', 0)}")
    logger.info(f"  Average reward: {stats.get('avg_reward', 0):.3f}")
    logger.info(f"  Average risk: {stats.get('avg_risk', 0):.1%}")
    logger.info(f"  Action distribution: {stats.get('action_distribution', {})}")
    logger.info("="*50)

    env.close()


def main():
    """Main entry point with argument parsing."""
    parser = argparse.ArgumentParser(
        description="Autonomous Decision Visualizer - See how AI makes driving decisions"
    )

    parser.add_argument(
        "--episodes", "-e",
        type=int,
        default=3,
        help="Number of episodes to run (default: 3)"
    )

    parser.add_argument(
        "--steps", "-s",
        type=int,
        default=50,
        help="Maximum steps per episode (default: 50)"
    )

    parser.add_argument(
        "--render", "-r",
        action="store_true",
        help="Render the environment visually"
    )

    parser.add_argument(
        "--train", "-t",
        action="store_true",
        help="Train the agent before running demo"
    )

    parser.add_argument(
        "--training-steps",
        type=int,
        default=10000,
        help="Number of training steps (default: 10000)"
    )

    args = parser.parse_args()

    run_demo(
        episodes=args.episodes,
        max_steps=args.steps,
        render=args.render,
        train_first=args.train,
        training_steps=args.training_steps
    )


if __name__ == "__main__":
    main()
