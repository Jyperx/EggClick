from fastapi import WebSocket
from typing import List
import json

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.user_connections: dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: str = None):
        if user_id:
            # Si el usuario ya tiene una sesión abierta, la cerramos para evitar farmeo multi-pestaña
            existing_ws = self.user_connections.get(user_id)
            if existing_ws:
                try:
                    await existing_ws.send_json({"type": "force_disconnect", "reason": "multiple_tabs"})
                    await existing_ws.close(code=1008)
                except Exception:
                    pass
                self.disconnect(existing_ws)
                
            self.user_connections[user_id] = websocket
            
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            
        # Remover del diccionario de usuarios si existe
        to_remove_user = None
        for uid, ws in self.user_connections.items():
            if ws == websocket:
                to_remove_user = uid
                break
        if to_remove_user:
            del self.user_connections[to_remove_user]

    async def broadcast_state(self, current_clicks: int, prize_usd: float):
        message = {
            "type": "state_update",
            "current_clicks": current_clicks,
            "prize_usd": prize_usd
        }
        
        # Copiamos la lista para evitar errores si alguien se desconecta iterando
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                self.disconnect(connection)
                
    async def broadcast(self, message: str):
        # Copiamos la lista para evitar errores
        for connection in list(self.active_connections):
            try:
                await connection.send_text(message)
            except Exception:
                self.disconnect(connection)

manager = ConnectionManager()
