# Contributing to Autonomous Decision Visualizer

First off, thank you for considering contributing! 🎉

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Style Guidelines](#style-guidelines)

---

## Code of Conduct

This project adheres to a Code of Conduct. By participating, you are expected to uphold this code. Please be respectful and inclusive.

---

## Getting Started

### Find Something to Work On

- 🐛 **Bug fixes**: Check [issues labeled `bug`](https://github.com/ujjawal40/Autonomous-Vehicles-Understanding-Decisions-and-Reward-Systems/labels/bug)
- ✨ **Features**: Check [issues labeled `enhancement`](https://github.com/ujjawal40/Autonomous-Vehicles-Understanding-Decisions-and-Reward-Systems/labels/enhancement)
- 📝 **Documentation**: Check [issues labeled `documentation`](https://github.com/ujjawal40/Autonomous-Vehicles-Understanding-Decisions-and-Reward-Systems/labels/documentation)
- 🆕 **Good first issues**: Perfect for newcomers - [good first issues](https://github.com/ujjawal40/Autonomous-Vehicles-Understanding-Decisions-and-Reward-Systems/labels/good%20first%20issue)

### Before You Start

1. Check if an issue already exists for what you want to work on
2. If not, create an issue describing your proposed change
3. Wait for feedback before starting significant work

---

## How to Contribute

### Reporting Bugs

When reporting bugs, please include:

```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**
 - OS: [e.g., macOS 14.0]
 - Python version: [e.g., 3.11.0]
 - Node version: [e.g., 20.0.0]
 - Browser: [e.g., Chrome 120]
```

### Suggesting Features

Feature requests should include:

- **Problem**: What problem does this solve?
- **Solution**: Your proposed solution
- **Alternatives**: Any alternatives you considered
- **Additional context**: Mockups, examples, etc.

---

## Development Setup

### Prerequisites

- Python 3.11+
- Node.js 20+
- Docker & Docker Compose
- Git

### Setup Steps

```bash
# 1. Fork the repository on GitHub

# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/Autonomous-Vehicles-Understanding-Decisions-and-Reward-Systems.git
cd Autonomous-Vehicles-Understanding-Decisions-and-Reward-Systems

# 3. Add upstream remote
git remote add upstream https://github.com/ujjawal40/Autonomous-Vehicles-Understanding-Decisions-and-Reward-Systems.git

# 4. Create a virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 5. Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt  # Dev dependencies

# 6. Install frontend dependencies
cd web
npm install
cd ..

# 7. Start the database
docker-compose up -d

# 8. Run tests to verify setup
pytest
```

### Running the Application

```bash
# Terminal 1: Backend
python -m src.london.simulation

# Terminal 2: Frontend
cd web && npm run dev
```

---

## Pull Request Process

### 1. Create a Branch

```bash
# Update your main branch
git checkout main
git pull upstream main

# Create a feature branch
git checkout -b feature/your-feature-name
```

### 2. Make Your Changes

- Write clear, readable code
- Add tests for new functionality
- Update documentation as needed

### 3. Test Your Changes

```bash
# Run Python tests
pytest

# Run frontend tests
cd web && npm test

# Run linting
ruff check .
cd web && npm run lint
```

### 4. Commit Your Changes

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Format: <type>(<scope>): <description>

# Examples:
git commit -m "feat(london): add A* pathfinding optimization"
git commit -m "fix(ui): correct probability display rounding"
git commit -m "docs(readme): update installation instructions"
git commit -m "test(agent): add DQN learning tests"
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, no code change
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `test`: Adding tests
- `chore`: Maintenance tasks

### 5. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub with:
- Clear title describing the change
- Description of what and why
- Link to related issue(s)
- Screenshots if UI changes

---

## Style Guidelines

### Python

- Follow [PEP 8](https://peps.python.org/pep-0008/)
- Use type hints
- Maximum line length: 100 characters
- Use `ruff` for linting

```python
# Good
def calculate_reward(
    state: np.ndarray,
    action: int,
    info: dict[str, Any]
) -> float:
    """Calculate the reward for a given state-action pair.

    Args:
        state: Current observation
        action: Action taken
        info: Additional information

    Returns:
        Calculated reward value
    """
    ...
```

### TypeScript/React

- Use TypeScript strict mode
- Prefer functional components
- Use descriptive variable names
- Follow ESLint rules

```typescript
// Good
interface RewardComponentProps {
  name: string;
  value: number;
  explanation: string;
}

function RewardComponent({ name, value, explanation }: RewardComponentProps) {
  return (
    <div className="reward-component">
      <span className="name">{name}</span>
      <span className="value">{value.toFixed(2)}</span>
    </div>
  );
}
```

### Git Commits

- Use present tense ("Add feature" not "Added feature")
- Use imperative mood ("Move cursor to..." not "Moves cursor to...")
- Keep first line under 50 characters
- Reference issues when applicable

---

## Questions?

Feel free to:
- Open an issue with the `question` label
- Start a discussion in GitHub Discussions

Thank you for contributing! 🚀
