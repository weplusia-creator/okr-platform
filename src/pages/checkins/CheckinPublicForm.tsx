import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, CheckCircle2, AlertTriangle, ChevronRight, ChevronLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { CheckinEmoji, CompromisoStatus } from '../../types/checkin';
import { EMOJI_CONFIG, CHECKIN_STATUS_LABELS, COMPROMISO_STATUS_LABELS } from '../../types/checkin';

interface PublicCheckin {
  id: string;
  token: string;
  numero: number;
  periodo: string | null;
  estado: string;
  pulso_score: number | null;
  nps_score: number | null;
  emoji: string | null;
  project: { name: string } | null;
}

interface PublicPregunta {
  id: string;
  seccion: string;
  pregunta: string;
  respuesta: string | null;
  orden: number;
}

interface PublicCompromiso {
  id: string;
  descripcion: string;
  responsable: string;
  estado: string;
  notas: string | null;
}

const SECCIONES = [
  { key: 'pulso', label: 'Pulso', tiempo: '30 seg' },
  { key: 'compromisos', label: 'Compromisos anteriores', tiempo: '1 min' },
  { key: 'avances', label: 'Avances', tiempo: '1 min' },
  { key: 'problemas', label: 'Problemas y bloqueos', tiempo: '1 min' },
  { key: 'proxima_semana', label: 'Próxima semana', tiempo: '1 min' },
  { key: 'feedback', label: 'Feedback', tiempo: '30 seg' },
];

export function CheckinPublicForm() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkin, setCheckin] = useState<PublicCheckin | null>(null);
  const [preguntas, setPreguntas] = useState<PublicPregunta[]>([]);
  const [compromisos, setCompromisos] = useState<PublicCompromiso[]>([]);
  const [currentStep, setCurrentStep] = useState(0);

  // Form state
  const [emoji, setEmoji] = useState<CheckinEmoji | null>(null);
  const [pulsoScore, setPulsoScore] = useState(7);
  const [palabraClave, setPalabraClave] = useState('');
  const [npsScore, setNpsScore] = useState(7);
  const [necesitaAyuda, setNecesitaAyuda] = useState(false);
  const [detalleAyuda, setDetalleAyuda] = useState('');
  const [respuestas, setRespuestas] = useState<Record<string, string>>({});
  const [compromisosUpdate, setCompromisosUpdate] = useState<Record<string, { estado: CompromisoStatus; notas: string }>>({});

  const loadCheckin = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const { data: checkinData, error: err } = await supabase
        .from('checkins')
        .select('id, token, numero, periodo, estado, pulso_score, nps_score, emoji, project:projects(name)')
        .eq('token', token)
        .single();

      if (err || !checkinData) {
        setError('Check-in no encontrado o el link expiró.');
        return;
      }

      if (checkinData.estado === 'completado_cliente' || checkinData.estado === 'en_reunion' || checkinData.estado === 'cerrado') {
        setSubmitted(true);
        setCheckin(checkinData);
        return;
      }

      setCheckin(checkinData);

      const { data: preguntasData } = await supabase
        .from('checkin_preguntas')
        .select('id, seccion, pregunta, respuesta, orden')
        .eq('checkin_id', checkinData.id)
        .order('orden');

      setPreguntas(preguntasData || []);

      const { data: compromisosData } = await supabase
        .from('checkin_compromisos')
        .select('id, descripcion, responsable, estado, notas')
        .eq('checkin_id', checkinData.id);

      setCompromisos(compromisosData || []);

      // Initialize compromiso updates
      const updates: Record<string, { estado: CompromisoStatus; notas: string }> = {};
      (compromisosData || []).forEach(c => {
        updates[c.id] = { estado: c.estado as CompromisoStatus, notas: c.notas || '' };
      });
      setCompromisosUpdate(updates);
    } catch {
      setError('Error al cargar el check-in.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadCheckin(); }, [loadCheckin]);

  const handleSubmit = async () => {
    if (!checkin) return;
    setSubmitting(true);
    try {
      // Update checkin main fields
      await supabase
        .from('checkins')
        .update({
          pulso_score: pulsoScore,
          nps_score: npsScore,
          emoji,
          palabra_clave: palabraClave || null,
          necesita_ayuda_urgente: necesitaAyuda,
          detalle_ayuda_urgente: necesitaAyuda ? detalleAyuda : null,
          estado: 'completado_cliente',
          fecha_completado_cliente: new Date().toISOString(),
        })
        .eq('token', token);

      // Update preguntas with responses
      for (const p of preguntas) {
        if (respuestas[p.id] !== undefined) {
          await supabase
            .from('checkin_preguntas')
            .update({ respuesta: respuestas[p.id] })
            .eq('id', p.id);
        }
      }

      // Update compromisos
      for (const [compId, update] of Object.entries(compromisosUpdate)) {
        await supabase
          .from('checkin_compromisos')
          .update({ estado: update.estado, notas: update.notas || null })
          .eq('id', compId);
      }

      setSubmitted(true);
    } catch {
      setError('Error al enviar. Intentá de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  // Determine which sections have content
  const activeSecciones = SECCIONES.filter(s => {
    if (s.key === 'compromisos') return compromisos.length > 0;
    if (s.key === 'pulso') return true; // Always show pulso
    return preguntas.some(p => p.seccion === s.key);
  });

  const totalSteps = activeSecciones.length;
  const currentSeccion = activeSecciones[currentStep];
  const seccionPreguntas = preguntas.filter(p => p.seccion === currentSeccion?.key);
  const progress = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">¡Gracias!</h1>
          <p className="text-gray-600 text-lg">
            Tu consultor va a revisar tus respuestas antes de la reunión.
          </p>
          {checkin?.project && (
            <p className="text-sm text-gray-500 mt-4">
              Check-in #{checkin.numero} — {checkin.project.name}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="font-bold text-gray-900">
                Check-in #{checkin?.numero}
              </h1>
              {checkin?.project && (
                <p className="text-sm text-gray-500">{checkin.project.name}</p>
              )}
            </div>
            <span className="text-xs text-gray-400">
              ~5 min
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-gray-400">
              {currentStep + 1} de {totalSteps}
            </span>
            <span className="text-xs text-gray-400">
              {currentSeccion?.label}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* PULSO */}
        {currentSeccion?.key === 'pulso' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                ¿Cómo te sentís con el proyecto?
              </h2>
              <div className="flex justify-center gap-6">
                {(Object.entries(EMOJI_CONFIG) as [CheckinEmoji, { emoji: string; label: string }][]).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => setEmoji(key)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all ${
                      emoji === key
                        ? 'bg-blue-50 ring-2 ring-blue-500 scale-110'
                        : 'bg-white hover:bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <span className="text-5xl">{cfg.emoji}</span>
                    <span className="text-sm font-medium text-gray-700">{cfg.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                ¿Del 1 al 10, qué tan satisfecho estás esta semana?
              </h2>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-400 w-4">1</span>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={pulsoScore}
                  onChange={e => setPulsoScore(parseInt(e.target.value))}
                  className="flex-1 h-3 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <span className="text-sm text-gray-400 w-6">10</span>
              </div>
              <div className="text-center mt-2">
                <span className={`text-3xl font-bold ${
                  pulsoScore >= 8 ? 'text-green-600' : pulsoScore >= 5 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {pulsoScore}
                </span>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Una palabra que describa tu semana:
              </h2>
              <input
                type="text"
                value={palabraClave}
                onChange={e => setPalabraClave(e.target.value)}
                placeholder="Ej: productiva, caótica, tranquila..."
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                maxLength={50}
              />
            </div>
          </div>
        )}

        {/* COMPROMISOS ANTERIORES */}
        {currentSeccion?.key === 'compromisos' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Compromisos del check-in anterior
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Marcá el estado de cada compromiso
            </p>
            {compromisos.map(comp => (
              <div key={comp.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                <p className="font-medium text-gray-900">{comp.descripcion}</p>
                <div className="flex gap-2 flex-wrap">
                  {(['completado', 'en_progreso', 'no_cumplido'] as CompromisoStatus[]).map(status => {
                    const label = status === 'completado' ? '✅ Cumplido' : status === 'en_progreso' ? '🔄 En progreso' : '❌ No pude';
                    const isSelected = compromisosUpdate[comp.id]?.estado === status;
                    return (
                      <button
                        key={status}
                        onClick={() => setCompromisosUpdate(prev => ({
                          ...prev,
                          [comp.id]: { ...prev[comp.id], estado: status },
                        }))}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          isSelected
                            ? status === 'completado' ? 'bg-green-100 text-green-800 ring-2 ring-green-500'
                            : status === 'en_progreso' ? 'bg-blue-100 text-blue-800 ring-2 ring-blue-500'
                            : 'bg-red-100 text-red-800 ring-2 ring-red-500'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  placeholder="Comentario (opcional)"
                  value={compromisosUpdate[comp.id]?.notas || ''}
                  onChange={e => setCompromisosUpdate(prev => ({
                    ...prev,
                    [comp.id]: { ...prev[comp.id], notas: e.target.value },
                  }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                />
              </div>
            ))}
          </div>
        )}

        {/* GENERIC SECTIONS (avances, problemas, proxima_semana, feedback) */}
        {currentSeccion && !['pulso', 'compromisos'].includes(currentSeccion.key) && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">
              {currentSeccion.label}
            </h2>
            {seccionPreguntas.map(p => (
              <div key={p.id}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {p.pregunta}
                </label>
                {/* Detect if this is a si_no question */}
                {p.pregunta.toLowerCase().includes('(1-10)') || p.pregunta.toLowerCase().includes('1 al 10') ? (
                  <div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-400 w-4">1</span>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={p.seccion === 'feedback' ? npsScore : parseInt(respuestas[p.id] || '7')}
                        onChange={e => {
                          if (p.seccion === 'feedback' && p.pregunta.toLowerCase().includes('recomendarías')) {
                            setNpsScore(parseInt(e.target.value));
                          }
                          setRespuestas(prev => ({ ...prev, [p.id]: e.target.value }));
                        }}
                        className="flex-1 h-3 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                      <span className="text-sm text-gray-400 w-6">10</span>
                    </div>
                    <div className="text-center mt-1">
                      <span className="text-2xl font-bold text-blue-600">
                        {p.seccion === 'feedback' && p.pregunta.toLowerCase().includes('recomendarías') ? npsScore : respuestas[p.id] || '7'}
                      </span>
                    </div>
                  </div>
                ) : p.pregunta.toLowerCase().includes('ayuda urgente') || p.pregunta.includes('?') && (p.pregunta.toLowerCase().includes('sí/no') || p.pregunta.toLowerCase().startsWith('¿necesitás')) ? (
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setNecesitaAyuda(true);
                          setRespuestas(prev => ({ ...prev, [p.id]: 'Sí' }));
                        }}
                        className={`flex-1 py-3 rounded-xl font-medium text-center transition-all ${
                          necesitaAyuda ? 'bg-red-100 text-red-800 ring-2 ring-red-500' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Sí
                      </button>
                      <button
                        onClick={() => {
                          setNecesitaAyuda(false);
                          setDetalleAyuda('');
                          setRespuestas(prev => ({ ...prev, [p.id]: 'No' }));
                        }}
                        className={`flex-1 py-3 rounded-xl font-medium text-center transition-all ${
                          !necesitaAyuda && respuestas[p.id] === 'No' ? 'bg-green-100 text-green-800 ring-2 ring-green-500' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        No
                      </button>
                    </div>
                    {necesitaAyuda && (
                      <textarea
                        value={detalleAyuda}
                        onChange={e => setDetalleAyuda(e.target.value)}
                        placeholder="Contanos con qué necesitás ayuda..."
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                      />
                    )}
                  </div>
                ) : (
                  <textarea
                    value={respuestas[p.id] || ''}
                    onChange={e => setRespuestas(prev => ({ ...prev, [p.id]: e.target.value }))}
                    placeholder="Escribí tu respuesta..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
        <div className="max-w-lg mx-auto flex gap-3">
          {currentStep > 0 && (
            <button
              onClick={() => setCurrentStep(s => s - 1)}
              className="flex items-center gap-2 px-6 py-3 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
            >
              <ChevronLeft className="w-5 h-5" />
              Anterior
            </button>
          )}
          {currentStep < totalSteps - 1 ? (
            <button
              onClick={() => setCurrentStep(s => s + 1)}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700"
            >
              Siguiente
              <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting || !emoji}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar Check-in ✓'
              )}
            </button>
          )}
        </div>
      </div>

      {/* Bottom spacer for fixed nav */}
      <div className="h-24" />
    </div>
  );
}
