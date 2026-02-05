import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, AlertTriangle, TrendingUp, TrendingDown, Minus, Copy, ExternalLink,
  Plus, Trash2, Save, Loader2, Clock, CheckCircle2, MessageSquare, BarChart3,
  Calendar, User, ChevronDown, ChevronRight,
} from 'lucide-react';
import { useCheckin } from '../../context/CheckinContext';
import { useProjects } from '../../context/ProjectContext';
import {
  CHECKIN_STATUS_LABELS, EMOJI_CONFIG, COMPROMISO_STATUS_LABELS, PRIORIDAD_LABELS,
  SECCION_CONFIG, getPulsoColor,
} from '../../types/checkin';
import type { CompromisoStatus, CompromisoPrioridad, CompromisoResponsable } from '../../types/checkin';
import { Modal } from '../../components/Modal';

export function CheckinDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    checkins, fetchCheckins, preguntas, fetchPreguntas, compromisos, fetchCompromisos,
    metricas, fetchMetricas, updateCheckin, addCompromiso, deleteCompromiso, cerrarCheckin,
  } = useCheckin();
  const { projects } = useProjects();

  const [showClose, setShowClose] = useState(false);
  const [showAddCompromiso, setShowAddCompromiso] = useState(false);
  const [saving, setSaving] = useState(false);
  const [closeForm, setCloseForm] = useState({ notasConsultor: '', resumenReunion: '' });
  const [compromisoForm, setCompromisoForm] = useState({
    descripcion: '',
    responsable: 'cliente' as CompromisoResponsable,
    fechaLimite: '',
    prioridad: 'media' as CompromisoPrioridad,
  });
  const [copied, setCopied] = useState(false);

  const checkin = checkins.find(c => c.id === id);
  const project = checkin ? projects.find(p => p.id === checkin.proyectoId) : null;
  const checkinPreguntas = useMemo(() => preguntas.filter(p => p.checkinId === id).sort((a, b) => a.orden - b.orden), [preguntas, id]);
  const checkinCompromisos = useMemo(() => compromisos.filter(c => c.checkinId === id), [compromisos, id]);
  const checkinMetricas = useMemo(() => metricas.filter(m => m.checkinId === id), [metricas, id]);

  // Previous checkin for comparison
  const prevCheckin = useMemo(() => {
    if (!checkin) return null;
    return checkins
      .filter(c => c.proyectoId === checkin.proyectoId && c.numero < checkin.numero)
      .sort((a, b) => b.numero - a.numero)[0] || null;
  }, [checkins, checkin]);

  useEffect(() => {
    if (id) {
      fetchPreguntas(id);
      fetchCompromisos({ checkinId: id });
      fetchMetricas(id);
    }
  }, [id, fetchPreguntas, fetchCompromisos, fetchMetricas]);

  useEffect(() => {
    if (checkins.length === 0) fetchCheckins();
  }, [checkins.length, fetchCheckins]);

  const publicUrl = checkin ? `${window.location.origin}/checkin/${checkin.token}` : '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await cerrarCheckin(id, closeForm);
      setShowClose(false);
    } finally {
      setSaving(false);
    }
  };

  const handleAddCompromiso = async () => {
    if (!id || !checkin || !compromisoForm.descripcion.trim()) return;
    setSaving(true);
    try {
      await addCompromiso({
        checkinId: id,
        proyectoId: checkin.proyectoId,
        descripcion: compromisoForm.descripcion.trim(),
        responsable: compromisoForm.responsable,
        fechaLimite: compromisoForm.fechaLimite || null,
        estado: 'pendiente',
        prioridad: compromisoForm.prioridad,
        checkinOrigenId: id,
        checkinRevisionId: null,
        notas: null,
      });
      setCompromisoForm({ descripcion: '', responsable: 'cliente', fechaLimite: '', prioridad: 'media' });
      setShowAddCompromiso(false);
    } finally {
      setSaving(false);
    }
  };

  const handleStartReunion = async () => {
    if (!id) return;
    await updateCheckin(id, { estado: 'en_reunion', fechaReunion: new Date().toISOString() });
  };

  // Group preguntas by section
  const secciones = useMemo(() => {
    const map: Record<string, typeof checkinPreguntas> = {};
    checkinPreguntas.forEach(p => {
      if (!map[p.seccion]) map[p.seccion] = [];
      map[p.seccion].push(p);
    });
    return map;
  }, [checkinPreguntas]);

  // Negative keywords highlighting
  const negativeWords = ['problema', 'urgente', 'mal', 'bloqueo', 'impedimento', 'riesgo', 'atraso', 'retraso', 'difícil', 'complicado'];

  const highlightNegative = (text: string) => {
    if (!text) return text;
    let result = text;
    negativeWords.forEach(word => {
      const regex = new RegExp(`(${word})`, 'gi');
      result = result.replace(regex, '**$1**');
    });
    return result;
  };

  if (!checkin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const statusCfg = CHECKIN_STATUS_LABELS[checkin.estado as keyof typeof CHECKIN_STATUS_LABELS];
  const pulsoChange = prevCheckin?.pulsoScore && checkin.pulsoScore
    ? checkin.pulsoScore - prevCheckin.pulsoScore : null;
  const cumplimiento = checkinCompromisos.length > 0
    ? Math.round((checkinCompromisos.filter(c => c.estado === 'completado').length / checkinCompromisos.length) * 100)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Check-in #{checkin.numero}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {project?.name} {checkin.periodo ? `— ${checkin.periodo}` : ''}
          </p>
        </div>
        <span className={`text-xs px-3 py-1 rounded-full font-medium ${statusCfg?.color || 'bg-gray-100 text-gray-600'}`}>
          {statusCfg?.label || checkin.estado}
        </span>
      </div>

      {/* Top panel: Pulso + Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5 flex items-center gap-4">
          <span className="text-4xl">
            {checkin.emoji ? EMOJI_CONFIG[checkin.emoji as keyof typeof EMOJI_CONFIG]?.emoji : '📋'}
          </span>
          <div>
            <div className={`text-3xl font-bold ${getPulsoColor(checkin.pulsoScore)}`}>
              {checkin.pulsoScore ?? '-'}/10
            </div>
            {pulsoChange !== null && (
              <div className={`flex items-center gap-1 text-sm ${pulsoChange > 0 ? 'text-green-600' : pulsoChange < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                {pulsoChange > 0 ? <TrendingUp className="w-4 h-4" /> : pulsoChange < 0 ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                {pulsoChange > 0 ? '+' : ''}{pulsoChange} vs anterior
              </div>
            )}
            {checkin.palabraClave && (
              <p className="text-sm text-gray-500 mt-1">"{checkin.palabraClave}"</p>
            )}
          </div>
        </div>

        <div className="card p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">NPS</p>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {checkin.npsScore ?? '-'}/10
          </div>
          {cumplimiento !== null && (
            <div className="mt-2">
              <p className="text-sm text-gray-500">Compromisos: {cumplimiento}%</p>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                <div className={`h-2 rounded-full ${cumplimiento >= 70 ? 'bg-green-500' : cumplimiento >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${cumplimiento}%` }} />
              </div>
            </div>
          )}
        </div>

        <div className="card p-5 space-y-2">
          {checkin.necesitaAyudaUrgente && (
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-medium">
              <AlertTriangle className="w-5 h-5" />
              Pidió ayuda urgente
            </div>
          )}
          {checkin.detalleAyudaUrgente && (
            <p className="text-sm text-red-600 dark:text-red-300">{checkin.detalleAyudaUrgente}</p>
          )}
          {pulsoChange !== null && pulsoChange <= -2 && (
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm font-medium">
              <TrendingDown className="w-4 h-4" />
              Pulso bajó {Math.abs(pulsoChange)} puntos
            </div>
          )}
          {/* Public link */}
          <div className="flex items-center gap-2 pt-2">
            <button onClick={handleCopyLink} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
              <Copy className="w-3 h-3" />
              {copied ? 'Copiado!' : 'Copiar link'}
            </button>
            <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> Ver formulario
            </a>
          </div>
        </div>
      </div>

      {/* Compromisos */}
      <div className="card">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-white">Compromisos</h2>
          <button onClick={() => setShowAddCompromiso(true)} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
            <Plus className="w-4 h-4" /> Agregar
          </button>
        </div>
        {checkinCompromisos.length === 0 ? (
          <div className="px-5 py-8 text-center text-gray-500 text-sm">Sin compromisos</div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {checkinCompromisos.map(comp => {
              const sCfg = COMPROMISO_STATUS_LABELS[comp.estado as keyof typeof COMPROMISO_STATUS_LABELS];
              const pCfg = PRIORIDAD_LABELS[comp.prioridad as keyof typeof PRIORIDAD_LABELS];
              return (
                <div key={comp.id} className="px-5 py-3 flex items-start gap-3">
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${comp.estado === 'no_cumplido' ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                      {comp.descripcion}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${sCfg?.color || 'bg-gray-100 text-gray-600'}`}>
                        {sCfg?.label || comp.estado}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${pCfg?.color || 'bg-gray-100 text-gray-600'}`}>
                        {pCfg?.label || comp.prioridad}
                      </span>
                      <span className="text-xs text-gray-400">
                        {comp.responsable === 'cliente' ? 'Cliente' : 'Consultor'}
                      </span>
                      {comp.fechaLimite && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(comp.fechaLimite).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                        </span>
                      )}
                    </div>
                    {comp.notas && <p className="text-xs text-gray-500 mt-1">{comp.notas}</p>}
                  </div>
                  <button onClick={() => deleteCompromiso(comp.id)} className="p-1 text-gray-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Respuestas del cliente */}
      {checkin.estado !== 'pendiente' && (
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white">Respuestas del cliente</h2>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {Object.entries(secciones).map(([seccion, preg]) => {
              const secCfg = SECCION_CONFIG[seccion as keyof typeof SECCION_CONFIG];
              return (
                <div key={seccion} className="px-5 py-4">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    {secCfg?.label || seccion}
                  </h3>
                  <div className="space-y-3">
                    {preg.map(p => (
                      <div key={p.id}>
                        <p className="text-xs text-gray-500 mb-1">{p.pregunta}</p>
                        <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                          {p.respuesta || <span className="text-gray-400 italic">Sin respuesta</span>}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Métricas */}
      {checkinMetricas.length > 0 && (
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white">Métricas</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b dark:border-gray-700">
                  <th className="px-5 py-2">Métrica</th>
                  <th className="px-5 py-2">Actual</th>
                  <th className="px-5 py-2">Meta</th>
                  <th className="px-5 py-2">Anterior</th>
                  <th className="px-5 py-2">Tendencia</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {checkinMetricas.map(m => (
                  <tr key={m.id}>
                    <td className="px-5 py-2 font-medium text-gray-900 dark:text-white">{m.nombreMetrica}</td>
                    <td className="px-5 py-2">{m.valorActual ?? '-'}</td>
                    <td className="px-5 py-2 text-gray-500">{m.valorMeta ?? '-'}</td>
                    <td className="px-5 py-2 text-gray-500">{m.valorAnterior ?? '-'}</td>
                    <td className="px-5 py-2">
                      {m.tendencia === 'subio' ? <TrendingUp className="w-4 h-4 text-green-500" /> :
                        m.tendencia === 'bajo' ? <TrendingDown className="w-4 h-4 text-red-500" /> :
                          <Minus className="w-4 h-4 text-gray-400" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Notas del consultor */}
      {(checkin.notasConsultor || checkin.resumenReunion) && (
        <div className="card p-5 space-y-3">
          <h2 className="font-semibold text-gray-900 dark:text-white">Notas de la reunión</h2>
          {checkin.resumenReunion && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Resumen</p>
              <p className="text-sm text-gray-900 dark:text-white">{checkin.resumenReunion}</p>
            </div>
          )}
          {checkin.notasConsultor && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Notas</p>
              <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{checkin.notasConsultor}</p>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Link
          to={`/checkins/history/${checkin.proyectoId}`}
          className="btn-secondary flex items-center gap-2"
        >
          <BarChart3 className="w-4 h-4" /> Historial
        </Link>
        {checkin.estado === 'completado_cliente' && (
          <button onClick={handleStartReunion} className="btn-secondary flex items-center gap-2">
            <MessageSquare className="w-4 h-4" /> Iniciar reunión
          </button>
        )}
        {(checkin.estado === 'en_reunion' || checkin.estado === 'completado_cliente') && (
          <button onClick={() => setShowClose(true)} className="btn-primary flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Cerrar check-in
          </button>
        )}
      </div>

      {/* Close Modal */}
      <Modal open={showClose} onClose={() => setShowClose(false)} title="Cerrar Check-in">
        <div className="space-y-4">
          <div>
            <label className="label">Resumen de la reunión</label>
            <textarea
              className="input"
              rows={2}
              value={closeForm.resumenReunion}
              onChange={e => setCloseForm(f => ({ ...f, resumenReunion: e.target.value }))}
              placeholder="2-3 líneas resumiendo lo discutido..."
            />
          </div>
          <div>
            <label className="label">Notas detalladas</label>
            <textarea
              className="input"
              rows={4}
              value={closeForm.notasConsultor}
              onChange={e => setCloseForm(f => ({ ...f, notasConsultor: e.target.value }))}
              placeholder="Notas internas sobre la reunión..."
            />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowClose(false)} className="btn-secondary">Cancelar</button>
            <button onClick={handleClose} disabled={saving} className="btn-primary flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Cerrar check-in
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Compromiso Modal */}
      <Modal open={showAddCompromiso} onClose={() => setShowAddCompromiso(false)} title="Nuevo compromiso">
        <div className="space-y-4">
          <div>
            <label className="label">Descripción *</label>
            <input
              type="text"
              className="input"
              value={compromisoForm.descripcion}
              onChange={e => setCompromisoForm(f => ({ ...f, descripcion: e.target.value }))}
              placeholder="¿Qué se comprometió a hacer?"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Responsable</label>
              <select
                className="select"
                value={compromisoForm.responsable}
                onChange={e => setCompromisoForm(f => ({ ...f, responsable: e.target.value as CompromisoResponsable }))}
              >
                <option value="cliente">Cliente</option>
                <option value="consultor">Consultor</option>
              </select>
            </div>
            <div>
              <label className="label">Prioridad</label>
              <select
                className="select"
                value={compromisoForm.prioridad}
                onChange={e => setCompromisoForm(f => ({ ...f, prioridad: e.target.value as CompromisoPrioridad }))}
              >
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Fecha límite</label>
            <input
              type="date"
              className="input"
              value={compromisoForm.fechaLimite}
              onChange={e => setCompromisoForm(f => ({ ...f, fechaLimite: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowAddCompromiso(false)} className="btn-secondary">Cancelar</button>
            <button
              onClick={handleAddCompromiso}
              disabled={saving || !compromisoForm.descripcion.trim()}
              className="btn-primary flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Agregar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
