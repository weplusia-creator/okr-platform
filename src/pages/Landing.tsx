import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Target,
  TrendingUp,
  Users,
  BarChart3,
  Zap,
  CheckCircle2,
  ChevronRight,
  Layers,
  Search,
  Settings,
  RefreshCw,
  X,
  Loader2,
  User,
  Mail,
  Phone,
  Building2,
  Briefcase,
  MessageSquare,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const PROBLEMS = [
  {
    icon: Search,
    title: 'No sabés por qué no vendés más',
    description: 'Tenés clientes, tenés equipo, pero los resultados no escalan. No hay un diagnóstico claro de qué está fallando.',
  },
  {
    icon: BarChart3,
    title: 'No podés medir lo que importa',
    description: 'No tenés métricas comerciales claras. Las decisiones se toman por intuición, no por datos.',
  },
  {
    icon: Users,
    title: 'Tu equipo vende pero no tiene proceso',
    description: 'Cada vendedor tiene su método. No hay un proceso replicable, trazable ni escalable.',
  },
  {
    icon: Settings,
    title: 'Probaste herramientas pero no funcionan',
    description: 'CRM implementados que nadie usa, capacitaciones que no pegan, consultorías genéricas que no aterrizan.',
  },
];

const SERVICES = [
  {
    icon: Search,
    title: 'Diagnóstico Comercial',
    description: 'Analizamos tu modelo de ventas actual: procesos, métricas, equipo, tecnología y oportunidades. Identificamos exactamente dónde estás perdiendo plata.',
    items: ['Auditoría del proceso comercial', 'Análisis de métricas y conversión', 'Mapa de oportunidades'],
  },
  {
    icon: Layers,
    title: 'Diseño del Modelo Comercial',
    description: 'Creamos un sistema de ventas personalizado, con procesos claros, roles definidos y métricas que importan.',
    items: ['Proceso de ventas paso a paso', 'Definición de KPIs comerciales', 'Playbook para el equipo'],
  },
  {
    icon: Zap,
    title: 'Implementación',
    description: 'No te dejamos un PDF. Trabajamos con tu equipo para implementar cada pieza del modelo: herramientas, rutinas, dashboards.',
    items: ['Setup de herramientas y CRM', 'Capacitación del equipo', 'Tableros de control en tiempo real'],
  },
  {
    icon: RefreshCw,
    title: 'Mejora Continua',
    description: 'Acompañamiento mensual para ajustar, optimizar y escalar. Tu modelo comercial evoluciona con tu empresa.',
    items: ['Revisión mensual de resultados', 'Ajustes de proceso y estrategia', 'Escalamiento del modelo'],
  },
];

const DIFFERENTIALS = [
  'No vendemos humo. Trabajamos con datos, procesos y resultados medibles.',
  'Cada modelo es 100% personalizado. No usamos plantillas genéricas.',
  'Implementamos con vos. No te dejamos solo con un entregable.',
  'Integramos estrategia + procesos + personas + tecnología.',
  'Somos consultora boutique: pocos clientes, mucha profundidad.',
];

export function Landing() {
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

  const closeForm = () => {
    setShowForm(false);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-wau-black/95 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/wau-icon.png" alt="WAU" className="w-8 h-8 object-contain" />
            <span className="text-xl font-bold text-white tracking-tight">WAU</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={openForm}
              className="hidden sm:inline-flex text-sm font-medium text-gray-400 hover:text-primary-300 transition-colors"
            >
              Agendar llamada
            </button>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-wau-black bg-primary-300 hover:bg-primary-400 rounded-lg transition-colors"
            >
              Ingresar
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-16 bg-wau-black">
        <div className="pt-20 pb-24 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-300/10 text-primary-300 rounded-full text-sm font-medium mb-8 border border-primary-300/20">
              <Target className="w-4 h-4" />
              Consultora de ventas para PyMEs
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-tight mb-6">
              Tu empresa vende,
              <br />
              <span className="text-primary-300">pero podría vender mucho más.</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              Diseñamos modelos comerciales personalizados, trazables y escalables.
              Para que tu equipo venda más, mejor y con método.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={openForm}
                className="inline-flex items-center gap-2 px-8 py-4 text-base font-semibold text-wau-black bg-primary-300 hover:bg-primary-400 rounded-xl shadow-lg shadow-primary-300/20 transition-all hover:shadow-xl hover:shadow-primary-300/30 hover:-translate-y-0.5"
              >
                Agendar llamada estratégica
                <ArrowRight className="w-5 h-5" />
              </button>
              <a
                href="#servicios"
                className="inline-flex items-center gap-2 px-8 py-4 text-base font-medium text-gray-400 hover:text-primary-300 transition-colors"
              >
                Conocer más
                <ChevronRight className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Social proof bar */}
      <section className="border-b border-gray-100 bg-sand-50 py-8 px-6">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-8 sm:gap-16 text-center">
          <div>
            <p className="text-3xl font-bold text-wau-black">+50</p>
            <p className="text-sm text-gray-500">Empresas asesoradas</p>
          </div>
          <div className="w-px h-10 bg-gray-200 hidden sm:block" />
          <div>
            <p className="text-3xl font-bold text-wau-black">+200</p>
            <p className="text-sm text-gray-500">Procesos implementados</p>
          </div>
          <div className="w-px h-10 bg-gray-200 hidden sm:block" />
          <div>
            <p className="text-3xl font-bold text-wau-black">4.9/5</p>
            <p className="text-sm text-gray-500">Satisfacción de clientes</p>
          </div>
        </div>
      </section>

      {/* Problems */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-3">El problema</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-wau-black mb-4">
              ¿Te suena familiar?
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Estos son los problemas más comunes que vemos en empresas que facturan bien pero saben que podrían estar mucho mejor.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {PROBLEMS.map((problem, i) => (
              <div key={i} className="p-6 rounded-2xl border border-gray-100 hover:border-primary-300/50 hover:shadow-lg transition-all group">
                <div className="w-12 h-12 bg-danger-50 group-hover:bg-primary-100 rounded-xl flex items-center justify-center mb-4 transition-colors">
                  <problem.icon className="w-6 h-6 text-danger-500 group-hover:text-primary-700 transition-colors" />
                </div>
                <h3 className="text-lg font-semibold text-wau-black mb-2">{problem.title}</h3>
                <p className="text-gray-500 leading-relaxed">{problem.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Value Proposition */}
      <section className="py-20 px-6 bg-wau-black text-white">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm font-semibold text-primary-300 uppercase tracking-wider mb-3">Nuestra propuesta</p>
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            No te vendemos un curso.
            <br />
            Te construimos un sistema.
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed">
            WAU diseña e implementa modelos comerciales completos. Integramos estrategia, procesos, personas, métricas y tecnología en un sistema que tu equipo puede ejecutar todos los días.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-14 h-14 bg-primary-300/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Target className="w-7 h-7 text-primary-300" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Personalizado</h3>
              <p className="text-sm text-gray-400">Cada modelo se diseña para tu empresa, tu mercado y tu equipo.</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 bg-primary-300/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-7 h-7 text-primary-300" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Trazable</h3>
              <p className="text-sm text-gray-400">Métricas claras para saber exactamente qué funciona y qué no.</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 bg-primary-300/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-7 h-7 text-primary-300" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Escalable</h3>
              <p className="text-sm text-gray-400">Un sistema que crece con tu empresa sin depender de una persona.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="servicios" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-3">Cómo trabajamos</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-wau-black mb-4">
              Un proceso claro, de principio a fin
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              No improvisamos. Seguimos un método probado que se adapta a cada empresa.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {SERVICES.map((service, i) => (
              <div key={i} className="p-8 rounded-2xl border border-gray-100 hover:shadow-xl transition-all">
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-10 h-10 bg-wau-black rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-300 font-bold text-sm">{i + 1}</span>
                  </div>
                  <h3 className="text-xl font-semibold text-wau-black">{service.title}</h3>
                </div>
                <p className="text-gray-500 mb-5 leading-relaxed">{service.description}</p>
                <ul className="space-y-2">
                  {service.items.map((item, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle2 className="w-4 h-4 text-primary-500 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Target audience */}
      <section className="py-20 px-6 bg-sand-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-3">Para quién es</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-wau-black mb-4">
              Trabajamos con líderes que quieren resultados
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { title: 'Dueños de PyMEs', description: 'Que saben que su empresa puede más pero no encuentran el camino para escalar ventas.' },
              { title: 'Gerentes Comerciales', description: 'Que necesitan estructura, métricas y un proceso replicable para su equipo.' },
              { title: 'Líderes de equipo', description: 'Que quieren dejar de depender de vendedores estrella y crear un sistema predecible.' },
            ].map((item, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 text-center">
                <div className="w-12 h-12 bg-wau-black rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-6 h-6 text-primary-300" />
                </div>
                <h3 className="font-semibold text-wau-black mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Differentials */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-3">Por qué WAU</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-wau-black mb-4">
              Lo que nos hace diferentes
            </h2>
          </div>
          <div className="space-y-4 max-w-2xl mx-auto">
            {DIFFERENTIALS.map((diff, i) => (
              <div key={i} className="flex items-start gap-4 p-4 rounded-xl hover:bg-primary-50 transition-colors">
                <div className="w-8 h-8 bg-primary-300 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="w-5 h-5 text-wau-black" />
                </div>
                <p className="text-gray-700 leading-relaxed">{diff}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6 bg-wau-black">
        <div className="max-w-3xl mx-auto text-center">
          <img src="/wau-icon.png" alt="WAU" className="w-16 h-16 object-contain mx-auto mb-8 opacity-60" />
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            ¿Listo para construir tu modelo comercial?
          </h2>
          <p className="text-lg text-gray-400 mb-10 max-w-xl mx-auto leading-relaxed">
            Agendá una llamada estratégica de 30 minutos. Sin compromiso, sin venta agresiva. Analizamos tu situación y te decimos honestamente si podemos ayudarte.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={openForm}
              className="inline-flex items-center gap-2 px-8 py-4 text-base font-semibold text-wau-black bg-primary-300 hover:bg-primary-400 rounded-xl transition-all hover:-translate-y-0.5 shadow-lg shadow-primary-300/20"
            >
              Agendar llamada estratégica
              <ArrowRight className="w-5 h-5" />
            </button>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-8 py-4 text-base font-medium text-gray-400 hover:text-primary-300 transition-colors"
            >
              Ya soy cliente — Ingresar
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src="/wau-icon.png" alt="WAU" className="w-7 h-7 object-contain" />
            <span className="text-lg font-bold text-wau-black">WAU</span>
            <span className="text-sm text-gray-400 ml-2">Consultora de ventas</span>
          </div>
          <p className="text-sm text-gray-400">
            © {new Date().getFullYear()} WAU. Todos los derechos reservados.
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
                  ¡Mensaje enviado!
                </h3>
                <p className="text-gray-500 mb-8 leading-relaxed">
                  Recibimos tu solicitud. Nos vamos a comunicar con vos en las próximas 24 horas para coordinar la llamada.
                </p>
                <button
                  onClick={closeForm}
                  className="btn-wau px-8 py-3"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <div className="p-8">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-wau-black mb-2">
                    Agendar llamada estratégica
                  </h3>
                  <p className="text-gray-500 text-sm">
                    Completá tus datos y nos comunicamos para coordinar una llamada de 30 minutos sin compromiso.
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
                      <label className="label">Empresa</label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                        <input
                          type="text"
                          value={formData.company}
                          onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                          className="input pl-10"
                          placeholder="Nombre de tu empresa"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="label">Cargo</label>
                      <div className="relative">
                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                        <input
                          type="text"
                          value={formData.role}
                          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                          className="input pl-10"
                          placeholder="Tu cargo"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="label">¿En qué podemos ayudarte?</label>
                    <div className="relative">
                      <MessageSquare className="absolute left-3 top-3 w-4.5 h-4.5 text-gray-400" />
                      <textarea
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        className="input pl-10 min-h-[80px] resize-none"
                        placeholder="Contanos brevemente tu situación..."
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
                        Solicitar llamada
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>

                  <p className="text-xs text-gray-400 text-center mt-3">
                    Sin compromiso. Sin venta agresiva. Solo una conversación honesta.
                  </p>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
