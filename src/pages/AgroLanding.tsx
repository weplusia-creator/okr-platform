import { useState, type FormEvent } from 'react';
import {
  ArrowRight,
  Target,
  CheckCircle2,
  X,
  Loader2,
  User,
  Mail,
  Phone,
  Building2,
  Briefcase,
  MessageSquare,
  Sprout,
  BarChart3,
  Users,
  Lightbulb,
  Megaphone,
  Handshake,
  Award,
  Rocket,
  Wheat,
  Tractor,
  Leaf,
  Sun,
  LandPlot,
  Fence,
  Droplets,
  TreeDeciduous,
  CloudSun,
  Shovel,
  Mountain,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const MONTH_1 = {
  title: 'Fundamentos & Diagnóstico',
  subtitle: 'Entender el negocio y ordenar la cabeza comercial',
  items: [
    'Diagnóstico completo del negocio agro',
    'Business Model Canvas aplicado al campo',
    'Cliente ideal (productor, contratista, decisor real)',
    'Propuesta de valor clara (por qué te compran a vos)',
    'Objetivo comercial concreto a 4 meses',
  ],
  results: ['Negocio entendido como sistema', 'Propuesta clara', 'Foco comercial definido'],
  format: ['Sesiones grupales en vivo', 'Trabajo guiado (no tareas teóricas)', 'Comunidad WAU Agro (desde el día 1)', '1:1 estratégico (ventas / modelo de negocio)'],
};

const MONTH_2 = {
  title: 'Arquitectura Comercial & OKRs',
  subtitle: 'Armar el sistema para vender de forma repetible',
  items: [
    'Proceso comercial agro (paso a paso)',
    'Funnel realista (no ideal)',
    'OKRs comerciales (qué medir y por qué)',
    'Ritual comercial semanal',
    'CRM simple (Odoo Free / alternativa)',
  ],
  results: ['Proceso comercial armado', 'Métricas claras', 'CRM funcionando', 'Dejar de "ver qué pasa"'],
  format: ['Workshops prácticos', 'Casos reales del agro', 'Revisión grupal', '1:1 con especialista en estrategia comercial'],
};

const MONTH_3 = {
  title: 'Ejecución Real',
  subtitle: 'Pasar del diseño a la cancha',
  items: [
    'Prospección inteligente (zonas, campañas, segmentos)',
    'Abordaje multicanal (WhatsApp, llamadas, visitas)',
    'Reunión de descubrimiento (sin chamuyo)',
    'Propuestas que no compiten solo por precio',
    'Manejo de objeciones reales del agro',
  ],
  results: ['Reuniones reales', 'Propuestas enviadas', 'Pipeline activo', 'Confianza para vender'],
  format: ['Entrenamiento + práctica', 'Roleplays con casos reales', 'Revisión de pipeline', '1:1 con especialista en ventas'],
};

const MONTH_4 = {
  title: 'Marca Personal & Escalabilidad',
  subtitle: 'Que las oportunidades te empiecen a buscar',
  items: [
    'Marca personal aplicada al agro (sin caretearla)',
    'Posicionamiento: qué decir, a quién y por qué',
    'Contenido simple (LinkedIn / WhatsApp / Instagram)',
    'Rutina mínima sostenible',
    'Escalar el sistema comercial',
  ],
  results: ['Marca personal clara', 'Perfil optimizado', 'Contenido alineado', 'Autoridad real, no humo'],
  format: ['Workshops de marca personal', 'Ejemplos reales del agro', 'Feedback personalizado', '1:1 con especialista en marca personal'],
};

const MONTHS = [MONTH_1, MONTH_2, MONTH_3, MONTH_4];
const MONTH_ICONS = [Sprout, Fence, Tractor, Megaphone];

const FOR_WHO = [
  { text: 'Vendedores de insumos, servicios o maquinaria', icon: Tractor },
  { text: 'Emprendedores del agro', icon: Sprout },
  { text: 'Empresas chicas (1–5 personas vendiendo)', icon: Users },
  { text: 'Técnicos que hoy también venden', icon: Wheat },
  { text: 'Personas con conocimiento, pero sin sistema', icon: Lightbulb },
];

const DELIVERABLES = [
  { text: 'Propuesta de valor clara', icon: Target },
  { text: 'Proceso comercial armado', icon: Fence },
  { text: 'Funnel definido', icon: Droplets },
  { text: 'CRM operativo', icon: BarChart3 },
  { text: 'OKRs comerciales vivos', icon: Sprout },
  { text: 'Pipeline activo', icon: Rocket },
  { text: 'Marca personal en marcha', icon: Megaphone },
  { text: 'Comunidad y contactos', icon: Handshake },
  { text: 'Método que podés repetir campaña tras campaña', icon: Wheat },
];

export function AgroLanding() {
  const [showForm, setShowForm] = useState(false);
  const [formState, setFormState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    role: '',
    message: '',
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormState('loading');

    const { error } = await supabase.from('leads').insert({
      name: formData.name,
      email: formData.email,
      phone: formData.phone || null,
      company: formData.company || null,
      role: formData.role || null,
      message: formData.message || null,
      source: 'agro360',
    });

    if (error) {
      setFormState('error');
    } else {
      setFormState('success');
    }
  };

  const openForm = () => {
    setShowForm(true);
    setFormState('idle');
    setFormData({ name: '', email: '', phone: '', company: '', role: '', message: '' });
  };

  const closeForm = () => setShowForm(false);

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-wau-black/95 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/wau-icon.png" alt="WAU" className="w-8 h-8 object-contain" />
            <span className="text-xl font-bold text-white tracking-tight">WAU</span>
            <span className="text-xs font-medium text-primary-300 bg-primary-300/10 px-2 py-0.5 rounded-full border border-primary-300/20">AGRO 360</span>
          </div>
          <button
            onClick={openForm}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-wau-black bg-primary-300 hover:bg-primary-400 rounded-lg transition-colors"
          >
            Quiero inscribirme
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-16 bg-wau-black relative overflow-hidden">
        {/* Decorative agro icons */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
          <Wheat className="absolute top-24 left-[10%] w-24 h-24 text-primary-300" />
          <Tractor className="absolute top-40 right-[8%] w-20 h-20 text-primary-300" />
          <Sun className="absolute bottom-20 left-[15%] w-16 h-16 text-primary-300" />
          <LandPlot className="absolute bottom-32 right-[12%] w-20 h-20 text-primary-300" />
          <Leaf className="absolute top-32 left-[45%] w-12 h-12 text-primary-300 rotate-45" />
          <CloudSun className="absolute top-20 right-[30%] w-14 h-14 text-primary-300" />
          <TreeDeciduous className="absolute bottom-16 left-[40%] w-16 h-16 text-primary-300" />
          <Mountain className="absolute bottom-10 right-[35%] w-20 h-20 text-primary-300" />
        </div>
        <div className="relative pt-20 pb-24 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-300/10 text-primary-300 rounded-full text-sm font-medium mb-8 border border-primary-300/20">
              <Wheat className="w-4 h-4" />
              Programa de Ventas para el Agro
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-tight mb-4">
              WAU AGRO <span className="text-primary-300">360</span>
            </h1>
            <p className="text-xl sm:text-2xl font-medium text-gray-300 mb-6 max-w-3xl mx-auto leading-relaxed">
              4 meses para construir tu sistema comercial, empezar a vender y posicionarte como referente
            </p>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              Un programa intensivo para vendedores y emprendedores del agro que quieren dejar de improvisar, vender con método y construir una marca personal que genere oportunidades todos los meses.
            </p>
            <button
              onClick={openForm}
              className="inline-flex items-center gap-2 px-8 py-4 text-base font-semibold text-wau-black bg-primary-300 hover:bg-primary-400 rounded-xl shadow-lg shadow-primary-300/20 transition-all hover:shadow-xl hover:shadow-primary-300/30 hover:-translate-y-0.5"
            >
              Quiero inscribirme
              <ArrowRight className="w-5 h-5" />
            </button>
            <p className="text-sm text-gray-500 mt-4">Programa creado por WAU</p>
          </div>
        </div>
      </section>

      {/* Promise */}
      <section className="py-16 px-6 bg-sand-50 border-b border-gray-100">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-3">En 4 meses</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-wau-black">
              No salís motivado. <span className="text-primary-600">Salís operativo.</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {[
              { text: 'Tenés toda tu arquitectura comercial armada', icon: Fence },
              { text: 'Empezás a vender con un sistema, no por intuición', icon: Tractor },
              { text: 'Aprendés a mostrar lo que sabés y construir marca personal', icon: Megaphone },
              { text: 'Formás parte de una comunidad agro-comercial', icon: Wheat },
              { text: 'Tenés 1:1 con especialistas (ventas, estrategia y marca)', icon: Handshake },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-100">
                  <div className="w-8 h-8 bg-wau-black rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-primary-300" />
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{item.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* For who */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-3">Para quién es</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-wau-black mb-4">
              Para quien quiere orden, método y resultados
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto mb-8">
            {FOR_WHO.map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 hover:border-primary-300/50 transition-colors">
                  <div className="w-10 h-10 bg-wau-black rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-primary-300" />
                  </div>
                  <p className="text-sm text-gray-700">{item.text}</p>
                </div>
              );
            })}
          </div>
          <div className="max-w-md mx-auto bg-wau-black rounded-2xl p-6 text-center">
            <p className="text-gray-400 text-sm mb-1">No es para quien busca "tips sueltos"</p>
            <p className="text-primary-300 font-semibold">Es para quien quiere orden, método y resultados</p>
          </div>
        </div>
      </section>

      {/* Program Structure - 4 Months */}
      <section className="py-20 px-6 bg-wau-black text-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-primary-300 uppercase tracking-wider mb-3">Estructura del programa</p>
            <h2 className="text-3xl sm:text-4xl font-bold">
              4 meses. 4 fases. <span className="text-primary-300">Un sistema completo.</span>
            </h2>
          </div>

          <div className="space-y-8">
            {MONTHS.map((month, i) => {
              const Icon = MONTH_ICONS[i];
              return (
                <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-primary-300 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6 text-wau-black" />
                    </div>
                    <div>
                      <p className="text-primary-300 text-sm font-semibold">Mes {i + 1}</p>
                      <h3 className="text-xl font-bold">{month.title}</h3>
                      <p className="text-gray-400 text-sm">{month.subtitle}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Content */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Qué trabajás</p>
                      <ul className="space-y-2">
                        {month.items.map((item, j) => (
                          <li key={j} className="flex items-start gap-2 text-sm text-gray-300">
                            <span className="text-primary-300 mt-1">•</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Format */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Formato</p>
                      <ul className="space-y-2">
                        {month.format.map((item, j) => (
                          <li key={j} className="flex items-start gap-2 text-sm text-gray-400">
                            <span className="text-gray-600 mt-1">•</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Results */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Resultado del mes</p>
                      <ul className="space-y-2">
                        {month.results.map((item, j) => (
                          <li key={j} className="flex items-center gap-2 text-sm text-white font-medium">
                            <CheckCircle2 className="w-4 h-4 text-primary-300 flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Community + 1:1 */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Community */}
            <div className="p-8 rounded-2xl border border-gray-100">
              <div className="w-12 h-12 bg-wau-black rounded-xl flex items-center justify-center mb-5">
                <Wheat className="w-6 h-6 text-primary-300" />
              </div>
              <h3 className="text-2xl font-bold text-wau-black mb-2">Comunidad WAU Agro</h3>
              <p className="text-gray-500 mb-5 leading-relaxed">
                El agro se mueve por confianza. La comunidad acelera eso.
              </p>
              <ul className="space-y-3">
                {[
                  { text: 'Grupo privado de participantes', icon: Users },
                  { text: 'Casos reales', icon: LandPlot },
                  { text: 'Preguntas abiertas', icon: MessageSquare },
                  { text: 'Networking agro', icon: Handshake },
                  { text: 'Aprendizaje cruzado', icon: Sprout },
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="w-7 h-7 bg-primary-50 rounded-md flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-3.5 h-3.5 text-primary-600" />
                    </div>
                    {item.text}
                  </li>
                ))}
              </ul>
            </div>

            {/* 1:1 */}
            <div className="p-8 rounded-2xl border border-gray-100">
              <div className="w-12 h-12 bg-wau-black rounded-xl flex items-center justify-center mb-5">
                <Users className="w-6 h-6 text-primary-300" />
              </div>
              <h3 className="text-2xl font-bold text-wau-black mb-2">Acompañamiento 1:1</h3>
              <p className="text-gray-500 mb-5 leading-relaxed">
                No sos un número. Ajustamos el sistema a tu realidad.
              </p>
              <ul className="space-y-3">
                {[
                  { text: 'Especialista en ventas', icon: Target },
                  { text: 'Especialista en estrategia', icon: BarChart3 },
                  { text: 'Especialista en marca personal', icon: Megaphone },
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-4 h-4 text-primary-700" />
                    </div>
                    {item.text}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Deliverables */}
      <section className="py-20 px-6 bg-sand-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-3">Lo que te llevás</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-wau-black mb-4">
              Entregable final del programa
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {DELIVERABLES.map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100">
                  <div className="w-8 h-8 bg-primary-300 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-wau-black" />
                  </div>
                  <p className="text-sm font-medium text-wau-black">{item.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6 bg-wau-black">
        <div className="max-w-3xl mx-auto text-center">
          <img src="/wau-icon.png" alt="WAU" className="w-16 h-16 object-contain mx-auto mb-8 opacity-60" />
          <blockquote className="text-xl sm:text-2xl font-medium text-gray-300 mb-10 leading-relaxed italic">
            "En el agro nadie improvisa una campaña productiva.
            <br />
            En ventas, sí.
            <br />
            <span className="text-primary-300 not-italic font-bold">WAU AGRO 360 viene a cambiar eso.</span>"
          </blockquote>
          <button
            onClick={openForm}
            className="inline-flex items-center gap-2 px-8 py-4 text-base font-semibold text-wau-black bg-primary-300 hover:bg-primary-400 rounded-xl transition-all hover:-translate-y-0.5 shadow-lg shadow-primary-300/20"
          >
            Quiero inscribirme
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src="/wau-icon.png" alt="WAU" className="w-7 h-7 object-contain" />
            <span className="text-lg font-bold text-wau-black">WAU</span>
            <span className="text-sm text-gray-400 ml-2">Agro 360</span>
          </div>
          <p className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} WAU. Todos los derechos reservados.
          </p>
        </div>
      </footer>

      {/* Contact Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeForm} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
            <button
              onClick={closeForm}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {formState === 'success' ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-primary-300 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-8 h-8 text-wau-black" />
                </div>
                <h3 className="text-2xl font-bold text-wau-black mb-3">
                  ¡Inscripción recibida!
                </h3>
                <p className="text-gray-500 mb-8 leading-relaxed">
                  Nos vamos a comunicar con vos en las próximas 24 horas con toda la info del programa WAU AGRO 360.
                </p>
                <button onClick={closeForm} className="btn-wau px-8 py-3">
                  Cerrar
                </button>
              </div>
            ) : (
              <div className="p-8">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-wau-black mb-2">
                    Inscribirme a WAU AGRO 360
                  </h3>
                  <p className="text-gray-500 text-sm">
                    Completá tus datos y nos comunicamos con toda la info del programa.
                  </p>
                </div>

                {formState === 'error' && (
                  <div className="mb-6 p-4 rounded-lg bg-danger-50 border border-danger-200">
                    <p className="text-sm text-danger-600">
                      Hubo un error al enviar. Por favor intentá de nuevo.
                    </p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="label">Nombre completo *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="input pl-10"
                        placeholder="Tu nombre"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label">Email *</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="input pl-10"
                        placeholder="tu@email.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label">Teléfono</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="input pl-10"
                        placeholder="+54 11 1234-5678"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Empresa / Actividad</label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                        <input
                          type="text"
                          value={formData.company}
                          onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                          className="input pl-10"
                          placeholder="Ej: Venta de insumos"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="label">Rol</label>
                      <div className="relative">
                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                        <input
                          type="text"
                          value={formData.role}
                          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                          className="input pl-10"
                          placeholder="Ej: Vendedor, Dueño"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="label">¿Qué esperás del programa?</label>
                    <div className="relative">
                      <MessageSquare className="absolute left-3 top-3 w-4.5 h-4.5 text-gray-400" />
                      <textarea
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        className="input pl-10 min-h-[80px] resize-none"
                        placeholder="Contanos brevemente..."
                        rows={3}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={formState === 'loading'}
                    className="btn-wau w-full py-3 mt-2"
                  >
                    {formState === 'loading' ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        Quiero inscribirme
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
