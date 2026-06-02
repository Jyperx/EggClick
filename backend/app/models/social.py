from sqlalchemy import Column, Integer, String, BigInteger
from app.models.base import Base

class Clan(Base):
    __tablename__ = "clans"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(String, nullable=True)
    leader_id = Column(String, index=True)
    entry_fee = Column(BigInteger, default=0)
    member_count = Column(Integer, default=1)
    egg_coins = Column(BigInteger, default=0)
    total_clicks = Column(BigInteger, default=0)
    shield_id = Column(Integer, default=1)
