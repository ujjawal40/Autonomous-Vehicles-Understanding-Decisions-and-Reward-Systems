"""
Training Runner

Service that manages training jobs and broadcasts updates via WebSocket.
"""

import asyncio
from typing import Dict, Any, Optional, Set
from datetime import datetime
import json

from fastapi import WebSocket

from src.database import get_db, crud
from src.training.engine import TrainingEngine, TrainingConfig, EpisodeResult, StepData


class TrainingRunner:
    """
    Manages active training jobs and WebSocket connections.

    Features:
    - Run multiple training jobs concurrently
    - Broadcast updates to connected clients
    - Persist results to database
    """

    def __init__(self):
        self.active_jobs: Dict[int, TrainingEngine] = {}
        self.websockets: Dict[int, Set[WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def start_training(
        self,
        run_id: int,
        config: Dict[str, Any],
    ) -> bool:
        """Start a new training job."""
        async with self._lock:
            if run_id in self.active_jobs:
                return False

            # Create training config
            training_config = TrainingConfig(
                run_id=run_id,
                algorithm=config['algorithm'],
                hyperparameters=config.get('hyperparameters', {}),
                reward_mode=config.get('reward_mode', 'sliders'),
                reward_config=config.get('reward_config', {}),
                reward_code=config.get('reward_code'),
                total_episodes=config['total_episodes'],
                max_steps_per_episode=config.get('max_steps_per_episode', 50),
            )

            # Create engine with callbacks
            engine = TrainingEngine(
                config=training_config,
                on_step=lambda data: asyncio.create_task(
                    self._broadcast_step(run_id, data)
                ),
                on_episode_start=lambda ep, start, end: asyncio.create_task(
                    self._broadcast_episode_start(run_id, ep, start, end)
                ),
                on_episode_end=lambda result: asyncio.create_task(
                    self._handle_episode_end(run_id, result)
                ),
                on_training_complete=lambda state: asyncio.create_task(
                    self._handle_training_complete(run_id, state)
                ),
            )

            self.active_jobs[run_id] = engine

            # Start training in background
            asyncio.create_task(self._run_training(run_id, engine))

            return True

    async def _run_training(self, run_id: int, engine: TrainingEngine):
        """Run training job."""
        try:
            await engine.run()
        except Exception as e:
            await self._broadcast_error(run_id, str(e))
        finally:
            async with self._lock:
                if run_id in self.active_jobs:
                    del self.active_jobs[run_id]

    async def pause_training(self, run_id: int) -> bool:
        """Pause a running training job."""
        if run_id not in self.active_jobs:
            return False
        self.active_jobs[run_id].pause()
        return True

    async def resume_training(self, run_id: int) -> bool:
        """Resume a paused training job."""
        if run_id not in self.active_jobs:
            return False
        self.active_jobs[run_id].resume()
        return True

    async def stop_training(self, run_id: int) -> bool:
        """Stop a training job."""
        if run_id not in self.active_jobs:
            return False
        self.active_jobs[run_id].stop()
        return True

    def is_running(self, run_id: int) -> bool:
        """Check if a training job is active."""
        return run_id in self.active_jobs

    def get_status(self, run_id: int) -> Optional[Dict[str, Any]]:
        """Get current status of a training job."""
        if run_id not in self.active_jobs:
            return None
        return self.active_jobs[run_id].get_metrics()

    # WebSocket management
    async def add_websocket(self, run_id: int, websocket: WebSocket):
        """Add a WebSocket connection for a run."""
        if run_id not in self.websockets:
            self.websockets[run_id] = set()
        self.websockets[run_id].add(websocket)

    async def remove_websocket(self, run_id: int, websocket: WebSocket):
        """Remove a WebSocket connection."""
        if run_id in self.websockets:
            self.websockets[run_id].discard(websocket)

    async def _broadcast(self, run_id: int, message: Dict[str, Any]):
        """Broadcast message to all connected WebSockets."""
        if run_id not in self.websockets:
            return

        dead_connections = set()
        for ws in self.websockets[run_id]:
            try:
                await ws.send_json(message)
            except Exception:
                dead_connections.add(ws)

        # Remove dead connections
        for ws in dead_connections:
            self.websockets[run_id].discard(ws)

    async def _broadcast_step(self, run_id: int, data: StepData):
        """Broadcast step update."""
        await self._broadcast(run_id, {
            'type': 'step',
            'data': {
                'run_id': run_id,
                'step': data.step_num,
                'current_node': data.node_id,
                'action': data.action,
                'action_probs': data.action_probs,
                'reward': data.reward,
                'cumulative_reward': data.cumulative_reward,
                'risk_score': data.risk_score,
                'entropy': data.entropy,
            }
        })

    async def _broadcast_episode_start(
        self, run_id: int, episode: int, start: int, end: int
    ):
        """Broadcast episode start."""
        await self._broadcast(run_id, {
            'type': 'episode_start',
            'data': {
                'run_id': run_id,
                'episode': episode,
                'current_node': start,
                'target_node': end,
            }
        })

    async def _handle_episode_end(self, run_id: int, result: EpisodeResult):
        """Handle episode completion - save to DB and broadcast."""
        # Save to database
        db = get_db()
        with db.session() as session:
            crud.create_episode(
                db=session,
                run_id=run_id,
                episode_num=result.episode_num,
                start_node=result.start_node,
                end_node=result.end_node,
                path=result.path,
                optimal_path=result.optimal_path,
                total_reward=result.total_reward,
                steps=result.steps,
                success=result.success,
                path_length=result.path_length,
                optimal_length=result.optimal_length,
                efficiency=result.efficiency,
                avg_risk_score=result.avg_risk_score,
                max_risk_score=result.max_risk_score,
                final_epsilon=result.final_epsilon,
                duration_ms=result.duration_ms,
            )

            # Update run progress
            engine = self.active_jobs.get(run_id)
            if engine:
                metrics = engine.get_metrics()
                crud.update_training_run_progress(
                    db=session,
                    run_id=run_id,
                    completed_episodes=metrics['episodes_completed'],
                    current_episode=metrics['episode'],
                    current_step=0,
                    total_reward=metrics['total_reward'],
                    avg_reward=metrics['avg_reward'],
                    best_reward=metrics['best_reward'],
                    success_rate=metrics['success_rate'],
                    avg_steps=metrics['avg_steps'],
                )

        # Broadcast
        await self._broadcast(run_id, {
            'type': 'episode_end',
            'data': {
                'run_id': run_id,
                'episode': result.episode_num,
                'total_reward': result.total_reward,
                'success': result.success,
                'epsilon': result.final_epsilon,
                'metrics': {
                    'avg_reward': engine.state.avg_reward if engine else 0,
                    'best_reward': engine.state.best_reward if engine else 0,
                    'success_rate': engine.state.success_rate if engine else 0,
                }
            }
        })

    async def _handle_training_complete(self, run_id: int, state):
        """Handle training completion."""
        # Update database
        db = get_db()
        with db.session() as session:
            crud.update_training_run_status(
                db=session,
                run_id=run_id,
                status='completed',
                completed_at=datetime.now(),
            )

        # Broadcast
        await self._broadcast(run_id, {
            'type': 'training_complete',
            'data': {
                'run_id': run_id,
                'metrics': {
                    'avg_reward': state.avg_reward,
                    'best_reward': state.best_reward,
                    'success_rate': state.success_rate,
                }
            }
        })

    async def _broadcast_error(self, run_id: int, error: str):
        """Broadcast error message."""
        await self._broadcast(run_id, {
            'type': 'error',
            'data': {
                'run_id': run_id,
                'error': error,
            }
        })


# Global runner instance
training_runner = TrainingRunner()
