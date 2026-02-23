// ===== Proposal Types =====

export type ProposalStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected';

export interface ProposalItemDeliverable {
  name: string;
  description: string | null;
}

export interface ProposalItemFAQ {
  question: string;
  answer: string;
}

export interface ProposalItem {
  id: string;
  proposalId: string;
  productId: string | null;
  name: string;
  description: string | null;
  benefits: string[];
  methodology: string | null;
  deliverables: ProposalItemDeliverable[];
  requirements: string | null;
  scope: string | null;
  outOfScope: string | null;
  faqs: ProposalItemFAQ[];
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  monthlyFee: number | null;
  estimatedDurationDays: number | null;
  sortOrder: number;
  createdAt: string;
}

export interface Proposal {
  id: string;
  organizationId: string;
  dealId: string | null;
  clientId: string | null;
  proposalNumber: string;
  title: string;

  // Client info
  clientName: string;
  clientCompany: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  clientLogoUrl: string | null;

  // Content
  introduction: string | null;
  objective: string | null;
  strengths: string[];
  specificObjectives: string[];
  centralGap: { current: string; desired: string; cost?: string }[];
  gapTitle: string | null;
  gapDescription: string | null;
  phases: { name: string; periodo: string; objetivo: string; entregables: string[] }[] | null;
  hiddenSlides: string[];
  termsAndConditions: string | null;
  validityDays: number;

  // Financial
  subtotal: number;
  discountPercent: number;
  totalAmount: number;
  currency: string;
  paymentTerms: string | null;

  // Duration
  estimatedDurationDays: number | null;
  proposedStartDate: string | null;

  // Status
  status: ProposalStatus;
  sentAt: string | null;
  viewedAt: string | null;
  acceptedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;

  // Shareable
  shareToken: string;

  // Ownership
  createdBy: string;
  createdByName?: string;
  ownerId: string;
  ownerName?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;

  // Joined data
  items?: ProposalItem[];
  dealName?: string;
}

// ===== Config Maps =====

export const PROPOSAL_STATUS_CONFIG: Record<ProposalStatus, {
  label: string;
  color: string;
  bgClass: string;
}> = {
  draft: {
    label: 'Borrador',
    color: '#6b7280',
    bgClass: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  },
  sent: {
    label: 'Enviada',
    color: '#3b82f6',
    bgClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  },
  viewed: {
    label: 'Vista',
    color: '#8b5cf6',
    bgClass: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  },
  accepted: {
    label: 'Aceptada',
    color: '#22c55e',
    bgClass: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  },
  rejected: {
    label: 'Rechazada',
    color: '#ef4444',
    bgClass: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  },
};

// ===== Form Input Types =====

export interface CreateProposalInput {
  dealId?: string;
  clientId?: string;
  title: string;
  clientName: string;
  clientCompany?: string;
  clientEmail?: string;
  clientPhone?: string;
  introduction?: string;
  objective?: string;
  strengths?: string[];
  specificObjectives?: string[];
  centralGap?: { current: string; desired: string }[];
  termsAndConditions?: string;
  validityDays?: number;
  discountPercent?: number;
  paymentTerms?: string;
  proposedStartDate?: string;
  ownerId: string;
}

export interface CreateProposalItemInput {
  proposalId: string;
  productId?: string;
  name: string;
  description?: string;
  benefits?: string[];
  methodology?: string;
  deliverables?: ProposalItemDeliverable[];
  requirements?: string;
  scope?: string;
  outOfScope?: string;
  faqs?: ProposalItemFAQ[];
  unitPrice: number;
  quantity?: number;
  monthlyFee?: number;
  estimatedDurationDays?: number;
  sortOrder?: number;
}

// ===== Stats =====

export interface ProposalStats {
  totalProposals: number;
  draftCount: number;
  sentCount: number;
  viewedCount: number;
  acceptedCount: number;
  rejectedCount: number;
  totalValue: number;
  acceptedValue: number;
  conversionRate: number;
}
