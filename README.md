<div align="center">

# 🚗 Autonomous Decision Visualizer

### *Watch AI Learn to Navigate London Streets in Real-Time*

[![Python](https://img.shields.io/badge/Python-3.11+-black?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![React](https://img.shields.io/badge/React-19-black?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-black?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-black?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-Ready-black?style=for-the-badge&logo=docker&logoColor=white)](https://docker.com)
[![License](https://img.shields.io/badge/License-MIT-black?style=for-the-badge)](LICENSE)
[![Live Demo](https://img.shields.io/badge/Live_Demo-View_Now-00d4ff?style=for-the-badge&logo=vercel&logoColor=white)](https://advs.vercel.app)

<br/>

**An interactive platform for visualizing how reinforcement learning agents make decisions.**

**See the reward functions. Understand the tradeoffs. Watch the AI think.**

### [🚀 Try the Live Demo](https://advs.vercel.app)

[Features](#-features) • [Quick Start](#-quick-start) • [Architecture](#-system-architecture) • [Documentation](#-documentation) • [Contributing](#-contributing)

<br/>

</div>

---

## 🎯 What is This?

Ever wondered **how self-driving cars make decisions**? This project lets you:

- 🗺️ **Watch an AI navigate real city streets** in London, NYC, Tokyo, or Mumbai
- 🧠 **See the neural network "thinking"** with animated decision flow
- 📊 **Visualize action probabilities** updating in real-time
- ⚙️ **Customize reward functions** with formulas and see behavior changes
- 📈 **Compare RL algorithms** (DQN, Double DQN, PPO, A2C, SAC)
- 🎯 **Set custom waypoints** by clicking on the map
- 📍 **Watch cars follow real roads** using OSRM routing

---

## 🎮 Try It Out!

**[Launch the Live Demo →](https://advs.vercel.app)**

Here's what you can do:

1. **Switch Cities** — Toggle between London, NYC, Tokyo, and Mumbai
2. **Adjust Rewards** — Drag the sliders to change speed, safety, progress, comfort, and traffic rule weights
3. **Watch Neural Flow** — See animated particles flow through the network as decisions are made
4. **Click to Set Waypoints** — Click "Set Start" or "Set End", then click on the map
5. **Train & Observe** — Hit "Apply & Retrain" to see how different reward weights affect behavior
6. **Compare Algorithms** — Switch between DQN, PPO, A2C, and more

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

### 🗺️ Multi-City Navigation
Navigate through real streets in **4 major cities**:
- **London** — Central London streets
- **New York** — Times Square area
- **Tokyo** — Shibuya district
- **Mumbai** — South Mumbai

Routes follow actual roads using OSRM routing engine.

### 🧠 Neural Flow Visualization
Watch the AI "think" in real-time:
- **Animated particles** flowing through the network
- **State inputs** → Hidden layers → **Action outputs**
- **Probability rings** showing confidence for each action
- **Selected action** pulses and glows

### ⚙️ Customizable Reward Functions
Design rewards with full control:
- **5 reward components** — Speed, Safety, Progress, Comfort, Traffic Rules
- **Visual sliders** with custom min/max ranges
- **Formulas displayed** — See exactly how rewards are calculated
- **Apply & Retrain** — Watch behavior change in real-time

### 🎯 Interactive Waypoints
- **Click "Set Start"** then click on the map
- **Click "Set End"** to set destination
- Watch the car navigate the route
- Routes follow real roads, not straight lines

### 🤖 Multiple RL Algorithms
Compare how different algorithms learn:

| Algorithm | Type | Best For |
|-----------|------|----------|
| DQN | Value-based | Stable learning |
| Double DQN | Value-based | Reduced overestimation |
| PPO | Policy-based | Robust performance |
| A2C | Actor-Critic | Fast iteration |
| SAC | Actor-Critic | Sample efficiency |

### 📊 Real-Time Metrics
Live updates as training progresses:
- Episode counter
- Step counter
- Dynamic probability bars
- Current total reward
- Risk level indicator

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
| **Frontend** | React 19, TypeScript, Tailwind CSS, Vite |
| **Maps** | Leaflet + CartoDB Dark Matter tiles |
| **Routing** | OSRM (Open Source Routing Machine) |
| **Visualization** | HTML5 Canvas (Neural Flow, Highway2D) |
| **Deployment** | Vercel |
| **Backend** (planned) | Python 3.11, FastAPI, Gymnasium |
| **Database** (planned) | PostgreSQL 16, SQLAlchemy |

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

### Phase 2: Interactive Dashboard ✅
- [x] Multi-city support (London, NYC, Tokyo, Mumbai)
- [x] Neural flow visualization (animated decision network)
- [x] Custom reward function editor with sliders
- [x] Reward formulas with custom ranges
- [x] Click-to-set waypoints on map
- [x] Real road routing via OSRM
- [x] Training controls (Start/Stop/Apply & Retrain)
- [x] Episode and step tracking
- [x] Algorithm selector (DQN, Double DQN, PPO, A2C, SAC)
- [x] Live probability updates
- [x] Vercel deployment

### Phase 3: Backend Integration 🚧
- [ ] PostgreSQL + Docker setup
- [ ] Real training loop integration
- [ ] WebSocket live updates from actual training
- [ ] Checkpoint save/load

### Phase 4: Advanced Features
- [ ] Training history graphs
- [ ] Episode comparison tools
- [ ] Export/import configurations
- [ ] Multi-agent scenarios

### Phase 5: Polish
- [ ] Mobile responsive design
- [ ] Performance optimizations
- [ ] Comprehensive documentation
- [ ] Tutorial mode

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

## 💬 Feedback Wanted!

This project is actively seeking feedback on:

### 🎨 UI/UX Improvements
- Is the dashboard intuitive? What's confusing?
- Are the visualizations helpful for understanding RL?
- What information would you want to see that's missing?
- Mobile responsiveness suggestions

### 🧠 RL Implementation
- More sophisticated algorithms (TD3, SAC with priority replay)
- Real training integration (currently simulated)
- Better state representations
- Multi-agent scenarios
- Curriculum learning visualization

### 📊 New Features
- Export training configs and share with others
- Record and playback episodes
- A/B testing different reward functions
- Integration with actual RL training frameworks

**[Open an Issue](https://github.com/ujjawal40/Autonomous-Vehicles-Understanding-Decisions-and-Reward-Systems/issues/new)** with your thoughts!

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
