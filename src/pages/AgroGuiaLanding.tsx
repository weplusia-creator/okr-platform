import { useState, type FormEvent } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  X,
  Loader2,
  User,
  Mail,
  Phone,
  Download,
  BookOpen,
  Target,
  Users,
  Map,
  Megaphone,
  Wheat,
  Sprout,
  FileText,
} from 'lucide-react';

const GUIDE_HIGHLIGHTS = [
  { text: 'Definí tu propuesta de valor como asesor', icon: Target },
  { text: 'Identificá a tu cliente ideal en el agro', icon: Users },
  { text: '7 canales para conseguir clientes desde cero', icon: Map },
  { text: 'Guiones de contacto y seguimiento', icon: Megaphone },
  { text: 'Plan de acción a 90 días', icon: Sprout },
  { text: 'Plantillas y ejercicios prácticos', icon: FileText },
];

export function AgroGuiaLanding() {
  const [formState, setFormState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormState('loading');

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const resp = await fetch(`${supabaseUrl}/rest/v1/rpc/submit_landing_form`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          p_name: formData.name,
          p_email: formData.email,
          p_phone: formData.phone || null,
          p_company: null,
          p_position: null,
          p_notes: '[Manual Prospección Agro] Descarga de manual gratuito',
          p_source: 'guia agro',
        }),
      });

      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        console.error('submit_landing_form error:', resp.status, text);
        throw new Error(text || 'Error');
      }
      setFormState('success');
    } catch (err) {
      console.error('Form submit error:', err);
      setFormState('error');
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = '/Guia_Prospeccion_Agro.docx';
    link.download = 'Guia_Prospeccion_Agro_MattAgroVentas.docx';
    link.click();
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-wau-black/95 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/wau-icon.png" alt="WAU" className="w-8 h-8 object-contain" />
            <span className="text-xl font-bold text-white tracking-tight">WAU</span>
            <span className="text-xs font-medium text-primary-300 bg-primary-300/10 px-2 py-0.5 rounded-full border border-primary-300/20">AGRO VENTAS</span>
          </div>
          <a
            href="/"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Ver programa Agro 360
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-16 bg-wau-black">
        <div className="pt-20 pb-24 px-6">
          <div className="max-w-5xl mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            {/* Left: Text */}
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-300/10 text-primary-300 rounded-full text-sm font-medium mb-6 border border-primary-300/20">
                <BookOpen className="w-4 h-4" />
                Manual gratuito
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight mb-4">
                Conseguí tus Primeros Clientes como{' '}
                <span className="text-primary-300">Asesor del Agro</span>
              </h1>
              <p className="text-lg text-gray-400 leading-relaxed mb-8 max-w-xl">
                Manual paso a paso para que lances tu asesoría agropecuaria y consigas entre 3 y 7 productores pagando por tu conocimiento en 90 días.
              </p>
              <a
                href="#descargar"
                className="inline-flex items-center gap-2 px-8 py-4 text-base font-semibold text-wau-black bg-primary-300 hover:bg-primary-400 rounded-xl shadow-lg shadow-primary-300/20 transition-all hover:shadow-xl hover:shadow-primary-300/30 hover:-translate-y-0.5"
              >
                <Download className="w-5 h-5" />
                Descargar gratis
              </a>
            </div>

            {/* Right: Guide preview card */}
            <div className="flex-shrink-0 w-72 sm:w-80">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
                <div className="w-24 h-32 bg-primary-300/20 border border-primary-300/30 rounded-xl mx-auto mb-5 flex items-center justify-center">
                  <Wheat className="w-12 h-12 text-primary-300" />
                </div>
                <p className="text-sm text-gray-500 mb-1">Matt | Agro Ventas</p>
                <h3 className="text-white font-bold text-lg leading-tight mb-2">Manual de Prospección Agro</h3>
                <p className="text-xs text-gray-500">Gratis · 2026</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What's inside */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-3">Qué vas a encontrar</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-wau-black">
              Un sistema completo para <span className="text-primary-600">dejar de improvisar</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {GUIDE_HIGHLIGHTS.map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="flex items-start gap-3 p-5 bg-white rounded-xl border border-gray-100 hover:border-primary-300/50 transition-colors">
                  <div className="w-10 h-10 bg-wau-black rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-primary-300" />
                  </div>
                  <p className="text-sm text-gray-700 font-medium leading-relaxed pt-2">{item.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Quote */}
      <section className="py-16 px-6 bg-sand-50">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xl sm:text-2xl font-medium text-wau-black leading-relaxed italic">
            "Tu conocimiento técnico solo vale si alguien te paga por él.
            <br />
            <span className="text-primary-600 not-italic font-bold">Este manual existe para que eso pase.</span>"
          </p>
          <p className="text-sm text-gray-400 mt-4">— Matt | Agro Ventas</p>
        </div>
      </section>

      {/* Download Form */}
      <section id="descargar" className="py-20 px-6 bg-wau-black">
        <div className="max-w-lg mx-auto">
          {formState === 'success' ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-300 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-8 h-8 text-wau-black" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">¡Tu manual está listo!</h3>
              <p className="text-gray-400 mb-8 leading-relaxed">
                Hacé click abajo para descargarlo. También te lo enviamos por email.
              </p>
              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-2 px-8 py-4 text-base font-semibold text-wau-black bg-primary-300 hover:bg-primary-400 rounded-xl transition-all hover:-translate-y-0.5 shadow-lg shadow-primary-300/20"
              >
                <Download className="w-5 h-5" />
                Descargar manual
              </button>
              <div className="mt-10 pt-8 border-t border-white/10">
                <p className="text-gray-500 text-sm mb-3">¿Querés ir más allá del manual?</p>
                <a
                  href="/"
                  className="inline-flex items-center gap-2 text-primary-300 hover:text-primary-400 text-sm font-semibold transition-colors"
                >
                  Conocé WAU Agro 360
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-3">
                  Descargá el manual <span className="text-primary-300">gratis</span>
                </h2>
                <p className="text-gray-400">
                  Dejá tus datos y accedé al manual de prospección agro.
                </p>
              </div>

              {formState === 'error' && (
                <div className="mb-6 p-4 rounded-lg bg-red-900/20 border border-red-800">
                  <p className="text-sm text-red-400">Hubo un error. Por favor intentá de nuevo.</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Nombre completo *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-primary-300/50 focus:border-primary-300/50 outline-none transition-colors"
                      placeholder="Tu nombre"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Email *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-primary-300/50 focus:border-primary-300/50 outline-none transition-colors"
                      placeholder="tu@email.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Teléfono</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-primary-300/50 focus:border-primary-300/50 outline-none transition-colors"
                      placeholder="+54 11 1234-5678"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={formState === 'loading'}
                  className="w-full flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-wau-black bg-primary-300 hover:bg-primary-400 rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-primary-300/20 mt-2"
                >
                  {formState === 'loading' ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Quiero el manual gratis
                    </>
                  )}
                </button>

                <p className="text-xs text-gray-600 text-center mt-3">
                  No spam. Solo contenido de valor para el agro.
                </p>
              </form>
            </>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src="/wau-icon.png" alt="WAU" className="w-7 h-7 object-contain" />
            <span className="text-lg font-bold text-wau-black">WAU</span>
            <span className="text-sm text-gray-400 ml-2">Agro Ventas</span>
          </div>
          <p className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} WAU. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
