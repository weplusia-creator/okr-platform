import { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Users, Plus, Trash2, CheckCircle, Eye, Lock, Unlock,
  ChevronDown, ChevronRight, Star, Send, Download, ClipboardCopy, MessageSquare,
} from 'lucide-react';
import { useBMC } from '../../context/BMCContext';
import { useProjects } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/Modal';
import {
  BMC_BLOCK_CONFIG, BMC_CANVAS_STATUS_LABELS, BMC_CANVAS_TYPE_LABELS,
} from '../../types/bmc';
import type { BmcBlockType, BmcBlock, BmcCanvasStatus } from '../../types/bmc';

export function BMCCanvasView() {
  const { canvasId } = useParams<{ canvasId: string }>();
  const navigate = useNavigate();
  const { appUser, orgUsers } = useAuth();
  const { projects } = useProjects();
  const {
    canvases, fetchCanvases, updateCanvas, deleteCanvas,
    blocks, fetchBlocks, consolidateBlock,
    questions, fetchQuestions,
    participants, fetchParticipants, addParticipant, removeParticipant,
    responses, fetchResponses,
    votes, fetchVotes, castVote,
  } = useBMC();

  const [selectedBlock, setSelectedBlock] = useState<BmcBlock | null>(null);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showConsolidate, setShowConsolidate] = useState(false);
  const [consolidateText, setConsolidateText] = useState('');
  const [addUserEmail, setAddUserEmail] = useState('');
  const [addUserName, setAddUserName] = useState('');
  const [addUserId, setAddUserId] = useState('');
  const [saving, setSaving] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const canvas = canvases.find(c => c.id === canvasId);
  const project = canvas ? projects.find(p => p.id === canvas.projectId) : null;

  useEffect(() => {
    if (canvasId) {
      fetchCanvases();
      fetchBlocks(canvasId);
      fetchParticipants(canvasId);
      fetchResponses(canvasId);
      fetchVotes(canvasId);
    }
  }, [canvasId, fetchCanvases, fetchBlocks, fetchParticipants, fetchResponses, fetchVotes]);

  // Load questions for all blocks
  useEffect(() => {
    for (const block of blocks) {
      fetchQuestions(block.id);
    }
  }, [blocks, fetchQuestions]);

  const blockQuestions = useMemo(() => {
    const map: Record<string, typeof questions> = {};
    for (const q of questions) {
      if (!map[q.blockId]) map[q.blockId] = [];
      map[q.blockId].push(q);
    }
    return map;
  }, [questions]);

  const blockResponses = useMemo(() => {
    const map: Record<string, typeof responses> = {};
    for (const r of responses) {
      if (!map[r.blockId]) map[r.blockId] = [];
      map[r.blockId].push(r);
    }
    return map;
  }, [responses]);

  const handleAddParticipant = async () => {
    if (!canvasId) return;
    setSaving(true);
    try {
      if (addUserId) {
        const user = orgUsers.find(u => u.id === addUserId);
        await addParticipant(canvasId, { userId: addUserId, name: user?.fullName || user?.email || undefined });
      } else if (addUserEmail.trim()) {
        await addParticipant(canvasId, { email: addUserEmail.trim(), name: addUserName.trim() || undefined });
      }
      setAddUserId('');
      setAddUserEmail('');
      setAddUserName('');
    } finally {
      setSaving(false);
    }
  };

  const handleConsolidate = async () => {
    if (!selectedBlock || !consolidateText.trim()) return;
    await consolidateBlock(selectedBlock.id, consolidateText.trim());
    setShowConsolidate(false);
    setConsolidateText('');
  };

  const handleStatusChange = async (status: BmcCanvasStatus) => {
    if (!canvasId) return;
    await updateCanvas(canvasId, { status });
  };

  const handleGoRespond = async () => {
    if (!canvasId || !appUser?.id) return;
    // Auto-add as participant if not already
    const isParticipant = participants.some(p => p.userId === appUser.id);
    if (!isParticipant) {
      await addParticipant(canvasId, { userId: appUser.id, name: appUser.fullName || appUser.email || undefined });
    }
    navigate(`/bmc/${canvasId}/respond`);
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/bmc/${canvasId}/respond`;
    navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  if (!canvas) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Canvas no encontrado</p>
        <Link to="/bmc" className="text-primary-600 hover:underline mt-2 inline-block">Volver</Link>
      </div>
    );
  }

  const statusCfg = BMC_CANVAS_STATUS_LABELS[canvas.status];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link to="/bmc" className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{canvas.name}</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {project?.clientName || project?.name} — v{canvas.version} — {BMC_CANVAS_TYPE_LABELS[canvas.type]}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-xl">
              El Business Model Canvas es una herramienta estratégica que permite visualizar los 9 componentes clave de un modelo de negocio. Sirve para diagnosticar, diseñar y comunicar cómo una empresa crea, entrega y captura valor.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="select text-xs"
            value={canvas.status}
            onChange={e => handleStatusChange(e.target.value as BmcCanvasStatus)}
          >
            {Object.entries(BMC_CANVAS_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <button onClick={() => setShowParticipants(true)} className="btn-secondary btn-sm flex items-center gap-1">
            <Users className="w-3.5 h-3.5" /> Participantes ({participants.length})
          </button>
          <button onClick={handleCopyLink} className="btn-secondary btn-sm flex items-center gap-1">
            <ClipboardCopy className="w-3.5 h-3.5" /> {linkCopied ? 'Copiado!' : 'Copiar link'}
          </button>
          <button onClick={handleGoRespond} className="btn-primary btn-sm flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5" /> Responder
          </button>
        </div>
      </div>

      {/* Canvas Grid - BMC Layout */}
      <div className="grid grid-cols-5 grid-rows-3 gap-2 min-h-[500px]">
        {Object.entries(BMC_BLOCK_CONFIG).map(([type, cfg]) => {
          const block = blocks.find(b => b.type === type);
          if (!block) return null;

          const bQuestions = blockQuestions[block.id] || [];
          const bResponses = blockResponses[block.id] || [];
          const isConsolidated = !!block.consolidatedResponse;
          const responseCount = bResponses.length;
          const uniqueParticipants = new Set(bResponses.map(r => r.participantId)).size;

          return (
            <div
              key={type}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow bg-white dark:bg-gray-800 flex flex-col"
              style={{ gridArea: cfg.gridArea, borderTopColor: cfg.color, borderTopWidth: '3px' }}
              onClick={() => setSelectedBlock(block)}
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs font-semibold text-gray-900 dark:text-white">{cfg.name}</h3>
                {isConsolidated && <CheckCircle className="w-3.5 h-3.5 text-green-500" />}
              </div>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-2">{cfg.description}</p>

              {block.consolidatedResponse ? (
                <p className="text-xs text-gray-700 dark:text-gray-300 flex-1 line-clamp-4">
                  {block.consolidatedResponse}
                </p>
              ) : (
                <div className="flex-1 flex items-end">
                  <div className="text-[10px] text-gray-400">
                    {bQuestions.length} preguntas · {responseCount} respuestas · {uniqueParticipants} participantes
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Block detail - responses + consolidation */}
      {selectedBlock && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: BMC_BLOCK_CONFIG[selectedBlock.type as BmcBlockType]?.color }} />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {BMC_BLOCK_CONFIG[selectedBlock.type as BmcBlockType]?.name}
              </h2>
              {selectedBlock.consolidatedResponse && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Consolidado
                </span>
              )}
            </div>
            <button onClick={() => setSelectedBlock(null)} className="btn-ghost btn-sm">Cerrar</button>
          </div>

          {/* Respuestas agrupadas por pregunta */}
          <div className="space-y-6 mb-6">
            {(blockQuestions[selectedBlock.id] || []).map((q, qi) => {
              const qResponses = responses.filter(r => r.questionId === q.id);

              return (
                <div key={q.id} className="border-b border-gray-100 dark:border-gray-700 pb-4 last:border-0">
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">{qi + 1}</span>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">{q.question}</h4>
                      {q.helpText && <p className="text-[11px] text-gray-400 mt-0.5">{q.helpText}</p>}
                    </div>
                  </div>

                  {qResponses.length === 0 ? (
                    <p className="text-xs text-gray-400 italic ml-7">Sin respuestas aún</p>
                  ) : (
                    <div className="space-y-1.5 ml-7">
                      {qResponses.map(r => {
                        const rVotes = votes.filter(v => v.responseId === r.id);
                        const avgVote = rVotes.length > 0 ? (rVotes.reduce((s, v) => s + v.value, 0) / rVotes.length).toFixed(1) : null;
                        const pName = r.isAnonymous ? 'Anónimo' : (r.participantName || participants.find(p => p.id === r.participantId)?.name || '—');

                        return (
                          <div key={r.id} className="bg-gray-50 dark:bg-gray-700/30 rounded-lg px-3 py-2">
                            <p className="text-sm text-gray-700 dark:text-gray-300">{r.response}</p>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-[10px] text-gray-400 font-medium">{pName}</span>
                              {canvas.allowVoting && avgVote && (
                                <span className="text-[10px] text-amber-500 flex items-center gap-0.5">
                                  <Star className="w-3 h-3 fill-amber-400" /> {avgVote}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Consolidación */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-primary-500" /> Respuesta consolidada
            </h3>
            {showConsolidate ? (
              <div className="space-y-3">
                <p className="text-xs text-gray-500">Unificá las respuestas de los participantes en una síntesis para este bloque.</p>
                <textarea
                  className="input"
                  rows={5}
                  value={consolidateText}
                  onChange={e => setConsolidateText(e.target.value)}
                  placeholder="Escribí la respuesta consolidada basándote en las respuestas anteriores..."
                />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowConsolidate(false)} className="btn-secondary btn-sm">Cancelar</button>
                  <button onClick={handleConsolidate} disabled={!consolidateText.trim()} className="btn-primary btn-sm disabled:opacity-50">
                    Guardar consolidación
                  </button>
                </div>
              </div>
            ) : selectedBlock.consolidatedResponse ? (
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-4 whitespace-pre-wrap">
                  {selectedBlock.consolidatedResponse}
                </p>
                <button
                  onClick={() => { setConsolidateText(selectedBlock.consolidatedResponse || ''); setShowConsolidate(true); }}
                  className="btn-secondary btn-sm mt-2"
                >
                  Editar consolidación
                </button>
              </div>
            ) : (
              <div>
                <p className="text-xs text-gray-400 italic mb-2">Este bloque aún no tiene respuesta consolidada.</p>
                <button
                  onClick={() => { setConsolidateText(''); setShowConsolidate(true); }}
                  className="btn-primary btn-sm"
                >
                  Consolidar respuestas
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Participants modal */}
      <Modal isOpen={showParticipants} onClose={() => setShowParticipants(false)} title="Participantes del Canvas">
        <div className="space-y-4">
          {/* Add participant */}
          <div className="space-y-2 pb-4 border-b border-gray-200 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Agregar participante</p>
            <select className="select" value={addUserId} onChange={e => setAddUserId(e.target.value)}>
              <option value="">Usuario de la plataforma...</option>
              {orgUsers.filter(u => u.status === 'active').map(u => (
                <option key={u.id} value={u.id}>{u.fullName || u.email}</option>
              ))}
            </select>
            {!addUserId && (
              <>
                <input className="input text-sm" placeholder="O invitar por email..." value={addUserEmail} onChange={e => setAddUserEmail(e.target.value)} />
                {addUserEmail && (
                  <input className="input text-sm" placeholder="Nombre del invitado" value={addUserName} onChange={e => setAddUserName(e.target.value)} />
                )}
              </>
            )}
            <button
              onClick={handleAddParticipant}
              disabled={(!addUserId && !addUserEmail.trim()) || saving}
              className="btn-primary btn-sm w-full disabled:opacity-50"
            >
              Agregar
            </button>
          </div>

          {/* List */}
          {participants.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Sin participantes</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {participants.map(p => {
                const user = p.userId ? orgUsers.find(u => u.id === p.userId) : null;
                const name = user?.fullName || p.name || p.email || '—';
                const statusColors: Record<string, string> = {
                  invited: 'bg-yellow-100 text-yellow-700',
                  active: 'bg-blue-100 text-blue-700',
                  completed: 'bg-green-100 text-green-700',
                };

                return (
                  <div key={p.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-gray-400 capitalize">{p.role}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusColors[p.status] || ''}`}>
                          {p.status === 'invited' ? 'Invitado' : p.status === 'active' ? 'Activo' : 'Completado'}
                        </span>
                      </div>
                    </div>
                    <button onClick={() => removeParticipant(p.id)} className="text-red-400 hover:text-red-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
