"""
Training API Endpoints

FastAPI routes for training management, CRUD operations, and real-time updates.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
import asyncio

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from src.database import get_session, crud, TrainingRun


# ============================================
# PYDANTIC MODELS
# ============================================

class TrainingConfig(BaseModel):
    """Configuration for starting a new training run."""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    algorithm: str = Field(..., pattern='^(DQN|DoubleDQN|PPO|A2C)$')
    hyperparameters: Dict[str, Any] = Field(default_factory=dict)
    reward_mode: str = Field(default='sliders', pattern='^(sliders|code)$')
    reward_config: Optional[Dict[str, Any]] = None
    reward_code: Optional[str] = None
    total_episodes: int = Field(default=100, ge=1, le=10000)
    max_steps_per_episode: int = Field(default=50, ge=10, le=500)
    environment: str = Field(default='london')


class TrainingRunResponse(BaseModel):
    """Response model for training runs."""
    id: int
    uuid: str
    name: str
    description: Optional[str]
    status: str
    algorithm: str
    hyperparameters: Dict[str, Any]
    reward_mode: str
    reward_config: Dict[str, Any]
    total_episodes: int
    completed_episodes: int
    avg_reward: Optional[float]
    success_rate: Optional[float]
    created_at: str
    started_at: Optional[str]
    completed_at: Optional[str]

    class Config:
        from_attributes = True


class RewardPresetCreate(BaseModel):
    """Model for creating a reward preset."""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    mode: str = Field(default='sliders', pattern='^(sliders|code)$')
    config: Optional[Dict[str, Any]] = None
    code: Optional[str] = None


class RewardPresetResponse(BaseModel):
    """Response model for reward presets."""
    id: int
    uuid: str
    name: str
    description: Optional[str]
    mode: str
    config: Dict[str, Any]
    code: Optional[str]
    is_default: bool
    is_system: bool
    created_at: str

    class Config:
        from_attributes = True


class AlgorithmConfigResponse(BaseModel):
    """Response model for algorithm configs."""
    id: int
    algorithm: str
    name: str
    description: Optional[str]
    config: Dict[str, Any]
    is_default: bool

    class Config:
        from_attributes = True


class CompareRequest(BaseModel):
    """Request model for comparing training runs."""
    run_ids: List[int] = Field(..., min_items=2, max_items=5)


# ============================================
# TRAINING MANAGER
# ============================================

class TrainingManager:
    """
    Manages active training sessions.

    Handles start/stop/pause operations and WebSocket communication.
    """

    def __init__(self):
        self.active_runs: Dict[int, Dict[str, Any]] = {}
        self.websocket_connections: Dict[int, List[WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def start_training(self, run_id: int, config: Dict[str, Any]) -> bool:
        """Start or resume a training run."""
        async with self._lock:
            if run_id in self.active_runs:
                return False

            self.active_runs[run_id] = {
                'status': 'running',
                'config': config,
                'start_time': datetime.now(),
                'paused': False,
            }
            return True

    async def pause_training(self, run_id: int) -> bool:
        """Pause a training run."""
        async with self._lock:
            if run_id not in self.active_runs:
                return False

            self.active_runs[run_id]['paused'] = True
            self.active_runs[run_id]['status'] = 'paused'
            return True

    async def resume_training(self, run_id: int) -> bool:
        """Resume a paused training run."""
        async with self._lock:
            if run_id not in self.active_runs:
                return False

            self.active_runs[run_id]['paused'] = False
            self.active_runs[run_id]['status'] = 'running'
            return True

    async def stop_training(self, run_id: int) -> bool:
        """Stop a training run."""
        async with self._lock:
            if run_id in self.active_runs:
                del self.active_runs[run_id]
            return True

    def is_running(self, run_id: int) -> bool:
        """Check if a run is active."""
        return run_id in self.active_runs

    def is_paused(self, run_id: int) -> bool:
        """Check if a run is paused."""
        run = self.active_runs.get(run_id)
        return run['paused'] if run else False

    async def add_websocket(self, run_id: int, websocket: WebSocket):
        """Add a WebSocket connection for a run."""
        if run_id not in self.websocket_connections:
            self.websocket_connections[run_id] = []
        self.websocket_connections[run_id].append(websocket)

    async def remove_websocket(self, run_id: int, websocket: WebSocket):
        """Remove a WebSocket connection."""
        if run_id in self.websocket_connections:
            try:
                self.websocket_connections[run_id].remove(websocket)
            except ValueError:
                pass

    async def broadcast_update(self, run_id: int, data: Dict[str, Any]):
        """Broadcast an update to all connected WebSockets."""
        if run_id not in self.websocket_connections:
            return

        dead_connections = []
        for ws in self.websocket_connections[run_id]:
            try:
                await ws.send_json(data)
            except Exception:
                dead_connections.append(ws)

        # Remove dead connections
        for ws in dead_connections:
            await self.remove_websocket(run_id, ws)


# Global training manager
training_manager = TrainingManager()

# Create router
router = APIRouter(prefix="/api/v1", tags=["training"])


# ============================================
# TRAINING RUN ENDPOINTS
# ============================================

@router.post("/runs", response_model=TrainingRunResponse)
async def create_run(
    config: TrainingConfig,
    db: Session = Depends(get_session),
):
    """Create a new training run."""
    run = crud.create_training_run(
        db=db,
        name=config.name,
        description=config.description,
        algorithm=config.algorithm,
        hyperparameters=config.hyperparameters,
        reward_mode=config.reward_mode,
        reward_config=config.reward_config,
        reward_code=config.reward_code,
        total_episodes=config.total_episodes,
        max_steps_per_episode=config.max_steps_per_episode,
        environment=config.environment,
    )
    db.commit()
    return run.to_dict()


@router.get("/runs", response_model=List[TrainingRunResponse])
async def list_runs(
    status: Optional[str] = None,
    algorithm: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_session),
):
    """List training runs with optional filters."""
    runs = crud.get_training_runs(
        db=db,
        status=status,
        algorithm=algorithm,
        limit=limit,
        offset=offset,
    )
    return [run.to_dict() for run in runs]


@router.get("/runs/{run_id}", response_model=TrainingRunResponse)
async def get_run(run_id: int, db: Session = Depends(get_session)):
    """Get a specific training run."""
    run = crud.get_training_run(db, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Training run not found")
    return run.to_dict()


@router.delete("/runs/{run_id}")
async def delete_run(run_id: int, db: Session = Depends(get_session)):
    """Delete a training run."""
    if training_manager.is_running(run_id):
        raise HTTPException(status_code=400, detail="Cannot delete a running training")

    success = crud.delete_training_run(db, run_id)
    if not success:
        raise HTTPException(status_code=404, detail="Training run not found")

    db.commit()
    return {"status": "deleted"}


# ============================================
# TRAINING CONTROL ENDPOINTS
# ============================================

@router.post("/runs/{run_id}/start")
async def start_run(run_id: int, db: Session = Depends(get_session)):
    """Start a training run."""
    run = crud.get_training_run(db, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Training run not found")

    if run.status not in ['pending', 'paused']:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot start training with status: {run.status}"
        )

    config = {
        'algorithm': run.algorithm,
        'hyperparameters': run.hyperparameters,
        'reward_mode': run.reward_mode,
        'reward_config': run.reward_config,
        'total_episodes': run.total_episodes,
        'max_steps_per_episode': run.max_steps_per_episode,
    }

    success = await training_manager.start_training(run_id, config)
    if not success:
        raise HTTPException(status_code=400, detail="Training already running")

    crud.update_training_run_status(
        db, run_id,
        status='running',
        started_at=datetime.now() if run.status == 'pending' else None,
    )
    db.commit()

    return {"status": "started", "run_id": run_id}


@router.post("/runs/{run_id}/pause")
async def pause_run(run_id: int, db: Session = Depends(get_session)):
    """Pause a running training."""
    run = crud.get_training_run(db, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Training run not found")

    if run.status != 'running':
        raise HTTPException(status_code=400, detail="Training is not running")

    success = await training_manager.pause_training(run_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to pause training")

    crud.update_training_run_status(
        db, run_id,
        status='paused',
        paused_at=datetime.now(),
    )
    db.commit()

    return {"status": "paused", "run_id": run_id}


@router.post("/runs/{run_id}/resume")
async def resume_run(run_id: int, db: Session = Depends(get_session)):
    """Resume a paused training."""
    run = crud.get_training_run(db, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Training run not found")

    if run.status != 'paused':
        raise HTTPException(status_code=400, detail="Training is not paused")

    success = await training_manager.resume_training(run_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to resume training")

    crud.update_training_run_status(db, run_id, status='running')
    db.commit()

    return {"status": "resumed", "run_id": run_id}


@router.post("/runs/{run_id}/stop")
async def stop_run(run_id: int, db: Session = Depends(get_session)):
    """Stop a training run."""
    run = crud.get_training_run(db, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Training run not found")

    if run.status not in ['running', 'paused']:
        raise HTTPException(status_code=400, detail="Training is not active")

    await training_manager.stop_training(run_id)

    crud.update_training_run_status(
        db, run_id,
        status='cancelled',
        completed_at=datetime.now(),
    )
    db.commit()

    return {"status": "stopped", "run_id": run_id}


# ============================================
# EPISODE ENDPOINTS
# ============================================

@router.get("/runs/{run_id}/episodes")
async def get_episodes(
    run_id: int,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_session),
):
    """Get episodes for a training run."""
    run = crud.get_training_run(db, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Training run not found")

    episodes = crud.get_episodes_for_run(db, run_id, limit, offset)
    return [ep.to_dict() for ep in episodes]


@router.get("/runs/{run_id}/episodes/stats")
async def get_episode_stats(run_id: int, db: Session = Depends(get_session)):
    """Get aggregated episode statistics."""
    run = crud.get_training_run(db, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Training run not found")

    return crud.get_episode_stats(db, run_id)


@router.get("/runs/{run_id}/reward-history")
async def get_reward_history(run_id: int, db: Session = Depends(get_session)):
    """Get reward history for plotting."""
    run = crud.get_training_run(db, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Training run not found")

    return crud.get_reward_history(db, run_id)


@router.get("/runs/{run_id}/risk-history")
async def get_risk_history(run_id: int, db: Session = Depends(get_session)):
    """Get risk score history."""
    run = crud.get_training_run(db, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Training run not found")

    return crud.get_risk_history(db, run_id)


# ============================================
# STEPS ENDPOINTS
# ============================================

@router.get("/episodes/{episode_id}/steps")
async def get_steps(
    episode_id: int,
    limit: int = 500,
    offset: int = 0,
    db: Session = Depends(get_session),
):
    """Get steps for an episode."""
    episode = crud.get_episode(db, episode_id)
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")

    steps = crud.get_steps_for_episode(db, episode_id, limit, offset)
    return [step.to_dict() for step in steps]


# ============================================
# REWARD PRESET ENDPOINTS
# ============================================

@router.get("/reward-presets", response_model=List[RewardPresetResponse])
async def list_reward_presets(db: Session = Depends(get_session)):
    """List all reward presets."""
    presets = crud.get_reward_presets(db)
    return [preset.to_dict() for preset in presets]


@router.post("/reward-presets", response_model=RewardPresetResponse)
async def create_reward_preset(
    preset: RewardPresetCreate,
    db: Session = Depends(get_session),
):
    """Create a new reward preset."""
    new_preset = crud.create_reward_preset(
        db=db,
        name=preset.name,
        description=preset.description,
        mode=preset.mode,
        config=preset.config,
        code=preset.code,
    )
    db.commit()
    return new_preset.to_dict()


@router.get("/reward-presets/{preset_id}", response_model=RewardPresetResponse)
async def get_reward_preset(preset_id: int, db: Session = Depends(get_session)):
    """Get a specific reward preset."""
    preset = crud.get_reward_preset(db, preset_id)
    if not preset:
        raise HTTPException(status_code=404, detail="Reward preset not found")
    return preset.to_dict()


@router.put("/reward-presets/{preset_id}", response_model=RewardPresetResponse)
async def update_reward_preset(
    preset_id: int,
    data: RewardPresetCreate,
    db: Session = Depends(get_session),
):
    """Update a reward preset (cannot update system presets)."""
    preset = crud.update_reward_preset(
        db=db,
        preset_id=preset_id,
        name=data.name,
        description=data.description,
        config=data.config,
        code=data.code,
    )
    if not preset:
        raise HTTPException(
            status_code=400,
            detail="Preset not found or is a system preset"
        )
    db.commit()
    return preset.to_dict()


@router.delete("/reward-presets/{preset_id}")
async def delete_reward_preset(preset_id: int, db: Session = Depends(get_session)):
    """Delete a reward preset (cannot delete system presets)."""
    success = crud.delete_reward_preset(db, preset_id)
    if not success:
        raise HTTPException(
            status_code=400,
            detail="Preset not found or is a system preset"
        )
    db.commit()
    return {"status": "deleted"}


# ============================================
# ALGORITHM CONFIG ENDPOINTS
# ============================================

@router.get("/algorithms", response_model=List[AlgorithmConfigResponse])
async def list_algorithm_configs(
    algorithm: Optional[str] = None,
    db: Session = Depends(get_session),
):
    """List algorithm configurations."""
    configs = crud.get_algorithm_configs(db, algorithm)
    return [config.to_dict() for config in configs]


@router.get("/algorithms/{algorithm}/default", response_model=AlgorithmConfigResponse)
async def get_default_config(algorithm: str, db: Session = Depends(get_session)):
    """Get the default configuration for an algorithm."""
    config = crud.get_default_algorithm_config(db, algorithm)
    if not config:
        raise HTTPException(status_code=404, detail="Algorithm config not found")
    return config.to_dict()


# ============================================
# COMPARISON ENDPOINTS
# ============================================

@router.post("/compare")
async def compare_runs(
    request: CompareRequest,
    db: Session = Depends(get_session),
):
    """Compare multiple training runs."""
    runs = crud.get_runs_for_comparison(db, request.run_ids)
    if len(runs) != len(request.run_ids):
        raise HTTPException(status_code=404, detail="One or more runs not found")

    comparison = {
        'runs': [run.to_dict() for run in runs],
        'reward_histories': {},
        'risk_histories': {},
    }

    for run in runs:
        comparison['reward_histories'][run.id] = crud.get_reward_history(db, run.id)
        comparison['risk_histories'][run.id] = crud.get_risk_history(db, run.id)

    return comparison


# ============================================
# WEBSOCKET ENDPOINT
# ============================================

@router.websocket("/ws/training/{run_id}")
async def training_websocket(websocket: WebSocket, run_id: int):
    """WebSocket endpoint for real-time training updates."""
    await websocket.accept()
    await training_manager.add_websocket(run_id, websocket)

    try:
        while True:
            # Keep connection alive and receive any client messages
            data = await websocket.receive_json()

            # Handle client messages (e.g., pause/resume commands)
            if data.get('action') == 'ping':
                await websocket.send_json({'action': 'pong'})

    except WebSocketDisconnect:
        await training_manager.remove_websocket(run_id, websocket)
    except Exception:
        await training_manager.remove_websocket(run_id, websocket)
