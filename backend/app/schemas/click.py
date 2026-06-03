from pydantic import BaseModel
from typing import Optional

class ClickBatch(BaseModel):
    user_id: str  # Conservado por compatibilidad pero el real viene del JWT
    clicks: int
    frozen_clicks: int = 0
    timestamp: int # Para Anti-Replay
    used_ice_hands: Optional[int] = 0
    used_autoclicker_seconds: Optional[float] = 0.0
    used_touchme_seconds: Optional[float] = 0.0
    bypass_cooldown_token: Optional[str] = None
    device_fingerprint: Optional[str] = None
    jwt_token: Optional[str] = None
    overheat_penalty_clicks: Optional[int] = 0

