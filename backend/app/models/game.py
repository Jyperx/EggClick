from sqlalchemy import Column, Integer, BigInteger, Numeric, Boolean, DateTime
from app.models.base import Base

class GlobalGameState(Base):
    __tablename__ = "global_game_state"

    id = Column(Integer, primary_key=True, index=True)
    current_season = Column(Integer, default=1)
    total_clicks_required = Column(BigInteger, default=1000000000)
    current_clicks = Column(BigInteger, default=0)
    prize_pool_usd = Column(Numeric(12, 2), default=150.00)
    unprocessed_clicks_for_prize = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    frenzy_mode_until = Column(DateTime, nullable=True)
