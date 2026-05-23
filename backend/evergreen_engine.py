# backend/evergreen_engine.py
import os
import sys
import datetime
import re
from sqlalchemy.orm import Session

# Permitir ejecuciones directas agregando el directorio raíz a la ruta de búsqueda de python
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import SessionLocal, Lead

# Configuración de variables críticas de correo
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "tu_key_aqui")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "Eunoia Learning <onboarding@resend.dev>")
TEMPLATES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "templates")

# CRONOGRAMA DE CORREOS AUTOMATIZADOS (Cronograma Evergreen de 6 Semanas)
# Mapea: "Días transcurridos desde el registro" -> "Nombre del archivo Markdown plantilla"
EVERGREEN_SCHEDULE = {
    1: "email_dia_1.md",   # 1 Día después: Bienvenida profunda y primer truco educativo
    3: "email_dia_3.md",   # 3 Días después: Presentación de recursos de lectoescritura
    6: "email_dia_6.md",   # 6 Días después: El poder de los pictogramas en el aula
    10: "email_dia_10.md", # 10 Días después: Cupón de descuento exclusivo de TpT (Eunoia Learning)
    14: "email_dia_14.md", # 2 Semanas: Recursos imprimibles gratuitos para matemáticas lúdicas
    21: "email_dia_21.md", # 3 Semanas: Consejos para evitar la frustración al escribir
    28: "email_dia_28.md", # 4 Semanas: Cómo estructurar rutinas visuales en casa
    35: "email_dia_35.md", # 5 Semanas: Selección del mes - Recursos de bajo costo recomendados
    42: "email_dia_42.md", # 6 Semanas (Cierre): Oferta final, regalo sorpresa y suscripción premium
}

MAX_DIA_LIMITE = max(EVERGREEN_SCHEDULE.keys()) # 42

def convert_markdown_to_html(md_text: str) -> str:
    """
    Convierte Markdown básico a código HTML con CSS en línea elegante, para asegurar
    compatibilidad total y evitar dependencias de paquetes externos complejos en Render.
    """
    html = md_text
    
    # 1. Escapar saltos de línea carriage
    html = html.replace("\r\n", "\n").replace("\r", "\n")
    
    # 2. Párrafos (separa grupos de texto aislados por doble salto de línea)
    paragraphs = []
    for chunk in html.split("\n\n"):
        chunk = chunk.strip()
        if not chunk:
            continue
        # Tratar encabezados, listas y párrafos normales
        if chunk.startswith("#"):
            paragraphs.append(chunk)
        elif chunk.startswith("- ") or chunk.startswith("* "):
            paragraphs.append(chunk)
        else:
            paragraphs.append(f"<p style='color: #2c4e44; font-family: sans-serif; line-height: 1.6; font-size: 14px; margin-bottom: 12px;'>{chunk}</p>")
            
    html = "\n\n".join(paragraphs)
    
    # 3. Encabezados
    html = re.sub(r'^#\s+(.+)$', r"<h1 style='color: #1a332a; font-family: sans-serif; font-size: 20px; font-weight: bold; border-b: 1px solid #e1ebec; padding-bottom: 6px; margin-bottom: 14px;'>\1</h1>", html, flags=re.MULTILINE)
    html = re.sub(r'^##\s+(.+)$', r"<h2 style='color: #234337; font-family: sans-serif; font-size: 17px; font-weight: bold; margin-top: 16px; margin-bottom: 10px;'>\1</h2>", html, flags=re.MULTILINE)
    
    # 4. Negritas
    html = re.sub(r'\*\*(.+?)\*\*', r"<strong style='color: #1a332a;'>\1</strong>", html)
    
    # 5. Cursivas
    html = re.sub(r'\*(.+?)\*', r"<em style='font-style: italic;'>\1</em>", html)
    
    # 6. Listas (convertir - item a <li>)
    # Reagrupar líneas con '- ' en bloques <ul>
    lines = html.split("\n")
    in_list = False
    new_lines = []
    for line in lines:
        if line.strip().startswith("- ") or line.strip().startswith("* "):
            item_text = line.strip()[2:]
            if not in_list:
                new_lines.append("<ul style='padding-left: 20px; margin-bottom: 12px; color: #2c4e44; font-family: sans-serif; font-size: 14px;'>")
                in_list = True
            new_lines.append(f"<li style='margin-bottom: 6px;'>{item_text}</li>")
        else:
            if in_list:
                new_lines.append("</ul>")
                in_list = False
            new_lines.append(line)
    if in_list:
        new_lines.append("</ul>")
    html = "\n".join(new_lines)
    
    # 7. Saltos de línea internos simples
    html = html.replace("\n", "<br>")
    
    return html

def build_email_markup(titulo: str, content_html: str) -> str:
    """Estructura de correo elegante con diseño corporativo de nuestra marca Eunoia Learning."""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>{titulo}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f7f5ef; font-family: Arial, sans-serif;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2ded5; border-radius: 8px; overflow: hidden; margin-top: 20px; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(44,78,68,0.03);">
            <!-- Header -->
            <tr>
                <td align="center" style="background-color: #2c4e44; padding: 24px;">
                    <h1 style="color: #fdfbf7; margin: 0; font-family: Georgia, serif; font-size: 24px; font-weight: normal; letter-spacing: 1px;">Eunoia Learning</h1>
                    <p style="color: #a8c1b9; margin: 4px 0 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; font-family: monospace;">Recursos de Autorregulación & Visuales</p>
                </td>
            </tr>
            <!-- Body -->
            <tr>
                <td style="padding: 30px 24px; background-color: #ffffff;">
                    {content_html}
                </td>
            </tr>
            <!-- Footer -->
            <tr>
                <td align="center" style="background-color: #f3efe6; padding: 20px; border-t: 1px solid #e1dad2; color: #636d6a; font-size: 11px; line-height: 1.5;">
                    <p style="margin: 0 0 8px 0;">© 2026 Eunoia Learning. Todos los derechos reservados.</p>
                    <p style="margin: 0;">Has recibido este correo electrónico porque te uniste al kit de descarga visual en nuestra tienda.</p>
                    <p style="margin: 8px 0 0 0;"><a href="#unsubscribe" style="color: #2c4e44; text-decoration: underline;">Modificar mis preferencias o canjear baja</a></p>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

def run_evergreen_dispatcher():
    """Ejecuta el ciclo diario de automatización de envío de correos."""
    print("🚀 Iniciando Motor de Automatización Evergreen - Eunoia Learning")
    
    if not RESEND_API_KEY or RESEND_API_KEY == "tu_key_aqui":
        print("❌ ERROR: RESEND_API_KEY no configurado en las variables de entorno.")
        return
        
    db: Session = SessionLocal()
    
    try:
        # 1. Obtener leads activos
        leads_activos = db.query(Lead).filter(Lead.estado_embudo == "activo").all()
        print(f"📊 Analizando un lote de {len(leads_activos)} leads activos registrados para hoy...")
        
        # Inicializar el contador de seguridad premium (evita superar los 95 de la capa gratuita)
        emails_sent_today = 0
        MAX_ENVIO_LIMITE = 95
        
        # Importar Resend SDK
        try:
            import resend
            resend.api_key = RESEND_API_KEY
        except ImportError:
            print("⚠️ Biblioteca python-resend no instalada localmente. El despacho real requiere 'pip install resend'")
            print("🎮 Modo simulación activa integrado.")
            resend = None

        today = datetime.datetime.utcnow().date()
        
        for lead in leads_activos:
            # Control de seguridad estricto para proteger el límite diario de Resend
            if emails_sent_today >= MAX_ENVIO_LIMITE:
                print(f"⚠️ ¡ATENCIÓN! Se ha alcanzado el límite de seguridad preventivo diario de ({emails_sent_today}/95). Deteniendo el script para proteger tu cuenta de Resend.")
                break
                
            # Calcular la diferencia en días desde la suscripción del lead
            lead_reg_date = lead.fecha_registro.date()
            days_elapsed = (today - lead_reg_date).days
            
            # Si el lead ya rebasó el límite máximo de días del embudo evergreen (6 semanas)
            if days_elapsed > MAX_DIA_LIMITE:
                lead.estado_embudo = "completado"
                db.commit()
                print(f"✅ Lead {lead.email} ha finalizado todo el ciclo de 6 semanas con éxito (Total días cursados: {days_elapsed}). Estado cambiado a 'completado'.")
                continue
                
            # Verificar si le corresponde un correo hoy de acuerdo a la tabla
            if days_elapsed in EVERGREEN_SCHEDULE:
                template_file = EVERGREEN_SCHEDULE[days_elapsed]
                
                # Obtener la lista de días ya despachados
                dias_ya_enviados = [int(x) for x in lead.dias_enviados.split(",") if x.strip().isdigit()]
                
                # Validar la idempotencia protectora (nunca duplicar envíos de un mismo día)
                if days_elapsed in dias_ya_enviados:
                    continue # Ya se le envió este día, avanzar con el siguiente lead
                    
                template_path = os.path.join(TEMPLATES_DIR, template_file)
                
                if not os.path.exists(template_path):
                    print(f"⚠️ Plantilla de correo faltante para Día {days_elapsed}: {template_path}")
                    continue
                    
                # Leer plantilla Markdown
                with open(template_path, "r", encoding="utf-8") as f:
                    md_content = f.read()
                
                # Extraer título / asunto (primera línea si empieza con # o Asunto: )
                subject_match = re.search(r"^Subject:\s*(.+)$", md_content, re.MULTILINE)
                if subject_match:
                    subject = subject_match.group(1).strip()
                    # Remover línea del Asunto del cuerpo
                    md_content = re.sub(r"^Subject:\s*.+$", "", md_content, flags=re.MULTILINE).strip()
                else:
                    subject = f"Eunoia Learning - Día {days_elapsed} de tu Kit de Recursos"
                
                # Reemplazar variables personalizadas
                nombre_personalizado = lead.first_name if lead.first_name else "Educador"
                md_personalized = md_content.replace("{Nombre}", nombre_personalizado)
                
                # Convertir Cuerpo a HTML
                body_html = convert_markdown_to_html(md_personalized)
                full_email_html = build_email_markup(subject, body_html)
                
                # Despachar vía Resend
                print(f"✉️ Enviando correo Día {days_elapsed} a: {lead.email}...")
                
                if resend:
                    try:
                        resend.Emails.send({
                            "from": SENDER_EMAIL,
                            "to": lead.email,
                            "subject": subject,
                            "html": full_email_html
                        })
                    except Exception as err:
                        print(f"❌ Error al conectar con la API de Resend para {lead.email}: {str(err)}")
                        continue
                else:
                    # Logs simulados
                    print(f"⚙️ [SIMULACIÓN RESPONDIDA] Correo de verdad simularía:\n    A: {lead.email}\n    Asunto: {subject}\n    Remitente: {SENDER_EMAIL}")
                    
                # Registrar que este día fue despachado exitosamente
                dias_ya_enviados.append(days_elapsed)
                lead.dias_enviados = ",".join(str(d) for d in sorted(dias_ya_enviados))
                db.commit()
                
                emails_sent_today += 1
                
        print(f"🎉 Ciclo diario terminado. Total de correos automatizados enviados hoy: {emails_sent_today}")
        
    finally:
        db.close()

if __name__ == "__main__":
    run_evergreen_dispatcher()
