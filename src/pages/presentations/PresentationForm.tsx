import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Save,
  Loader2,
  Presentation,
  Eye,
} from 'lucide-react';
import { usePresentations } from '../../context/PresentationContext';
import { useAuth } from '../../context/AuthContext';
import { supabase, getAccessTokenFresh } from '../../lib/supabase';
import { fetchWithTimeout, AI_TIMEOUT_MS } from '../../lib/fetchTimeout';
import { SLIDE_BG_COLORS, SLIDE_LAYOUT_CONFIG, getSlideAccentColor } from '../../types/presentations';
import type { SlideLayout, PresentationSlide } from '../../types/presentations';

interface LocalSlide {
  id?: string;
  title: string;
  subtitle: string;
  content: string;
  bulletPoints: string[];
  layout: SlideLayout;
  bgColor: string;
  imageUrl: string;
}

export function PresentationForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  const { appUser } = useAuth();
  const {
    getPresentation,
    addPresentation,
    updatePresentation,
    addSlide,
    updateSlide,
    deleteSlide,
    reorderSlides,
  } = usePresentations();

  // Step management
  const [step, setStep] = useState(0); // 0: info, 1: AI gen, 2: edit slides

  // Presentation info
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [author, setAuthor] = useState('');
  const [date, setDate] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientCompany, setClientCompany] = useState('');

  // AI
  const [aiText, setAiText] = useState('');
  const [aiParsing, setAiParsing] = useState(false);

  // Slides
  const [slides, setSlides] = useState<LocalSlide[]>([]);
  const [expandedSlide, setExpandedSlide] = useState<number | null>(null);
  const [previewSlide, setPreviewSlide] = useState<number | null>(null);

  // General
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState('');
  const [existingSlideIds, setExistingSlideIds] = useState<string[]>([]);

  // Load existing presentation for edit
  useEffect(() => {
    if (isEditing && id) {
      (async () => {
        setLoading(true);
        const pres = await getPresentation(id);
        if (pres) {
          setTitle(pres.title);
          setSubtitle(pres.subtitle || '');
          setAuthor(pres.author || '');
          setDate(pres.date || '');
          setClientName(pres.clientName || '');
          setClientCompany(pres.clientCompany || '');
          if (pres.slides && pres.slides.length > 0) {
            setSlides(
              pres.slides.map((s) => ({
                id: s.id,
                title: s.title,
                subtitle: s.subtitle || '',
                content: s.content || '',
                bulletPoints: s.bulletPoints || [],
                layout: s.layout as SlideLayout,
                bgColor: s.bgColor,
                imageUrl: s.imageUrl || '',
              }))
            );
            setExistingSlideIds(pres.slides.map((s) => s.id));
            setStep(2);
          }
        }
        setLoading(false);
      })();
    }
  }, [id, isEditing, getPresentation]);

  // ===== AI Generation =====
  const handleAiGenerate = async () => {
    if (!aiText.trim() || aiParsing) return;
    setAiParsing(true);
    try {
      const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
      if (!apiKey) {
        alert('API key de Anthropic no configurada');
        return;
      }

      const resp = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 4096,
          messages: [{
            role: 'user',
            content: `Analiza el siguiente texto y genera una presentacion profesional de alto impacto visual en formato JSON.

Genera un array de slides donde cada slide tiene:
- title: titulo de la slide (corto, impactante, EN MAYUSCULAS para section y bullets)
- subtitle: subtitulo decorativo en italic (ej: "Compartir", "Beneficios de", "Por que los"). Opcional pero recomendado.
- content: texto principal (1-3 oraciones, conciso)
- bulletPoints: array de puntos clave (para layout "bullets" cada punto se convierte en una card visual, maximo 4)
- layout: uno de "title", "section", "content", "bullets", "quote", "image-text"
- bgColor: color de fondo, rotar entre "#231F1F" (oscuro), "#FF4632" (rojo), "#FFFBE8" (claro), "#3100E2" (azul), "#D4FC59" (lima), "#6B21A8" (purpura)

Layouts disponibles:
- "title": portada principal con titulo grande y logo
- "section": slide de seccion con titulo impactante gigante (para separar temas)
- "content": texto con contenido en card redondeada
- "bullets": grilla de 2-4 cards de colores, cada bulletPoint = una card
- "quote": cita destacada grande en italic
- "image-text": layout dividido texto izq + espacio para imagen der

Reglas:
- La primera slide DEBE ser layout "title" con bgColor "#231F1F"
- Maximo 8-12 slides en total
- Alternar colores de fondo para variedad visual impactante
- Para "bullets" maximo 4 puntos (se muestran como cards coloridas)
- Para "section" el titulo debe ser grande e impactante, en mayusculas
- Incluir al menos 1 slide de tipo "section" y 1 de "bullets" para variedad
- Los subtitles deben ser cortos y decorativos (1-3 palabras)
- Responde SOLO con el JSON, sin markdown, sin backticks, sin explicaciones

Formato de respuesta exacto:
{"slides": [{"title": "...", "subtitle": "...", "content": "...", "bulletPoints": ["..."], "layout": "...", "bgColor": "..."}]}

Texto:
${aiText}`,
          }],
        }),
      }, AI_TIMEOUT_MS);

      if (!resp.ok) {
        const errBody = await resp.text().catch(() => '');
        throw new Error(`API error ${resp.status}: ${errBody.slice(0, 200)}`);
      }
      const data = await resp.json();
      const content = data.content?.[0]?.text || '';
      if (!content) throw new Error('La IA no genero contenido');

      const jsonStr = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      let parsed: any;
      try {
        parsed = JSON.parse(jsonStr);
      } catch {
        throw new Error('La IA devolvio un formato invalido');
      }

      if (parsed.slides && Array.isArray(parsed.slides) && parsed.slides.length > 0) {
        setSlides(parsed.slides.map((s: any) => ({
          title: s.title || '',
          subtitle: s.subtitle || '',
          content: s.content || '',
          bulletPoints: s.bulletPoints || [],
          layout: s.layout || 'content',
          bgColor: s.bgColor || '#231F1F',
          imageUrl: '',
        })));
        setStep(2);
      }
    } catch (err: any) {
      console.error('Error generating with AI:', err);
      alert('Error al generar la presentacion: ' + (err?.message || 'Error desconocido'));
    } finally {
      setAiParsing(false);
    }
  };

  // ===== Slide management =====
  const addLocalSlide = () => {
    setSlides((prev) => {
      setExpandedSlide(prev.length);
      return [
        ...prev,
        { title: '', subtitle: '', content: '', bulletPoints: [], layout: 'content', bgColor: '#231F1F', imageUrl: '' },
      ];
    });
  };

  const removeSlide = (index: number) => {
    setSlides((prev) => prev.filter((_, i) => i !== index));
    setExpandedSlide(null);
  };

  const moveSlide = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= slides.length) return;
    const newSlides = [...slides];
    [newSlides[index], newSlides[newIndex]] = [newSlides[newIndex], newSlides[index]];
    setSlides(newSlides);
    setExpandedSlide(newIndex);
  };

  const updateLocalSlide = (index: number, field: keyof LocalSlide, value: any) => {
    setSlides((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  };

  const addBulletPoint = (slideIndex: number) => {
    setSlides((prev) =>
      prev.map((s, i) =>
        i === slideIndex ? { ...s, bulletPoints: [...s.bulletPoints, ''] } : s
      )
    );
  };

  const updateBulletPoint = (slideIndex: number, bulletIndex: number, value: string) => {
    setSlides((prev) =>
      prev.map((s, i) =>
        i === slideIndex
          ? { ...s, bulletPoints: s.bulletPoints.map((b, j) => (j === bulletIndex ? value : b)) }
          : s
      )
    );
  };

  const removeBulletPoint = (slideIndex: number, bulletIndex: number) => {
    setSlides((prev) =>
      prev.map((s, i) =>
        i === slideIndex
          ? { ...s, bulletPoints: s.bulletPoints.filter((_, j) => j !== bulletIndex) }
          : s
      )
    );
  };

  // ===== Save =====
  // Direct fetch to Supabase REST API - bypasses client auth/lock issues
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const getAccessToken = (): Promise<string> => {
    return getAccessTokenFresh();
  };

  const directInsert = async (table: string, body: Record<string, any>): Promise<any> => {
    const token = await getAccessToken();
    const resp = await fetchWithTimeout(`${supabaseUrl}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${token}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      throw new Error(`Error ${resp.status}: ${errText.slice(0, 200)}`);
    }
    const arr = await resp.json();
    return Array.isArray(arr) ? arr[0] : arr;
  };

  const directUpdate = async (table: string, id: string, body: Record<string, any>): Promise<void> => {
    const token = await getAccessToken();
    const resp = await fetchWithTimeout(`${supabaseUrl}/rest/v1/${table}?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      throw new Error(`Error ${resp.status}: ${errText.slice(0, 200)}`);
    }
  };

  const directDelete = async (table: string, id: string): Promise<void> => {
    const token = await getAccessToken();
    const resp = await fetchWithTimeout(`${supabaseUrl}/rest/v1/${table}?id=eq.${id}`, {
      method: 'DELETE',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      throw new Error(`Error ${resp.status}: ${errText.slice(0, 200)}`);
    }
  };

  const handleSave = async () => {
    if (!appUser) return;
    if (!title.trim()) { alert('Ingresa un titulo'); return; }
    if (slides.length === 0) { alert('Agrega al menos una slide'); return; }
    setSaving(true);
    setSaveProgress('Creando presentacion...');

    try {
      let presentationId = id;

      if (isEditing && presentationId) {
        setSaveProgress('Actualizando presentacion...');
        const presUpdates: Record<string, any> = {
          title,
          subtitle: subtitle || null,
          author: author || null,
          date: date || null,
          client_name: clientName || null,
          client_company: clientCompany || null,
          updated_at: new Date().toISOString(),
        };
        await directUpdate('presentations', presentationId, presUpdates);

        const currentSlideIds = slides.filter((s) => s.id).map((s) => s.id!);
        const toDelete = existingSlideIds.filter((eid) => !currentSlideIds.includes(eid));
        for (const sid of toDelete) {
          await directDelete('presentation_slides', sid);
        }

        for (let i = 0; i < slides.length; i++) {
          const s = slides[i];
          setSaveProgress(`Guardando slide ${i + 1}/${slides.length}...`);
          const slideRow: Record<string, any> = {
            title: s.title,
            content: s.content || null,
            bullet_points: s.bulletPoints,
            layout: s.layout,
            bg_color: s.bgColor,
            sort_order: i,
            subtitle: s.subtitle || null,
            image_url: s.imageUrl || null,
          };

          if (s.id) {
            await directUpdate('presentation_slides', s.id, slideRow);
          } else {
            slideRow.presentation_id = presentationId;
            await directInsert('presentation_slides', slideRow);
          }
        }
      } else {
        setSaveProgress('Creando presentacion...');
        const presRow: Record<string, any> = {
          organization_id: appUser.organizationId,
          title,
          subtitle: subtitle || null,
          author: author || null,
          client_name: clientName || null,
          client_company: clientCompany || null,
          created_by: appUser.id,
          status: 'draft',
        };
        if (date) presRow.date = date;

        const created = await directInsert('presentations', presRow);
        presentationId = created.id;
        console.log('[save] presentation created:', presentationId);

        for (let i = 0; i < slides.length; i++) {
          const s = slides[i];
          setSaveProgress(`Guardando slide ${i + 1}/${slides.length}...`);
          const slideRow: Record<string, any> = {
            presentation_id: presentationId,
            title: s.title,
            content: s.content || null,
            bullet_points: s.bulletPoints,
            layout: s.layout,
            bg_color: s.bgColor,
            sort_order: i,
            subtitle: s.subtitle || null,
            image_url: s.imageUrl || null,
          };
          await directInsert('presentation_slides', slideRow);
        }
      }

      navigate(`/presentations/${presentationId}`);
    } catch (err: any) {
      console.error('Error saving presentation:', err);
      alert('Error al guardar: ' + (err?.message || 'Error desconocido'));
    } finally {
      setSaving(false);
      setSaveProgress('');
    }
  };

  // ===== Slide preview helper =====
  const getSlideTextColorClass = (bgColor: string) => {
    return bgColor === '#FFFBE8' || bgColor === '#D4FC59' ? 'text-[#231F1F]' : 'text-white';
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/presentations')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#3100E2]/10 dark:bg-[#3100E2]/20 flex items-center justify-center">
            <Presentation className="w-5 h-5 text-[#3100E2]" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isEditing ? 'Editar presentacion' : 'Nueva presentacion'}
          </h1>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-8">
        {['Info basica', 'Generar con IA', 'Editar slides'].map((label, i) => (
          <button
            key={i}
            onClick={() => {
              if (i === 0 || (i === 1 && step >= 0) || (i === 2 && slides.length > 0)) setStep(i);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              step === i
                ? 'bg-[#3100E2] text-white'
                : step > i
                  ? 'bg-[#3100E2]/10 text-[#3100E2] dark:bg-[#3100E2]/20'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">
              {i + 1}
            </span>
            {label}
          </button>
        ))}
      </div>

      {/* ===== STEP 0: Info basica ===== */}
      {step === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Titulo *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Estrategia digital 2025"
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#3100E2]/50 focus:border-[#3100E2] outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subtitulo</label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Ej: Plan de accion Q1"
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#3100E2]/50 focus:border-[#3100E2] outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Autor</label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Nombre del presentador"
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#3100E2]/50 focus:border-[#3100E2] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#3100E2]/50 focus:border-[#3100E2] outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cliente (opcional)</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Nombre del cliente"
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#3100E2]/50 focus:border-[#3100E2] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Empresa (opcional)</label>
              <input
                type="text"
                value={clientCompany}
                onChange={(e) => setClientCompany(e.target.value)}
                placeholder="Nombre de la empresa"
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#3100E2]/50 focus:border-[#3100E2] outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={() => {
                if (!title.trim()) {
                  alert('Ingresa un titulo');
                  return;
                }
                setStep(1);
              }}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#3100E2] text-white rounded-lg font-semibold hover:bg-[#2800c0] transition-colors"
            >
              Siguiente
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ===== STEP 1: AI Generation ===== */}
      {step === 1 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Generar con IA</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pega tu texto y la IA lo convierte en slides</p>
            </div>
          </div>

          <textarea
            value={aiText}
            onChange={(e) => setAiText(e.target.value)}
            placeholder="Pega aca el texto de tu presentacion, informe, notas, o cualquier contenido que quieras convertir en slides...&#10;&#10;Puede ser un documento completo, bullet points, notas de reunion, etc."
            className="w-full h-64 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none resize-y"
          />

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setStep(0)}
              className="flex items-center gap-2 px-4 py-2.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setSlides([{
                    title: title,
                    subtitle: '',
                    content: subtitle || '',
                    bulletPoints: [],
                    layout: 'title',
                    bgColor: '#231F1F',
                    imageUrl: '',
                  }]);
                  setStep(2);
                }}
                className="px-4 py-2.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-sm"
              >
                Crear manualmente
              </button>
              <button
                onClick={handleAiGenerate}
                disabled={aiParsing || !aiText.trim()}
                className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {aiParsing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generar presentacion
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== STEP 2: Edit Slides ===== */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Slides List */}
          {slides.map((slide, index) => {
            const isExpanded = expandedSlide === index;
            const bgCfg = SLIDE_BG_COLORS.find((c) => c.value === slide.bgColor) || SLIDE_BG_COLORS[0];
            const layoutCfg = SLIDE_LAYOUT_CONFIG[slide.layout];

            return (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                {/* Slide header */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  onClick={() => setExpandedSlide(isExpanded ? null : index)}
                >
                  <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  <div
                    className="w-8 h-5 rounded flex-shrink-0 border border-gray-200 dark:border-gray-600"
                    style={{ background: slide.bgColor }}
                  />
                  <span className="text-xs font-mono text-gray-400 flex-shrink-0">
                    {index + 1}
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white truncate flex-1">
                    {slide.title || '(sin titulo)'}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 flex-shrink-0">
                    {layoutCfg.label}
                  </span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); moveSlide(index, 'up'); }}
                      disabled={index === 0}
                      className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-20"
                    >
                      <ChevronUp className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); moveSlide(index, 'down'); }}
                      disabled={index === slides.length - 1}
                      className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-20"
                    >
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setPreviewSlide(previewSlide === index ? null : index); }}
                      className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      <Eye className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeSlide(index); }}
                      className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>

                {/* Preview */}
                {previewSlide === index && (
                  <div className="mx-4 mb-3">
                    <div
                      className="rounded-lg p-6 aspect-[16/9] max-h-48 overflow-hidden flex flex-col justify-center"
                      style={{ background: slide.bgColor }}
                    >
                      {slide.layout === 'title' ? (
                        <div>
                          <h3 className={`text-xl font-bold ${getSlideTextColorClass(slide.bgColor)} leading-tight`}>
                            {slide.title || 'Titulo'}
                          </h3>
                          {slide.content && (
                            <p className={`text-sm mt-2 ${slide.bgColor === '#FFFBE8' ? 'text-[#231F1F]/70' : 'text-white/70'}`}>
                              {slide.content}
                            </p>
                          )}
                        </div>
                      ) : slide.layout === 'quote' ? (
                        <div>
                          <div className="w-8 h-1 mb-3" style={{ background: getSlideAccentColor(slide.bgColor) }} />
                          <p className={`text-lg italic ${getSlideTextColorClass(slide.bgColor)} leading-relaxed`}>
                            "{slide.content || 'Cita'}"
                          </p>
                        </div>
                      ) : (
                        <div>
                          <h3 className={`text-sm font-bold ${getSlideTextColorClass(slide.bgColor)} mb-2`}>
                            {slide.title}
                          </h3>
                          {slide.content && (
                            <p className={`text-xs ${slide.bgColor === '#FFFBE8' ? 'text-[#231F1F]/70' : 'text-white/70'} mb-2`}>
                              {slide.content}
                            </p>
                          )}
                          {slide.bulletPoints.length > 0 && (
                            <div className="space-y-0.5">
                              {slide.bulletPoints.slice(0, 4).map((bp, i) => (
                                <p key={i} className={`text-xs ${slide.bgColor === '#FFFBE8' ? 'text-[#231F1F]/60' : 'text-white/60'}`}>
                                  • {bp}
                                </p>
                              ))}
                              {slide.bulletPoints.length > 4 && (
                                <p className={`text-xs ${slide.bgColor === '#FFFBE8' ? 'text-[#231F1F]/40' : 'text-white/40'}`}>
                                  +{slide.bulletPoints.length - 4} mas...
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Expanded edit form */}
                {isExpanded && (
                  <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Titulo</label>
                      <input
                        type="text"
                        value={slide.title}
                        onChange={(e) => updateLocalSlide(index, 'title', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-[#3100E2]/50 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Subtitulo <span className="text-gray-400 font-normal">(decorativo, italic)</span></label>
                      <input
                        type="text"
                        value={slide.subtitle}
                        onChange={(e) => updateLocalSlide(index, 'subtitle', e.target.value)}
                        placeholder="Ej: Compartir, Beneficios de, Elementos..."
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-[#3100E2]/50 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Contenido</label>
                      <textarea
                        value={slide.content}
                        onChange={(e) => updateLocalSlide(index, 'content', e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-[#3100E2]/50 outline-none resize-y"
                      />
                    </div>

                    {/* Bullet Points */}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Puntos</label>
                      <div className="space-y-2">
                        {slide.bulletPoints.map((bp, bpIdx) => (
                          <div key={bpIdx} className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 w-4 flex-shrink-0">{bpIdx + 1}.</span>
                            <input
                              type="text"
                              value={bp}
                              onChange={(e) => updateBulletPoint(index, bpIdx, e.target.value)}
                              className="flex-1 px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-[#3100E2]/50 outline-none"
                            />
                            <button
                              onClick={() => removeBulletPoint(index, bpIdx)}
                              className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => addBulletPoint(index)}
                          className="flex items-center gap-1 text-xs text-[#3100E2] hover:underline"
                        >
                          <Plus className="w-3 h-3" /> Agregar punto
                        </button>
                      </div>
                    </div>

                    {/* Layout & Color */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Layout</label>
                        <select
                          value={slide.layout}
                          onChange={(e) => updateLocalSlide(index, 'layout', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-[#3100E2]/50 outline-none"
                        >
                          {Object.entries(SLIDE_LAYOUT_CONFIG).map(([key, cfg]) => (
                            <option key={key} value={key}>{cfg.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Color de fondo</label>
                        <div className="flex items-center gap-2 flex-wrap">
                          {SLIDE_BG_COLORS.map((c) => (
                            <button
                              key={c.value}
                              onClick={() => updateLocalSlide(index, 'bgColor', c.value)}
                              className={`w-8 h-8 rounded-lg border-2 transition-all ${
                                slide.bgColor === c.value
                                  ? 'border-[#3100E2] scale-110'
                                  : 'border-gray-200 dark:border-gray-600'
                              }`}
                              style={{ background: c.value }}
                              title={c.label}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Image URL */}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        URL de imagen <span className="text-gray-400 font-normal">(opcional - para section, image-text)</span>
                      </label>
                      <input
                        type="url"
                        value={slide.imageUrl}
                        onChange={(e) => updateLocalSlide(index, 'imageUrl', e.target.value)}
                        placeholder="https://ejemplo.com/imagen.jpg"
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-[#3100E2]/50 outline-none"
                      />
                      {slide.imageUrl && (
                        <div className="mt-2 relative rounded-lg overflow-hidden h-24 bg-gray-100 dark:bg-gray-800">
                          <img
                            src={slide.imageUrl}
                            alt="Preview"
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Add slide button */}
          <button
            onClick={addLocalSlide}
            className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-400 hover:border-[#3100E2] hover:text-[#3100E2] transition-colors flex items-center justify-center gap-2 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Agregar slide
          </button>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-2 px-4 py-2.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Regenerar con IA
            </button>

            <button
              onClick={handleSave}
              disabled={saving || slides.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#D4FC59] text-[#231F1F] rounded-lg font-semibold hover:bg-[#c5ed4a] disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {saveProgress || 'Guardando...'}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Guardar presentacion
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
