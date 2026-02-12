// ===== Presentation Types =====

export type PresentationStatus = 'draft' | 'published';

export type SlideLayout = 'title' | 'content' | 'bullets' | 'quote';

export interface PresentationSlide {
  id: string;
  presentationId: string;
  title: string;
  content: string | null;
  bulletPoints: string[];
  layout: SlideLayout;
  bgColor: string;
  sortOrder: number;
  createdAt: string;
}

export interface Presentation {
  id: string;
  organizationId: string;
  title: string;
  subtitle: string | null;
  author: string | null;
  date: string | null;
  clientName: string | null;
  clientCompany: string | null;
  status: PresentationStatus;
  shareToken: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  slides?: PresentationSlide[];
}

// ===== Config Maps =====

export const PRESENTATION_STATUS_CONFIG: Record<PresentationStatus, {
  label: string;
  color: string;
  bgClass: string;
}> = {
  draft: {
    label: 'Borrador',
    color: '#6b7280',
    bgClass: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  },
  published: {
    label: 'Publicada',
    color: '#22c55e',
    bgClass: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  },
};

export const SLIDE_LAYOUT_CONFIG: Record<SlideLayout, { label: string }> = {
  title: { label: 'Portada' },
  content: { label: 'Contenido' },
  bullets: { label: 'Lista' },
  quote: { label: 'Cita' },
};

export const SLIDE_BG_COLORS = [
  { value: '#231F1F', label: 'Oscuro', textColor: 'white' },
  { value: '#FF4632', label: 'Rojo', textColor: 'white' },
  { value: '#FFFBE8', label: 'Claro', textColor: 'dark' },
  { value: '#3100E2', label: 'Azul', textColor: 'white' },
];

// ===== Form Input Types =====

export interface CreatePresentationInput {
  title: string;
  subtitle?: string;
  author?: string;
  date?: string;
  clientName?: string;
  clientCompany?: string;
}

export interface CreateSlideInput {
  presentationId: string;
  title: string;
  content?: string;
  bulletPoints?: string[];
  layout?: SlideLayout;
  bgColor?: string;
  sortOrder?: number;
}

export interface UpdateSlideInput {
  title?: string;
  content?: string | null;
  bulletPoints?: string[];
  layout?: SlideLayout;
  bgColor?: string;
  sortOrder?: number;
}
