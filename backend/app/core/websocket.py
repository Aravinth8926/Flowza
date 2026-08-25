import json
from typing import Dict, List, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.core.security import decode_token

class ConnectionManager:
    def __init__(self):
        # Maps user_id -> List of WebSockets
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # Maps user_id -> role_name
        self.user_roles: Dict[str, str] = {}

    async def connect(self, websocket: WebSocket, user_id: str, role_name: str = "vendor"):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        self.user_roles[user_id] = role_name.lower()
        print(f"[WS] Connected user {user_id} ({role_name}). Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                self.user_roles.pop(user_id, None)
        print(f"[WS] Disconnected user {user_id}")

    async def send_to_user(self, user_id: str, message: dict):
        """Send message to a specific user across all active tab connections."""
        if user_id in self.active_connections:
            for connection in list(self.active_connections[user_id]):
                try:
                    await connection.send_json(message)
                except Exception as e:
                    print(f"[WS] Error sending to user {user_id}: {e}")

    async def send_to_all_vendors(self, message: dict):
        """Broadcast message to all connected vendor users."""
        for user_id, role in list(self.user_roles.items()):
            if role == "vendor":
                await self.send_to_user(user_id, message)

    async def send_to_all_suppliers(self, message: dict):
        """Broadcast message to all connected supplier users."""
        for user_id, role in list(self.user_roles.items()):
            if role == "supplier":
                await self.send_to_user(user_id, message)

    async def send_notification_event(self, user_id: str, notification_data: dict):
        """Send standardized real-time notification to a user's active connections."""
        payload = {
            "type": "notification",
            "event": "notification",
            "data": notification_data,
        }
        await self.send_to_user(user_id, payload)

    async def broadcast_all(self, message: dict):
        """Broadcast to all connected clients."""
        for user_id in list(self.active_connections.keys()):
            await self.send_to_user(user_id, message)


manager = ConnectionManager()

router = APIRouter()

@router.websocket("/ws/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str):
    decoded = decode_token(token)
    if not decoded or "sub" not in decoded:
        await websocket.close(code=4001)
        return

    user_id = str(decoded["sub"])
    role_name = decoded.get("role", "vendor")
    await manager.connect(websocket, user_id, role_name)

    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
    except Exception as e:
        manager.disconnect(websocket, user_id)
