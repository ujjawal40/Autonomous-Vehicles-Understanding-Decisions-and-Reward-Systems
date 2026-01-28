"""
SQLAlchemy ORM Models

Defines all database models for the Autonomous Decision Visualizer.
"""

import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any

from sqlalchemy import (
    Column, Integer, BigInteger, String, Float, Boolean, Text,
    DateTime, ForeignKey, LargeBinary, JSON, CheckConstraint,
    UniqueConstraint, Index
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func

Base = declarative_base()


class TrainingRun(Base):
    """
    Represents a single training run.

    Stores configuration, progress, and results for a training session.
    """
    __tablename__ = 'training_runs'

    id = Column(Integer, primary_key=True)
    uuid = Column(UUID(as_uuid=True), default=uuid.uuid4, unique=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Metadata
    name = Column(String(255), nullable=False)
    description = Column(Text)
    status = Column(
        String(50),
        default='pending',
        nullable=False
    )

    # Algorithm Configuration
    algorithm = Column(String(50), nullable=False)
    hyperparameters = Column(JSONB, default=dict, nullable=False)

    # Reward Configuration
    reward_mode = Column(String(20), default='sliders')
    reward_config = Column(JSONB, default=dict, nullable=False)
    reward_code = Column(Text)

    # Training Configuration
    total_episodes = Column(Integer, default=100, nullable=False)
    max_steps_per_episode = Column(Integer, default=50, nullable=False)

    # Progress
    completed_episodes = Column(Integer, default=0)
    current_episode = Column(Integer, default=0)
    current_step = Column(Integer, default=0)

    # Results
    total_reward = Column(Float, default=0)
    avg_reward = Column(Float)
    best_reward = Column(Float)
    success_rate = Column(Float)
    avg_steps = Column(Float)

    # Timing
    started_at = Column(DateTime(timezone=True))
    paused_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    total_duration_seconds = Column(Integer, default=0)

    # Environment
    environment = Column(String(50), default='london')
    map_config = Column(JSONB, default=dict)

    # Relationships
    episodes = relationship('Episode', back_populates='run', cascade='all, delete-orphan')
    checkpoints = relationship('ModelCheckpoint', back_populates='run', cascade='all, delete-orphan')

    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'running', 'paused', 'completed', 'failed', 'cancelled')",
            name='valid_status'
        ),
        CheckConstraint(
            "algorithm IN ('DQN', 'DoubleDQN', 'PPO', 'A2C')",
            name='valid_algorithm'
        ),
        Index('idx_runs_created_at', created_at.desc()),
        Index('idx_runs_status', status),
        Index('idx_runs_algorithm', algorithm),
    )

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            'id': self.id,
            'uuid': str(self.uuid) if self.uuid else None,
            'name': self.name,
            'description': self.description,
            'status': self.status,
            'algorithm': self.algorithm,
            'hyperparameters': self.hyperparameters,
            'reward_mode': self.reward_mode,
            'reward_config': self.reward_config,
            'total_episodes': self.total_episodes,
            'completed_episodes': self.completed_episodes,
            'avg_reward': self.avg_reward,
            'success_rate': self.success_rate,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
        }


class Episode(Base):
    """
    Represents a single episode within a training run.

    Stores navigation path, rewards, and metrics for one episode.
    """
    __tablename__ = 'episodes'

    id = Column(Integer, primary_key=True)
    run_id = Column(Integer, ForeignKey('training_runs.id', ondelete='CASCADE'), nullable=False)
    episode_num = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Navigation
    start_node = Column(BigInteger, nullable=False)
    end_node = Column(BigInteger, nullable=False)
    path = Column(JSONB, default=list, nullable=False)
    optimal_path = Column(JSONB, default=list)

    # Metrics
    total_reward = Column(Float, default=0, nullable=False)
    steps = Column(Integer, default=0, nullable=False)
    success = Column(Boolean, default=False, nullable=False)

    # Efficiency
    path_length = Column(Float)
    optimal_length = Column(Float)
    efficiency = Column(Float)

    # Risk
    avg_risk_score = Column(Float)
    max_risk_score = Column(Float)

    # Agent State
    final_epsilon = Column(Float)

    # Timing
    duration_ms = Column(Integer)

    # Relationships
    run = relationship('TrainingRun', back_populates='episodes')
    steps_data = relationship('Step', back_populates='episode', cascade='all, delete-orphan')

    __table_args__ = (
        UniqueConstraint('run_id', 'episode_num', name='unique_episode_per_run'),
        Index('idx_episodes_run_id', run_id),
        Index('idx_episodes_success', success),
        Index('idx_episodes_reward', total_reward.desc()),
    )

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            'id': self.id,
            'run_id': self.run_id,
            'episode_num': self.episode_num,
            'start_node': self.start_node,
            'end_node': self.end_node,
            'path': self.path,
            'optimal_path': self.optimal_path,
            'total_reward': self.total_reward,
            'steps': self.steps,
            'success': self.success,
            'efficiency': self.efficiency,
            'duration_ms': self.duration_ms,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class Step(Base):
    """
    Represents a single step within an episode.

    Stores detailed data for each decision point.
    """
    __tablename__ = 'steps'

    id = Column(Integer, primary_key=True)
    episode_id = Column(Integer, ForeignKey('episodes.id', ondelete='CASCADE'), nullable=False)
    step_num = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # State
    node_id = Column(BigInteger, nullable=False)
    action = Column(Integer, nullable=False)
    action_name = Column(String(20))

    # Probabilities
    action_probs = Column(JSONB, default=dict, nullable=False)
    q_values = Column(JSONB)

    # Reward
    reward = Column(Float, nullable=False)
    cumulative_reward = Column(Float, nullable=False)
    reward_breakdown = Column(JSONB)

    # Risk
    risk_score = Column(Float)
    risk_components = Column(JSONB)
    entropy = Column(Float)

    # Distance
    distance_to_goal = Column(Float)
    distance_traveled = Column(Float)

    # Relationships
    episode = relationship('Episode', back_populates='steps_data')

    __table_args__ = (
        UniqueConstraint('episode_id', 'step_num', name='unique_step_per_episode'),
        Index('idx_steps_episode_id', episode_id),
        Index('idx_steps_node', node_id),
        Index('idx_steps_risk', risk_score.desc()),
    )

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            'id': self.id,
            'episode_id': self.episode_id,
            'step_num': self.step_num,
            'node_id': self.node_id,
            'action': self.action,
            'action_name': self.action_name,
            'action_probs': self.action_probs,
            'reward': self.reward,
            'cumulative_reward': self.cumulative_reward,
            'risk_score': self.risk_score,
            'entropy': self.entropy,
        }


class RewardPreset(Base):
    """
    Stored reward function configurations.

    Can be either slider-based (JSON config) or code-based (Python code).
    """
    __tablename__ = 'reward_presets'

    id = Column(Integer, primary_key=True)
    uuid = Column(UUID(as_uuid=True), default=uuid.uuid4, unique=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Metadata
    name = Column(String(255), nullable=False, unique=True)
    description = Column(Text)

    # Configuration
    mode = Column(String(20), default='sliders')
    config = Column(JSONB, default=dict, nullable=False)
    code = Column(Text)

    # Flags
    is_default = Column(Boolean, default=False)
    is_system = Column(Boolean, default=False)

    __table_args__ = (
        CheckConstraint("mode IN ('sliders', 'code')", name='valid_reward_mode'),
    )

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            'id': self.id,
            'uuid': str(self.uuid) if self.uuid else None,
            'name': self.name,
            'description': self.description,
            'mode': self.mode,
            'config': self.config,
            'code': self.code,
            'is_default': self.is_default,
            'is_system': self.is_system,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class ModelCheckpoint(Base):
    """
    Stored model weights at specific episodes.

    Allows resuming training or loading best models.
    """
    __tablename__ = 'model_checkpoints'

    id = Column(Integer, primary_key=True)
    run_id = Column(Integer, ForeignKey('training_runs.id', ondelete='CASCADE'), nullable=False)
    episode = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Model
    algorithm = Column(String(50), nullable=False)
    weights = Column(LargeBinary, nullable=False)

    # Metrics at checkpoint
    metrics = Column(JSONB, default=dict, nullable=False)

    # Metadata
    is_best = Column(Boolean, default=False)
    notes = Column(Text)

    # Relationships
    run = relationship('TrainingRun', back_populates='checkpoints')

    __table_args__ = (
        UniqueConstraint('run_id', 'episode', name='unique_checkpoint_per_episode'),
        Index('idx_checkpoints_run_id', run_id),
        Index('idx_checkpoints_best', is_best, postgresql_where=(is_best == True)),
    )

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            'id': self.id,
            'run_id': self.run_id,
            'episode': self.episode,
            'algorithm': self.algorithm,
            'metrics': self.metrics,
            'is_best': self.is_best,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class AlgorithmConfig(Base):
    """
    Preset hyperparameter configurations for algorithms.
    """
    __tablename__ = 'algorithm_configs'

    id = Column(Integer, primary_key=True)
    algorithm = Column(String(50), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    config = Column(JSONB, default=dict, nullable=False)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint('algorithm', 'name', name='unique_algo_config_name'),
    )

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            'id': self.id,
            'algorithm': self.algorithm,
            'name': self.name,
            'description': self.description,
            'config': self.config,
            'is_default': self.is_default,
        }
