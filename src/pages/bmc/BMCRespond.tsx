import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Circle, ChevronRight, Send, Star } from 'lucide-react';
import { useBMC } from '../../context/BMCContext';
import { useAuth } from '../../context/AuthContext';
import { BMC_BLOCK_CONFIG, BMC_CANVAS_STATUS_LABELS } from '../../types/bmc';
import type { BmcBlock, BmcBlockType } from '../../types/bmc';

export function BMCRespond() {
  const { canvasId } = useParams<{ canvasId: string }>();
  const { appUser } = useAuth();
  const {
    canvases, fetchCanvases,
    blocks, fetchBlocks,
    questions, fetchQuestions,
    participants, fetchParticipants, updateParticipantStatus,
    responses, fetchResponses, saveResponse,
    votes, fetchVotes, castVote,
  } = useBMC();

  const [selectedBlock, setSelectedBlock] = useState<BmcBlock | null>(null);
  const [localResponses, setLocalResponses] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const canvas = canvases.find(c => c.id === canvasId);

  // Find current user's participant record
  const myParticipant = useMemo(() => {
    if (!appUser?.id) return null;
    return participants.find(p => p.userId === appUser.id);
  }, [participants, appUser?.id]);

  useEffect(() => {
    if (canvasId) {
      fetchCanvases();
      fetchBlocks(canvasId);
      fetchParticipants(canvasId);
      fetchResponses(canvasId);
      fetchVotes(canvasId);
    }
  }, [canvasId, fetchCanvases, fetchBlocks, fetchParticipants, fetchResponses, fetchVotes]);

  useEffect(() => {
    for (const block of blocks) {
      fetchQuestions(block.id);
    }
  }, [blocks, fetchQuestions]);

  // Initialize local responses from existing
  useEffect(() => {
    if (myParticipant) {
      const map: Record<string, string> = {};
      for (const r of responses) {
        if (r.participantId === myParticipant.id) {
          map[r.questionId] = r.response;
        }
      }
      setLocalResponses(map);

      // Mark as active if still invited
      if (myParticipant.status === 'invited') {
        updateParticipantStatus(myParticipant.id, 'active');
      }
    }
  }, [myParticipant, responses]);

  const blockQuestions = useMemo(() => {
    const map: Record<string, typeof questions> = {};
    for (const q of questions) {
      if (!map[q.blockId]) map[q.blockId] = [];
      map[q.blockId].push(q);
    }
    return map;
  }, [questions]);

  // Progress
  const totalQuestions = questions.length;
  const answeredQuestions = Object.keys(localResponses).filter(k => localResponses[k]?.trim()).length;
  const progressPercent = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

  const handleSaveBlock = async () => {
    if (!canvasId || !selectedBlock) return;
    if (!myParticipant) {
      alert('No se encontró tu registro de participante. Intentá recargar la página.');
      return;
    }
    setSaving(true);
    setSaved(false);
    try {
      const bQuestions = blockQuestions[selectedBlock.id] || [];
      for (const q of bQuestions) {
        const response = localResponses[q.id];
        if (response?.trim()) {
          await saveResponse({
            canvasId,
            blockId: selectedBlock.id,
            questionId: q.id,
            participantId: myParticipant.id,
            response: response.trim(),
            isAnonymous: canvas?.anonymousResponses ?? false,
          });
        }
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleFinalize = async () => {
    if (!myParticipant) return;
    // Save all pending
    if (selectedBlock) await handleSaveBlock();
    await updateParticipantStatus(myParticipant.id, 'completed');
  };

  // Show other responses after responding
  const canSeeOthers = canvas?.showOthersResponses === 'yes' ||
    (canvas?.showOthersResponses === 'after' && myParticipant?.status === 'completed');

  if (!canvas) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Canvas no encontrado</p>
        <Link to="/bmc" className="text-primary-600 hover:underline mt-2 inline-block">Volver</Link>
      </div>
    );
  }

  if (!myParticipant) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">No sos participante de este canvas</p>
        <Link to="/bmc" className="text-primary-600 hover:underline mt-2 inline-block">Volver</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <Link to="/bmc" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 mb-2">
          <ArrowLeft className="w-4 h-4" /> Volver
        </Link>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{canvas.name}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Respondé las preguntas de cada bloque del Business Model Canvas</p>
      </div>

      {/* Progress */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-700 dark:text-gray-300 font-medium">Progreso</span>
          <span className="text-gray-500">{answeredQuestions}/{totalQuestions} preguntas — {progressPercent}%</span>
        </div>
        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
        </div>
        {myParticipant.status === 'completed' && (
          <p className="text-xs text-green-600 dark:text-green-400 mt-2 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" /> Respuestas finalizadas
          </p>
        )}
      </div>

      {/* Block selection */}
      {!selectedBlock ? (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Seleccioná un bloque para responder:</h2>
          {blocks.map(block => {
            const cfg = BMC_BLOCK_CONFIG[block.type as BmcBlockType];
            if (!cfg) return null;
            const bqs = blockQuestions[block.id] || [];
            const answered = bqs.filter(q => localResponses[q.id]?.trim()).length;
            const complete = bqs.length > 0 && answered === bqs.length;

            return (
              <button
                key={block.id}
                onClick={() => setSelectedBlock(block)}
                className="w-full flex items-center gap-3 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow text-left"
              >
                <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.color }} />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{cfg.name}</h3>
                  <p className="text-xs text-gray-500">{answered}/{bqs.length} respondidas</p>
                </div>
                {complete ? (
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                )}
              </button>
            );
          })}

          {myParticipant.status !== 'completed' && answeredQuestions > 0 && (
            <button onClick={handleFinalize} className="btn-primary w-full mt-4">
              Finalizar mis respuestas
            </button>
          )}
        </div>
      ) : (
        /* Answer questions */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button onClick={() => { handleSaveBlock(); setSelectedBlock(null); }} className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600">
              <ArrowLeft className="w-4 h-4" /> Volver a bloques
            </button>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              {BMC_BLOCK_CONFIG[selectedBlock.type as BmcBlockType]?.name}
            </h2>
          </div>

          {(blockQuestions[selectedBlock.id] || []).map((q, i) => {
            // Other responses for this question
            const otherResponses = canSeeOthers
              ? responses.filter(r => r.questionId === q.id && r.participantId !== myParticipant.id)
              : [];

            return (
              <div key={q.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
                <div className="flex items-start gap-2 mb-3">
                  <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{q.question}</p>
                    {q.helpText && <p className="text-xs text-gray-400 mt-0.5">{q.helpText}</p>}
                  </div>
                </div>

                <textarea
                  className="input"
                  rows={3}
                  value={localResponses[q.id] || ''}
                  onChange={e => setLocalResponses(prev => ({ ...prev, [q.id]: e.target.value }))}
                  placeholder="Tu respuesta..."
                  disabled={myParticipant.status === 'completed'}
                />

                {/* Other responses */}
                {otherResponses.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    <p className="text-[10px] font-semibold text-gray-400">Otras respuestas:</p>
                    {otherResponses.map(r => (
                      <div key={r.id} className="bg-gray-50 dark:bg-gray-700/30 rounded px-2 py-1.5">
                        <p className="text-xs text-gray-600 dark:text-gray-400">{r.response}</p>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-[10px] text-gray-400">{r.isAnonymous ? 'Anónimo' : r.participantName}</span>
                          {canvas.allowVoting && myParticipant && (
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map(v => (
                                <button
                                  key={v}
                                  onClick={() => castVote(r.id, myParticipant.id, v)}
                                  className="text-gray-300 hover:text-amber-400 transition-colors"
                                >
                                  <Star className={`w-3 h-3 ${
                                    (votes.find(vt => vt.responseId === r.id && vt.participantId === myParticipant.id)?.value || 0) >= v
                                      ? 'fill-amber-400 text-amber-400'
                                      : ''
                                  }`} />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <div className="flex justify-between">
            <button onClick={() => { handleSaveBlock(); setSelectedBlock(null); }} className="btn-secondary">
              Guardar y volver
            </button>
            <button onClick={handleSaveBlock} disabled={saving} className={`flex items-center gap-2 disabled:opacity-50 ${saved ? 'btn-secondary text-green-600' : 'btn-primary'}`}>
              {saved ? <><CheckCircle className="w-4 h-4" /> Guardado</> : <><Send className="w-4 h-4" /> {saving ? 'Guardando...' : 'Guardar respuestas'}</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
