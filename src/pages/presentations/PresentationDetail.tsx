import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Edit3,
  Trash2,
  Copy,
  Link2,
  ExternalLink,
  Presentation as PresentationIcon,
  Share2,
  Loader2,
  Calendar,
  User,
  Building2,
} from 'lucide-react';
import { usePresentations } from '../../context/PresentationContext';
import { PRESENTATION_STATUS_CONFIG, SLIDE_BG_COLORS, SLIDE_LAYOUT_CONFIG, getSlideAccentColor, getSlideTextColor } from '../../types/presentations';
import type { Presentation, PresentationSlide } from '../../types/presentations';
import { parseLocalDate } from '../../utils/helpers';

import { toast } from '../../components/ui/toast';
import { confirmDialog } from '../../components/ui/confirm';
export function PresentationDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const {
    getPresentation,
    deletePresentation,
    duplicatePresentation,
    publishPresentation,
  } = usePresentations();

  const [pres, setPres] = useState<Presentation | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (id) {
      (async () => {
        setLoading(true);
        const data = await getPresentation(id);
        setPres(data);
        setLoading(false);
      })();
    }
  }, [id, getPresentation]);

  const handlePublish = async () => {
    if (!pres) return;
    setPublishing(true);
    try {
      const token = await publishPresentation(pres.id);
      const url = `${window.location.origin}/pres/${token}`;
      await navigator.clipboard.writeText(url).catch(() => {});
      setPres({ ...pres, status: 'published' });
      toast.success('Presentacion publicada! Link copiado al portapapeles.');
    } catch (err: any) {
      toast.error('Error al publicar: ' + (err?.message || 'Error desconocido'));
    } finally {
      setPublishing(false);
    }
  };

  const handleCopyLink = async () => {
    if (!pres) return;
    const url = `${window.location.origin}/pres/${pres.shareToken}`;
    await navigator.clipboard.writeText(url).catch(() => {});
    toast.success('Link copiado al portapapeles');
  };

  const handleDelete = async () => {
    if (!pres || !(await confirmDialog({ message: 'Eliminar esta presentacion?', danger: true }))) return;
    try {
      await deletePresentation(pres.id);
      navigate('/presentations');
    } catch (err: any) {
      toast.error('Error al eliminar: ' + (err?.message || 'Error desconocido'));
    }
  };

  const handleDuplicate = async () => {
    if (!pres) return;
    const dup = await duplicatePresentation(pres.id);
    if (dup) navigate(`/presentations/${dup.id}`);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return parseLocalDate(dateStr).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const textColorClass = (bgColor: string) => {
    return getSlideTextColor(bgColor) === '#FFFFFF' ? 'text-white' : 'text-[#231F1F]';
  };

  const subTextColorClass = (bgColor: string) => {
    return getSlideTextColor(bgColor) === '#FFFFFF' ? 'text-white/60' : 'text-[#231F1F]/60';
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!pres) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">Presentacion no encontrada</p>
        <button onClick={() => navigate('/presentations')} className="text-[#3100E2] hover:underline mt-2">
          Volver a presentaciones
        </button>
      </div>
    );
  }

  const statusCfg = PRESENTATION_STATUS_CONFIG[pres.status];
  const slides = pres.slides || [];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/presentations')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{pres.title}</h1>
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.bgClass}`}>
              {statusCfg.label}
            </span>
          </div>
          {pres.subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{pres.subtitle}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Slides */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Slides ({slides.length})
            </h2>
            {pres.status === 'published' && (
              <a
                href={`/pres/${pres.shareToken}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-[#3100E2] hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                Ver presentacion
              </a>
            )}
          </div>

          {slides.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <PresentationIcon className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No hay slides</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {slides.map((slide, index) => {
                const accent = getSlideAccentColor(slide.bgColor);
                const tc = textColorClass(slide.bgColor);
                const stc = subTextColorClass(slide.bgColor);

                return (
                  <div
                    key={slide.id}
                    className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700"
                  >
                    {/* Slide preview */}
                    <div
                      className="p-4 aspect-[16/9] flex flex-col justify-center relative overflow-hidden"
                      style={{ background: slide.bgColor }}
                    >
                      {/* Background image for section layout */}
                      {slide.layout === 'section' && slide.imageUrl && (
                        <img src={slide.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 grayscale" />
                      )}

                      {slide.layout === 'title' ? (
                        <div className="relative z-10">
                          <div className="text-[10px] font-black tracking-widest mb-2" style={{ color: accent }}>WAU©</div>
                          {slide.subtitle && (
                            <p className={`text-[10px] italic ${stc} mb-0.5`} style={{ fontFamily: 'serif' }}>{slide.subtitle}</p>
                          )}
                          <h3 className={`text-base font-black ${tc} leading-tight uppercase`}>{slide.title}</h3>
                        </div>
                      ) : slide.layout === 'section' ? (
                        <div className="relative z-10 flex items-center justify-center h-full">
                          <div className="bg-white rounded-xl p-3 text-center max-w-[80%]">
                            <h3 className="text-sm font-black text-[#231F1F] uppercase leading-tight">{slide.title}</h3>
                          </div>
                        </div>
                      ) : slide.layout === 'quote' ? (
                        <div className="relative z-10 text-center px-2">
                          <span className="text-2xl font-black leading-none" style={{ color: accent }}>"</span>
                          <p className={`text-xs italic ${tc} leading-relaxed`}>{slide.content}</p>
                        </div>
                      ) : slide.layout === 'bullets' ? (
                        <div className="relative z-10">
                          {slide.subtitle && (
                            <p className="text-[10px] italic mb-0.5" style={{ color: accent, fontFamily: 'serif' }}>{slide.subtitle}</p>
                          )}
                          <h3 className={`text-xs font-bold ${tc} uppercase mb-2`}>{slide.title}</h3>
                          {slide.bulletPoints.length > 0 && (
                            <div className="grid grid-cols-2 gap-1">
                              {slide.bulletPoints.slice(0, 4).map((bp, i) => (
                                <div key={i} className="rounded-lg px-1.5 py-1 text-[8px] text-white font-medium truncate" style={{ background: accent === '#D4FC59' ? ['#FF4632','#3100E2','#6B21A8','#231F1F'][i % 4] : ['#231F1F','#FF4632','#3100E2','#6B21A8'][i % 4] }}>
                                  {bp}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : slide.layout === 'image-text' ? (
                        <div className="relative z-10 flex gap-2 h-full items-center">
                          <div className="flex-1">
                            {slide.subtitle && (
                              <p className="text-[10px] italic mb-0.5" style={{ color: accent, fontFamily: 'serif' }}>{slide.subtitle}</p>
                            )}
                            <h3 className={`text-xs font-bold ${tc} leading-tight`}>{slide.title}</h3>
                          </div>
                          {slide.imageUrl && (
                            <div className="w-[40%] h-full rounded-lg overflow-hidden flex-shrink-0">
                              <img src={slide.imageUrl} alt="" className="w-full h-full object-cover" />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="relative z-10">
                          {slide.subtitle && (
                            <p className="text-[10px] italic mb-0.5" style={{ color: accent, fontFamily: 'serif' }}>{slide.subtitle}</p>
                          )}
                          <h3 className={`text-xs font-bold ${tc} uppercase mb-1`}>{slide.title}</h3>
                          <div className="w-6 h-0.5 mb-1.5" style={{ background: accent }} />
                          {slide.content && (
                            <p className={`text-[9px] ${stc} line-clamp-2`}>{slide.content}</p>
                          )}
                          {slide.bulletPoints.length > 0 && (
                            <div className="mt-1 space-y-0.5">
                              {slide.bulletPoints.slice(0, 2).map((bp, i) => (
                                <p key={i} className={`text-[9px] ${stc}`}>• {bp}</p>
                              ))}
                              {slide.bulletPoints.length > 2 && (
                                <p className={`text-[9px] ${stc}`}>+{slide.bulletPoints.length - 2} mas</p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {/* Slide footer */}
                    <div className="px-3 py-2 bg-white dark:bg-gray-800 flex items-center justify-between">
                      <span className="text-xs text-gray-400">{index + 1}. {SLIDE_LAYOUT_CONFIG[slide.layout as keyof typeof SLIDE_LAYOUT_CONFIG]?.label}</span>
                      {slide.imageUrl && <span className="text-[10px] text-gray-400">img</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Sidebar */}
        <div className="space-y-4">
          {/* Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Acciones</h3>

            {pres.status === 'draft' && (
              <button
                onClick={handlePublish}
                disabled={publishing || slides.length === 0}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#D4FC59] text-[#231F1F] rounded-lg font-semibold hover:bg-[#c5ed4a] disabled:opacity-50 transition-colors"
              >
                {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                Publicar y compartir
              </button>
            )}

            {pres.status === 'published' && (
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#D4FC59] text-[#231F1F] rounded-lg font-semibold hover:bg-[#c5ed4a] transition-colors"
              >
                <Link2 className="w-4 h-4" />
                Copiar link
              </button>
            )}

            <button
              onClick={() => navigate(`/presentations/${pres.id}/edit`)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              Editar
            </button>

            <button
              onClick={handleDuplicate}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Copy className="w-4 h-4" />
              Duplicar
            </button>

            <button
              onClick={handleDelete}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar
            </button>
          </div>

          {/* Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Informacion</h3>

            {pres.author && (
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-300">{pres.author}</span>
              </div>
            )}

            {pres.date && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-300">{formatDate(pres.date)}</span>
              </div>
            )}

            {(pres.clientName || pres.clientCompany) && (
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-300">
                  {pres.clientName}{pres.clientCompany ? ` - ${pres.clientCompany}` : ''}
                </span>
              </div>
            )}

            <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-400">
                Creada {formatDate(pres.createdAt)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
