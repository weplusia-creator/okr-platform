import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CheckCircle2, AlertTriangle, ListChecks, Calendar, FolderKanban,
  Plus, Trash2, Copy, Check, Save, ArrowLeft, MessageCircle,
} from 'lucide-react';
import { useProjects } from '../../context/ProjectContext';
import { useFinance } from '../../context/FinanceContext';
import { toast } from '../../components/ui/toast';

type Responsable = 'cliente' | 'consultor' | 'ambos';

interface Compromiso {
  id: string;
  texto: string;
  responsable: Responsable;
}

const RESPONSABLE_LABEL: Record<Responsable, string> = {
  cliente: 'Cliente',
  consultor: 'Consultor',
  ambos: 'Ambos',
};

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDateEs(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const fecha = new Date(y, m - 1, d);
  return fecha.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function linesFromText(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.trim().replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean);
}

function buildInforme({
  projectName, clientName, fecha, positivos, desafios, compromisos,
}: {
  projectName: string; clientName: string | null; fecha: string;
  positivos: string; desafios: string; compromisos: Compromiso[];
}): string {
  const lines: string[] = [];
  const header = clientName && clientName !== projectName
    ? `📋 Resumen del encuentro — ${projectName} (${clientName})`
    : `📋 Resumen del encuentro — ${projectName || 'Proyecto sin nombre'}`;
  lines.push(header);
  lines.push(`🗓 ${formatDateEs(fecha)}`);
  lines.push('');

  const posLines = linesFromText(positivos);
  if (posLines.length > 0) {
    lines.push('✅ POSITIVOS:');
    for (const l of posLines) lines.push(`• ${l}`);
    lines.push('');
  }

  const desLines = linesFromText(desafios);
  if (desLines.length > 0) {
    lines.push('⚠️ DESAFÍOS:');
    for (const l of desLines) lines.push(`• ${l}`);
    lines.push('');
  }

  const validCompromisos = compromisos.filter((c) => c.texto.trim());
  if (validCompromisos.length > 0) {
    lines.push('📋 COMPROMISOS PARA LA PRÓXIMA SEMANA:');
    for (const c of validCompromisos) {
      lines.push(`• ${c.texto.trim()} — ${RESPONSABLE_LABEL[c.responsable]}`);
    }
    lines.push('');
  }

  lines.push('Nos vemos la semana que viene 👋');
  return lines.join('\n').trim();
}

export function EncuentroNuevo() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialProjectId = searchParams.get('projectId') ?? '';

  const { projects, addNovedad } = useProjects();
  const { clients } = useFinance();

  const [projectId, setProjectId] = useState(initialProjectId);
  const [fecha, setFecha] = useState(todayISO());
  const [positivos, setPositivos] = useState('');
  const [desafios, setDesafios] = useState('');
  const [compromisos, setCompromisos] = useState<Compromiso[]>([
    { id: crypto.randomUUID(), texto: '', responsable: 'cliente' },
  ]);

  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  const activeProjects = useMemo(() => {
    // Show all projects but rank active ones first
    return [...projects].sort((a, b) => {
      const aActive = a.status === 'in_progress' ? 0 : 1;
      const bActive = b.status === 'in_progress' ? 0 : 1;
      if (aActive !== bActive) return aActive - bActive;
      return (a.name ?? '').localeCompare(b.name ?? '');
    });
  }, [projects]);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === projectId) ?? null,
    [projects, projectId],
  );

  const selectedClient = useMemo(() => {
    if (!selectedProject?.clientId) return null;
    return clients.find((c) => c.id === selectedProject.clientId) ?? null;
  }, [clients, selectedProject]);

  const informe = useMemo(
    () =>
      buildInforme({
        projectName: selectedProject?.name ?? '',
        clientName: selectedClient?.name ?? selectedProject?.clientName ?? null,
        fecha,
        positivos,
        desafios,
        compromisos,
      }),
    [selectedProject, selectedClient, fecha, positivos, desafios, compromisos],
  );

  const isEmpty =
    !positivos.trim() && !desafios.trim() && compromisos.every((c) => !c.texto.trim());

  // ----- compromisos handlers -----
  const updateCompromiso = (id: string, patch: Partial<Compromiso>) => {
    setCompromisos((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };
  const addCompromiso = () => {
    setCompromisos((prev) => [
      ...prev,
      { id: crypto.randomUUID(), texto: '', responsable: 'cliente' },
    ]);
  };
  const removeCompromiso = (id: string) => {
    setCompromisos((prev) => (prev.length === 1 ? prev : prev.filter((c) => c.id !== id)));
  };

  // ----- actions -----
  const handleCopy = async () => {
    if (isEmpty) {
      toast.warning('Llená al menos una sección antes de copiar.');
      return;
    }
    try {
      await navigator.clipboard.writeText(informe);
      setCopied(true);
      toast.success('Informe copiado. Pegalo en WhatsApp.');
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('No se pudo copiar al portapapeles.');
    }
  };

  const handleSaveAsNovedad = async () => {
    if (!projectId) {
      toast.warning('Elegí un proyecto primero.');
      return;
    }
    if (isEmpty) {
      toast.warning('Llená al menos una sección antes de guardar.');
      return;
    }
    setSaving(true);
    try {
      await addNovedad(projectId, informe);
      toast.success('Guardado como novedad del proyecto.');
      navigate(`/projects/${projectId}`);
    } catch (err: any) {
      toast.error('No se pudo guardar: ' + (err?.message || 'error desconocido'));
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    // If only one in-progress project, auto-select it for speed.
    if (!projectId && activeProjects.length > 0) {
      const inProgress = activeProjects.filter((p) => p.status === 'in_progress');
      if (inProgress.length === 1) setProjectId(inProgress[0].id);
    }
  }, [activeProjects, projectId]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-1.5 -m-1.5 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#3d3839] transition-colors"
          aria-label="Volver"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <MessageCircle className="w-6 h-6 sm:w-7 sm:h-7 text-accent-600 dark:text-accent-400" />
            Cerrar encuentro
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Anotá lo positivo, los desafíos y los compromisos. Generá un mini-informe listo para WhatsApp.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
        {/* Form */}
        <div className="lg:col-span-3 space-y-4">
          {/* Project + Fecha */}
          <div className="card p-4 sm:p-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1.5 mb-1.5">
                <FolderKanban className="w-3.5 h-3.5" />
                Proyecto
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-[#443f40] bg-white dark:bg-[#2e2a2b] text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3100E2]"
              >
                <option value="">Elegir proyecto...</option>
                {activeProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.clientName && p.clientName !== p.name ? ` — ${p.clientName}` : ''}
                    {p.status !== 'in_progress' ? ` (${p.status})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1.5 mb-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Fecha del encuentro
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-200 dark:border-[#443f40] bg-white dark:bg-[#2e2a2b] text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3100E2]"
              />
            </div>
          </div>

          {/* Positivos */}
          <div className="card p-4 sm:p-5">
            <label className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Cosas positivas / logros
            </label>
            <textarea
              value={positivos}
              onChange={(e) => setPositivos(e.target.value)}
              placeholder="Una por línea (o usá guiones). Ej:&#10;Cerraron la primera venta del mes&#10;Equipo nuevo onboardeado"
              rows={4}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-[#443f40] bg-white dark:bg-[#2e2a2b] text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-y leading-relaxed"
            />
          </div>

          {/* Desafios */}
          <div className="card p-4 sm:p-5">
            <label className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Desafíos / bloqueos
            </label>
            <textarea
              value={desafios}
              onChange={(e) => setDesafios(e.target.value)}
              placeholder="Una por línea. Ej:&#10;Falta integrar Mercado Pago&#10;La conversión de la landing bajó al 2%"
              rows={4}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-[#443f40] bg-white dark:bg-[#2e2a2b] text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-y leading-relaxed"
            />
          </div>

          {/* Compromisos */}
          <div className="card p-4 sm:p-5">
            <label className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
              <ListChecks className="w-4 h-4 text-[#3100E2] dark:text-blue-400" />
              Compromisos para la próxima semana
            </label>
            <div className="space-y-2">
              {compromisos.map((c, idx) => (
                <div key={c.id} className="flex items-start gap-2">
                  <input
                    type="text"
                    value={c.texto}
                    onChange={(e) => updateCompromiso(c.id, { texto: e.target.value })}
                    placeholder={`Compromiso ${idx + 1}...`}
                    className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-gray-200 dark:border-[#443f40] bg-white dark:bg-[#2e2a2b] text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3100E2]/40"
                  />
                  <select
                    value={c.responsable}
                    onChange={(e) => updateCompromiso(c.id, { responsable: e.target.value as Responsable })}
                    className="px-2 py-2 rounded-lg border border-gray-200 dark:border-[#443f40] bg-white dark:bg-[#2e2a2b] text-xs text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#3100E2]/40"
                  >
                    <option value="cliente">Cliente</option>
                    <option value="consultor">Consultor</option>
                    <option value="ambos">Ambos</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => removeCompromiso(c.id)}
                    disabled={compromisos.length === 1}
                    className="p-2 rounded-lg text-gray-400 hover:text-[#FF4632] hover:bg-[#FF4632]/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Eliminar compromiso"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addCompromiso}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#3100E2] dark:text-blue-400 hover:bg-[#3100E2]/10 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar compromiso
              </button>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="lg:col-span-2">
          <div className="card p-4 sm:p-5 lg:sticky lg:top-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                Preview del informe
              </h2>
              {!isEmpty && (
                <span className="text-[10px] text-gray-400 dark:text-gray-500">
                  Se actualiza en vivo
                </span>
              )}
            </div>
            <div className="rounded-lg bg-gray-50 dark:bg-[#2e2a2b] border border-gray-200 dark:border-[#443f40] p-3 sm:p-4 max-h-[60vh] overflow-y-auto">
              {isEmpty ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                  Empezá a llenar el formulario y el informe se va armando solo acá.
                </p>
              ) : (
                <pre className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-gray-800 dark:text-gray-200 font-sans">
                  {informe}
                </pre>
              )}
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleCopy}
                disabled={isEmpty}
                className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  copied
                    ? 'bg-emerald-500 text-white'
                    : 'bg-[#3100E2] text-white hover:bg-[#2300a3]'
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copiado al portapapeles' : 'Copiar informe para WhatsApp'}
              </button>
              <button
                type="button"
                onClick={handleSaveAsNovedad}
                disabled={isEmpty || saving || !projectId}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-gray-200 dark:border-[#443f40] bg-white dark:bg-[#363233] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#3d3839] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Guardando...' : 'Guardar como novedad del proyecto'}
              </button>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center mt-1">
                "Guardar" deja el informe en el historial del proyecto para verlo después.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
