from sqlalchemy import Column, String, BigInteger, Boolean, Integer, JSON
from app.models.base import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True) # Usamos String para el usuario mock
    username = Column(String, unique=True, index=True)
    total_clicks = Column(BigInteger, default=0)
    egg_coins = Column(BigInteger, default=0)
    clan_id = Column(Integer, nullable=True)
    clan_contribution = Column(BigInteger, default=0)
    country = Column(String, nullable=True)
    inventory = Column(JSON, default=dict)
    unprocessed_clicks = Column(Integer, default=0)
    is_functional_user = Column(Boolean, default=False)
    session_clicks = Column(Integer, default=0)
    cooldown_until = Column(String, nullable=True) # Usamos String (ISO) por simplicidad de compatibilidad SQLite/Postgres
    device_fingerprint = Column(String, nullable=True, index=True)
    last_ip = Column(String, nullable=True)
