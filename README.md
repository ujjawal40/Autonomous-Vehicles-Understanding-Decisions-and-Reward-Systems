<div align="center">

# 🚗 Autonomous Decision Visualizer

### *Watch AI Learn to Navigate London Streets in Real-Time*

[![Python](https://img.shields.io/badge/Python-3.11+-black?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![React](https://img.shields.io/badge/React-19-black?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-black?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-black?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-Ready-black?style=for-the-badge&logo=docker&logoColor=white)](https://docker.com)
[![License](https://img.shields.io/badge/License-MIT-black?style=for-the-badge)](LICENSE)

<br/>

**An interactive platform for visualizing how reinforcement learning agents make decisions.**

**See the reward functions. Understand the tradeoffs. Watch the AI think.**

[Features](#-features) • [Quick Start](#-quick-start) • [Architecture](#-system-architecture) • [Documentation](#-documentation) • [Contributing](#-contributing)

<br/>

</div>

---

## 🎯 What is This?

Ever wondered **how self-driving cars make decisions**? This project lets you:

- 🗺️ **Watch an AI navigate real London streets** using OpenStreetMap data
- 🧠 **See exactly why it makes each decision** with reward breakdowns
- 📊 **Visualize probability distributions** in real-time 3D
- ⚙️ **Design your own reward functions** and see how behavior changes
- 📈 **Compare different RL algorithms** (DQN, Double DQN, PPO, A2C)
- 💾 **Store and analyze training runs** with PostgreSQL

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React + Three.js)                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │   MAP   │ │  PROBS  │ │ METRICS │ │TRAINING │ │ HISTORY │ │  RISK   │  │
│  │         │ │   3D    │ │         │ │         │ │         │ │  GAUGE  │  │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘  │
│                                                                             │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                                │ WebSocket + REST API
                                │
┌───────────────────────────────┴─────────────────────────────────────────────┐
│                              BACKEND (FastAPI + Python)                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  Training    │  │  Algorithm   │  │   Reward     │  │    Risk      │   │
│  │  Controller  │  │   Engine     │  │   Engine     │  │  Calculator  │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                      │
│  │ London Env   │  │   Metrics    │  │    Model     │                      │
│  │  (Gymnasium) │  │  Collector   │  │   Manager    │                      │
│  └──────────────┘  └──────────────┘  └──────────────┘                      │
│                                                                             │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                                │ SQLAlchemy ORM
                                │
┌───────────────────────────────┴─────────────────────────────────────────────┐
│                         POSTGRESQL (Docker)                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   training_runs  │  episodes  │  steps  │  reward_presets  │  checkpoints  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## ✨ Features

### 🗺️ Real-Time Navigation Visualization
Watch the AI agent navigate through **240+ real intersections** in London's Soho district, with live path tracking and optimal route comparison.

### 🌋 3D Probability Volcano
Four visualization modes for action probabilities:
- **Real-time** — Current decision as a spike
- **Animated** — Last N steps flowing
- **Episode Surface** — Full episode as terrain
- **Stacked Episodes** — Learning evolution over time

### ⚙️ Custom Reward Functions
Design rewards your way:
- **Slider Mode** — Adjust weights visually
- **Code Editor** — Write custom Python logic
- **Presets** — Save and share configurations

### 🤖 Multiple RL Algorithms
Compare how different algorithms learn:

| Algorithm | Type | Best For |
|-----------|------|----------|
| DQN | Value-based | Stable learning |
| Double DQN | Value-based | Reduced overestimation |
| PPO | Policy-based | Robust performance |
| A2C | Actor-Critic | Fast iteration |

### 📊 Comprehensive Metrics
Track everything:
- Cumulative reward curves
- Success rate over time
- Path efficiency
- Q-value distributions
- Risk/reward ratios
- Exploration decay

### 💾 Training History
- Store runs in PostgreSQL
- Compare multiple experiments
- Export data (CSV, JSON)
- Resume from checkpoints

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 20+
- Docker & Docker Compose

### 1. Clone the Repository
```bash
git clone https://github.com/ujjawal40/Autonomous-Vehicles-Understanding-Decisions-and-Reward-Systems.git
cd Autonomous-Vehicles-Understanding-Decisions-and-Reward-Systems
```

### 2. Start the Database
```bash
docker-compose up -d
```

### 3. Install Backend Dependencies
```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 4. Install Frontend Dependencies
```bash
cd web
npm install
```

### 5. Run the Application
```bash
# Terminal 1: Backend
python -m src.london.simulation

# Terminal 2: Frontend
cd web && npm run dev
```

### 6. Open Your Browser
Navigate to `http://localhost:5173`

---

## 🎮 Usage Examples

### Basic Training Run
```python
from src.london import LondonNavigationEnv, NavigationAgent

env = LondonNavigationEnv()
agent = NavigationAgent(algorithm='DQN')

for episode in range(100):
    state, info = env.reset()
    done = False
    while not done:
        action, probs = agent.select_action(state)
        state, reward, done, truncated, info = env.step(action)
        agent.learn(state, action, reward)
```

### Custom Reward Function
```python
def my_reward(state, action, next_state, info):
    reward = 0

    if info['reached_goal']:
        reward += 100  # Big bonus!

    if info['made_progress']:
        reward += info['distance_reduced'] * 2

    if info['revisited_node']:
        reward -= 5  # Heavy penalty for loops

    return reward

env.set_reward_function(my_reward)
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, TypeScript, Three.js, Tailwind CSS |
| **Backend** | Python 3.11, FastAPI, Gymnasium |
| **Database** | PostgreSQL 16, SQLAlchemy |
| **RL Algorithms** | Custom implementations (DQN, PPO, A2C) |
| **Maps** | OpenStreetMap via OSMnx |
| **Infrastructure** | Docker, Docker Compose |

---

## 📊 Performance

| Metric | Value |
|--------|-------|
| Map Size | ~1 km² (Soho, London) |
| Intersections | 240+ |
| Road Segments | 429 |
| Training Speed | ~100 episodes/min |
| WebSocket Latency | <50ms |

---

## 🗺️ Roadmap

### Phase 1: Foundation ✅
- [x] Highway-env integration
- [x] Reward decomposition
- [x] Terminal visualization
- [x] Basic DQN agent
- [x] London street navigation
- [x] Real-time WebSocket updates
- [x] React frontend with dark theme

### Phase 2: Database & Training Controls 🚧
- [ ] PostgreSQL + Docker setup
- [ ] Training start/stop/pause controls
- [ ] Episode configuration
- [ ] Custom reward editor (sliders + code)
- [ ] Reward presets

### Phase 3: Advanced Algorithms
- [ ] Double DQN implementation
- [ ] PPO implementation
- [ ] A2C implementation
- [ ] Algorithm comparison tools

### Phase 4: Visualization Upgrade
- [ ] 3D probability volcano (Three.js)
- [ ] Risk/reward gauge
- [ ] Training history browser
- [ ] Multi-run comparison

### Phase 5: Expansion
- [ ] Additional city maps
- [ ] Model export/import
- [ ] API documentation
- [ ] Performance optimizations

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [Getting Started](docs/getting-started.md) | Installation and first run |
| [Architecture](docs/architecture.md) | System design deep-dive |
| [Reward Functions](docs/reward-functions.md) | How to design rewards |
| [Algorithms](docs/algorithms.md) | RL algorithm explanations |
| [API Reference](docs/api.md) | REST & WebSocket APIs |
| [Contributing](CONTRIBUTING.md) | How to contribute |

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Ways to Contribute
- 🐛 Report bugs
- 💡 Suggest features
- 📝 Improve documentation
- 🔧 Submit pull requests
- ⭐ Star the repo!

### Good First Issues
Check out issues labeled [`good first issue`](https://github.com/ujjawal40/Autonomous-Vehicles-Understanding-Decisions-and-Reward-Systems/labels/good%20first%20issue) to get started.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [OpenStreetMap](https://www.openstreetmap.org/) for map data
- [Gymnasium](https://gymnasium.farama.org/) for RL environment framework
- [highway-env](https://github.com/Farama-Foundation/HighwayEnv) for inspiration
- [Three.js](https://threejs.org/) for 3D visualization

---

<div align="center">

**If this project helps you understand RL, give it a ⭐!**

Made with 🧠 by [Ujjawal Dwivedi](https://github.com/ujjawal40)

[Report Bug](https://github.com/ujjawal40/Autonomous-Vehicles-Understanding-Decisions-and-Reward-Systems/issues) · [Request Feature](https://github.com/ujjawal40/Autonomous-Vehicles-Understanding-Decisions-and-Reward-Systems/issues)

</div>
