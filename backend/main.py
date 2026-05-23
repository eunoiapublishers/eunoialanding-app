# backend/main.py
import os
import datetime
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from sqlalchemy.orm import Session

from backend.database import init_db, SessionLocal, Lead

# Inicializar DB SQLite
init_db()

app = FastAPI(title="Eunoia Learning CRM Backend (Render Compatible)")

# Habilitar CORS para permitir llamadas desde GitHub Pages (Astro) u otros dominios locales/remotos
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Puedes restringirlo a tu dominio de GitHub Pages ej: "https://tu-usuario.github.io"
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependencia para obtener la sesión de BD de forma segura por cada request
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Pydantic Schemas para tipar las requests
class LeadCreate(BaseModel):
    first_name: Optional[str] = None
    email: EmailStr
    tags: Optional[List[str]] = None

@app.get("/api/health")
def api_health():
    """Endpoint ligero de keep-alive para Render para mitigar el Cold Start o verificar estado."""
    return {"status": "ok", "timestamp": datetime.datetime.utcnow().isoformat()}

@app.post("/api/leads", status_code=status.HTTP_201_CREATED)
def register_lead(lead_data: LeadCreate, db: Session = Depends(get_db)):
    """
    Endpoint de registro 'Fire and Forget' invocado por Astro.
    Bypass de cold start en Astro mediante redirección inmediata en el cliente.
    """
    # Sanitizar email
    email_clean = lead_data.email.strip().lower()
    
    # Comprobar si el lead ya existe en la base de datos
    existing_lead = db.query(Lead).filter(Lead.email == email_clean).first()
    
    if existing_lead:
        # Si el usuario ya está registrado, re-activamos su embudo por si se había dado de baja
        if existing_lead.estado_embudo != "activo":
            existing_lead.estado_embudo = "activo"
            existing_lead.fecha_registro = datetime.datetime.utcnow() # Reinicia el ciclo Evergreen
            existing_lead.dias_enviados = ""
            db.commit()
            return {"message": "Lead reactivado con éxito", "id": existing_lead.id}
        return {"message": "Lead ya se encontraba activo en el embudo", "id": existing_lead.id}
    
    # Crear nuevo lead con fecha actual
    new_lead = Lead(
        first_name=lead_data.first_name,
        email=email_clean,
        fecha_registro=datetime.datetime.utcnow(),
        estado_embudo="activo",
        dias_enviados=""
    )
    
    try:
        db.add(new_lead)
        db.commit()
        db.refresh(new_lead)
        return {"success": True, "message": "Lead registrado en el CRM de Eunoia", "id": new_lead.id}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error al escribir en base de datos local SQLite: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    # Render inyecta la variable de entorno 'PORT'
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
