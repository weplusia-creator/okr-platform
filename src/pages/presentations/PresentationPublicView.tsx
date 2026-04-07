import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Presentation, PresentationSlide } from '../../types/presentations';
import { getSlideAccentColor, getSlideTextColor } from '../../types/presentations';

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

// Card colors for bullets layout - rotate through these
const CARD_COLORS = [
  { bg: '#FF4632', text: '#FFFFFF' },
  { bg: '#FFFBE8', text: '#231F1F' },
  { bg: '#3100E2', text: '#FFFFFF' },
  { bg: '#6B21A8', text: '#FFFFFF' },
  { bg: '#D4FC59', text: '#231F1F' },
  { bg: '#231F1F', text: '#FFFFFF' },
];

function getCardColor(index: number, slideBg: string) {
  // Filter out the card color that matches the slide background
  const available = CARD_COLORS.filter(c => c.bg !== slideBg);
  return available[index % available.length];
}

const GOOGLE_FONTS_URL = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700;1,900&family=Inter:wght@400;500;600;700;800;900&display=swap';

const GLOBAL_STYLES = `
  @import url('${GOOGLE_FONTS_URL}');
  .font-display { font-family: 'Playfair Display', Georgia, serif; }
  .font-body { font-family: 'Inter', system-ui, sans-serif; }
  @keyframes slideIn { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .animate-slideIn { animation: slideIn 0.6s ease-out; }
  .animate-fadeIn { animation: fadeIn 0.8s ease-out; }
`;

const PRINT_STYLES = `
  ${GLOBAL_STYLES}
  @media print {
    @page { margin: 0; size: A4 landscape; }
    body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .print-slide { page-break-after: always; break-after: page; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; }
    .print-slide:last-child { page-break-after: avoid; }
    .no-print { display: none !important; }
  }
  @media screen {
    .print-slide { min-height: 100vh; display: flex; flex-direction: column; justify-content: center; }
  }
`;

// ===== Slide Renderers =====

function SlideTitle({ slide, pres, accent, textColor }: { slide: PresentationSlide; pres: Presentation; accent: string; textColor: string }) {
  return (
    <div className="relative min-h-screen flex flex-col justify-center px-8 sm:px-16 lg:px-24 py-16 overflow-hidden">
      {/* Background image if present */}
      {slide.imageUrl && (
        <div className="absolute inset-0">
          <img src={slide.imageUrl} alt="" className="w-full h-full object-cover opacity-20" style={{ filter: 'grayscale(100%)' }} />
          <div className="absolute inset-0" style={{ background: `${slide.bgColor}cc` }} />
        </div>
      )}

      <div className="relative z-10">
        {/* WAU Logo */}
        <p className="font-display font-black text-5xl sm:text-6xl mb-12" style={{ color: accent }}>
          WAU<sup className="text-lg">©</sup>
        </p>

        {/* Client company as italic subtitle */}
        {(pres.clientCompany || slide.subtitle) && (
          <p className="font-display italic text-xl sm:text-2xl mb-2" style={{ color: accent }}>
            {slide.subtitle || `Consultoria ${pres.clientCompany}`}
          </p>
        )}

        {/* Title - huge */}
        <h1 className="font-body font-black text-5xl sm:text-6xl lg:text-8xl uppercase tracking-tight leading-[0.95] mb-8" style={{ color: textColor }}>
          {slide.title}
        </h1>

        {/* Accent line */}
        <div className="w-28 h-1 mb-10" style={{ background: accent }} />

        {/* Content */}
        {slide.content && (
          <p className="text-lg sm:text-xl max-w-3xl mb-8 leading-relaxed" style={{ color: textColor, opacity: 0.7 }}>
            {slide.content}
          </p>
        )}

        {/* Author / Client / Date */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-12">
          {pres.author && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] mb-2" style={{ color: textColor, opacity: 0.4 }}>Presentado por</p>
              <p className="text-lg font-semibold" style={{ color: textColor }}>{pres.author}</p>
            </div>
          )}
          {pres.clientName && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] mb-2" style={{ color: textColor, opacity: 0.4 }}>Para</p>
              <p className="text-lg font-semibold" style={{ color: textColor }}>{pres.clientName}</p>
            </div>
          )}
          {pres.date && (
            <div className="sm:text-right">
              <p className="text-[10px] uppercase tracking-[0.3em] mb-2" style={{ color: textColor, opacity: 0.4 }}>Fecha</p>
              <p className="text-lg font-semibold" style={{ color: textColor }}>{formatDate(pres.date)}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SlideSection({ slide, accent, textColor }: { slide: PresentationSlide; accent: string; textColor: string }) {
  if (slide.imageUrl) {
    // Image background with card overlay (like PDF slide 2)
    return (
      <div className="relative min-h-screen flex flex-col justify-end overflow-hidden">
        <img src={slide.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ filter: 'grayscale(80%) brightness(0.7)' }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* WAU logo top-right */}
        <div className="absolute top-8 right-8 sm:right-12 z-10">
          <p className="font-display font-black text-3xl" style={{ color: '#fff' }}>WAU<sup className="text-xs">©</sup></p>
        </div>

        {/* Card overlay at bottom */}
        <div className="relative z-10 m-6 sm:m-12 mb-12 sm:mb-20">
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-8 sm:p-10 max-w-2xl shadow-2xl">
            {slide.subtitle && (
              <p className="font-display italic text-lg text-[#231F1F]/60 mb-1">{slide.subtitle}</p>
            )}
            <h2 className="font-body font-black text-3xl sm:text-4xl lg:text-5xl text-[#231F1F] leading-tight">
              {slide.title}
            </h2>
            {slide.content && (
              <p className="text-base text-[#231F1F]/70 mt-4 leading-relaxed">{slide.content}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // No image - large title style
  return (
    <div className="min-h-screen flex flex-col justify-center px-8 sm:px-16 lg:px-24 py-16">
      {slide.subtitle && (
        <p className="font-display italic text-2xl sm:text-3xl mb-2" style={{ color: accent }}>
          {slide.subtitle}
        </p>
      )}
      <h2 className="font-body font-black text-5xl sm:text-6xl lg:text-8xl uppercase tracking-tight leading-[0.95] mb-6" style={{ color: textColor }}>
        {slide.title}
      </h2>
      <div className="w-28 h-1 mb-10" style={{ background: accent }} />
      {slide.content && (
        <p className="text-lg sm:text-xl max-w-3xl leading-relaxed" style={{ color: textColor, opacity: 0.7 }}>
          {slide.content}
        </p>
      )}
    </div>
  );
}

function SlideContent({ slide, accent, textColor }: { slide: PresentationSlide; accent: string; textColor: string }) {
  const isDark = textColor === '#FFFFFF';
  return (
    <div className="min-h-screen flex flex-col justify-center px-8 sm:px-16 lg:px-24 py-16">
      {/* Subtitle italic */}
      {slide.subtitle && (
        <p className="font-display italic text-xl sm:text-2xl mb-2" style={{ color: accent }}>
          {slide.subtitle}
        </p>
      )}

      {/* Title - huge */}
      <h2 className="font-body font-black text-4xl sm:text-5xl lg:text-6xl uppercase tracking-tight leading-[0.95] mb-4" style={{ color: textColor }}>
        {slide.title}
      </h2>

      {/* Accent line */}
      <div className="w-full max-w-3xl h-0.5 mb-10" style={{ background: accent, opacity: 0.4 }} />

      {/* Content + Image layout */}
      <div className={`flex gap-8 items-start ${slide.imageUrl ? 'max-w-6xl' : 'max-w-3xl'}`}>
        {/* Text card */}
        {(slide.content || slide.bulletPoints.length > 0) && (
          <div
            className="rounded-3xl p-8 sm:p-10 flex-1"
            style={{
              background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
            }}
          >
            {slide.content && (
              <p className="text-lg sm:text-xl leading-relaxed whitespace-pre-wrap" style={{ color: textColor, opacity: 0.85 }}>
                {slide.content}
              </p>
            )}
            {slide.bulletPoints.length > 0 && (
              <div className={`space-y-3 ${slide.content ? 'mt-6' : ''}`}>
                {slide.bulletPoints.map((bp, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <span className="text-lg font-bold mt-0.5 flex-shrink-0" style={{ color: accent }}>•</span>
                    <p className="text-lg leading-relaxed font-medium" style={{ color: textColor, opacity: 0.9 }}>
                      {bp}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Image - side by side, rounded, grayscale */}
        {slide.imageUrl && (
          <div className="flex-shrink-0 w-[35%] max-w-sm">
            <img
              src={slide.imageUrl}
              alt=""
              className="w-full rounded-2xl object-cover"
              style={{ filter: 'grayscale(100%)', aspectRatio: '4/5' }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function SlideBullets({ slide, accent, textColor }: { slide: PresentationSlide; accent: string; textColor: string }) {
  const cols = slide.bulletPoints.length <= 2 ? 2 : slide.bulletPoints.length <= 3 ? 3 : 4;
  return (
    <div className="min-h-screen flex flex-col justify-center px-8 sm:px-16 lg:px-24 py-16">
      {/* Subtitle + Title */}
      {slide.subtitle && (
        <p className="font-display italic text-xl sm:text-2xl mb-2" style={{ color: accent }}>
          {slide.subtitle}
        </p>
      )}
      <h2 className="font-body font-black text-4xl sm:text-5xl lg:text-6xl uppercase tracking-tight leading-[0.95] mb-4" style={{ color: textColor }}>
        {slide.title}
      </h2>
      <div className="w-full h-0.5 mb-10" style={{ background: accent, opacity: 0.4 }} />

      {/* Content above cards */}
      {slide.content && (
        <p className="text-lg mb-8 max-w-3xl leading-relaxed" style={{ color: textColor, opacity: 0.7 }}>
          {slide.content}
        </p>
      )}

      {/* Cards grid */}
      <div className={`grid gap-4 sm:gap-5 ${
        cols === 2 ? 'grid-cols-1 sm:grid-cols-2' :
        cols === 3 ? 'grid-cols-1 sm:grid-cols-3' :
        'grid-cols-2 sm:grid-cols-4'
      }`}>
        {slide.bulletPoints.map((bp, idx) => {
          const cardColor = getCardColor(idx, slide.bgColor);
          return (
            <div
              key={idx}
              className="rounded-2xl sm:rounded-3xl p-5 sm:p-6 flex flex-col justify-between min-h-[140px] sm:min-h-[200px] transition-transform hover:scale-[1.02]"
              style={{ background: cardColor.bg, color: cardColor.text }}
            >
              <h3 className="font-body font-bold text-lg sm:text-xl leading-snug">
                {bp}
              </h3>
              <span className="text-3xl font-black opacity-20 mt-4 self-end">
                {String(idx + 1).padStart(2, '0')}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SlideQuote({ slide, accent, textColor }: { slide: PresentationSlide; accent: string; textColor: string }) {
  return (
    <div className="min-h-screen flex flex-col justify-center px-8 sm:px-16 lg:px-24 py-16">
      <div className="max-w-4xl">
        {/* Large quote mark */}
        <span className="font-display text-8xl sm:text-9xl font-black leading-none block -mb-8" style={{ color: accent, opacity: 0.3 }}>"</span>

        <p className="font-display italic text-3xl sm:text-4xl lg:text-5xl leading-snug" style={{ color: textColor }}>
          {slide.content || slide.title}
        </p>

        {/* Attribution */}
        {slide.title && slide.content && slide.title !== slide.content && (
          <div className="mt-8 flex items-center gap-4">
            <div className="w-12 h-0.5" style={{ background: accent }} />
            <p className="text-lg font-semibold" style={{ color: accent }}>
              {slide.title}
            </p>
          </div>
        )}

        {/* Subtitle as extra attribution */}
        {slide.subtitle && (
          <p className="font-display italic text-lg mt-2 ml-16" style={{ color: textColor, opacity: 0.5 }}>
            {slide.subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

function SlideImageText({ slide, accent, textColor }: { slide: PresentationSlide; accent: string; textColor: string }) {
  const isDark = textColor === '#FFFFFF';
  return (
    <div className="min-h-screen flex flex-col lg:flex-row items-stretch">
      {/* Text column - 55% */}
      <div className="flex-1 lg:w-[55%] flex flex-col justify-center px-8 sm:px-12 lg:px-16 py-12 lg:py-16">
        {slide.subtitle && (
          <p className="font-display italic text-xl sm:text-2xl mb-2" style={{ color: accent }}>
            {slide.subtitle}
          </p>
        )}
        <h2 className="font-body font-black text-3xl sm:text-4xl lg:text-5xl uppercase tracking-tight leading-[0.95] mb-4" style={{ color: textColor }}>
          {slide.title}
        </h2>
        <div className="w-20 h-0.5 mb-8" style={{ background: accent, opacity: 0.4 }} />

        {slide.content && (
          <p className="text-base sm:text-lg leading-relaxed whitespace-pre-wrap mb-6" style={{ color: textColor, opacity: 0.8 }}>
            {slide.content}
          </p>
        )}

        {slide.bulletPoints.length > 0 && (
          <div className="space-y-3">
            {slide.bulletPoints.map((bp, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <span className="font-bold text-sm mt-1 flex-shrink-0" style={{ color: accent }}>•</span>
                <p className="text-base leading-relaxed" style={{ color: textColor, opacity: 0.85 }}>
                  {bp}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Image column - 40% */}
      <div className="lg:w-[40%] min-h-[300px] lg:min-h-0 relative p-4 sm:p-8 flex items-center justify-center">
        {slide.imageUrl ? (
          <img
            src={slide.imageUrl}
            alt=""
            className="w-full h-full object-cover rounded-2xl max-h-[70vh]"
            style={{ filter: 'grayscale(100%)' }}
          />
        ) : (
          <div
            className="w-full h-full min-h-[300px] rounded-3xl flex items-center justify-center"
            style={{
              background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              border: `2px dashed ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
            }}
          >
            <span className="font-display italic text-2xl" style={{ color: textColor, opacity: 0.2 }}>Imagen</span>
          </div>
        )}

        {/* Decorative accent */}
        <div className="absolute top-4 right-4 sm:top-8 sm:right-8 w-8 h-8 rounded-full" style={{ background: accent, opacity: 0.5 }} />
      </div>
    </div>
  );
}

// ===== Main Component =====

export function PresentationPublicView() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const printMode = searchParams.get('print') === '1';
  const [pres, setPres] = useState<Presentation | null>(null);
  const [slides, setSlides] = useState<PresentationSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const fetchPresentation = async () => {
      if (!token) {
        setError('Token invalido');
        setLoading(false);
        return;
      }
      try {
        const { data: p, error: err } = await supabase
          .from('presentations')
          .select('*')
          .eq('share_token', token)
          .eq('status', 'published')
          .maybeSingle();

        if (err || !p) {
          setError('Presentacion no encontrada o no disponible');
          setLoading(false);
          return;
        }

        setPres({
          id: p.id,
          organizationId: p.organization_id,
          title: p.title,
          subtitle: p.subtitle,
          author: p.author,
          date: p.date,
          clientName: p.client_name,
          clientCompany: p.client_company,
          status: p.status,
          shareToken: p.share_token,
          createdBy: p.created_by,
          createdAt: p.created_at,
          updatedAt: p.updated_at,
        });

        const { data: slidesData, error: slideErr } = await supabase
          .from('presentation_slides')
          .select('*')
          .eq('presentation_id', p.id)
          .order('sort_order', { ascending: true });

        if (slideErr) throw slideErr;

        setSlides(
          (slidesData || []).map((s: any) => ({
            id: s.id,
            presentationId: s.presentation_id,
            title: s.title,
            subtitle: s.subtitle || null,
            content: s.content,
            bulletPoints: s.bullet_points || [],
            layout: s.layout,
            bgColor: s.bg_color,
            imageUrl: s.image_url || null,
            sortOrder: s.sort_order,
            createdAt: s.created_at,
          }))
        );
      } catch (err: any) {
        console.error('Error fetching presentation:', err);
        setError('Error al cargar la presentacion');
      } finally {
        setLoading(false);
      }
    };
    fetchPresentation();
  }, [token]);

  // Auto-trigger print in print mode
  useEffect(() => {
    if (printMode && !loading && pres && slides.length > 0) {
      const timer = setTimeout(() => window.print(), 600);
      return () => clearTimeout(timer);
    }
  }, [printMode, loading, pres, slides.length]);

  // Keyboard navigation
  useEffect(() => {
    if (slides.length === 0) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        setCurrentStep((s) => Math.min(slides.length - 1, s + 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentStep((s) => Math.max(0, s - 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slides.length]);

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#231F1F' }}>
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-[#D4FC59]/20" />
            <div className="absolute inset-0 rounded-full border-4 border-t-[#D4FC59] animate-spin" />
          </div>
          <p className="text-white/70 text-sm tracking-widest uppercase">Cargando presentacion...</p>
        </div>
      </div>
    );
  }

  // Error
  if (error || !pres) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#231F1F' }}>
        <div className="text-center max-w-md">
          <AlertTriangle className="w-16 h-16 text-[#FF4632] mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-white mb-3">Presentacion no disponible</h1>
          <p className="text-white/70">{error || 'La presentacion que buscas no existe o no esta publicada.'}</p>
        </div>
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#231F1F' }}>
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-white mb-3">Presentacion vacia</h1>
          <p className="text-white/70">Esta presentacion no tiene slides.</p>
        </div>
      </div>
    );
  }

  // ========== PRINT MODE ==========
  if (printMode) {
    return (
      <div className="print-presentation font-body">
        <style>{PRINT_STYLES}</style>
        {slides.map((slide) => {
          const accent = getSlideAccentColor(slide.bgColor);
          const textColor = getSlideTextColor(slide.bgColor);
          return (
            <div key={slide.id} className="print-slide" style={{ background: slide.bgColor }}>
              {slide.layout === 'title' ? (
                <SlideTitle slide={slide} pres={pres} accent={accent} textColor={textColor} />
              ) : slide.layout === 'section' ? (
                <SlideSection slide={slide} accent={accent} textColor={textColor} />
              ) : slide.layout === 'quote' ? (
                <SlideQuote slide={slide} accent={accent} textColor={textColor} />
              ) : slide.layout === 'bullets' ? (
                <SlideBullets slide={slide} accent={accent} textColor={textColor} />
              ) : slide.layout === 'image-text' ? (
                <SlideImageText slide={slide} accent={accent} textColor={textColor} />
              ) : (
                <SlideContent slide={slide} accent={accent} textColor={textColor} />
              )}
            </div>
          );
        })}
        <div className="no-print" style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 50 }}>
          <button
            onClick={() => window.print()}
            style={{ background: '#D4FC59', color: '#231F1F', padding: '0.75rem 1.5rem', borderRadius: '0.75rem', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}
          >
            Descargar PDF
          </button>
        </div>
      </div>
    );
  }

  // ========== INTERACTIVE SLIDE MODE ==========
  const totalSteps = slides.length;
  const activeSlide = slides[currentStep];
  if (!activeSlide) return null;

  const bg = activeSlide.bgColor || '#231F1F';
  const textColor = getSlideTextColor(bg);
  const accent = getSlideAccentColor(bg);
  const isLight = textColor === '#231F1F';

  const goNext = () => { setCurrentStep((s) => Math.min(totalSteps - 1, s + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const goPrev = () => { setCurrentStep((s) => Math.max(0, s - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  return (
    <div className="min-h-screen transition-colors duration-500 font-body" style={{ background: bg }}>
      <style>{GLOBAL_STYLES}</style>

      {/* Fixed Nav Bar */}
      <nav className="fixed top-0 left-0 right-0 z-30 transition-colors duration-500" style={{ background: bg }}>
        <div className="h-1" style={{ background: 'linear-gradient(90deg, #3100E2 0%, #D4FC59 50%, #FF4632 100%)' }} />
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-display font-black text-xl" style={{ color: accent }}>WAU<sup className="text-[8px]">©</sup></span>
            <span className={`text-xs font-medium tracking-widest uppercase ${isLight ? 'text-[#231F1F]/40' : 'text-white/40'}`}>
              {pres.title}
            </span>
          </div>
          <span className={`text-xs font-mono ${isLight ? 'text-[#231F1F]/30' : 'text-white/30'}`}>
            {String(currentStep + 1).padStart(2, '0')}/{String(totalSteps).padStart(2, '0')}
          </span>
        </div>
        {/* Progress line */}
        <div className="h-0.5" style={{ background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)' }}>
          <div
            className="h-full transition-all duration-500 ease-out"
            style={{ width: `${((currentStep + 1) / totalSteps) * 100}%`, background: accent }}
          />
        </div>
      </nav>

      {/* Slide Content */}
      <main className="pt-14 pb-24 animate-slideIn" key={currentStep}>
        {activeSlide.layout === 'title' ? (
          <SlideTitle slide={activeSlide} pres={pres} accent={accent} textColor={textColor} />
        ) : activeSlide.layout === 'section' ? (
          <SlideSection slide={activeSlide} accent={accent} textColor={textColor} />
        ) : activeSlide.layout === 'quote' ? (
          <SlideQuote slide={activeSlide} accent={accent} textColor={textColor} />
        ) : activeSlide.layout === 'bullets' ? (
          <SlideBullets slide={activeSlide} accent={accent} textColor={textColor} />
        ) : activeSlide.layout === 'image-text' ? (
          <SlideImageText slide={activeSlide} accent={accent} textColor={textColor} />
        ) : (
          <SlideContent slide={activeSlide} accent={accent} textColor={textColor} />
        )}
      </main>

      {/* Fixed Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-30 transition-colors duration-500" style={{ background: bg }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={goPrev}
            disabled={currentStep === 0}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all disabled:opacity-20 disabled:cursor-not-allowed ${
              isLight
                ? 'text-[#231F1F]/60 border border-[#231F1F]/15 hover:bg-[#231F1F]/5'
                : 'text-white/60 border border-white/10 hover:bg-white/5'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Anterior</span>
          </button>

          {/* Dot indicators */}
          <div className="flex items-center gap-1.5">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => { setCurrentStep(idx); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className={`rounded-full transition-all duration-300 ${
                  idx === currentStep
                    ? 'w-6 h-2'
                    : 'w-2 h-2'
                }`}
                style={{
                  background: idx === currentStep
                    ? accent
                    : idx < currentStep
                      ? `${accent}40`
                      : isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.12)',
                }}
              />
            ))}
          </div>

          {currentStep < totalSteps - 1 ? (
            <button
              onClick={goNext}
              className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition-transform hover:scale-[1.02]"
              style={{ background: accent, color: accent === '#D4FC59' ? '#231F1F' : '#FFFFFF' }}
            >
              <span className="hidden sm:inline">Siguiente</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="w-[120px]" />
          )}
        </div>
        <div className="text-center pb-3">
          <span className={`text-[10px] tracking-widest uppercase ${isLight ? 'text-[#231F1F]/15' : 'text-white/10'}`}>
            WAU Consultora
          </span>
        </div>
      </div>
    </div>
  );
}
