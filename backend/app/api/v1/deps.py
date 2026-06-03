from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import os

security = HTTPBearer()

async def get_current_user_id(credentials: HTTPAuthorizationCredentials = Security(security)):
    token = credentials.credentials
    secret = os.environ["JWT_SECRET"]
    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
            
        from app.db.redis import redis_client
        ban_data = await redis_client.get(f"ban:{user_id}")
        if ban_data:
            import json
            try:
                ban_info = json.loads(ban_data)
                reason = ban_info.get("reason", "Your account has been banned.")
            except:
                reason = "Your account has been banned."
            raise HTTPException(status_code=403, detail=reason)
        elif await redis_client.sismember("banned_users", user_id):
            raise HTTPException(status_code=403, detail="Your account has been banned.")
            
        return user_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
