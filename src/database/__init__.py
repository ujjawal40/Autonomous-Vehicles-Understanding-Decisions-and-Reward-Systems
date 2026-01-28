"""
Database Module

Provides PostgreSQL database connectivity and ORM models for the
Autonomous Decision Visualizer.
"""

from .connection import Database, get_db, get_session
from .models import (
    Base,
    TrainingRun,
    Episode,
    Step,
    RewardPreset,
    ModelCheckpoint,
    AlgorithmConfig,
)
from . import crud

__all__ = [
    # Connection
    'Database',
    'get_db',
    'get_session',
    'Base',
    # Models
    'TrainingRun',
    'Episode',
    'Step',
    'RewardPreset',
    'ModelCheckpoint',
    'AlgorithmConfig',
    # CRUD
    'crud',
]
