"""
Database CRUD Operations

Provides create, read, update, delete operations for all models.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime

from sqlalchemy.orm import Session
from sqlalchemy import desc, func, Integer

from .models import (
    TrainingRun, Episode, Step,
    RewardPreset, ModelCheckpoint, AlgorithmConfig
)


# ============================================
# TRAINING RUNS
# ============================================

def create_training_run(
    db: Session,
    name: str,
    algorithm: str,
    hyperparameters: Dict[str, Any],
    reward_mode: str = 'sliders',
    reward_config: Optional[Dict[str, Any]] = None,
    reward_code: Optional[str] = None,
    total_episodes: int = 100,
    max_steps_per_episode: int = 50,
    description: Optional[str] = None,
    environment: str = 'london',
    map_config: Optional[Dict[str, Any]] = None,
) -> TrainingRun:
    """Create a new training run."""
    run = TrainingRun(
        name=name,
        algorithm=algorithm,
        hyperparameters=hyperparameters,
        reward_mode=reward_mode,
        reward_config=reward_config or {},
        reward_code=reward_code,
        total_episodes=total_episodes,
        max_steps_per_episode=max_steps_per_episode,
        description=description,
        environment=environment,
        map_config=map_config or {},
    )
    db.add(run)
    db.flush()
    return run


def get_training_run(db: Session, run_id: int) -> Optional[TrainingRun]:
    """Get a training run by ID."""
    return db.query(TrainingRun).filter(TrainingRun.id == run_id).first()


def get_training_run_by_uuid(db: Session, uuid: str) -> Optional[TrainingRun]:
    """Get a training run by UUID."""
    return db.query(TrainingRun).filter(TrainingRun.uuid == uuid).first()


def get_training_runs(
    db: Session,
    status: Optional[str] = None,
    algorithm: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> List[TrainingRun]:
    """Get training runs with optional filters."""
    query = db.query(TrainingRun)

    if status:
        query = query.filter(TrainingRun.status == status)
    if algorithm:
        query = query.filter(TrainingRun.algorithm == algorithm)

    return query.order_by(desc(TrainingRun.created_at)).offset(offset).limit(limit).all()


def update_training_run_status(
    db: Session,
    run_id: int,
    status: str,
    started_at: Optional[datetime] = None,
    paused_at: Optional[datetime] = None,
    completed_at: Optional[datetime] = None,
) -> Optional[TrainingRun]:
    """Update training run status and timing."""
    run = get_training_run(db, run_id)
    if not run:
        return None

    run.status = status
    if started_at:
        run.started_at = started_at
    if paused_at:
        run.paused_at = paused_at
    if completed_at:
        run.completed_at = completed_at

    db.flush()
    return run


def update_training_run_progress(
    db: Session,
    run_id: int,
    completed_episodes: int,
    current_episode: int,
    current_step: int,
    total_reward: float,
    avg_reward: Optional[float] = None,
    best_reward: Optional[float] = None,
    success_rate: Optional[float] = None,
    avg_steps: Optional[float] = None,
) -> Optional[TrainingRun]:
    """Update training run progress and metrics."""
    run = get_training_run(db, run_id)
    if not run:
        return None

    run.completed_episodes = completed_episodes
    run.current_episode = current_episode
    run.current_step = current_step
    run.total_reward = total_reward

    if avg_reward is not None:
        run.avg_reward = avg_reward
    if best_reward is not None:
        run.best_reward = best_reward
    if success_rate is not None:
        run.success_rate = success_rate
    if avg_steps is not None:
        run.avg_steps = avg_steps

    db.flush()
    return run


def delete_training_run(db: Session, run_id: int) -> bool:
    """Delete a training run (cascades to episodes, steps, checkpoints)."""
    run = get_training_run(db, run_id)
    if not run:
        return False

    db.delete(run)
    db.flush()
    return True


# ============================================
# EPISODES
# ============================================

def create_episode(
    db: Session,
    run_id: int,
    episode_num: int,
    start_node: int,
    end_node: int,
    path: List[int],
    optimal_path: Optional[List[int]] = None,
    total_reward: float = 0,
    steps: int = 0,
    success: bool = False,
    path_length: Optional[float] = None,
    optimal_length: Optional[float] = None,
    efficiency: Optional[float] = None,
    avg_risk_score: Optional[float] = None,
    max_risk_score: Optional[float] = None,
    final_epsilon: Optional[float] = None,
    duration_ms: Optional[int] = None,
) -> Episode:
    """Create a new episode."""
    episode = Episode(
        run_id=run_id,
        episode_num=episode_num,
        start_node=start_node,
        end_node=end_node,
        path=path,
        optimal_path=optimal_path or [],
        total_reward=total_reward,
        steps=steps,
        success=success,
        path_length=path_length,
        optimal_length=optimal_length,
        efficiency=efficiency,
        avg_risk_score=avg_risk_score,
        max_risk_score=max_risk_score,
        final_epsilon=final_epsilon,
        duration_ms=duration_ms,
    )
    db.add(episode)
    db.flush()
    return episode


def get_episode(db: Session, episode_id: int) -> Optional[Episode]:
    """Get an episode by ID."""
    return db.query(Episode).filter(Episode.id == episode_id).first()


def get_episodes_for_run(
    db: Session,
    run_id: int,
    limit: int = 100,
    offset: int = 0,
) -> List[Episode]:
    """Get all episodes for a training run."""
    return (
        db.query(Episode)
        .filter(Episode.run_id == run_id)
        .order_by(Episode.episode_num)
        .offset(offset)
        .limit(limit)
        .all()
    )


def get_episode_stats(db: Session, run_id: int) -> Dict[str, Any]:
    """Get aggregated statistics for episodes in a run."""
    result = db.query(
        func.count(Episode.id).label('total_episodes'),
        func.sum(Episode.success.cast(Integer)).label('successful_episodes'),
        func.avg(Episode.total_reward).label('avg_reward'),
        func.max(Episode.total_reward).label('max_reward'),
        func.min(Episode.total_reward).label('min_reward'),
        func.avg(Episode.steps).label('avg_steps'),
        func.avg(Episode.efficiency).label('avg_efficiency'),
    ).filter(Episode.run_id == run_id).first()

    return {
        'total_episodes': result.total_episodes or 0,
        'successful_episodes': result.successful_episodes or 0,
        'avg_reward': float(result.avg_reward) if result.avg_reward else 0,
        'max_reward': float(result.max_reward) if result.max_reward else 0,
        'min_reward': float(result.min_reward) if result.min_reward else 0,
        'avg_steps': float(result.avg_steps) if result.avg_steps else 0,
        'avg_efficiency': float(result.avg_efficiency) if result.avg_efficiency else 0,
    }


# ============================================
# STEPS
# ============================================

def create_step(
    db: Session,
    episode_id: int,
    step_num: int,
    node_id: int,
    action: int,
    action_probs: Dict[str, float],
    reward: float,
    cumulative_reward: float,
    action_name: Optional[str] = None,
    q_values: Optional[Dict[str, float]] = None,
    reward_breakdown: Optional[Dict[str, float]] = None,
    risk_score: Optional[float] = None,
    risk_components: Optional[Dict[str, float]] = None,
    entropy: Optional[float] = None,
    distance_to_goal: Optional[float] = None,
    distance_traveled: Optional[float] = None,
) -> Step:
    """Create a new step."""
    step = Step(
        episode_id=episode_id,
        step_num=step_num,
        node_id=node_id,
        action=action,
        action_name=action_name,
        action_probs=action_probs,
        q_values=q_values,
        reward=reward,
        cumulative_reward=cumulative_reward,
        reward_breakdown=reward_breakdown,
        risk_score=risk_score,
        risk_components=risk_components,
        entropy=entropy,
        distance_to_goal=distance_to_goal,
        distance_traveled=distance_traveled,
    )
    db.add(step)
    db.flush()
    return step


def create_steps_batch(db: Session, steps_data: List[Dict[str, Any]]) -> List[Step]:
    """Create multiple steps in a batch for efficiency."""
    steps = [Step(**data) for data in steps_data]
    db.add_all(steps)
    db.flush()
    return steps


def get_steps_for_episode(
    db: Session,
    episode_id: int,
    limit: int = 500,
    offset: int = 0,
) -> List[Step]:
    """Get all steps for an episode."""
    return (
        db.query(Step)
        .filter(Step.episode_id == episode_id)
        .order_by(Step.step_num)
        .offset(offset)
        .limit(limit)
        .all()
    )


# ============================================
# REWARD PRESETS
# ============================================

def create_reward_preset(
    db: Session,
    name: str,
    mode: str = 'sliders',
    config: Optional[Dict[str, Any]] = None,
    code: Optional[str] = None,
    description: Optional[str] = None,
    is_default: bool = False,
    is_system: bool = False,
) -> RewardPreset:
    """Create a new reward preset."""
    preset = RewardPreset(
        name=name,
        mode=mode,
        config=config or {},
        code=code,
        description=description,
        is_default=is_default,
        is_system=is_system,
    )
    db.add(preset)
    db.flush()
    return preset


def get_reward_preset(db: Session, preset_id: int) -> Optional[RewardPreset]:
    """Get a reward preset by ID."""
    return db.query(RewardPreset).filter(RewardPreset.id == preset_id).first()


def get_reward_presets(db: Session) -> List[RewardPreset]:
    """Get all reward presets."""
    return db.query(RewardPreset).order_by(RewardPreset.name).all()


def get_default_reward_preset(db: Session) -> Optional[RewardPreset]:
    """Get the default reward preset."""
    return db.query(RewardPreset).filter(RewardPreset.is_default == True).first()


def update_reward_preset(
    db: Session,
    preset_id: int,
    name: Optional[str] = None,
    config: Optional[Dict[str, Any]] = None,
    code: Optional[str] = None,
    description: Optional[str] = None,
) -> Optional[RewardPreset]:
    """Update a reward preset."""
    preset = get_reward_preset(db, preset_id)
    if not preset or preset.is_system:
        return None

    if name:
        preset.name = name
    if config is not None:
        preset.config = config
    if code is not None:
        preset.code = code
    if description is not None:
        preset.description = description

    db.flush()
    return preset


def delete_reward_preset(db: Session, preset_id: int) -> bool:
    """Delete a reward preset (cannot delete system presets)."""
    preset = get_reward_preset(db, preset_id)
    if not preset or preset.is_system:
        return False

    db.delete(preset)
    db.flush()
    return True


# ============================================
# MODEL CHECKPOINTS
# ============================================

def create_checkpoint(
    db: Session,
    run_id: int,
    episode: int,
    algorithm: str,
    weights: bytes,
    metrics: Dict[str, Any],
    is_best: bool = False,
    notes: Optional[str] = None,
) -> ModelCheckpoint:
    """Create a model checkpoint."""
    checkpoint = ModelCheckpoint(
        run_id=run_id,
        episode=episode,
        algorithm=algorithm,
        weights=weights,
        metrics=metrics,
        is_best=is_best,
        notes=notes,
    )
    db.add(checkpoint)
    db.flush()
    return checkpoint


def get_checkpoint(db: Session, checkpoint_id: int) -> Optional[ModelCheckpoint]:
    """Get a checkpoint by ID."""
    return db.query(ModelCheckpoint).filter(ModelCheckpoint.id == checkpoint_id).first()


def get_checkpoints_for_run(db: Session, run_id: int) -> List[ModelCheckpoint]:
    """Get all checkpoints for a training run."""
    return (
        db.query(ModelCheckpoint)
        .filter(ModelCheckpoint.run_id == run_id)
        .order_by(ModelCheckpoint.episode)
        .all()
    )


def get_best_checkpoint(db: Session, run_id: int) -> Optional[ModelCheckpoint]:
    """Get the best checkpoint for a training run."""
    return (
        db.query(ModelCheckpoint)
        .filter(ModelCheckpoint.run_id == run_id, ModelCheckpoint.is_best == True)
        .first()
    )


def update_best_checkpoint(db: Session, run_id: int, checkpoint_id: int) -> bool:
    """Mark a checkpoint as the best, unmarking previous best."""
    # Unmark current best
    db.query(ModelCheckpoint).filter(
        ModelCheckpoint.run_id == run_id,
        ModelCheckpoint.is_best == True
    ).update({'is_best': False})

    # Mark new best
    checkpoint = get_checkpoint(db, checkpoint_id)
    if checkpoint and checkpoint.run_id == run_id:
        checkpoint.is_best = True
        db.flush()
        return True
    return False


# ============================================
# ALGORITHM CONFIGS
# ============================================

def get_algorithm_configs(db: Session, algorithm: Optional[str] = None) -> List[AlgorithmConfig]:
    """Get algorithm configurations."""
    query = db.query(AlgorithmConfig)
    if algorithm:
        query = query.filter(AlgorithmConfig.algorithm == algorithm)
    return query.order_by(AlgorithmConfig.algorithm, AlgorithmConfig.name).all()


def get_default_algorithm_config(db: Session, algorithm: str) -> Optional[AlgorithmConfig]:
    """Get the default config for an algorithm."""
    return (
        db.query(AlgorithmConfig)
        .filter(AlgorithmConfig.algorithm == algorithm, AlgorithmConfig.is_default == True)
        .first()
    )


def create_algorithm_config(
    db: Session,
    algorithm: str,
    name: str,
    config: Dict[str, Any],
    description: Optional[str] = None,
    is_default: bool = False,
) -> AlgorithmConfig:
    """Create an algorithm configuration."""
    algo_config = AlgorithmConfig(
        algorithm=algorithm,
        name=name,
        config=config,
        description=description,
        is_default=is_default,
    )
    db.add(algo_config)
    db.flush()
    return algo_config


# ============================================
# COMPARISON QUERIES
# ============================================

def get_runs_for_comparison(db: Session, run_ids: List[int]) -> List[TrainingRun]:
    """Get multiple training runs for comparison."""
    return db.query(TrainingRun).filter(TrainingRun.id.in_(run_ids)).all()


def get_reward_history(db: Session, run_id: int) -> List[Dict[str, Any]]:
    """Get reward history for plotting."""
    episodes = (
        db.query(Episode.episode_num, Episode.total_reward, Episode.success)
        .filter(Episode.run_id == run_id)
        .order_by(Episode.episode_num)
        .all()
    )

    return [
        {
            'episode': ep.episode_num,
            'reward': ep.total_reward,
            'success': ep.success,
        }
        for ep in episodes
    ]


def get_risk_history(db: Session, run_id: int) -> List[Dict[str, Any]]:
    """Get risk score history for a run."""
    episodes = (
        db.query(Episode.episode_num, Episode.avg_risk_score, Episode.max_risk_score)
        .filter(Episode.run_id == run_id)
        .order_by(Episode.episode_num)
        .all()
    )

    return [
        {
            'episode': ep.episode_num,
            'avg_risk': ep.avg_risk_score,
            'max_risk': ep.max_risk_score,
        }
        for ep in episodes
    ]
