from fastapi import APIRouter, Depends, HTTPException
import jwt
import os
import datetime
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()
router = APIRouter()

SECRET_KEY = os.getenv("JWT_SECRET", "super-secret-key-egg-game")

class AdTokenResponse(BaseModel):
    token: str

@router.get("/generate-token", response_model=AdTokenResponse)
async def generate_ad_token():
    # En un entorno real S2S, esto no sería llamado por el cliente directamente
    # sino que el Ad Network nos llamaría. Por ahora, creamos un token con caducidad.
    expiration = datetime.datetime.utcnow() + datetime.timedelta(minutes=5)
    payload = {
        "sub": "adsense_reward",
        "exp": expiration
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
    return {"token": token}
