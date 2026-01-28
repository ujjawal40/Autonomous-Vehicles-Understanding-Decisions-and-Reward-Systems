"""
London Navigation WebSocket Server

Provides real-time navigation data to the web frontend.
"""

import asyncio
import json
from typing import Set
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware


# Store active WebSocket connections
active_connections: Set[WebSocket] = set()

# Store the event loop for cross-thread broadcasting
_server_loop = None

# Map data (sent once on connection)
map_data = {}

# Simulation state
simulation_state = {
    "episode": 0,
    "step": 0,
    "currentNode": None,
    "targetNode": None,
    "pathTaken": [],
    "optimalPath": [],
    "currentAction": None,
    "actionProbs": {},
    "reward": 0,
    "totalReward": 0,
    "distanceTraveled": 0,
    "currentSpeed": 0,
    "agentStats": {},
    "probabilityEvolution": [],
    "stepHistory": [],
    "isLive": False,
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    global _server_loop
    _server_loop = asyncio.get_event_loop()
    print("Starting London Navigation WebSocket server...")
    yield
    print("Shutting down London Navigation WebSocket server...")


app = FastAPI(
    title="London Navigation API",
    version="0.1.0",
    lifespan=lifespan,
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "ok", "message": "London Navigation API"}


@app.get("/map")
async def get_map():
    """Get the current map data."""
    return map_data


@app.get("/state")
async def get_state():
    """Get current simulation state."""
    return simulation_state


@app.websocket("/ws/london")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time London navigation updates."""
    await websocket.accept()
    active_connections.add(websocket)

    try:
        # Send connection acknowledgment with map data
        await websocket.send_json({
            "type": "connection",
            "data": {
                "message": "Connected to London Navigation server",
                "mapData": map_data
            }
        })

        # Send current state
        await websocket.send_json({
            "type": "state_update",
            "data": simulation_state
        })

        # Keep connection alive and handle incoming messages
        while True:
            try:
                data = await asyncio.wait_for(
                    websocket.receive_text(),
                    timeout=30.0
                )
                message = json.loads(data)

                # Handle commands from frontend
                if message.get("command") == "set_destination":
                    # Frontend can request a specific start/end
                    start = message.get("start")
                    end = message.get("end")
                    # This could be used to restart simulation with new destination
                    print(f"Destination request: {start} -> {end}")

            except asyncio.TimeoutError:
                # Send ping to keep connection alive
                await websocket.send_json({"type": "ping"})

    except WebSocketDisconnect:
        active_connections.discard(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        active_connections.discard(websocket)


def set_map_data(data: dict):
    """Set the map data to be sent to clients."""
    global map_data
    map_data = data


def _sync_broadcast():
    """Synchronous wrapper to broadcast state from non-async context."""
    global _server_loop
    if not active_connections or _server_loop is None:
        return

    message = json.dumps({"type": "state_update", "data": simulation_state})

    for connection in active_connections.copy():
        try:
            asyncio.run_coroutine_threadsafe(
                connection.send_text(message),
                _server_loop
            )
        except Exception as e:
            print(f"Broadcast error: {e}")


def _to_python_type(value):
    """Convert numpy types to Python native types for JSON serialization."""
    import numpy as np
    if isinstance(value, (np.integer, np.int64, np.int32)):
        return int(value)
    elif isinstance(value, (np.floating, np.float64, np.float32)):
        return float(value)
    elif isinstance(value, np.ndarray):
        return value.tolist()
    elif isinstance(value, list):
        return [_to_python_type(v) for v in value]
    elif isinstance(value, dict):
        return {k: _to_python_type(v) for k, v in value.items()}
    return value


def update_navigation_state(
    episode: int = None,
    step: int = None,
    current_node: int = None,
    target_node: int = None,
    path_taken: list = None,
    optimal_path: list = None,
    current_action: int = None,
    action_probs: dict = None,
    reward: float = None,
    total_reward: float = None,
    distance_traveled: float = None,
    current_speed: float = None,
    agent_stats: dict = None,
    probability_evolution: list = None,
    step_history: list = None,
):
    """Update simulation state and broadcast to clients."""
    if episode is not None:
        simulation_state["episode"] = int(episode)
    if step is not None:
        simulation_state["step"] = int(step)
    if current_node is not None:
        simulation_state["currentNode"] = int(current_node)
    if target_node is not None:
        simulation_state["targetNode"] = int(target_node)
    if path_taken is not None:
        simulation_state["pathTaken"] = [int(n) for n in path_taken]
    if optimal_path is not None:
        simulation_state["optimalPath"] = [int(n) for n in optimal_path] if optimal_path else []
    if current_action is not None:
        simulation_state["currentAction"] = int(current_action)
    if action_probs is not None:
        simulation_state["actionProbs"] = {str(k): float(v) for k, v in action_probs.items()}
    if reward is not None:
        simulation_state["reward"] = float(reward)
    if total_reward is not None:
        simulation_state["totalReward"] = float(total_reward)
    if distance_traveled is not None:
        simulation_state["distanceTraveled"] = float(distance_traveled)
    if current_speed is not None:
        simulation_state["currentSpeed"] = float(current_speed)
    if agent_stats is not None:
        simulation_state["agentStats"] = _to_python_type(agent_stats)
    if probability_evolution is not None:
        simulation_state["probabilityEvolution"] = _to_python_type(probability_evolution)
    if step_history is not None:
        simulation_state["stepHistory"] = _to_python_type(step_history)

    simulation_state["isLive"] = True

    # Broadcast to connected clients
    _sync_broadcast()


def run_server(host: str = "0.0.0.0", port: int = 8001):
    """Run the FastAPI server."""
    import uvicorn
    uvicorn.run(app, host=host, port=port)


if __name__ == "__main__":
    run_server()
