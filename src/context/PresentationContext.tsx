import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase, onTabResumed } from '../lib/supabase';
import { preflightToken } from '../lib/preflight';
import { useAuth } from './AuthContext';
import type {
  Presentation,
  PresentationSlide,
  PresentationStatus,
  CreatePresentationInput,
  CreateSlideInput,
  UpdateSlideInput,
} from '../types/presentations';

interface PresentationContextType {
  presentations: Presentation[];
  loading: boolean;
  error: string | null;

  fetchPresentations: () => Promise<void>;
  getPresentation: (id: string) => Promise<Presentation | null>;
  addPresentation: (data: CreatePresentationInput) => Promise<Presentation>;
  updatePresentation: (id: string, updates: Partial<Presentation>) => Promise<void>;
  deletePresentation: (id: string) => Promise<void>;
  duplicatePresentation: (id: string) => Promise<Presentation | null>;

  fetchSlides: (presentationId: string) => Promise<PresentationSlide[]>;
  addSlide: (data: CreateSlideInput) => Promise<PresentationSlide>;
  updateSlide: (id: string, updates: UpdateSlideInput) => Promise<void>;
  deleteSlide: (id: string) => Promise<void>;
  reorderSlides: (presentationId: string, slideIds: string[]) => Promise<void>;

  publishPresentation: (id: string) => Promise<string>;
}

const PresentationContext = createContext<PresentationContextType | undefined>(undefined);

function mapPresentation(p: any): Presentation {
  return {
    id: p.id,
    organizationId: p.organization_id,
    title: p.title,
    subtitle: p.subtitle,
    author: p.author,
    date: p.date,
    clientName: p.client_name,
    clientCompany: p.client_company,
    status: p.status as PresentationStatus,
    shareToken: p.share_token,
    createdBy: p.created_by,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}

function mapSlide(s: any): PresentationSlide {
  return {
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
  };
}

export function PresentationProvider({ children }: { children: ReactNode }) {
  const { appUser } = useAuth();
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ===== Fetch Presentations =====
  const fetchPresentations = useCallback(async () => {
    if (!appUser?.organizationId) return;

    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('presentations')
        .select('*')
        .eq('organization_id', appUser.organizationId)
        .order('created_at', { ascending: false });

      if (err) throw new Error(err.message);
      setPresentations((data || []).map(mapPresentation));
    } catch (err: any) {
      console.error('Error fetching presentations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [appUser?.organizationId]);

  useEffect(() => {
    if (appUser?.organizationId) {
      fetchPresentations();
    }
  }, [appUser?.organizationId, fetchPresentations]);

  // ===== Fetch Slides =====
  const fetchSlides = useCallback(async (presentationId: string): Promise<PresentationSlide[]> => {
    const { data, error: err } = await supabase
      .from('presentation_slides')
      .select('*')
      .eq('presentation_id', presentationId)
      .order('sort_order', { ascending: true });

    if (err) throw new Error(err.message);
    return (data || []).map(mapSlide);
  }, []);

  // ===== Get Single Presentation =====
  const getPresentation = useCallback(async (id: string): Promise<Presentation | null> => {
    try {
      const { data, error: err } = await supabase
        .from('presentations')
        .select('*')
        .eq('id', id)
        .single();

      if (err) throw new Error(err.message);

      const slides = await fetchSlides(id);
      return { ...mapPresentation(data), slides };
    } catch (err: any) {
      console.error('Error getting presentation:', err);
      return null;
    }
  }, [fetchSlides]);

  // ===== Add Presentation =====
  const addPresentation = useCallback(
    async (data: CreatePresentationInput): Promise<Presentation> => {
    await preflightToken();
      if (!appUser?.organizationId) throw new Error('No organization');

      const insertData: Record<string, any> = {
        organization_id: appUser.organizationId,
        title: data.title,
        subtitle: data.subtitle || null,
        author: data.author || null,
        client_name: data.clientName || null,
        client_company: data.clientCompany || null,
        created_by: appUser.id,
        status: 'draft',
      };
      if (data.date) insertData.date = data.date;

      // Try normal supabase client first
      console.log('[addPresentation] attempting insert...');
      const { data: created, error: err } = await supabase
        .from('presentations')
        .insert(insertData)
        .select()
        .single();

      if (err) throw new Error(err.message);

      const newPres = mapPresentation(created);
      setPresentations((prev) => [newPres, ...prev]);
      return newPres;
    },
    [appUser]
  );

  // ===== Update Presentation =====
  const updatePresentation = useCallback(
    async (id: string, updates: Partial<Presentation>) => {
      const dbUpdates: Record<string, any> = {};

      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.subtitle !== undefined) dbUpdates.subtitle = updates.subtitle;
      if (updates.author !== undefined) dbUpdates.author = updates.author;
      if (updates.date !== undefined) dbUpdates.date = updates.date || null;
      if (updates.clientName !== undefined) dbUpdates.client_name = updates.clientName;
      if (updates.clientCompany !== undefined) dbUpdates.client_company = updates.clientCompany;
      if (updates.status !== undefined) dbUpdates.status = updates.status;

      dbUpdates.updated_at = new Date().toISOString();

      const { error: err } = await supabase.from('presentations').update(dbUpdates).eq('id', id);
      if (err) throw new Error(err.message);

      setPresentations((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...updates, updatedAt: dbUpdates.updated_at } : p))
      );
    },
    []
  );

  // ===== Delete Presentation =====
  const deletePresentation = useCallback(async (id: string) => {
    const { error: err } = await supabase.from('presentations').delete().eq('id', id);
    if (err) throw new Error(err.message);
    setPresentations((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // ===== Add Slide =====
  const addSlide = useCallback(async (data: CreateSlideInput): Promise<PresentationSlide> => {
    await preflightToken();
    const insertData: Record<string, any> = {
      presentation_id: data.presentationId,
      title: data.title,
      content: data.content || null,
      bullet_points: data.bulletPoints || [],
      layout: data.layout || 'content',
      bg_color: data.bgColor || '#231F1F',
      sort_order: data.sortOrder ?? 0,
    };
    // Only include new columns if they have values (backwards-compatible)
    if (data.subtitle) insertData.subtitle = data.subtitle;
    if (data.imageUrl) insertData.image_url = data.imageUrl;

    const { data: created, error: err } = await supabase
      .from('presentation_slides')
      .insert(insertData)
      .select()
      .single();

    if (err) throw new Error(err.message);
    return mapSlide(created);
  }, []);

  // ===== Update Slide =====
  const updateSlide = useCallback(async (id: string, updates: UpdateSlideInput) => {
    const dbUpdates: Record<string, any> = {};

    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.content !== undefined) dbUpdates.content = updates.content;
    if (updates.bulletPoints !== undefined) dbUpdates.bullet_points = updates.bulletPoints;
    if (updates.layout !== undefined) dbUpdates.layout = updates.layout;
    if (updates.bgColor !== undefined) dbUpdates.bg_color = updates.bgColor;
    if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;
    // Only include new columns if explicitly set
    if (updates.subtitle !== undefined) dbUpdates.subtitle = updates.subtitle;
    if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl;

    const { error: err } = await supabase.from('presentation_slides').update(dbUpdates).eq('id', id);
    if (err) throw new Error(err.message);
  }, []);

  // ===== Delete Slide =====
  const deleteSlide = useCallback(async (id: string) => {
    const { error: err } = await supabase.from('presentation_slides').delete().eq('id', id);
    if (err) throw new Error(err.message);
  }, []);

  // ===== Reorder Slides =====
  const reorderSlides = useCallback(async (_presentationId: string, slideIds: string[]) => {
    const results = await Promise.all(
      slideIds.map((id, index) =>
        supabase.from('presentation_slides').update({ sort_order: index }).eq('id', id)
      )
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) throw new Error(failed.error.message);
  }, []);

  // ===== Duplicate Presentation =====
  const duplicatePresentation = useCallback(
    async (id: string): Promise<Presentation | null> => {
      const original = presentations.find((p) => p.id === id);
      if (!original) return null;

      const newPres = await addPresentation({
        title: `${original.title} (copia)`,
        subtitle: original.subtitle || undefined,
        author: original.author || undefined,
        date: original.date || undefined,
        clientName: original.clientName || undefined,
        clientCompany: original.clientCompany || undefined,
      });

      const slides = await fetchSlides(id);
      await Promise.all(
        slides.map((slide) =>
          addSlide({
            presentationId: newPres.id,
            title: slide.title,
            subtitle: slide.subtitle || undefined,
            content: slide.content || undefined,
            bulletPoints: slide.bulletPoints,
            layout: slide.layout,
            bgColor: slide.bgColor,
            imageUrl: slide.imageUrl || undefined,
            sortOrder: slide.sortOrder,
          })
        )
      );

      return newPres;
    },
    [presentations, addPresentation, fetchSlides, addSlide]
  );

  // ===== Publish Presentation =====
  const publishPresentation = useCallback(async (id: string): Promise<string> => {
    const { data, error: err } = await supabase
      .from('presentations')
      .update({ status: 'published', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('share_token')
      .single();

    if (err) throw new Error(err.message);

    setPresentations((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'published' as PresentationStatus } : p))
    );

    return data.share_token;
  }, []);

  // ===== REALTIME =====
  useEffect(() => {
    const orgId = appUser?.organizationId;
    if (!orgId) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const debounce = (fn: () => void) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(fn, 300);
    };
    const channel = supabase
      .channel(`presentations:${orgId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presentations', filter: `organization_id=eq.${orgId}` },
        () => debounce(fetchPresentations))
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [appUser?.organizationId, fetchPresentations]);

  useEffect(() => {
    if (!appUser?.organizationId) return;
    return onTabResumed(() => { fetchPresentations(); });
  }, [appUser?.organizationId, fetchPresentations]);

  return (
    <PresentationContext.Provider
      value={{
        presentations,
        loading,
        error,
        fetchPresentations,
        getPresentation,
        addPresentation,
        updatePresentation,
        deletePresentation,
        duplicatePresentation,
        fetchSlides,
        addSlide,
        updateSlide,
        deleteSlide,
        reorderSlides,
        publishPresentation,
      }}
    >
      {children}
    </PresentationContext.Provider>
  );
}

export function usePresentations() {
  const context = useContext(PresentationContext);
  if (!context) {
    throw new Error('usePresentations must be used within PresentationProvider');
  }
  return context;
}
