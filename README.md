# Autonomous Decision Visualizer

**See how autonomous systems make decisions in real-time.**

This project visualizes how Reinforcement Learning agents make driving decisions, showing reward calculations, risk assessments, and action probabilities - making AI decision-making transparent and understandable.

![Python](https://img.shields.io/badge/Python-3.9%2B-blue)
![License](https://img.shields.io/badge/License-MIT-green)
![Status](https://img.shields.io/badge/Status-Phase%201-orange)

## What This Project Does

- **Visualizes RL Decisions**: See exactly why an autonomous agent chose to turn left, speed up, or slow down
- **Reward Decomposition**: Break down rewards into components (speed, safety, efficiency, etc.)
- **Risk Assessment**: Real-time risk scoring for each decision
- **Action Probabilities**: See the probability distribution over all possible actions

## Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/ujjawal40/Autonomous-Vehicles-Understanding-Decisions-and-Reward-Systems.git
cd Autonomous-Vehicles-Understanding-Decisions-and-Reward-Systems

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Run the Demo

```bash
# Basic demo (random agent, 3 episodes)
python -m src.main

# With trained agent
python -m src.main --train --training-steps 20000

# More options
python -m src.main --episodes 5 --steps 100 --render
```

## Project Structure

```
.
├── src/
│   ├── environment/       # Environment wrappers (Highway-env)
│   │   └── highway_wrapper.py
│   ├── agents/           # RL agents (DQN, etc.)
│   │   └── dqn_agent.py
│   ├── rewards/          # Reward calculation & decomposition
│   │   └── reward_calculator.py
│   ├── visualization/    # Display components
│   │   ├── terminal_visualizer.py
│   │   └── decision_display.py
│   ├── utils/           # Configuration & utilities
│   └── main.py          # Entry point
├── tests/               # Unit tests
├── examples/            # Example scripts
├── docs/               # Documentation
└── requirements.txt    # Dependencies
```

## Understanding the Output

When you run the demo, you'll see:

```
┌──────────────────── Step 15 ────────────────────┐
│ Component      │ Value   │ Explanation          │
├────────────────┼─────────┼──────────────────────┤
│ ACTION         │ 3 (FASTER) │ Decision made     │
│ SPEED          │ +0.380  │ Good speed (28 m/s)  │
│ COLLISION      │  0.000  │ No collision - safe  │
│ LANE_CHANGE    │  0.000  │ Maintained lane      │
│ HEADWAY        │ +0.200  │ Safe distance (35m)  │
├────────────────┼─────────┼──────────────────────┤
│ TOTAL REWARD   │ +0.580  │                      │
│ RISK LEVEL     │ 5%      │ Normal conditions    │
└────────────────┴─────────┴──────────────────────┘

Action Probabilities:
  FASTER      45% ████████████████░░░░░░░░ ← CHOSEN
  IDLE        30% ██████████░░░░░░░░░░░░░░
  LANE_RIGHT  15% █████░░░░░░░░░░░░░░░░░░░
  LANE_LEFT    7% ██░░░░░░░░░░░░░░░░░░░░░░
  SLOWER       3% █░░░░░░░░░░░░░░░░░░░░░░░
```

## Reward Components Explained

| Component | Description | Positive | Negative |
|-----------|-------------|----------|----------|
| **Speed** | Maintaining efficient speed | Near target speed | Too slow/fast |
| **Collision** | Safety violations | - | Crash detected |
| **Lane Change** | Stability preference | - | Unnecessary changes |
| **Headway** | Following distance | Safe distance | Too close |
| **Lane Position** | Lane discipline | Right lanes (US) | - |

## Roadmap

### Phase 1: Foundation ✅
- [x] Highway-env integration
- [x] Reward decomposition
- [x] Terminal visualization
- [x] Basic DQN agent

### Phase 2: Web UI (Coming Soon)
- [ ] Dark mode web interface
- [ ] Real-time visualization dashboard
- [ ] Interactive controls
- [ ] Multiple environment support

### Phase 3: Advanced Features
- [ ] Spacecraft trajectory optimization
- [ ] Multiple RL algorithms (PPO, A2C)
- [ ] Custom environment builder
- [ ] Export training data

## Contributing

Contributions welcome! Please read our contributing guidelines (coming soon).

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- [Highway-env](https://github.com/Farama-Foundation/HighwayEnv) for the driving environment
- [Stable-Baselines3](https://github.com/DLR-RM/stable-baselines3) for RL implementations
- [Rich](https://github.com/Textualize/rich) for terminal visualization
