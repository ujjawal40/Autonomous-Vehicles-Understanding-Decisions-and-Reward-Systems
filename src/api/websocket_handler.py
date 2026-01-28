"""
WebSocket Handler

Manages WebSocket connections and broadcasts training updates.
"""

import asyncio
import json
from typing import Dict, Set, Any, Optional
from dataclasses import dataclass, asdict
from datetime import datetime
from fastapi import WebSocket, WebSocketDisconnect


@dataclass
class WSMessage:
    """WebSocket message structure."""
    type: str
    payload: Dict[str, Any]
    timestamp: float

    def to_json(self) -> str:
        return json.dumps(asdict(self))


class ConnectionManager:
    """Manages WebSocket connections and message broadcasting."""

    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.connection_metadata: Dict[WebSocket, Dict[str, Any]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, client_id: Optional[str] = None):
        """Accept a new WebSocket connection."""
        await websocket.accept()
        async with self._lock:
            self.active_connections.add(websocket)
            self.connection_metadata[websocket] = {
                "client_id": client_id or str(id(websocket)),
                "connected_at": datetime.utcnow().isoformat(),
                "subscriptions": set(),
            }

        # Send connection confirmation
        await self.send_personal(
            websocket,
            "connection_established",
            {
                "client_id": self.connection_metadata[websocket]["client_id"],
                "server_time": datetime.utcnow().isoformat(),
            }
        )

    async def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection."""
        async with self._lock:
            self.active_connections.discard(websocket)
            self.connection_metadata.pop(websocket, None)

    async def send_personal(
        self, websocket: WebSocket, msg_type: str, payload: Dict[str, Any]
    ):
        """Send a message to a specific client."""
        message = WSMessage(
            type=msg_type,
            payload=payload,
            timestamp=datetime.utcnow().timestamp()
        )
        try:
            await websocket.send_text(message.to_json())
        except Exception as e:
            print(f"Failed to send message: {e}")
            await self.disconnect(websocket)

    async def broadcast(self, msg_type: str, payload: Dict[str, Any]):
        """Broadcast a message to all connected clients."""
        message = WSMessage(
            type=msg_type,
            payload=payload,
            timestamp=datetime.utcnow().timestamp()
        )
        json_message = message.to_json()

        disconnected = set()
        for connection in self.active_connections.copy():
            try:
                await connection.send_text(json_message)
            except Exception:
                disconnected.add(connection)

        # Clean up disconnected clients
        for connection in disconnected:
            await self.disconnect(connection)

    async def broadcast_to_subscribed(
        self, msg_type: str, payload: Dict[str, Any], topic: str
    ):
        """Broadcast to clients subscribed to a specific topic."""
        message = WSMessage(
            type=msg_type,
            payload=payload,
            timestamp=datetime.utcnow().timestamp()
        )
        json_message = message.to_json()

        for connection in self.active_connections.copy():
            metadata = self.connection_metadata.get(connection, {})
            subscriptions = metadata.get("subscriptions", set())
            if topic in subscriptions:
                try:
                    await connection.send_text(json_message)
                except Exception:
                    await self.disconnect(connection)

    async def subscribe(self, websocket: WebSocket, topic: str):
        """Subscribe a client to a topic."""
        if websocket in self.connection_metadata:
            self.connection_metadata[websocket]["subscriptions"].add(topic)

    async def unsubscribe(self, websocket: WebSocket, topic: str):
        """Unsubscribe a client from a topic."""
        if websocket in self.connection_metadata:
            self.connection_metadata[websocket]["subscriptions"].discard(topic)

    @property
    def connection_count(self) -> int:
        """Get the number of active connections."""
        return len(self.active_connections)


# Global connection manager instance
manager = ConnectionManager()


# Message type constants
class MessageTypes:
    # Server -> Client
    CONNECTION_ESTABLISHED = "connection_established"
    TRAINING_STARTED = "training_started"
    TRAINING_STOPPED = "training_stopped"
    TRAINING_PAUSED = "training_paused"
    TRAINING_RESUMED = "training_resumed"
    STEP_COMPLETED = "step_completed"
    EPISODE_COMPLETED = "episode_completed"
    STATE_UPDATE = "state_update"
    METRICS_UPDATE = "metrics_update"
    REWARD_UPDATE = "reward_update"
    ERROR = "error"

    # Client -> Server
    START_TRAINING = "start_training"
    STOP_TRAINING = "stop_training"
    PAUSE_TRAINING = "pause_training"
    RESUME_TRAINING = "resume_training"
    UPDATE_CONFIG = "update_config"
    UPDATE_REWARD_WEIGHTS = "update_reward_weights"
    SUBSCRIBE = "subscribe"
    UNSUBSCRIBE = "unsubscribe"


async def handle_client_message(
    websocket: WebSocket,
    message: Dict[str, Any],
    training_callback=None
):
    """Handle incoming messages from clients."""
    msg_type = message.get("type")
    payload = message.get("payload", {})

    if msg_type == MessageTypes.START_TRAINING:
        if training_callback:
            await training_callback("start", payload)
        await manager.broadcast(
            MessageTypes.TRAINING_STARTED,
            {"config": payload}
        )

    elif msg_type == MessageTypes.STOP_TRAINING:
        if training_callback:
            await training_callback("stop", payload)
        await manager.broadcast(
            MessageTypes.TRAINING_STOPPED,
            {}
        )

    elif msg_type == MessageTypes.PAUSE_TRAINING:
        if training_callback:
            await training_callback("pause", payload)
        await manager.broadcast(
            MessageTypes.TRAINING_PAUSED,
            {}
        )

    elif msg_type == MessageTypes.RESUME_TRAINING:
        if training_callback:
            await training_callback("resume", payload)
        await manager.broadcast(
            MessageTypes.TRAINING_RESUMED,
            {}
        )

    elif msg_type == MessageTypes.UPDATE_CONFIG:
        if training_callback:
            await training_callback("update_config", payload)

    elif msg_type == MessageTypes.UPDATE_REWARD_WEIGHTS:
        if training_callback:
            await training_callback("update_reward_weights", payload)

    elif msg_type == MessageTypes.SUBSCRIBE:
        topic = payload.get("topic")
        if topic:
            await manager.subscribe(websocket, topic)

    elif msg_type == MessageTypes.UNSUBSCRIBE:
        topic = payload.get("topic")
        if topic:
            await manager.unsubscribe(websocket, topic)


async def websocket_endpoint(websocket: WebSocket, training_callback=None):
    """Main WebSocket endpoint handler."""
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                await handle_client_message(websocket, message, training_callback)
            except json.JSONDecodeError:
                await manager.send_personal(
                    websocket,
                    MessageTypes.ERROR,
                    {"message": "Invalid JSON"}
                )
    except WebSocketDisconnect:
        await manager.disconnect(websocket)


# Utility functions for broadcasting training updates
async def broadcast_step(step_data: Dict[str, Any]):
    """Broadcast a training step update."""
    await manager.broadcast(MessageTypes.STEP_COMPLETED, step_data)


async def broadcast_episode(episode_data: Dict[str, Any]):
    """Broadcast an episode completion."""
    await manager.broadcast(MessageTypes.EPISODE_COMPLETED, episode_data)


async def broadcast_metrics(metrics: Dict[str, Any]):
    """Broadcast metrics update."""
    await manager.broadcast(MessageTypes.METRICS_UPDATE, metrics)


async def broadcast_state(state: Dict[str, Any]):
    """Broadcast vehicle state update."""
    await manager.broadcast(MessageTypes.STATE_UPDATE, state)
