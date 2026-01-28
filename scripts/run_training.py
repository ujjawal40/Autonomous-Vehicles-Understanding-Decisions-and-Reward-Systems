#!/usr/bin/env python3
"""
Training Script

Run RL training from command line.
"""

import argparse
import asyncio
import signal
import sys
from typing import Optional

# Add parent directory to path
sys.path.insert(0, str(__file__).rsplit('/', 2)[0])

from src.environments import create_highway_env
from src.algorithms import create_agent, DEFAULT_CONFIGS
from src.training import TrainingEngine, TrainingConfig


def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Train RL agents for autonomous vehicle navigation"
    )

    parser.add_argument(
        "--algorithm",
        type=str,
        default="DQN",
        choices=["DQN", "DoubleDQN", "PPO", "A2C"],
        help="RL algorithm to use"
    )

    parser.add_argument(
        "--episodes",
        type=int,
        default=1000,
        help="Number of episodes to train"
    )

    parser.add_argument(
        "--max-steps",
        type=int,
        default=200,
        help="Maximum steps per episode"
    )

    parser.add_argument(
        "--learning-rate",
        type=float,
        default=None,
        help="Learning rate (uses algorithm default if not specified)"
    )

    parser.add_argument(
        "--gamma",
        type=float,
        default=0.99,
        help="Discount factor"
    )

    parser.add_argument(
        "--render",
        action="store_true",
        help="Render environment during training"
    )

    parser.add_argument(
        "--save-dir",
        type=str,
        default="models",
        help="Directory to save trained models"
    )

    parser.add_argument(
        "--load-model",
        type=str,
        default=None,
        help="Path to model to load and continue training"
    )

    parser.add_argument(
        "--eval-interval",
        type=int,
        default=100,
        help="Evaluate every N episodes"
    )

    parser.add_argument(
        "--log-interval",
        type=int,
        default=10,
        help="Log metrics every N episodes"
    )

    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed"
    )

    return parser.parse_args()


def create_config(args) -> TrainingConfig:
    """Create training configuration from arguments."""
    # Get default config for algorithm
    algo_config = DEFAULT_CONFIGS.get(args.algorithm, {}).copy()

    # Override with command line arguments
    if args.learning_rate is not None:
        algo_config["learning_rate"] = args.learning_rate
    algo_config["gamma"] = args.gamma

    return TrainingConfig(
        algorithm=args.algorithm,
        hyperparameters=algo_config,
        max_episodes=args.episodes,
        max_steps_per_episode=args.max_steps,
        eval_interval=args.eval_interval,
        log_interval=args.log_interval,
        save_dir=args.save_dir,
        seed=args.seed,
    )


async def main():
    """Main training loop."""
    args = parse_args()

    print("=" * 60)
    print("Autonomous Vehicle Navigation Training")
    print("=" * 60)
    print(f"Algorithm: {args.algorithm}")
    print(f"Episodes: {args.episodes}")
    print(f"Max steps per episode: {args.max_steps}")
    print("=" * 60)

    # Create environment
    print("\nInitializing environment...")
    env = create_highway_env()

    # Get observation and action space dimensions
    obs_dim = env.observation_space.shape[0] * env.observation_space.shape[1]
    action_dim = env.action_space.n

    print(f"Observation space: {env.observation_space.shape}")
    print(f"Action space: {action_dim}")

    # Create agent
    print(f"\nInitializing {args.algorithm} agent...")
    algo_config = DEFAULT_CONFIGS.get(args.algorithm, {}).copy()
    if args.learning_rate is not None:
        algo_config["learning_rate"] = args.learning_rate
    algo_config["gamma"] = args.gamma

    agent = create_agent(
        algorithm=args.algorithm,
        obs_dim=obs_dim,
        action_dim=action_dim,
        config=algo_config,
    )

    # Load model if specified
    if args.load_model:
        print(f"Loading model from {args.load_model}")
        agent.load(args.load_model)

    # Create training config
    config = create_config(args)

    # Create training engine
    print("\nInitializing training engine...")
    engine = TrainingEngine(
        agent=agent,
        env=env,
        config=config,
    )

    # Set up signal handlers for graceful shutdown
    shutdown_event = asyncio.Event()

    def signal_handler(sig, frame):
        print("\n\nReceived shutdown signal, saving and exiting...")
        shutdown_event.set()

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    # Training callbacks
    def on_episode_end(episode: int, reward: float, steps: int):
        if episode % args.log_interval == 0:
            print(f"Episode {episode}: reward={reward:.2f}, steps={steps}")

    def on_training_end(total_episodes: int, best_reward: float):
        print(f"\nTraining completed!")
        print(f"Total episodes: {total_episodes}")
        print(f"Best reward: {best_reward:.2f}")

    engine.on_episode_end = on_episode_end
    engine.on_training_end = on_training_end

    # Run training
    print("\nStarting training...\n")

    try:
        await engine.train()
    except asyncio.CancelledError:
        print("Training cancelled")
    finally:
        # Save final model
        save_path = f"{args.save_dir}/{args.algorithm}_final.pt"
        agent.save(save_path)
        print(f"Model saved to {save_path}")

        # Cleanup
        env.close()

    print("\nDone!")


if __name__ == "__main__":
    asyncio.run(main())
