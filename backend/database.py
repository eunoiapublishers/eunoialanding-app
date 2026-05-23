# backend/database.py
import datetime
from sqlalchemy import create_engine, Column, Integer, String, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Estructura ligera de base de datos SQLite para evitar altos costos y asegurar velocidad
DATABASE_URL = "sqlite:///./leads_evergreen.db"

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, index=True, nullable=True)
    email = Column(String, unique=True, index=True, nullable=False)
    fecha_registro = Column(DateTime, default=datetime.datetime.utcnow)
    
    # "activo", "baja", "completado"
    estado_embudo = Column(String, default="activo", nullable=False)
    
    # Campo para registrar qué días ya se han enviado (ej: "1,3,6")
    # Esto evita duplicación si el cron job se ejecuta de nuevo en el mismo día
    dias_enviados = Column(String, default="", nullable=False)

def init_db():
    Base.metadata.create_all(bind=engine)
