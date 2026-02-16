// ===== Presentation Types =====

export type PresentationStatus = 'draft' | 'published';

export type SlideLayout = 'title' | 'section' | 'content' | 'bullets' | 'quote' | 'image-text';

export interface PresentationSlide {
  id: string;
  presentationId: string;
  title: string;
  subtitle: string | null;
  content: string | null;
  bulletPoints: string[];
  layout: SlideLayout;
  bgColor: string;
  imageUrl: string | null;
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
  section: { label: 'Sección' },
  content: { label: 'Contenido' },
  bullets: { label: 'Cards' },
  quote: { label: 'Cita' },
  'image-text': { label: 'Imagen + Texto' },
};

export const SLIDE_BG_COLORS = [
  { value: '#231F1F', label: 'Oscuro', textColor: 'white' },
  { value: '#FF4632', label: 'Rojo', textColor: 'white' },
  { value: '#FFFBE8', label: 'Claro', textColor: 'dark' },
  { value: '#3100E2', label: 'Azul', textColor: 'white' },
  { value: '#D4FC59', label: 'Lima', textColor: 'dark' },
  { value: '#6B21A8', label: 'Púrpura', textColor: 'white' },
];

// Accent color per background
export function getSlideAccentColor(bgColor: string): string {
  switch (bgColor) {
    case '#FFFBE8': return '#FF4632';
    case '#D4FC59': return '#3100E2';
    default: return '#D4FC59'; // lime for dark, red, blue, purple
  }
}

export function getSlideTextColor(bgColor: string): string {
  return bgColor === '#FFFBE8' || bgColor === '#D4FC59' ? '#231F1F' : '#FFFFFF';
}

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
  subtitle?: string;
  content?: string;
  bulletPoints?: string[];
  layout?: SlideLayout;
  bgColor?: string;
  imageUrl?: string;
  sortOrder?: number;
}

export interface UpdateSlideInput {
  title?: string;
  subtitle?: string | null;
  content?: string | null;
  bulletPoints?: string[];
  layout?: SlideLayout;
  bgColor?: string;
  imageUrl?: string | null;
  sortOrder?: number;
}
