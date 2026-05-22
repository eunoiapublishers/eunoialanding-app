import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import * as resendPkg from 'resend';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProd = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;

const app = express();

// Custom CORS middleware to support static GitHub Pages clients without dependencies
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

// Persistent local JSON file database that works out-of-the-box
const LEADS_FILE = path.join(__dirname, 'leads.json');

interface Lead {
  first_name: string;
  email: string;
  tags: string[];
  date: string;
}

// Initial demo data
const INTIAL_SEED_LEADS: Lead[] = [];

function readStoredLeads(): Lead[] {
  try {
    if (fs.existsSync(LEADS_FILE)) {
      return JSON.parse(fs.readFileSync(LEADS_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('Error reading leads.json:', err);
  }
  // Fallback / Initialize
  try {
    fs.writeFileSync(LEADS_FILE, JSON.stringify(INTIAL_SEED_LEADS, null, 2), 'utf-8');
  } catch (_) {}
  return INTIAL_SEED_LEADS;
}

function writeStoredLeads(list: Lead[]) {
  try {
    fs.writeFileSync(LEADS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing leads.json:', err);
  }
}

// Persistent configuration for Resend settings
const CONFIG_FILE = path.join(__dirname, 'config.json');

interface AppConfig {
  resendApiKey?: string;
  senderEmail?: string;
}

function readConfig(): AppConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('Error reading config.json:', err);
  }
  return {};
}

function writeConfig(cfg: AppConfig) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing config.json:', err);
  }
}

// Simple Helper to convert basic Markdown to simple HTML
function mdToHtml(md: string): string {
  return md
    .replace(/^# (.+)/gm, '<h2 style="font-family: sans-serif; color: #111827; margin-top:20px; font-size:20px;">$1</h2>')
    .replace(/^## (.+)/gm, '<h3 style="font-family: sans-serif; color: #374151; margin-top:16px; font-size:16px;">$1</h3>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/^- (.+)/gm, '<li style="margin-bottom: 6px; font-size: 14px; color:#4B5563;">$1</li>')
    .split(/\n\s*\n/)
    .map(block => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('<h') || trimmed.startsWith('<li')) return trimmed;
      return `<p style="font-family: sans-serif; font-size:14px; color:#4B5563; line-height:1.5;">${trimmed}</p>`;
    })
    .filter(Boolean)
    .join('\n');
}

// professional HTML email wrapper
function emailWrapper(subject: string, htmlContent: string): string {
  return `
    <div style="background-color: #FDFBF7; padding: 30px; font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #E5E7EB; border-radius: 12px;">
      <div style="background-color: #047857; padding: 15px; border-radius: 8px 8px 0 0; text-align: center; color: white;">
        <h2 style="margin: 0; font-size: 18px;">Eunoia Learning</h2>
      </div>
      <div style="padding: 20px; background-color: white; border-radius: 0 0 8px 8px;">
        ${htmlContent}
      </div>
      <div style="text-align: center; margin-top: 20px; font-size: 11px; color: #9CA3AF;">
        &copy; 2026 Eunoia Learning LLC. Todos los derechos reservados.
      </div>
    </div>
  `;
}

// --- API ROUTES ---

// 1. Get Leads List
app.get('/api/leads', (req, res) => {
  res.json(readStoredLeads());
});

// 2. Add Lead
app.post('/api/leads', async (req, res) => {
  const { first_name, email, tags } = req.body;
  if (!first_name || !email) {
    return res.status(400).json({ error: 'El nombre de pila y correo electrónico son obligatorios.' });
  }

  const leads = readStoredLeads();
  const alreadyExists = leads.find(l => l.email.toLowerCase() === email.toLowerCase());

  if (alreadyExists) {
    return res.status(200).json({ success: true, message: '¡Ya estás suscrito!', lead: alreadyExists });
  }

  const newLead: Lead = {
    first_name,
    email: email.trim(),
    tags: tags || ['Lead-TpT'],
    date: new Date().toISOString().split('T')[0]
  };

  leads.push(newLead);
  writeStoredLeads(leads);

  // Send an instant welcome email if Resend Key is configured
  const config = readConfig();
  const resendKey = config.resendApiKey || process.env.RESEND_API_KEY;
  const senderEmail = config.senderEmail || 'Eunoia Learning <onboarding@resend.dev>';

  if (resendKey) {
    try {
      const { Resend } = resendPkg as any;
      const resend = new Resend(resendKey);
      const welcomeHtml = `
        <h3 style="color: #047857;">¡Bienvenido/a a Eunoia, ${first_name}!</h3>
        <p>Tu paquete de materiales de descarga gratuita ya está listo para guardar en tu equipo.</p>
        <div style="margin: 20px 0; text-align: center;">
          <a href="https://www.teacherspayteachers.org/" target="_blank" style="background-color: #047857; color: white; padding: 10px 18px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 13px;">
            Descargar Kit de Pictografías (PDF)
          </a>
        </div>
      `;
      await resend.emails.send({
        from: senderEmail,
        to: [email],
        subject: '🎁 Tu Kit de Pictogramas Bienvenido está Listo',
        html: emailWrapper('Bienvenida', welcomeHtml)
      });
    } catch (err: any) {
      console.warn('Welcome mail error:', err.message);
    }
  }

  res.json({ success: true, lead: newLead });
});

// 2b. Delete Lead
app.post('/api/leads/delete', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'El correo electrónico es obligatorio.' });
  }
  let leads = readStoredLeads();
  const index = leads.findIndex(l => l.email.toLowerCase() === email.toLowerCase());
  if (index !== -1) {
    leads.splice(index, 1);
    writeStoredLeads(leads);
    return res.json({ success: true, message: 'Suscriptor eliminado con éxito.' });
  }
  return res.status(404).json({ error: 'Suscriptor no encontrado.' });
});

// 3. Send Newsletter to captured leads
app.post('/api/send-newsletter', async (req, res) => {
  const { subject, content } = req.body;
  if (!subject || !content) {
    return res.status(400).json({ error: 'Asunto y cuerpo (Markdown) obligatorios.' });
  }

  const leads = readStoredLeads();
  const logs: string[] = [];

  logs.push(`🚀 Iniciando cola de envío a las ${new Date().toLocaleTimeString()}...`);
  logs.push(`🔍 Cargados ${leads.length} suscriptores desde la base de datos local.`);

  if (leads.length === 0) {
    logs.push('❌ Error: No hay suscriptores registrados.');
    return res.status(400).json({ error: 'No hay leads registrados.', logs });
  }

  const htmlBody = mdToHtml(content);
  
  const config = readConfig();
  const resendKey = config.resendApiKey || process.env.RESEND_API_KEY;
  const senderEmail = config.senderEmail || 'Eunoia Learning <onboarding@resend.dev>';

  if (resendKey) {
    try {
      const { Resend } = resendPkg as any;
      const resend = new Resend(resendKey);

      for (const lead of leads) {
        try {
          const personalizedContent = `
            <p style="font-family: sans-serif; font-size: 14px; color: #374151; font-weight: bold;">
              Hola, ${lead.first_name}:
            </p>
            ${htmlBody}
          `;
          await resend.emails.send({
            from: senderEmail,
            to: [lead.email],
            subject: subject,
            html: emailWrapper(subject, personalizedContent)
          });
          logs.push(`   ✔ Enviado con éxito a <${lead.email}>`);
        } catch (singleErr: any) {
          logs.push(`   ❌ Fallo al enviar a <${lead.email}>: ${singleErr.message}`);
        }
      }
      logs.push(`✅ Campaña procesada: Envío completado.`);
      return res.json({ success: true, logs });
    } catch (err: any) {
      logs.push(`❌ Error crítico de Resend: ${err.message}`);
      return res.status(500).json({ error: err.message, logs });
    }
  } else {
    // Elegant Offline Simulation (Demo Mode)
    logs.push('⚠️ RESEND_API_KEY no configurado en el servidor backend ni en el panel de administrador.');
    logs.push('🎮 Ejecutando simulador de envío local para testing offline:');
    
    for (const lead of leads) {
      logs.push(`   📬 [Simulado] Entregando mail a <${lead.email}> con asunto: "${subject}"...`);
      logs.push(`   ✔ [Simulado] Entregado con éxito.`);
    }
    
    logs.push('\n💡 Solución: Define tu RESEND_API_KEY en el panel de administrador para enviar correos de verdad.');
    logs.push('🎉 ¡Despacho simulado completado con éxito!');
    return res.json({ success: true, logs });
  }
});

// 4. Get active configuration (safe, masks API Key)
app.get('/api/config', (req, res) => {
  const config = readConfig();
  const rawKey = config.resendApiKey || process.env.RESEND_API_KEY || '';
  const maskedKey = rawKey 
    ? `${rawKey.substring(0, 6)}****************${rawKey.substring(rawKey.length - 4)}` 
    : '';
  res.json({
    hasApiKey: !!rawKey,
    maskedApiKey: maskedKey,
    senderEmail: config.senderEmail || 'Eunoia Learning <onboarding@resend.dev>'
  });
});

// 5. Update configuration
app.post('/api/config', (req, res) => {
  const { resendApiKey, senderEmail } = req.body;
  const config = readConfig();

  if (resendApiKey !== undefined) {
    const trimmed = resendApiKey.trim();
    if (trimmed === '') {
      delete config.resendApiKey;
    } else if (!trimmed.includes('*')) {
      config.resendApiKey = trimmed;
    }
  }

  if (senderEmail !== undefined) {
    config.senderEmail = senderEmail.trim() || 'Eunoia Learning <onboarding@resend.dev>';
  }

  writeConfig(config);

  const rawKey = config.resendApiKey || process.env.RESEND_API_KEY || '';
  const maskedKey = rawKey 
    ? `${rawKey.substring(0, 6)}****************${rawKey.substring(rawKey.length - 4)}` 
    : '';

  res.json({
    success: true,
    hasApiKey: !!rawKey,
    maskedApiKey: maskedKey,
    senderEmail: config.senderEmail || 'Eunoia Learning <onboarding@resend.dev>'
  });
});

// Handle serving SPA / assets
if (isProd) {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'spa'
  });
  app.use(vite.middlewares);
}

app.listen(PORT, () => {
  console.log(`[+] Server running at http://localhost:${PORT}`);
});
