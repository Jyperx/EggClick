from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc
from app.db.database import get_db
from app.models.user import User
from app.models.social import Clan
from pydantic import BaseModel

router = APIRouter()

class JoinClanRequest(BaseModel):
    user_id: str
    clan_name: str

@router.get("/leaderboard/users")
async def get_top_users(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).order_by(desc(User.total_clicks)).limit(10))
    users = result.scalars().all()
    return [{"username": u.username, "clicks": u.total_clicks, "egg_coins": u.egg_coins} for u in users]

@router.get("/leaderboard/clans")
async def get_top_clans(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Clan).order_by(desc(Clan.total_clicks)).limit(10))
    clans = result.scalars().all()
    return [{"name": c.name, "clicks": c.total_clicks} for c in clans]

@router.post("/clans/join")
async def join_or_create_clan(req: JoinClanRequest, db: AsyncSession = Depends(get_db)):
    # Buscar usuario
    res = await db.execute(select(User).where(User.id == req.user_id))
    user = res.scalars().first()
    
    # Si es nuevo, lo creamos para que pueda unirse a un clan antes de hacer su primer clic
    if not user:
        user = User(id=req.user_id, username=f"Player_{req.user_id}", total_clicks=0, egg_coins=0)
        db.add(user)
        await db.commit()
        await db.refresh(user)
        
    # Buscar clan
    res = await db.execute(select(Clan).where(Clan.name == req.clan_name))
    clan = res.scalars().first()
    
    if not clan:
        clan = Clan(name=req.clan_name, total_clicks=0)
        db.add(clan)
        await db.commit()
        await db.refresh(clan)
        
    user.clan_id = clan.id
    await db.commit()
    
    return {"status": "success", "clan_name": clan.name}
