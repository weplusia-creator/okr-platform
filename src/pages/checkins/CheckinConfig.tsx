import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Plus, Copy, ExternalLink, Trash2 } from 'lucide-react';
import { useCheckin } from '../../context/CheckinContext';
import { useProjects } from '../../context/ProjectContext';
import { useFinance } from '../../context/FinanceContext';
import { FRECUENCIA_LABELS, DIA_LABELS } from '../../types/checkin';
import type { CheckinFrecuencia, DiaSemana, MetricaConfigItem } from '../../types/checkin';

export function CheckinConfigPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { configs, plantillas, fetchConfigs, fetchPlantillas, addConfig, updateConfig, addCheckin, addMetrica: addCheckinMetrica, checkins } = useCheckin();
  const { projects } = useProjects();
  const { clients } = useFinance();

  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);

  const project = projects.find(p => p.id === projectId);
  const config = configs.find(c => c.proyectoId === projectId);
  const projectCheckins = checkins.filter(c => c.proyectoId === projectId).sort((a, b) => b.numero - a.numero);

  const [form, setForm] = useState({
    clienteId: '',
    frecuencia: 'semanal' as CheckinFrecuencia,
    diaPreferido: 'lunes' as DiaSemana,
    horaEnvio: '09:00',
    activo: true,
    plantillaId: '',
    metricasConfig: [] as MetricaConfigItem[],
  });

  useEffect(() => {
    fetchConfigs();
    fetchPlantillas();
  }, [fetchConfigs, fetchPlantillas]);

  useEffect(() => {
    if (config) {
      setForm({
        clienteId: config.clienteId || '',
        frecuencia: config.frecuencia as CheckinFrecuencia,
        diaPreferido: config.diaPreferido as DiaSemana,
        horaEnvio: config.horaEnvio,
        activo: config.activo,
        plantillaId: config.plantillaId || '',
        metricasConfig: config.metricasConfig || [],
      });
    } else if (project?.clientId) {
      setForm(f => ({ ...f, clienteId: project.clientId || '' }));
    }
  }, [config, project]);

  const handleSave = async () => {
    if (!projectId) return;
    setSaving(true);
    try {
      if (config) {
        await updateConfig(config.id, {
          clienteId: form.clienteId || null,
          frecuencia: form.frecuencia,
          diaPreferido: form.diaPreferido,
          horaEnvio: form.horaEnvio,
          activo: form.activo,
          plantillaId: form.plantillaId || null,
          metricasConfig: form.metricasConfig,
        });
      } else {
        await addConfig({
          proyectoId: projectId,
          clienteId: form.clienteId || null,
          frecuencia: form.frecuencia,
          diaPreferido: form.diaPreferido,
          horaEnvio: form.horaEnvio,
          activo: form.activo,
          plantillaId: form.plantillaId || null,
          metricasConfig: form.metricasConfig,
          creadoPor: null,
        });
      }
      await fetchConfigs();
    } catch (err: any) {
      alert('Error al guardar config: ' + (err?.message || 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCheckin = async () => {
    if (!projectId || !config) {
      alert('Primero guardá la configuración del check-in.');
      return;
    }
    setCreating(true);
    try {
      const nextNumero = projectCheckins.length > 0 ? projectCheckins[0].numero + 1 : 1;
      const now = new Date();
      const endOfWeek = new Date(now);
      endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
      const periodo = `Semana del ${now.getDate()} al ${endOfWeek.getDate()} de ${now.toLocaleDateString('es-AR', { month: 'long' })}`;

      const checkin = await addCheckin({
        configId: config.id,
        proyectoId: projectId,
        clienteId: config.clienteId,
        numero: nextNumero,
        periodo,
        estado: 'pendiente',
        fechaEnvio: new Date().toISOString(),
        fechaCompletadoCliente: null,
        fechaReunion: null,
        fechaCierre: null,
        pulsoScore: null,
        npsScore: null,
        emoji: null,
        palabraClave: null,
        necesitaAyudaUrgente: false,
        detalleAyudaUrgente: null,
        notasConsultor: null,
        resumenReunion: null,
        creadoPor: null,
      });

      if (checkin) {
        // Crear métricas del config en el nuevo check-in
        if (config.metricasConfig && config.metricasConfig.length > 0) {
          for (const metrica of config.metricasConfig) {
            try {
              await addCheckinMetrica({
                checkinId: checkin.id,
                nombreMetrica: metrica.nombre,
                unidad: metrica.unidad || 'numero',
                valorMeta: metrica.meta ?? null,
                valorActual: null,
                valorAnterior: null,
                tendencia: 'igual',
              });
            } catch (metErr) {
              console.error('Error creating metric:', metErr);
            }
          }
        }
        navigate(`/checkins/${checkin.id}`);
      }
    } catch (err: any) {
      alert('Error al crear check-in: ' + (err?.message || 'Error desconocido'));
    } finally {
      setCreating(false);
    }
  };

  const addMetrica = () => {
    setForm(f => ({
      ...f,
      metricasConfig: [...f.metricasConfig, { nombre: '', unidad: 'numero', meta: null }],
    }));
  };

  const removeMetrica = (idx: number) => {
    setForm(f => ({
      ...f,
      metricasConfig: f.metricasConfig.filter((_, i) => i !== idx),
    }));
  };

  const updateMetrica = (idx: number, field: string, value: any) => {
    setForm(f => ({
      ...f,
      metricasConfig: f.metricasConfig.map((m, i) => i === idx ? { ...m, [field]: value } : m),
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Configurar Check-in
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{project?.name}</p>
        </div>
        {config && (
          <button
            onClick={handleCreateCheckin}
            disabled={creating}
            className="btn-primary flex items-center gap-2"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Crear check-in
          </button>
        )}
      </div>

      {/* Config form */}
      <div className="card p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="label">Cliente</label>
            <select
              className="select"
              value={form.clienteId}
              onChange={e => setForm(f => ({ ...f, clienteId: e.target.value }))}
            >
              <option value="">Sin cliente asignado</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Plantilla de preguntas</label>
            <select
              className="select"
              value={form.plantillaId}
              onChange={e => setForm(f => ({ ...f, plantillaId: e.target.value }))}
            >
              <option value="">Estándar (por defecto)</option>
              {plantillas.map(p => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Frecuencia</label>
            <select
              className="select"
              value={form.frecuencia}
              onChange={e => setForm(f => ({ ...f, frecuencia: e.target.value as CheckinFrecuencia }))}
            >
              {Object.entries(FRECUENCIA_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Día preferido</label>
            <select
              className="select"
              value={form.diaPreferido}
              onChange={e => setForm(f => ({ ...f, diaPreferido: e.target.value as DiaSemana }))}
            >
              {Object.entries(DIA_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Hora de envío</label>
            <input
              type="time"
              className="input"
              value={form.horaEnvio}
              onChange={e => setForm(f => ({ ...f, horaEnvio: e.target.value }))}
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="label mb-0">Activo</label>
            <button
              onClick={() => setForm(f => ({ ...f, activo: !f.activo }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.activo ? 'bg-blue-600' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.activo ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        {/* Métricas */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="label mb-0">Métricas a trackear</label>
            <button onClick={addMetrica} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
              <Plus className="w-4 h-4" /> Agregar métrica
            </button>
          </div>
          {form.metricasConfig.length === 0 ? (
            <p className="text-sm text-gray-400">Sin métricas configuradas</p>
          ) : (
            <div className="space-y-2">
              {form.metricasConfig.map((m, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <input
                    type="text"
                    className="input flex-1"
                    placeholder="Nombre (ej: Facturación mensual)"
                    value={m.nombre}
                    onChange={e => updateMetrica(idx, 'nombre', e.target.value)}
                  />
                  <select
                    className="select w-32"
                    value={m.unidad}
                    onChange={e => updateMetrica(idx, 'unidad', e.target.value)}
                  >
                    <option value="numero">Número</option>
                    <option value="porcentaje">%</option>
                    <option value="moneda">$</option>
                  </select>
                  <input
                    type="number"
                    className="input w-24"
                    placeholder="Meta"
                    value={m.meta ?? ''}
                    onChange={e => updateMetrica(idx, 'meta', e.target.value ? parseFloat(e.target.value) : null)}
                  />
                  <button onClick={() => removeMetrica(idx)} className="p-1 text-gray-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Save */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={() => navigate(-1)} className="btn-secondary">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {config ? 'Guardar cambios' : 'Activar check-ins'}
          </button>
        </div>
      </div>

      {/* Recent checkins */}
      {projectCheckins.length > 0 && (
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white">Check-ins recientes</h2>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {projectCheckins.slice(0, 10).map(ci => (
              <div
                key={ci.id}
                onClick={() => navigate(`/checkins/${ci.id}`)}
                className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
              >
                <span className="text-sm font-medium text-gray-900 dark:text-white">#{ci.numero}</span>
                <span className="text-sm text-gray-500 flex-1">{ci.periodo || ''}</span>
                <span className="text-sm font-bold">{ci.pulsoScore ?? '-'}/10</span>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(`${window.location.origin}/checkin/${ci.token}`);
                  }}
                  className="p-1 text-gray-400 hover:text-blue-600"
                  title="Copiar link público"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
