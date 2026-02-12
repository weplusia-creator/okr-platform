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
import { PRESENTATION_STATUS_CONFIG, SLIDE_BG_COLORS, SLIDE_LAYOUT_CONFIG } from '../../types/presentations';
import type { Presentation, PresentationSlide } from '../../types/presentations';

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
      await navigator.clipboard.writeText(url);
      setPres({ ...pres, status: 'published' });
      alert('Presentacion publicada! Link copiado al portapapeles.');
    } catch (err) {
      console.error('Error publishing:', err);
    } finally {
      setPublishing(false);
    }
  };

  const handleCopyLink = () => {
    if (!pres) return;
    const url = `${window.location.origin}/pres/${pres.shareToken}`;
    navigator.clipboard.writeText(url);
    alert('Link copiado al portapapeles');
  };

  const handleDelete = async () => {
    if (!pres || !confirm('Eliminar esta presentacion?')) return;
    await deletePresentation(pres.id);
    navigate('/presentations');
  };

  const handleDuplicate = async () => {
    if (!pres) return;
    const dup = await duplicatePresentation(pres.id);
    if (dup) navigate(`/presentations/${dup.id}`);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getSlideTextColor = (bgColor: string) => {
    return bgColor === '#FFFBE8' ? 'text-[#231F1F]' : 'text-white';
  };

  const getSlideAccentColor = (bgColor: string) => {
    if (bgColor === '#FF4632') return '#D4FC59';
    if (bgColor === '#FFFBE8') return '#FF4632';
    if (bgColor === '#3100E2') return '#D4FC59';
    return '#D4FC59';
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
              {slides.map((slide, index) => (
                <div
                  key={slide.id}
                  className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700"
                >
                  {/* Slide preview */}
                  <div
                    className="p-5 aspect-[16/9] flex flex-col justify-center"
                    style={{ background: slide.bgColor }}
                  >
                    {slide.layout === 'title' ? (
                      <div>
                        <h3 className={`text-lg font-bold ${getSlideTextColor(slide.bgColor)} leading-tight`}>
                          {slide.title}
                        </h3>
                        {slide.content && (
                          <p className={`text-xs mt-2 ${slide.bgColor === '#FFFBE8' ? 'text-[#231F1F]/60' : 'text-white/60'}`}>
                            {slide.content}
                          </p>
                        )}
                      </div>
                    ) : slide.layout === 'quote' ? (
                      <div>
                        <div className="w-8 h-1 mb-3" style={{ background: getSlideAccentColor(slide.bgColor) }} />
                        <p className={`text-sm italic ${getSlideTextColor(slide.bgColor)} leading-relaxed`}>
                          "{slide.content}"
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className={`text-xs font-bold uppercase tracking-wider mb-2`} style={{ color: getSlideAccentColor(slide.bgColor) }}>
                          {slide.title}
                        </p>
                        {slide.content && (
                          <p className={`text-xs ${slide.bgColor === '#FFFBE8' ? 'text-[#231F1F]/70' : 'text-white/70'} mb-2 line-clamp-2`}>
                            {slide.content}
                          </p>
                        )}
                        {slide.bulletPoints.length > 0 && (
                          <div className="space-y-0.5">
                            {slide.bulletPoints.slice(0, 3).map((bp, i) => (
                              <p key={i} className={`text-xs ${slide.bgColor === '#FFFBE8' ? 'text-[#231F1F]/60' : 'text-white/60'}`}>
                                • {bp}
                              </p>
                            ))}
                            {slide.bulletPoints.length > 3 && (
                              <p className={`text-xs ${slide.bgColor === '#FFFBE8' ? 'text-[#231F1F]/40' : 'text-white/40'}`}>
                                +{slide.bulletPoints.length - 3} mas
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Slide footer */}
                  <div className="px-3 py-2 bg-white dark:bg-gray-800 flex items-center justify-between">
                    <span className="text-xs text-gray-400">{index + 1}. {SLIDE_LAYOUT_CONFIG[slide.layout as keyof typeof SLIDE_LAYOUT_CONFIG]?.label}</span>
                  </div>
                </div>
              ))}
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

            {pres.status === 'draft' && (
              <button
                onClick={handleDelete}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Eliminar
              </button>
            )}
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
