-- ============================================
-- Autonomous Decision Visualizer
-- Database Initialization Script
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TRAINING RUNS
-- ============================================
CREATE TABLE training_runs (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Metadata
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'paused', 'completed', 'failed', 'cancelled')),

    -- Algorithm Configuration
    algorithm VARCHAR(50) NOT NULL CHECK (algorithm IN ('DQN', 'DoubleDQN', 'PPO', 'A2C')),
    hyperparameters JSONB NOT NULL DEFAULT '{}',

    -- Reward Configuration
    reward_mode VARCHAR(20) DEFAULT 'sliders' CHECK (reward_mode IN ('sliders', 'code')),
    reward_config JSONB NOT NULL DEFAULT '{}',
    reward_code TEXT,

    -- Training Configuration
    total_episodes INTEGER NOT NULL DEFAULT 100,
    max_steps_per_episode INTEGER NOT NULL DEFAULT 50,

    -- Progress
    completed_episodes INTEGER DEFAULT 0,
    current_episode INTEGER DEFAULT 0,
    current_step INTEGER DEFAULT 0,

    -- Results
    total_reward FLOAT DEFAULT 0,
    avg_reward FLOAT,
    best_reward FLOAT,
    success_rate FLOAT,
    avg_steps FLOAT,

    -- Timing
    started_at TIMESTAMP WITH TIME ZONE,
    paused_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    total_duration_seconds INTEGER DEFAULT 0,

    -- Environment
    environment VARCHAR(50) DEFAULT 'london',
    map_config JSONB DEFAULT '{}'
);

-- ============================================
-- EPISODES
-- ============================================
CREATE TABLE episodes (
    id SERIAL PRIMARY KEY,
    run_id INTEGER NOT NULL REFERENCES training_runs(id) ON DELETE CASCADE,
    episode_num INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Navigation
    start_node BIGINT NOT NULL,
    end_node BIGINT NOT NULL,
    path JSONB NOT NULL DEFAULT '[]',
    optimal_path JSONB DEFAULT '[]',

    -- Metrics
    total_reward FLOAT NOT NULL DEFAULT 0,
    steps INTEGER NOT NULL DEFAULT 0,
    success BOOLEAN NOT NULL DEFAULT FALSE,

    -- Efficiency
    path_length FLOAT,
    optimal_length FLOAT,
    efficiency FLOAT,

    -- Risk
    avg_risk_score FLOAT,
    max_risk_score FLOAT,

    -- Agent State
    final_epsilon FLOAT,

    -- Timing
    duration_ms INTEGER,

    UNIQUE(run_id, episode_num)
);

-- ============================================
-- STEPS (Detailed per-step data)
-- ============================================
CREATE TABLE steps (
    id SERIAL PRIMARY KEY,
    episode_id INTEGER NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
    step_num INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- State
    node_id BIGINT NOT NULL,
    action INTEGER NOT NULL,
    action_name VARCHAR(20),

    -- Probabilities
    action_probs JSONB NOT NULL DEFAULT '{}',
    q_values JSONB,

    -- Reward
    reward FLOAT NOT NULL,
    cumulative_reward FLOAT NOT NULL,
    reward_breakdown JSONB,

    -- Risk
    risk_score FLOAT,
    risk_components JSONB,
    entropy FLOAT,

    -- Distance
    distance_to_goal FLOAT,
    distance_traveled FLOAT,

    UNIQUE(episode_id, step_num)
);

-- ============================================
-- REWARD PRESETS
-- ============================================
CREATE TABLE reward_presets (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Metadata
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,

    -- Configuration
    mode VARCHAR(20) DEFAULT 'sliders' CHECK (mode IN ('sliders', 'code')),
    config JSONB NOT NULL DEFAULT '{}',
    code TEXT,

    -- Flags
    is_default BOOLEAN DEFAULT FALSE,
    is_system BOOLEAN DEFAULT FALSE
);

-- ============================================
-- MODEL CHECKPOINTS
-- ============================================
CREATE TABLE model_checkpoints (
    id SERIAL PRIMARY KEY,
    run_id INTEGER NOT NULL REFERENCES training_runs(id) ON DELETE CASCADE,
    episode INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Model
    algorithm VARCHAR(50) NOT NULL,
    weights BYTEA NOT NULL,

    -- Metrics at checkpoint
    metrics JSONB NOT NULL DEFAULT '{}',

    -- Metadata
    is_best BOOLEAN DEFAULT FALSE,
    notes TEXT,

    UNIQUE(run_id, episode)
);

-- ============================================
-- ALGORITHM CONFIGS (Preset hyperparameters)
-- ============================================
CREATE TABLE algorithm_configs (
    id SERIAL PRIMARY KEY,
    algorithm VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    config JSONB NOT NULL DEFAULT '{}',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(algorithm, name)
);

-- ============================================
-- INDEXES
-- ============================================

-- Training runs
CREATE INDEX idx_runs_created_at ON training_runs(created_at DESC);
CREATE INDEX idx_runs_status ON training_runs(status);
CREATE INDEX idx_runs_algorithm ON training_runs(algorithm);

-- Episodes
CREATE INDEX idx_episodes_run_id ON episodes(run_id);
CREATE INDEX idx_episodes_success ON episodes(success);
CREATE INDEX idx_episodes_reward ON episodes(total_reward DESC);

-- Steps
CREATE INDEX idx_steps_episode_id ON steps(episode_id);
CREATE INDEX idx_steps_node ON steps(node_id);
CREATE INDEX idx_steps_risk ON steps(risk_score DESC);

-- Checkpoints
CREATE INDEX idx_checkpoints_run_id ON model_checkpoints(run_id);
CREATE INDEX idx_checkpoints_best ON model_checkpoints(is_best) WHERE is_best = TRUE;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
CREATE TRIGGER update_training_runs_updated_at
    BEFORE UPDATE ON training_runs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reward_presets_updated_at
    BEFORE UPDATE ON reward_presets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DEFAULT DATA
-- ============================================

-- Default reward presets
INSERT INTO reward_presets (name, description, mode, config, is_default, is_system) VALUES
(
    'Balanced',
    'A balanced reward function suitable for most scenarios',
    'sliders',
    '{
        "goal_reached": 10.0,
        "progress_bonus": 0.5,
        "wrong_direction": -0.3,
        "revisit_penalty": -0.5,
        "step_penalty": -0.05,
        "timeout_penalty": -2.0
    }',
    TRUE,
    TRUE
),
(
    'Aggressive',
    'Heavily rewards reaching the goal, tolerates some inefficiency',
    'sliders',
    '{
        "goal_reached": 20.0,
        "progress_bonus": 1.0,
        "wrong_direction": -0.1,
        "revisit_penalty": -0.2,
        "step_penalty": -0.02,
        "timeout_penalty": -5.0
    }',
    FALSE,
    TRUE
),
(
    'Conservative',
    'Prioritizes safe, efficient routes over speed',
    'sliders',
    '{
        "goal_reached": 5.0,
        "progress_bonus": 0.3,
        "wrong_direction": -0.5,
        "revisit_penalty": -1.0,
        "step_penalty": -0.1,
        "timeout_penalty": -1.0
    }',
    FALSE,
    TRUE
),
(
    'Exploration',
    'Encourages exploration with minimal penalties',
    'sliders',
    '{
        "goal_reached": 10.0,
        "progress_bonus": 0.2,
        "wrong_direction": -0.1,
        "revisit_penalty": -0.1,
        "step_penalty": -0.01,
        "timeout_penalty": -0.5
    }',
    FALSE,
    TRUE
);

-- Default algorithm configs
INSERT INTO algorithm_configs (algorithm, name, description, config, is_default) VALUES
(
    'DQN',
    'Default DQN',
    'Standard DQN configuration',
    '{
        "learning_rate": 0.001,
        "gamma": 0.99,
        "epsilon_start": 1.0,
        "epsilon_end": 0.1,
        "epsilon_decay": 0.995,
        "batch_size": 32,
        "buffer_size": 10000,
        "target_update_freq": 100
    }',
    TRUE
),
(
    'DoubleDQN',
    'Default Double DQN',
    'Double DQN to reduce overestimation',
    '{
        "learning_rate": 0.001,
        "gamma": 0.99,
        "epsilon_start": 1.0,
        "epsilon_end": 0.1,
        "epsilon_decay": 0.995,
        "batch_size": 32,
        "buffer_size": 10000,
        "target_update_freq": 100
    }',
    TRUE
),
(
    'PPO',
    'Default PPO',
    'Proximal Policy Optimization',
    '{
        "learning_rate": 0.0003,
        "gamma": 0.99,
        "gae_lambda": 0.95,
        "clip_epsilon": 0.2,
        "value_coef": 0.5,
        "entropy_coef": 0.01,
        "batch_size": 64,
        "n_epochs": 10
    }',
    TRUE
),
(
    'A2C',
    'Default A2C',
    'Advantage Actor-Critic',
    '{
        "learning_rate": 0.0007,
        "gamma": 0.99,
        "gae_lambda": 0.95,
        "value_coef": 0.5,
        "entropy_coef": 0.01,
        "max_grad_norm": 0.5,
        "n_steps": 5
    }',
    TRUE
);

-- ============================================
-- VIEWS
-- ============================================

-- Training runs summary
CREATE VIEW training_runs_summary AS
SELECT
    tr.id,
    tr.uuid,
    tr.name,
    tr.algorithm,
    tr.status,
    tr.total_episodes,
    tr.completed_episodes,
    tr.avg_reward,
    tr.success_rate,
    tr.created_at,
    COUNT(e.id) as actual_episodes,
    AVG(e.total_reward) as calculated_avg_reward,
    AVG(e.efficiency) as avg_efficiency
FROM training_runs tr
LEFT JOIN episodes e ON e.run_id = tr.id
GROUP BY tr.id;

-- Episode statistics
CREATE VIEW episode_stats AS
SELECT
    e.run_id,
    e.episode_num,
    e.total_reward,
    e.success,
    e.efficiency,
    COUNT(s.id) as total_steps,
    AVG(s.risk_score) as avg_risk,
    MAX(s.risk_score) as max_risk,
    AVG(s.entropy) as avg_entropy
FROM episodes e
LEFT JOIN steps s ON s.episode_id = e.id
GROUP BY e.id;

-- ============================================
-- GRANTS (for application user)
-- ============================================
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO adv_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO adv_user;

SELECT 'Database initialized successfully!' as status;
