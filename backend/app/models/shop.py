from sqlalchemy import Column, Integer, String, Numeric, BigInteger
from app.models.base import Base

class ShopItem(Base):
    __tablename__ = "shop_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    description = Column(String)
    cost_egg_coins = Column(BigInteger, nullable=True)
    cost_usd = Column(Numeric(10, 2), nullable=True)
