"""
FastAPI WebSocket Server

Provides real-time simulation data to the web frontend.
"""

import asyncio
import json
from typing import Set
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

import numpy as np

# Store active WebSocket connections
active_connections: Set[WebSocket] = set()

# Simulation state that will be broadcast
simulation_state = {
    "episode": 0,
    "step": 0,
    "vehicles": [],
    "decisions": [],
    "rewardComponents": [],
    "actionProbabilities": [],
    "totalReward": 0,
    "riskLevel": 0,
    "isLive": False,
    "currentAction": "IDLE",
    "currentSpeed": 0,
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    print("Starting WebSocket server...")
    yield
    print("Shutting down WebSocket server...")


app = FastAPI(
    title="Autonomous Decision Visualizer API",
    version="0.1.0",
    lifespan=lifespan,
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "ok", "message": "Autonomous Decision Visualizer API"}


@app.get("/state")
async def get_state():
    """Get current simulation state."""
    return simulation_state


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates."""
    await websocket.accept()
    active_connections.add(websocket)

    try:
        # Send connection acknowledgment
        await websocket.send_json({
            "type": "connection",
            "data": {"message": "Connected to simulation server"}
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
                if message.get("command") == "start":
                    simulation_state["isLive"] = True
                elif message.get("command") == "stop":
                    simulation_state["isLive"] = False
                elif message.get("command") == "reset":
                    simulation_state["episode"] = 0
                    simulation_state["step"] = 0
                    simulation_state["decisions"] = []

            except asyncio.TimeoutError:
                # Send ping to keep connection alive
                await websocket.send_json({"type": "ping"})

    except WebSocketDisconnect:
        active_connections.discard(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        active_connections.discard(websocket)


async def broadcast_state(state: dict):
    """Broadcast state update to all connected clients."""
    if not active_connections:
        return

    message = json.dumps({"type": "state_update", "data": state})

    disconnected = set()
    for connection in active_connections:
        try:
            await connection.send_text(message)
        except Exception:
            disconnected.add(connection)

    # Clean up disconnected clients
    active_connections.difference_update(disconnected)


def update_state(
    episode: int = None,
    step: int = None,
    vehicles: list = None,
    decision: dict = None,
    reward_components: list = None,
    action_probabilities: list = None,
    total_reward: float = None,
    risk_level: float = None,
    current_action: str = None,
    current_speed: float = None,
):
    """Update simulation state (called from the RL loop)."""
    if episode is not None:
        simulation_state["episode"] = episode
    if step is not None:
        simulation_state["step"] = step
    if vehicles is not None:
        simulation_state["vehicles"] = vehicles
    if decision is not None:
        simulation_state["decisions"].append(decision)
        # Keep only last 50 decisions
        simulation_state["decisions"] = simulation_state["decisions"][-50:]
    if reward_components is not None:
        simulation_state["rewardComponents"] = reward_components
    if action_probabilities is not None:
        simulation_state["actionProbabilities"] = action_probabilities
    if total_reward is not None:
        simulation_state["totalReward"] = total_reward
    if risk_level is not None:
        simulation_state["riskLevel"] = risk_level
    if current_action is not None:
        simulation_state["currentAction"] = current_action
    if current_speed is not None:
        simulation_state["currentSpeed"] = current_speed

    simulation_state["isLive"] = True


def run_server(host: str = "0.0.0.0", port: int = 8000):
    """Run the FastAPI server."""
    import uvicorn
    uvicorn.run(app, host=host, port=port)


if __name__ == "__main__":
    run_server()
