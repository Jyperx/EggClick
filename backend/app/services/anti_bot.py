import time
from app.db.redis import redis_client

# Constantes de seguridad
MAX_CLICKS_PER_SECOND = 20 # Damos un margen
MAX_BATCH_CLICKS = 300 # Permite acumulación si la pestaña se suspende temporalmente

async def validate_clicks(user_id: str, clicks: int) -> bool:
    """
    Valida si un lote de clics es legítimo.
    Retorna True si es válido, False si es bot (varianza/exceso).
    """
    # 1. Límite Físico: Imposible hacer más de X clics en un lote razonable
    if clicks > MAX_BATCH_CLICKS:
        return False
        
    # 2. Validación de Clics por Minuto en Redis
    current_time = int(time.time())
    minute_window = current_time // 60
    minute_key = f"rate_limit:{user_id}:min:{minute_window}"
    
    pipe = redis_client.pipeline()
    pipe.incrby(minute_key, clicks)
    pipe.expire(minute_key, 120)
    result = await pipe.execute()
    
    clicks_this_minute = result[0]
    
    # Límite por minuto (~900 clics)
    if clicks_this_minute > 950: 
        # Aquí se podría activar el "Shadowban" en PostgreSQL
        return False
        
    return True
