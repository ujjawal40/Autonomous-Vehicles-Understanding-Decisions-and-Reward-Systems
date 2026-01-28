# Autonomous Decision Visualizer - Makefile
# ==========================================

.PHONY: help install dev server web train docker-up docker-down clean test lint

# Default target
help:
	@echo "Autonomous Decision Visualizer"
	@echo "=============================="
	@echo ""
	@echo "Available commands:"
	@echo "  make install     - Install all dependencies"
	@echo "  make dev         - Run development servers (backend + frontend)"
	@echo "  make server      - Run FastAPI backend server"
	@echo "  make web         - Run React frontend"
	@echo "  make train       - Run training script"
	@echo "  make docker-up   - Start Docker services"
	@echo "  make docker-down - Stop Docker services"
	@echo "  make test        - Run tests"
	@echo "  make lint        - Run linters"
	@echo "  make clean       - Clean up temporary files"

# Install dependencies
install:
	pip install -r requirements.txt
	cd web && npm install

# Development mode - run both servers
dev:
	@echo "Starting development servers..."
	@make server &
	@sleep 2
	@make web

# Run FastAPI backend server
server:
	python scripts/run_server.py --reload

# Run React frontend
web:
	cd web && npm run dev

# Run training
train:
	python scripts/run_training.py

# Training with specific algorithm
train-dqn:
	python scripts/run_training.py --algorithm DQN --episodes 500

train-ddqn:
	python scripts/run_training.py --algorithm DoubleDQN --episodes 500

train-ppo:
	python scripts/run_training.py --algorithm PPO --episodes 500

train-a2c:
	python scripts/run_training.py --algorithm A2C --episodes 500

# Docker commands
docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f

docker-build:
	docker-compose build

# Database
db-migrate:
	@echo "Running database migrations..."
	python -c "from src.database import get_db; db = get_db(); db.create_all_tables()"

db-reset:
	@echo "Resetting database..."
	docker-compose down -v
	docker-compose up -d postgres
	@sleep 3
	@make db-migrate

# Testing
test:
	pytest tests/ -v

test-cov:
	pytest tests/ -v --cov=src --cov-report=html

# Linting
lint:
	black src/ --check
	black scripts/ --check

format:
	black src/
	black scripts/

# Build frontend
build-web:
	cd web && npm run build

# Clean up
clean:
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type d -name .pytest_cache -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	rm -rf .coverage htmlcov/
	rm -rf web/dist web/node_modules/.cache

# Full clean
clean-all: clean
	rm -rf models/
	rm -rf web/node_modules

# Production build
build:
	@make build-web
	@echo "Production build complete!"
