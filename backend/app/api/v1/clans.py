from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.database import get_db
from app.models.social import Clan
from app.models.clan_requests import ClanRequest
from app.models.user import User
from app.api.v1.deps import get_current_user_id

router = APIRouter()

@router.post("/create")
async def create_clan(
    payload: dict = Body(...), 
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    name = payload.get("name")
    description = payload.get("description", "")
    entry_fee = payload.get("entry_fee", 0)
    shield_id = payload.get("shield_id", 1)
    
    if not user_id or user_id == "anon_user" or not name:
        raise HTTPException(status_code=400, detail="Invalid parameters")
        
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.clan_id is not None:
        raise HTTPException(status_code=400, detail="User already in a clan")
        
    from app.db.redis import redis_client
    user_state_key = f"user_state:{user_id}"
    state = await redis_client.hgetall(user_state_key)
    current_coins = float(state.get("egg_coins", user.egg_coins)) if state else user.egg_coins
    
    if current_coins < 1000:
        raise HTTPException(status_code=400, detail="Not enough EggCoins (1000 required)")
        
    # Check if clan exists
    existing_result = await db.execute(select(Clan).where(Clan.name == name))
    if existing_result.scalars().first():
        raise HTTPException(status_code=400, detail="Clan name already exists")
        
    # Descontar solo 1000 por la creación (el resto se queda con el usuario)
    new_coins = current_coins - 1000
    await redis_client.hset(user_state_key, "egg_coins", new_coins)
    
    # También actualizamos la DB para evitar saltos temporales
    user.egg_coins = new_coins
    
    new_clan = Clan(
        name=name,
        description=description,
        leader_id=user_id,
        entry_fee=entry_fee,
        member_count=1,
        total_clicks=0,
        egg_coins=0, # El clan inicia en 0 (el dinero del jugador NO va al clan)
        shield_id=shield_id
    )
    
    db.add(new_clan)
    await db.flush() # Para obtener el ID del clan
    
    user.clan_id = new_clan.id
    
    # Actualizar clan_id en Redis
    await redis_client.hset(user_state_key, "clan_id", str(new_clan.id))
    # Para asegurar que la DB se sincronice pronto
    await redis_client.sadd("pending_db_sync", user_id)
    
    await db.commit()
    
    return {"status": "success", "clan_id": new_clan.id, "egg_coins": user.egg_coins}

@router.get("/")
async def list_clans(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Clan))
    clans = result.scalars().all()
    return [{
        "id": c.id,
        "name": c.name,
        "description": c.description,
        "leader_id": c.leader_id,
        "entry_fee": c.entry_fee,
        "member_count": c.member_count,
        "total_clicks": c.total_clicks,
        "egg_coins": c.egg_coins,
        "shield_id": c.shield_id
    } for c in clans]

@router.get("/{clan_id}")
async def get_clan(clan_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Clan).where(Clan.id == clan_id))
    clan = result.scalars().first()
    if not clan:
        raise HTTPException(status_code=404, detail="Clan not found")
        
    # Obtener miembros
    members_result = await db.execute(select(User).where(User.clan_id == clan_id))
    members = members_result.scalars().all()
    
    return {
        "id": clan.id,
        "name": clan.name,
        "description": clan.description,
        "leader_id": clan.leader_id,
        "entry_fee": clan.entry_fee,
        "member_count": clan.member_count,
        "total_clicks": clan.total_clicks,
        "egg_coins": clan.egg_coins,
        "shield_id": clan.shield_id,
        "members": [{"id": m.id, "username": m.username, "total_clicks": m.total_clicks} for m in members]
    }

@router.post("/{clan_id}/join")
async def join_clan(
    clan_id: int, 
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    if not user_id or user_id == "anon_user":
        raise HTTPException(status_code=401, detail="Must be logged in")
        
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.clan_id is not None:
        raise HTTPException(status_code=400, detail="Already in a clan")
        
    clan_result = await db.execute(select(Clan).where(Clan.id == clan_id))
    clan = clan_result.scalars().first()
    
    if not clan:
        raise HTTPException(status_code=404, detail="Clan not found")
        
    if clan.member_count >= 10:
        raise HTTPException(status_code=400, detail="Clan is full (max 10 members)")
        
    from app.db.redis import redis_client
    user_state_key = f"user_state:{user_id}"
    state = await redis_client.hgetall(user_state_key)
    current_coins = float(state.get("egg_coins", user.egg_coins)) if state else user.egg_coins
        
    if current_coins < clan.entry_fee:
        raise HTTPException(status_code=400, detail=f"Not enough EggCoins for entry fee ({clan.entry_fee})")
        
    # Verificar si ya existe una solicitud pendiente
    req_result = await db.execute(select(ClanRequest).where(ClanRequest.clan_id == clan_id, ClanRequest.user_id == user_id, ClanRequest.status == "pending"))
    if req_result.scalars().first():
        raise HTTPException(status_code=400, detail="Request already pending")
        
    new_request = ClanRequest(clan_id=clan_id, user_id=user_id, status="pending")
    db.add(new_request)
    await db.commit()
    
    return {"status": "success", "message": "Request sent to clan leader"}

@router.get("/{clan_id}/requests")
async def get_clan_requests(
    clan_id: int, 
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    clan_result = await db.execute(select(Clan).where(Clan.id == clan_id))
    clan = clan_result.scalars().first()
    
    if not clan or clan.leader_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    req_result = await db.execute(select(ClanRequest, User.username).join(User, ClanRequest.user_id == User.id).where(ClanRequest.clan_id == clan_id, ClanRequest.status == "pending"))
    requests = req_result.all()
    
    return [{"request_id": r[0].id, "user_id": r[0].user_id, "username": r[1]} for r in requests]

@router.post("/{clan_id}/accept/{request_id}")
async def accept_request(
    clan_id: int, 
    request_id: int, 
    db: AsyncSession = Depends(get_db),
    leader_id: str = Depends(get_current_user_id)
):
    
    clan_result = await db.execute(select(Clan).where(Clan.id == clan_id))
    clan = clan_result.scalars().first()
    
    if not clan or clan.leader_id != leader_id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    if clan.member_count >= 10:
        raise HTTPException(status_code=400, detail="Clan is full")
        
    req_result = await db.execute(select(ClanRequest).where(ClanRequest.id == request_id, ClanRequest.clan_id == clan_id, ClanRequest.status == "pending"))
    clan_req = req_result.scalars().first()
    
    if not clan_req:
        raise HTTPException(status_code=404, detail="Request not found or already processed")
        
    applicant_result = await db.execute(select(User).where(User.id == clan_req.user_id))
    applicant = applicant_result.scalars().first()
    
    if not applicant or applicant.clan_id is not None:
        clan_req.status = "rejected" # Auto-rechazar si ya se unió a otro
        await db.commit()
        raise HTTPException(status_code=400, detail="Applicant no longer available")
        
    from app.db.redis import redis_client
    applicant_state_key = f"user_state:{applicant.id}"
    state = await redis_client.hgetall(applicant_state_key)
    applicant_coins = float(state.get("egg_coins", applicant.egg_coins)) if state else applicant.egg_coins
        
    if applicant_coins < clan.entry_fee:
        clan_req.status = "rejected"
        await db.commit()
        raise HTTPException(status_code=400, detail="Applicant cannot afford entry fee anymore")
        
    # Procesar: Solo deducir el entry_fee, el resto se queda con el aplicante
    new_coins = applicant_coins - clan.entry_fee
    await redis_client.hset(applicant_state_key, "egg_coins", new_coins)
    
    # También actualizamos la DB para evitar saltos temporales
    applicant.egg_coins = new_coins
    
    # El clan suma el entry_fee (usando hincrbyfloat para ser atómicos con Redis)
    await redis_client.hincrbyfloat(f"clan_state:{clan.id}", "egg_coins", clan.entry_fee)
    # Se agrega a pending_clan_sync para que el worker actualice PostgreSQL luego
    await redis_client.sadd("pending_clan_sync", clan.id)
    
    applicant.clan_id = clan.id
    # Actualizar clan_id en Redis
    await redis_client.hset(applicant_state_key, "clan_id", str(clan.id))
    await redis_client.sadd("pending_db_sync", applicant.id)
    
    clan.member_count += 1
    clan_req.status = "accepted"
    
    # Rechazar cualquier otra solicitud pendiente de este usuario a otros clanes
    other_reqs = await db.execute(select(ClanRequest).where(ClanRequest.user_id == applicant.id, ClanRequest.status == "pending"))
    for r in other_reqs.scalars().all():
        r.status = "rejected"
        
    await db.commit()
    return {"status": "success", "message": "User added to clan"}

@router.post("/{clan_id}/reject/{request_id}")
async def reject_request(
    clan_id: int, 
    request_id: int, 
    db: AsyncSession = Depends(get_db),
    leader_id: str = Depends(get_current_user_id)
):
    
    clan_result = await db.execute(select(Clan).where(Clan.id == clan_id))
    clan = clan_result.scalars().first()
    
    if not clan or clan.leader_id != leader_id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    req_result = await db.execute(select(ClanRequest).where(ClanRequest.id == request_id, ClanRequest.clan_id == clan_id, ClanRequest.status == "pending"))
    clan_req = req_result.scalars().first()
    
    if not clan_req:
        raise HTTPException(status_code=404, detail="Request not found")
        
    clan_req.status = "rejected"
    await db.commit()
    return {"status": "success", "message": "Request rejected"}
