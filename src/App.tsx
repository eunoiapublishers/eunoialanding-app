import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  User, 
  Send, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  Code,
  Download,
  Settings,
  BookOpen,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Undo2
} from 'lucide-react';

// Import local brand assets for cohesive presentation
import eunoiaLogo from './assets/images/eunoia_logo_1779332019443.png';

interface Lead {
  first_name: string;
  email: string;
  tags: string[];
  date: string;
}

export default function App() {
  // Navigation: Landing vs admin panel
  const [view, setView] = useState<'landing' | 'admin'>('landing');

  // Lead capture states
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [formError, setFormError] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(true);

  // Administrative stats & Dispatch logs
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [subject, setSubject] = useState('🎁 New Educational Resources: Visual Calm Down Guide');
  const [markdown, setMarkdown] = useState(
`# Visual Self-Regulation Guide

Follow these simple, helpful steps today:
- **Quiet space:** Create a peaceful environment free from loud noises.
- **Visual schedules:** Explain schedules beforehand with structured drawings.
- **Ask for help:** Teach them to show the visual helper card when frustrated.

*Download our free comprehensive printable guides in the visual library.*`
  );
  
  const [previewMode, setPreviewMode] = useState<'editor' | 'preview'>('editor');
  const [dispatchLogs, setDispatchLogs] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);

  // Config: GitHub Pages companion backend URL
  const [backendUrl, setBackendUrl] = useState(() => {
    return localStorage.getItem('eunoia_backend_url') || '';
  });

  // Get dynamic API endpoints (Supports GitHub Pages deployment scenario)
  const getEndpoint = (path: string) => {
    if (backendUrl) {
      const base = backendUrl.endsWith('/') ? backendUrl.slice(0, -1) : backendUrl;
      return `${base}${path}`;
    }
    return path;
  };

  // Fetch registered leads
  const fetchLeads = async () => {
    setIsLoadingLeads(true);
    try {
      const res = await fetch(getEndpoint('/api/leads'));
      if (res.ok) {
        const data = await res.json();
        setLeads(data);
      }
    } catch (err) {
      console.warn('Error fetching leads:', err);
    } finally {
      setIsLoadingLeads(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [backendUrl]);

  // Submit new lead
  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !email.trim()) return;

    setIsSubmitting(true);
    setFormError('');

    try {
      const response = await fetch(getEndpoint('/api/leads'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName.trim(),
          email: email.trim(),
          tags: ['Lead-TpT']
        })
      });

      if (response.ok) {
        setFormSuccess(true);
        setFormError('');
        fetchLeads();
      } else {
        const errData = await response.json();
        setFormError(errData.error || 'An error occurred while processing your registration.');
      }
    } catch (err) {
      setFormError('Could not connect to the server. Please verify the application backend API is running.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Send Newsletter campaign to captured leads
  const handleSendNewsletter = async () => {
    if (!subject.trim() || !markdown.trim()) {
      alert('Please fill out both the subject and the newsletter body.');
      return;
    }

    setIsSending(true);
    setDispatchLogs(['📢 Initializing visual resource newsletter dispatch...']);

    try {
      const response = await fetch(getEndpoint('/api/send-newsletter'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, content: markdown })
      });

      if (response.ok) {
        const data = await response.json();
        setDispatchLogs(data.logs || ['✅ Campaign sent successfully to all subscribers!']);
      } else {
        const errData = await response.json();
        setDispatchLogs(prev => [
          ...prev,
          `❌ Server Error: ${errData.error || 'Template delivery fail'}`,
          `💡 Make sure you configure the RESEND_API_KEY environment variable on your backend.`
        ]);
      }
    } catch (err) {
      setDispatchLogs(prev => [...prev, '❌ Network Error: Could not establish a connection to the server API.']);
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveBackendUrl = (url: string) => {
    const cleaned = url.trim();
    setBackendUrl(cleaned);
    if (cleaned) {
      localStorage.setItem('eunoia_backend_url', cleaned);
    } else {
      localStorage.removeItem('eunoia_backend_url');
    }
  };

  // Simple clean markdown converter
  const renderMarkdown = (src: string) => {
    return src
      .replace(/^# (.+)/gm, '<h3 style="font-family:\'Space Grotesk\', sans-serif; font-weight:700; color:#2C4E44; margin:14px 0 6px 0; border-bottom:1px solid #EAEFEA; padding-bottom:4px;">$1</h3>')
      .replace(/^## (.+)/gm, '<h4 style="font-family:\'Space Grotesk\', sans-serif; font-weight:600; color:#1C2E24; margin:10px 0 4px 0;">$1</h4>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/^- (.+)/gm, '<li style="margin-left: 14px; list-style-type: square; color:#1C2E24; font-size: 13px;">$1</li>');
  };

  const downloads = [
    { title: '1. Reversible Calm Down Chart (PDF)', desc: 'Interactive visual cues with calming pictograms.' },
    { title: '2. Social Story: Beth on Stage (PDF)', desc: 'A short story about overcoming anxiety & self-regulation.' },
    { title: '3. Behavioral Support Cards (PDF)', desc: 'Illustrated routines ready to print and cut.' },
    { title: '4. Cognitive Guide for Educators (PDF)', desc: 'Visual strategy guide to reduce classroom neural fatigue.' }
  ];

  return (
    <div id="main-container" className="min-h-screen bg-brand-cream text-brand-charcoal font-sans flex flex-col justify-between">
      
      {/* HEADER SECTION IN WARM-PINE THEMATIC SCHEME */}
      <header id="app-header" className="border-b border-brand-sage-light bg-white/95 sticky top-0 z-30 px-4 py-3 shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          
          <div className="flex items-center gap-2.5">
            <img 
              src={eunoiaLogo} 
              alt="Eunoia Learning Logo" 
              className="w-8 h-8 object-contain rounded-full border border-brand-sage-light bg-brand-cream p-0.5"
              referrerPolicy="no-referrer"
            />
            <div className="text-left">
              <span className="font-display font-bold text-base text-brand-pine block tracking-tight">Eunoia Learning</span>
              <span className="text-[10px] text-brand-sage font-mono uppercase tracking-wider block -mt-1.5">Newsletter Channel</span>
            </div>
          </div>

          <nav className="flex items-center gap-1.5 bg-brand-cream p-1 rounded-xl border border-brand-sage-light">
            <button 
              id="nav-landing"
              onClick={() => setView('landing')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${view === 'landing' ? 'bg-white text-brand-pine shadow-2xs font-bold' : 'text-brand-charcoal hover:bg-white/50'}`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Resource Hub
            </button>
            <button 
              id="nav-admin"
              onClick={() => setView('admin')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${view === 'admin' ? 'bg-white text-brand-pine shadow-2xs font-bold' : 'text-brand-charcoal hover:bg-white/50'}`}
            >
              <Settings className="w-3.5 h-3.5" />
              Admin Console
            </button>
          </nav>

        </div>
      </header>

      {/* CORE WORKSPACE */}
      <main className="flex-grow flex items-center justify-center py-10 px-4">
        <div className="max-w-xl w-full">
          
          {view === 'landing' ? (
            /* ================= VISTA DE CAPTACIÓN ULTRALIGERA Y DIRECTA ================= */
            <div className="space-y-6 text-center">
              
              <div className="bg-white border-2 border-brand-sage-light/60 shadow-[0_4px_24px_rgba(44,78,68,0.04)] rounded-2xl p-6 sm:p-9 space-y-6 relative overflow-hidden">
                
                {/* Visual Top Highlight Strip */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-brand-pine"></div>

                <div className="space-y-3">
                  <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest bg-brand-sage-light text-brand-pine px-3 py-1 rounded-full inline-block">
                    High-Definition Printable Resources
                  </span>
                  <h1 className="text-xl sm:text-2xl font-display font-extrabold text-brand-charcoal tracking-tight leading-tight">
                    Visual Support Tools for Neurodivergent Learners
                  </h1>
                  <p className="text-xs sm:text-sm text-brand-charcoal/80 leading-relaxed font-normal max-w-sm mx-auto">
                    Subscribe today to our free educational newsletter and get instant access to our structured packet of 4 visual guides and storybooks in PDF format.
                  </p>
                </div>

                {/* Personal Note Box */}
                <div className="bg-brand-cream/50 border border-brand-sage-light/60 rounded-xl p-4 text-left max-w-md mx-auto space-y-2">
                  <p className="text-[11px] text-brand-charcoal/90 leading-relaxed italic">
                    "I am a father of neurodivergent children, a therapist, and a writer. I want to share my professional and personal experience with you so we can build a more accessible world together."
                  </p>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-sage animate-pulse"></span>
                    <span className="text-[9px] text-brand-sage font-mono uppercase tracking-wider font-extrabold">Eunoia Founder Message</span>
                  </div>
                </div>

                {!formSuccess ? (
                  <form onSubmit={handleSubscribe} className="space-y-4 text-left">
                    <div>
                      <label className="block text-[10px] font-mono font-bold text-brand-charcoal/70 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-brand-sage" /> Your Name
                      </label>
                      <input 
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="e.g., Emily"
                        className="w-full px-3.5 py-2.5 border border-brand-sage-light rounded-xl text-sm bg-brand-cream/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-pine/30 text-brand-charcoal"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono font-bold text-brand-charcoal/70 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-brand-sage" /> Email Address
                      </label>
                      <input 
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="hello@example.com"
                        className="w-full px-3.5 py-2.5 border border-brand-sage-light rounded-xl text-sm bg-brand-cream/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-pine/30 text-brand-charcoal"
                      />
                    </div>

                    <div className="flex items-start gap-2.5 bg-brand-cream/40 p-3 rounded-xl border border-brand-sage-light/60">
                      <input 
                        type="checkbox"
                        id="terms-check"
                        checked={acceptedTerms}
                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                        className="mt-0.5 shrink-0 w-4 h-4 text-brand-pine border-brand-sage focus:ring-brand-pine rounded cursor-pointer"
                      />
                      <label htmlFor="terms-check" className="text-[10px] sm:text-[11px] text-brand-charcoal/70 leading-normal cursor-pointer text-left">
                        I assent to secure, localized email management. Eunoia never shares or transfers your credentials to external advertising networks. It is only stored to deliver free visual aids and newsletters.
                      </label>
                    </div>

                    {formError && (
                      <div className="p-3 bg-red-50 text-red-900 rounded-xl text-xs flex items-center gap-2 border border-red-200">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                        <span>{formError}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmitting || !acceptedTerms}
                      className="w-full bg-brand-pine hover:bg-brand-pine/90 text-brand-cream font-display font-semibold py-3 px-4 rounded-xl transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <span>Validating email...</span>
                      ) : (
                        <>
                          <span>Download Free Materials</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  /* EXCELENTE EXPERIENCIA DE DESCARGA DIRECTA */
                  <div className="space-y-5 animate-fade-in text-center">
                    <div className="w-12 h-12 bg-brand-sage-light text-brand-pine rounded-full flex items-center justify-center mx-auto shadow-sm">
                      <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
                    </div>
                    
                    <div className="space-y-1">
                      <h3 className="font-display font-extrabold text-lg text-brand-charcoal">Registration Completed!</h3>
                      <p className="text-xs text-brand-charcoal/80">We've saved your email locally. You can now access Eunoia's resource bank.</p>
                    </div>

                    <div className="bg-brand-cream/60 rounded-xl p-4 border border-brand-sage-light text-left space-y-2.5">
                      <span className="text-[10px] font-mono font-bold text-brand-pine uppercase tracking-wider block">
                        Resource Pack: Instant Direct Downloads:
                      </span>
                      
                      <div className="flex flex-col gap-2">
                        {downloads.map((item, idx) => (
                          <a 
                            key={idx}
                            href="https://www.teacherspayteachers.org/"
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-semibold text-brand-charcoal hover:text-brand-pine flex items-center justify-between p-2.5 bg-white rounded-lg border border-brand-sage-light hover:border-brand-pine transition-all shadow-3xs"
                          >
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900 text-[11px] sm:text-xs">{item.title}</span>
                              <span className="text-[10px] text-brand-sage font-normal">{item.desc}</span>
                            </div>
                            <span className="text-[10px] font-bold text-brand-pine flex items-center gap-0.5 whitespace-nowrap bg-brand-sage-light/40 px-2 py-1 rounded">
                              DOWNLOAD <Download className="w-3 h-3" />
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-2 pt-2">
                      <button 
                        onClick={() => setFormSuccess(false)}
                        className="text-xs font-bold text-brand-pine underline hover:text-brand-charcoal flex items-center gap-1 cursor-pointer"
                      >
                        <Undo2 className="w-3 h-3" /> Register another email
                      </button>
                    </div>

                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ================= VISTA DE ADMINISTRACIÓN Y SCRIPT EN ESPAÑOL ================= */
            <div className="space-y-6 text-left">
              <div className="bg-white border-2 border-brand-sage-light/60 shadow-[0_4px_24px_rgba(44,78,68,0.04)] rounded-2xl p-6 space-y-5">
                
                <div className="border-b border-brand-sage-light pb-3.5 flex items-center justify-between">
                  <div>
                    <h2 className="font-display font-extrabold text-base sm:text-lg text-brand-charcoal">Newsletter Dispatch Hub</h2>
                    <p className="text-xs text-brand-charcoal/60">Manage your subscribers and dispatch campaigns via Resend API.</p>
                  </div>
                  <div className="bg-brand-sage text-white px-2.5 py-1 rounded-xl text-xs font-bold font-mono">
                    {leads.length} leads
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
                  {/* Redacción y Editor */}
                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-[10px] font-mono font-bold text-brand-charcoal/70 uppercase tracking-widest mb-1">
                        Newsletter Subject
                      </label>
                      <input 
                        type="text" 
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Subject"
                        className="w-full px-3 py-2 border border-brand-sage-light rounded-lg text-xs bg-brand-cream/30 focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-[10px] font-mono font-bold text-brand-charcoal/70 uppercase tracking-widest">
                          Body (Markdown)
                        </label>
                        <button
                          onClick={() => setPreviewMode(previewMode === 'editor' ? 'preview' : 'editor')}
                          className="text-[10px] font-bold text-brand-pine hover:underline flex items-center gap-1"
                        >
                          <FileText className="w-3 h-3" />
                          {previewMode === 'editor' ? 'Show Preview' : 'Show Editor'}
                        </button>
                      </div>

                      {previewMode === 'preview' ? (
                        <div 
                          className="w-full h-44 p-3 border border-brand-sage-light rounded-lg bg-brand-cream/30 text-xs overflow-y-auto font-sans leading-relaxed text-left"
                          dangerouslySetInnerHTML={{ __html: renderMarkdown(markdown) }}
                        />
                      ) : (
                        <textarea 
                          value={markdown}
                          onChange={(e) => setMarkdown(e.target.value)}
                          placeholder="Write your newsletter content in Markdown format..."
                          rows={6}
                          className="w-full p-3 border border-brand-sage-light rounded-lg text-xs bg-brand-cream/30 focus:bg-white focus:outline-none font-mono text-brand-charcoal"
                        />
                      )}
                    </div>

                    <button
                      onClick={handleSendNewsletter}
                      disabled={isSending || leads.length === 0}
                      className="w-full bg-brand-pine hover:bg-brand-pine/90 text-brand-cream font-display font-bold py-2 px-3 rounded-lg text-xs tracking-wider uppercase transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {isSending ? 'Sending newsletter...' : 'Send Campaign to Leads'}
                    </button>
                  </div>

                  {/* Suscriptores Guardados & Consola de Operación */}
                  <div className="space-y-4">
                    <div className="space-y-1.5 text-left">
                      <div className="flex justify-between items-center">
                        <span className="block text-[10px] font-mono font-bold text-brand-charcoal/70 uppercase tracking-widest">Registered Subscribers</span>
                        <button 
                          onClick={fetchLeads} 
                          className="text-[10px] font-mono font-bold hover:text-brand-pine flex items-center gap-1"
                          title="Sync active database"
                        >
                          <RefreshCw className="w-3 h-3" /> Sync Database
                        </button>
                      </div>
                      
                      <div className="border border-brand-sage-light rounded-lg p-2 max-h-28 overflow-y-auto bg-brand-cream/30 space-y-1 block">
                        {isLoadingLeads ? (
                          <div className="text-[10px] text-brand-sage italic p-1">Loading...</div>
                        ) : leads.length === 0 ? (
                          <div className="text-[10px] text-brand-sage italic p-1">No subscribers registered yet.</div>
                        ) : (
                          leads.map((l, index) => (
                            <div key={index} className="text-[10px] text-brand-charcoal border-b border-brand-sage-light/45 pb-1 flex justify-between gap-1 p-0.5">
                              <span className="font-bold truncate">{l.first_name}</span>
                              <span className="text-brand-sage font-mono shrink-0">{l.email}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5 text-left">
                      <span className="block text-[10px] font-mono font-bold text-brand-charcoal/70 uppercase tracking-widest">Dispatch System Log</span>
                      <div className="border border-brand-charcoal bg-[#15231c] text-[#8ceba3] font-mono text-[9px] p-2.5 rounded-lg h-24 overflow-y-auto block space-y-0.5">
                        {dispatchLogs.length === 0 ? (
                          <div className="text-brand-sage opacity-55 italic">Log is idle. Awaiting campaign dispatch.</div>
                        ) : (
                          dispatchLogs.map((log, i) => (
                            <div key={i} className="leading-tight">{log}</div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                </div>

                {/* Explicación y Configuración para GitHub Pages */}
                <div className="border-t border-brand-sage-light pt-4 text-left space-y-2.5">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-brand-pine">GitHub Pages Backend Integration</span>
                  </div>
                  
                  <p className="text-[10px] text-brand-charcoal/80 leading-relaxed">
                    Since GitHub Pages only hosts static files, the browser cannot run Express server-side handlers or modify file data dynamically.
                    You can host this Express API on cloud hosting services like Render, Koyeb, or Railway, and paste your production API URL below to log newsletter targets remotely:
                  </p>
                  
                  <div>
                    <input 
                      type="text" 
                      value={backendUrl}
                      onChange={(e) => handleSaveBackendUrl(e.target.value)}
                      placeholder="e.g., https://eunoia-api-news.onrender.com"
                      className="w-full px-2.5 py-1.5 border border-brand-sage-light rounded bg-brand-cream/20 font-mono text-[10px] focus:outline-none focus:ring-1 focus:ring-brand-pine"
                    />
                    <p className="text-[9px] text-brand-pine font-bold mt-1">
                      {backendUrl ? `✓ Forwarding subscriber operations to: ${backendUrl}` : '🔍 Connected directly to this container\'s active local backend API'}
                    </p>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-brand-sage-light bg-white py-4 px-4 text-center">
        <p className="text-[11px] text-brand-sage font-medium tracking-wide">
          &copy; 2026 Eunoia Learning LLC. Thoughtfully designed to be simple, clean, and accessible.
        </p>
      </footer>

    </div>
  );
}
