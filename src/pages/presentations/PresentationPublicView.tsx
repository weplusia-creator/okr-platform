import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Presentation, PresentationSlide } from '../../types/presentations';

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

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
          .single();

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

        const { data: slidesData } = await supabase
          .from('presentation_slides')
          .select('*')
          .eq('presentation_id', p.id)
          .order('sort_order', { ascending: true });

        setSlides(
          (slidesData || []).map((s: any) => ({
            id: s.id,
            presentationId: s.presentation_id,
            title: s.title,
            content: s.content,
            bulletPoints: s.bullet_points || [],
            layout: s.layout,
            bgColor: s.bg_color,
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
    if (printMode && !loading && pres) {
      const timer = setTimeout(() => window.print(), 600);
      return () => clearTimeout(timer);
    }
  }, [printMode, loading, pres]);

  // Keyboard navigation
  useEffect(() => {
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

  const getSlideAccentColor = (bgColor: string) => {
    if (bgColor === '#FF4632') return '#D4FC59';
    if (bgColor === '#FFFBE8') return '#FF4632';
    if (bgColor === '#3100E2') return '#D4FC59';
    return '#D4FC59';
  };

  const isLightBg = (bgColor: string) => bgColor === '#FFFBE8';

  // ========== PRINT MODE ==========
  if (printMode) {
    return (
      <div className="print-presentation">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700;1,900&display=swap');
          .font-display { font-family: 'Playfair Display', Georgia, serif; }
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
        `}</style>

        {slides.map((slide, index) => (
          <div key={slide.id} className="print-slide" style={{ background: slide.bgColor }}>
            <div className="px-12 sm:px-20 py-16">
              {slide.layout === 'title' ? (
                <>
                  <img src="/wau-logo.png" alt="WAU" className="w-14 h-14 object-contain mb-10 opacity-60" />
                  {pres.clientCompany && (
                    <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: 'italic', color: '#D4FC59', fontSize: '1.3rem', marginBottom: '0.5rem' }}>
                      ( {pres.clientCompany} )
                    </p>
                  )}
                  <h1 style={{
                    color: isLightBg(slide.bgColor) ? '#231F1F' : '#fff',
                    fontSize: '3.5rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    lineHeight: 1.1,
                    letterSpacing: '-0.02em',
                    marginBottom: '1.5rem',
                  }}>
                    {slide.title}
                  </h1>
                  <div style={{ width: '6rem', height: '4px', background: '#D4FC59', marginBottom: '2.5rem' }} />
                  {slide.content && (
                    <p style={{ color: isLightBg(slide.bgColor) ? '#231F1F' : 'rgba(255,255,255,0.8)', fontSize: '1.2rem', maxWidth: '50rem' }}>
                      {slide.content}
                    </p>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2rem' }}>
                    <div>
                      {pres.author && (
                        <>
                          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '0.5rem' }}>Presentado por</p>
                          <p style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 600 }}>{pres.author}</p>
                        </>
                      )}
                      {pres.clientName && (
                        <>
                          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '0.5rem', marginTop: '1rem' }}>Para</p>
                          <p style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 600 }}>{pres.clientName}</p>
                        </>
                      )}
                    </div>
                    {pres.date && (
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '0.5rem' }}>Fecha</p>
                        <p style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 600 }}>{formatDate(pres.date)}</p>
                      </div>
                    )}
                  </div>
                </>
              ) : slide.layout === 'quote' ? (
                <>
                  <div style={{ width: '5rem', height: '4px', background: getSlideAccentColor(slide.bgColor), marginBottom: '2.5rem' }} />
                  <p style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontStyle: 'italic',
                    color: isLightBg(slide.bgColor) ? '#231F1F' : '#fff',
                    fontSize: '2rem',
                    lineHeight: 1.5,
                    maxWidth: '50rem',
                  }}>
                    "{slide.content}"
                  </p>
                  {slide.title && slide.title !== slide.content && (
                    <p style={{ color: getSlideAccentColor(slide.bgColor), fontSize: '1rem', marginTop: '1.5rem', fontWeight: 600 }}>
                      — {slide.title}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontStyle: 'italic',
                    color: getSlideAccentColor(slide.bgColor),
                    fontSize: '2rem',
                    marginBottom: '0.5rem',
                  }}>
                    {slide.title}
                  </p>
                  <div style={{ width: '5rem', height: '4px', background: getSlideAccentColor(slide.bgColor), marginBottom: '2.5rem' }} />
                  {slide.content && (
                    <p style={{
                      color: isLightBg(slide.bgColor) ? 'rgba(35,31,31,0.8)' : 'rgba(255,255,255,0.8)',
                      fontSize: '1.15rem',
                      lineHeight: 1.7,
                      whiteSpace: 'pre-wrap',
                      maxWidth: '50rem',
                      marginBottom: slide.bulletPoints.length > 0 ? '2rem' : '0',
                    }}>
                      {slide.content}
                    </p>
                  )}
                  {slide.bulletPoints.length > 0 && (
                    <div>
                      {slide.bulletPoints.map((bp, idx) => (
                        <p key={idx} style={{
                          color: isLightBg(slide.bgColor) ? '#3100E2' : '#fff',
                          fontSize: '1.15rem',
                          fontWeight: slide.layout === 'bullets' ? 700 : 400,
                          marginBottom: '0.8rem',
                        }}>
                          <span style={{ color: isLightBg(slide.bgColor) ? '#3100E2' : 'rgba(255,255,255,0.5)', marginRight: '0.75rem' }}>
                            {slide.layout === 'bullets' ? `${idx + 1}.` : '•'}
                          </span>
                          {bp}
                        </p>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}

        {/* Print button (screen only) */}
        <div className="no-print" style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 50 }}>
          <button
            onClick={() => window.print()}
            style={{ background: '#D4FC59', color: '#231F1F', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}
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
  const isLight = isLightBg(bg);
  const accent = getSlideAccentColor(bg);

  const goNext = () => { setCurrentStep((s) => Math.min(totalSteps - 1, s + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const goPrev = () => { setCurrentStep((s) => Math.max(0, s - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  return (
    <div className="min-h-screen transition-colors duration-500" style={{ background: bg }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700;1,900&display=swap');
        .font-display { font-family: 'Playfair Display', Georgia, serif; }
        @keyframes slideIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slideIn { animation: slideIn 0.6s ease-out; }
      `}</style>

      {/* Fixed Nav Bar */}
      <nav className="fixed top-0 left-0 right-0 z-30 transition-colors duration-500" style={{ background: bg }}>
        <div className="h-1" style={{ background: 'linear-gradient(90deg, #3100E2 0%, #D4FC59 50%, #FF4632 100%)' }} />
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/wau-logo.png" alt="WAU" className="w-8 h-8 object-contain" />
            <span className={`text-xs font-medium tracking-widest uppercase ${isLight ? 'text-[#231F1F]/40' : 'text-white/60'}`}>
              {pres.title}
            </span>
          </div>
          <span className={`text-xs ${isLight ? 'text-[#231F1F]/30' : 'text-white/50'}`}>
            {currentStep + 1}/{totalSteps}
          </span>
        </div>
        {/* Progress line */}
        <div className="h-0.5 bg-black/10">
          <div
            className="h-full bg-[#D4FC59] transition-all duration-500 ease-out"
            style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
          />
        </div>
      </nav>

      {/* Slide Content */}
      <main className="min-h-screen flex flex-col justify-center pt-16 pb-24">
        <div className="max-w-5xl mx-auto px-6 sm:px-10 w-full animate-slideIn" key={currentStep}>

          {activeSlide.layout === 'title' ? (
            <div className="py-12 sm:py-20">
              <div className="mb-8">
                <img src="/wau-logo.png" alt="WAU" className="w-16 h-16 object-contain mb-8 opacity-60" />
              </div>
              {pres.clientCompany && (
                <p className="text-[#D4FC59] font-display italic text-lg sm:text-xl mb-4">
                  ( {pres.clientCompany} )
                </p>
              )}
              <h1 className={`text-4xl sm:text-5xl lg:text-7xl font-bold uppercase tracking-tight leading-[1.1] mb-8 ${isLight ? 'text-[#231F1F]' : 'text-white'}`}>
                {activeSlide.title}
              </h1>
              <div className="w-24 h-1 bg-[#D4FC59] mb-10" />
              {activeSlide.content && (
                <p className={`text-lg sm:text-xl mb-8 max-w-3xl ${isLight ? 'text-[#231F1F]/70' : 'text-white/70'}`}>
                  {activeSlide.content}
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-12">
                <div>
                  {pres.author && (
                    <>
                      <p className={`text-[11px] uppercase tracking-[0.3em] mb-3 ${isLight ? 'text-[#231F1F]/50' : 'text-white/60'}`}>Presentado por</p>
                      <p className={`text-xl font-semibold mb-4 ${isLight ? 'text-[#231F1F]' : 'text-white'}`}>{pres.author}</p>
                    </>
                  )}
                  {pres.clientName && (
                    <>
                      <p className={`text-[11px] uppercase tracking-[0.3em] mb-3 ${isLight ? 'text-[#231F1F]/50' : 'text-white/60'}`}>Para</p>
                      <p className={`text-xl font-semibold ${isLight ? 'text-[#231F1F]' : 'text-white'}`}>{pres.clientName}</p>
                    </>
                  )}
                </div>
                {pres.date && (
                  <div className="sm:text-right">
                    <p className={`text-[11px] uppercase tracking-[0.3em] mb-3 ${isLight ? 'text-[#231F1F]/50' : 'text-white/60'}`}>Fecha</p>
                    <p className={`text-xl font-semibold ${isLight ? 'text-[#231F1F]' : 'text-white'}`}>{formatDate(pres.date)}</p>
                  </div>
                )}
              </div>
            </div>
          ) : activeSlide.layout === 'quote' ? (
            <div className="py-12 sm:py-20">
              <div className="w-20 h-1 mb-10" style={{ background: accent }} />
              <p className={`font-display italic text-2xl sm:text-3xl lg:text-4xl leading-relaxed max-w-4xl ${isLight ? 'text-[#231F1F]' : 'text-white'}`}>
                "{activeSlide.content}"
              </p>
              {activeSlide.title && activeSlide.title !== activeSlide.content && (
                <p className="mt-8 text-lg font-semibold" style={{ color: accent }}>
                  — {activeSlide.title}
                </p>
              )}
            </div>
          ) : (
            <div className="py-12 sm:py-20">
              <p className="font-display italic text-2xl sm:text-3xl mb-2" style={{ color: accent }}>
                {activeSlide.title}
              </p>
              <div className="w-20 h-1 mb-10" style={{ background: accent }} />
              {activeSlide.content && (
                <p className={`text-lg sm:text-xl leading-relaxed whitespace-pre-wrap max-w-3xl ${
                  activeSlide.bulletPoints.length > 0 ? 'mb-8' : ''
                } ${isLight ? 'text-[#231F1F]/80' : 'text-white/80'}`} style={{ textAlign: 'justify' }}>
                  {activeSlide.content}
                </p>
              )}
              {activeSlide.bulletPoints.length > 0 && (
                <div className="space-y-4 mt-8">
                  {activeSlide.bulletPoints.map((bp, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      {activeSlide.layout === 'bullets' ? (
                        <span className={`text-2xl font-bold leading-none mt-0.5 ${isLight ? 'text-[#3100E2]/50' : 'text-white/40'}`}>
                          {idx + 1}.
                        </span>
                      ) : (
                        <span className="text-2xl leading-none mt-1 flex-shrink-0" style={{ color: accent }}>•</span>
                      )}
                      <p className={`text-lg sm:text-xl leading-relaxed ${
                        activeSlide.layout === 'bullets'
                          ? `font-bold uppercase tracking-wide ${isLight ? 'text-[#231F1F]' : 'text-white'}`
                          : isLight ? 'text-[#231F1F]/80' : 'text-white/80'
                      }`}>
                        {bp}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      {/* Fixed Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-30 transition-colors duration-500" style={{ background: bg }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={goPrev}
            disabled={currentStep === 0}
            className={`flex items-center gap-2 px-5 py-3 rounded-lg font-medium transition-all disabled:opacity-20 disabled:cursor-not-allowed ${
              isLight
                ? 'text-[#231F1F]/60 border border-[#231F1F]/20 hover:bg-[#231F1F]/5'
                : 'text-white/70 border border-white/10 hover:bg-white/5'
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
                    ? 'w-6 h-2 bg-[#D4FC59]'
                    : idx < currentStep
                      ? `w-2 h-2 ${isLight ? 'bg-[#3100E2]/30' : 'bg-[#D4FC59]/30'}`
                      : `w-2 h-2 ${isLight ? 'bg-[#231F1F]/15' : 'bg-white/15'}`
                }`}
              />
            ))}
          </div>

          {currentStep < totalSteps - 1 ? (
            <button
              onClick={goNext}
              className="flex items-center gap-2 px-5 py-3 rounded-lg font-bold text-[#231F1F] transition-transform hover:scale-[1.02]"
              style={{ background: '#D4FC59' }}
            >
              <span className="hidden sm:inline">Siguiente</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="w-[120px]" />
          )}
        </div>
        {/* Footer credit */}
        <div className="text-center pb-3">
          <span className={`text-[10px] tracking-widest uppercase ${isLight ? 'text-[#231F1F]/20' : 'text-white/15'}`}>
            WAU Consultora
          </span>
        </div>
      </div>
    </div>
  );
}
