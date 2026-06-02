from sqlalchemy import Column, Integer, String, ForeignKey
from app.models.base import Base

class ClanRequest(Base):
    __tablename__ = "clan_requests"

    id = Column(Integer, primary_key=True, index=True)
    clan_id = Column(Integer, ForeignKey("clans.id"), index=True)
    user_id = Column(String, ForeignKey("users.id"), index=True)
    status = Column(String, default="pending") # 'pending', 'accepted', 'rejected'
