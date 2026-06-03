import jwt
import os
from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

security = HTTPBearer(auto_error=False)

async def verify_jwt(credentials: HTTPAuthorizationCredentials = Security(security)):
    if not credentials:
        return None
        
    token = credentials.credentials
    secret = os.environ["JWT_SECRET"]
    
    try:
        decoded = jwt.decode(token, secret, algorithms=["HS256"])
        user_email = decoded.get("sub")
        
        if user_email:
            from app.db.redis import redis_client
            if await redis_client.sismember("banned_users", user_email):
                return None
                
        return user_email
    except Exception:
        return None

