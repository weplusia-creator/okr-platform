import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type {
  Proposal,
  ProposalItem,
  ProposalStatus,
  CreateProposalInput,
  CreateProposalItemInput,
  ProposalStats,
  ProposalItemDeliverable,
} from '../types/proposals';

interface ProposalContextType {
  proposals: Proposal[];
  loading: boolean;
  error: string | null;

  // Proposals CRUD
  fetchProposals: () => Promise<void>;
  getProposal: (id: string) => Promise<Proposal | null>;
  addProposal: (data: CreateProposalInput) => Promise<Proposal | null>;
  updateProposal: (id: string, updates: Partial<Proposal>) => Promise<void>;
  deleteProposal: (id: string) => Promise<void>;
  duplicateProposal: (id: string) => Promise<Proposal | null>;

  // Proposal Items
  fetchProposalItems: (proposalId: string) => Promise<ProposalItem[]>;
  addProposalItem: (data: CreateProposalItemInput) => Promise<ProposalItem | null>;
  updateProposalItem: (id: string, updates: Partial<ProposalItem>) => Promise<void>;
  deleteProposalItem: (id: string) => Promise<void>;
  reorderProposalItems: (proposalId: string, itemIds: string[]) => Promise<void>;

  // Status Management
  sendProposal: (id: string) => Promise<string>;
  markAsViewed: (id: string) => Promise<void>;
  acceptProposal: (id: string) => Promise<void>;
  rejectProposal: (id: string, reason: string) => Promise<void>;

  // Public Access
  getProposalByToken: (token: string) => Promise<{ proposal: Proposal; items: ProposalItem[] } | null>;

  // Helpers
  recalculateTotals: (proposalId: string) => Promise<void>;
  getStats: () => ProposalStats;
  generateProposalNumber: () => Promise<string>;
}

const ProposalContext = createContext<ProposalContextType | undefined>(undefined);

export function ProposalProvider({ children }: { children: ReactNode }) {
  const { appUser } = useAuth();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ===== Generate Proposal Number =====
  const generateProposalNumber = useCallback(async (): Promise<string> => {
    const year = new Date().getFullYear();
    const prefix = `PROP-${year}-`;

    const { data } = await supabase
      .from('proposals')
      .select('proposal_number')
      .like('proposal_number', `${prefix}%`)
      .order('proposal_number', { ascending: false })
      .limit(1);

    let seq = 1;
    if (data && data.length > 0) {
      const lastNum = data[0].proposal_number;
      const match = lastNum.match(/PROP-\d{4}-(\d+)/);
      if (match) {
        seq = parseInt(match[1], 10) + 1;
      }
    }

    return `${prefix}${seq.toString().padStart(3, '0')}`;
  }, []);

  // ===== Fetch Proposals =====
  const fetchProposals = useCallback(async () => {
    if (!appUser?.organizationId) return;

    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('proposals')
        .select(`
          *,
          owner:users!proposals_owner_id_fkey(full_name),
          creator:users!proposals_created_by_fkey(full_name)
        `)
        .eq('organization_id', appUser.organizationId)
        .order('created_at', { ascending: false });

      if (err) throw err;

      setProposals(
        (data || []).map((p: any) => ({
          id: p.id,
          organizationId: p.organization_id,
          dealId: p.deal_id,
          clientId: p.client_id,
          proposalNumber: p.proposal_number,
          title: p.title,
          clientName: p.client_name,
          clientCompany: p.client_company,
          clientEmail: p.client_email,
          clientPhone: p.client_phone,
          clientLogoUrl: p.client_logo_url,
          introduction: p.introduction,
          objective: p.objective,
          strengths: p.strengths || [],
          specificObjectives: p.specific_objectives || [],
          centralGap: p.central_gap || [],
          gapTitle: p.gap_title || null,
          gapDescription: p.gap_description || null,
          phases: p.phases || null,
          planAccion: p.plan_accion || null,
          hiddenSlides: p.hidden_slides || [],
          termsAndConditions: p.terms_and_conditions,
          validityDays: p.validity_days,
          subtotal: parseFloat(p.subtotal) || 0,
          discountPercent: parseFloat(p.discount_percent) || 0,
          totalAmount: parseFloat(p.total_amount) || 0,
          currency: p.currency,
          paymentTerms: p.payment_terms,
          estimatedDurationDays: p.estimated_duration_days,
          proposedStartDate: p.proposed_start_date,
          status: p.status as ProposalStatus,
          sentAt: p.sent_at,
          viewedAt: p.viewed_at,
          acceptedAt: p.accepted_at,
          rejectedAt: p.rejected_at,
          rejectionReason: p.rejection_reason,
          shareToken: p.share_token,
          createdBy: p.created_by,
          createdByName: p.creator?.full_name,
          ownerId: p.owner_id,
          ownerName: p.owner?.full_name,
          createdAt: p.created_at,
          updatedAt: p.updated_at,
        }))
      );
    } catch (err: any) {
      console.error('Error fetching proposals:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [appUser?.organizationId]);

  useEffect(() => {
    if (appUser?.organizationId) {
      fetchProposals();
    }
  }, [appUser?.organizationId, fetchProposals]);

  // ===== Get Single Proposal =====
  const getProposal = useCallback(async (id: string): Promise<Proposal | null> => {
    try {
      const { data, error: err } = await supabase
        .from('proposals')
        .select(`
          *,
          owner:users!proposals_owner_id_fkey(full_name),
          creator:users!proposals_created_by_fkey(full_name)
        `)
        .eq('id', id)
        .single();

      if (err) throw err;

      return {
        id: data.id,
        organizationId: data.organization_id,
        dealId: data.deal_id,
        clientId: data.client_id,
        proposalNumber: data.proposal_number,
        title: data.title,
        clientName: data.client_name,
        clientCompany: data.client_company,
        clientEmail: data.client_email,
        clientPhone: data.client_phone,
        clientLogoUrl: data.client_logo_url,
        introduction: data.introduction,
        objective: data.objective,
        strengths: data.strengths || [],
        specificObjectives: data.specific_objectives || [],
        centralGap: data.central_gap || [],
        gapTitle: data.gap_title || null,
        gapDescription: data.gap_description || null,
        phases: data.phases || null,
        planAccion: data.plan_accion || null,
        hiddenSlides: data.hidden_slides || [],
        termsAndConditions: data.terms_and_conditions,
        validityDays: data.validity_days,
        subtotal: parseFloat(data.subtotal) || 0,
        discountPercent: parseFloat(data.discount_percent) || 0,
        totalAmount: parseFloat(data.total_amount) || 0,
        currency: data.currency,
        paymentTerms: data.payment_terms,
        estimatedDurationDays: data.estimated_duration_days,
        proposedStartDate: data.proposed_start_date,
        status: data.status as ProposalStatus,
        sentAt: data.sent_at,
        viewedAt: data.viewed_at,
        acceptedAt: data.accepted_at,
        rejectedAt: data.rejected_at,
        rejectionReason: data.rejection_reason,
        shareToken: data.share_token,
        createdBy: data.created_by,
        createdByName: data.creator?.full_name,
        ownerId: data.owner_id,
        ownerName: data.owner?.full_name,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (err: any) {
      console.error('Error getting proposal:', err);
      return null;
    }
  }, []);

  // ===== Add Proposal =====
  const addProposal = useCallback(
    async (data: CreateProposalInput): Promise<Proposal | null> => {
      if (!appUser?.organizationId) return null;

      try {
        const proposalNumber = await generateProposalNumber();

        const { data: created, error: err } = await supabase
          .from('proposals')
          .insert({
            organization_id: appUser.organizationId,
            deal_id: data.dealId || null,
            client_id: data.clientId || null,
            proposal_number: proposalNumber,
            title: data.title,
            client_name: data.clientName,
            client_company: data.clientCompany || null,
            client_email: data.clientEmail || null,
            client_phone: data.clientPhone || null,
            introduction: data.introduction || null,
            objective: data.objective || null,
            strengths: data.strengths || [],
            specific_objectives: data.specificObjectives || [],
            central_gap: data.centralGap || [],
            terms_and_conditions: data.termsAndConditions || null,
            validity_days: data.validityDays || 30,
            discount_percent: data.discountPercent || 0,
            payment_terms: data.paymentTerms || null,
            proposed_start_date: data.proposedStartDate || null,
            owner_id: data.ownerId,
            created_by: appUser.id,
            status: 'draft',
          })
          .select()
          .single();

        if (err) throw err;

        const newProposal: Proposal = {
          id: created.id,
          organizationId: created.organization_id,
          dealId: created.deal_id,
          clientId: created.client_id,
          proposalNumber: created.proposal_number,
          title: created.title,
          clientName: created.client_name,
          clientCompany: created.client_company,
          clientEmail: created.client_email,
          clientPhone: created.client_phone,
          introduction: created.introduction,
          objective: created.objective,
          strengths: created.strengths || [],
          specificObjectives: created.specific_objectives || [],
          centralGap: created.central_gap || [],
          termsAndConditions: created.terms_and_conditions,
          validityDays: created.validity_days,
          subtotal: 0,
          discountPercent: parseFloat(created.discount_percent) || 0,
          totalAmount: 0,
          currency: created.currency,
          paymentTerms: created.payment_terms,
          estimatedDurationDays: created.estimated_duration_days,
          proposedStartDate: created.proposed_start_date,
          status: created.status,
          sentAt: created.sent_at,
          viewedAt: created.viewed_at,
          acceptedAt: created.accepted_at,
          rejectedAt: created.rejected_at,
          rejectionReason: created.rejection_reason,
          shareToken: created.share_token,
          createdBy: created.created_by,
          ownerId: created.owner_id,
          createdAt: created.created_at,
          updatedAt: created.updated_at,
        };

        setProposals((prev) => [newProposal, ...prev]);
        return newProposal;
      } catch (err: any) {
        console.error('Error adding proposal:', err);
        setError(err.message);
        return null;
      }
    },
    [appUser, generateProposalNumber]
  );

  // ===== Update Proposal =====
  const updateProposal = useCallback(
    async (id: string, updates: Partial<Proposal>) => {
      try {
        const dbUpdates: Record<string, any> = {};

        if (updates.title !== undefined) dbUpdates.title = updates.title;
        if (updates.clientName !== undefined) dbUpdates.client_name = updates.clientName;
        if (updates.clientCompany !== undefined) dbUpdates.client_company = updates.clientCompany;
        if (updates.clientEmail !== undefined) dbUpdates.client_email = updates.clientEmail;
        if (updates.clientPhone !== undefined) dbUpdates.client_phone = updates.clientPhone;
        if (updates.clientLogoUrl !== undefined) dbUpdates.client_logo_url = updates.clientLogoUrl;
        if (updates.introduction !== undefined) dbUpdates.introduction = updates.introduction;
        if (updates.objective !== undefined) dbUpdates.objective = updates.objective;
        if (updates.strengths !== undefined) dbUpdates.strengths = updates.strengths;
        if (updates.specificObjectives !== undefined) dbUpdates.specific_objectives = updates.specificObjectives;
        if (updates.centralGap !== undefined) dbUpdates.central_gap = updates.centralGap;
        if (updates.gapTitle !== undefined) dbUpdates.gap_title = updates.gapTitle;
        if (updates.gapDescription !== undefined) dbUpdates.gap_description = updates.gapDescription;
        if (updates.phases !== undefined) dbUpdates.phases = updates.phases;
        if (updates.planAccion !== undefined) dbUpdates.plan_accion = updates.planAccion;
        if (updates.hiddenSlides !== undefined) dbUpdates.hidden_slides = updates.hiddenSlides;
        if (updates.termsAndConditions !== undefined) dbUpdates.terms_and_conditions = updates.termsAndConditions;
        if (updates.validityDays !== undefined) dbUpdates.validity_days = updates.validityDays;
        if (updates.discountPercent !== undefined) dbUpdates.discount_percent = updates.discountPercent;
        if (updates.paymentTerms !== undefined) dbUpdates.payment_terms = updates.paymentTerms;
        if (updates.proposedStartDate !== undefined) dbUpdates.proposed_start_date = updates.proposedStartDate;
        if (updates.estimatedDurationDays !== undefined) dbUpdates.estimated_duration_days = updates.estimatedDurationDays;
        if (updates.subtotal !== undefined) dbUpdates.subtotal = updates.subtotal;
        if (updates.totalAmount !== undefined) dbUpdates.total_amount = updates.totalAmount;
        if (updates.ownerId !== undefined) dbUpdates.owner_id = updates.ownerId;

        dbUpdates.updated_at = new Date().toISOString();

        const { error: err } = await supabase.from('proposals').update(dbUpdates).eq('id', id);

        if (err) throw err;

        setProposals((prev) =>
          prev.map((p) => (p.id === id ? { ...p, ...updates, updatedAt: dbUpdates.updated_at } : p))
        );
      } catch (err: any) {
        console.error('Error updating proposal:', err);
        setError(err.message);
      }
    },
    []
  );

  // ===== Delete Proposal =====
  const deleteProposal = useCallback(async (id: string) => {
    try {
      const { error: err } = await supabase.from('proposals').delete().eq('id', id);
      if (err) throw err;
      setProposals((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      console.error('Error deleting proposal:', err);
      setError(err.message);
    }
  }, []);

  // ===== Duplicate Proposal =====
  const duplicateProposal = useCallback(
    async (id: string): Promise<Proposal | null> => {
      const original = proposals.find((p) => p.id === id);
      if (!original) return null;

      const newProposal = await addProposal({
        title: `${original.title} (copia)`,
        clientName: original.clientName,
        clientCompany: original.clientCompany || undefined,
        clientEmail: original.clientEmail || undefined,
        clientPhone: original.clientPhone || undefined,
        introduction: original.introduction || undefined,
        objective: original.objective || undefined,
        strengths: original.strengths || [],
        specificObjectives: original.specificObjectives || [],
        centralGap: original.centralGap || [],
        termsAndConditions: original.termsAndConditions || undefined,
        validityDays: original.validityDays,
        discountPercent: original.discountPercent,
        paymentTerms: original.paymentTerms || undefined,
        ownerId: original.ownerId,
      });

      if (!newProposal) return null;

      // Copy items
      const items = await fetchProposalItems(id);
      for (const item of items) {
        await addProposalItem({
          proposalId: newProposal.id,
          productId: item.productId || undefined,
          name: item.name,
          description: item.description || undefined,
          benefits: item.benefits,
          methodology: item.methodology || undefined,
          deliverables: item.deliverables,
          requirements: item.requirements || undefined,
          scope: item.scope || undefined,
          outOfScope: item.outOfScope || undefined,
          faqs: item.faqs || [],
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          monthlyFee: item.monthlyFee || undefined,
          estimatedDurationDays: item.estimatedDurationDays || undefined,
          sortOrder: item.sortOrder,
        });
      }

      await recalculateTotals(newProposal.id);
      return newProposal;
    },
    [proposals, addProposal]
  );

  // ===== Fetch Proposal Items =====
  const fetchProposalItems = useCallback(async (proposalId: string): Promise<ProposalItem[]> => {
    try {
      const { data, error: err } = await supabase
        .from('proposal_items')
        .select('*')
        .eq('proposal_id', proposalId)
        .order('sort_order', { ascending: true });

      if (err) throw err;

      return (data || []).map((item: any) => ({
        id: item.id,
        proposalId: item.proposal_id,
        productId: item.product_id,
        name: item.name,
        description: item.description,
        benefits: item.benefits || [],
        methodology: item.methodology,
        deliverables: item.deliverables || [],
        requirements: item.requirements,
        scope: item.scope,
        outOfScope: item.out_of_scope,
        faqs: item.faqs || [],
        unitPrice: parseFloat(item.unit_price) || 0,
        quantity: item.quantity || 1,
        totalPrice: parseFloat(item.total_price) || 0,
        monthlyFee: item.monthly_fee ? parseFloat(item.monthly_fee) : null,
        estimatedDurationDays: item.estimated_duration_days,
        sortOrder: item.sort_order,
        createdAt: item.created_at,
      }));
    } catch (err: any) {
      console.error('Error fetching proposal items:', err);
      return [];
    }
  }, []);

  // ===== Add Proposal Item =====
  const addProposalItem = useCallback(
    async (data: CreateProposalItemInput): Promise<ProposalItem | null> => {
      try {
        const totalPrice = data.unitPrice * (data.quantity || 1);

        const { data: created, error: err } = await supabase
          .from('proposal_items')
          .insert({
            proposal_id: data.proposalId,
            product_id: data.productId || null,
            name: data.name,
            description: data.description || null,
            benefits: data.benefits || [],
            methodology: data.methodology || null,
            deliverables: data.deliverables || [],
            requirements: data.requirements || null,
            scope: data.scope || null,
            out_of_scope: data.outOfScope || null,
            faqs: data.faqs || [],
            unit_price: data.unitPrice,
            quantity: data.quantity || 1,
            total_price: totalPrice,
            monthly_fee: data.monthlyFee || null,
            estimated_duration_days: data.estimatedDurationDays || null,
            sort_order: data.sortOrder || 0,
          })
          .select()
          .single();

        if (err) throw err;

        await recalculateTotals(data.proposalId);

        return {
          id: created.id,
          proposalId: created.proposal_id,
          productId: created.product_id,
          name: created.name,
          description: created.description,
          benefits: created.benefits || [],
          methodology: created.methodology,
          deliverables: created.deliverables || [],
          requirements: created.requirements,
          scope: created.scope,
          outOfScope: created.out_of_scope,
          faqs: created.faqs || [],
          unitPrice: parseFloat(created.unit_price) || 0,
          quantity: created.quantity,
          totalPrice: parseFloat(created.total_price) || 0,
          monthlyFee: created.monthly_fee ? parseFloat(created.monthly_fee) : null,
          estimatedDurationDays: created.estimated_duration_days,
          sortOrder: created.sort_order,
          createdAt: created.created_at,
        };
      } catch (err: any) {
        console.error('Error adding proposal item:', err);
        return null;
      }
    },
    []
  );

  // ===== Update Proposal Item =====
  const updateProposalItem = useCallback(
    async (id: string, updates: Partial<ProposalItem>) => {
      try {
        const dbUpdates: Record<string, any> = {};

        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.benefits !== undefined) dbUpdates.benefits = updates.benefits;
        if (updates.methodology !== undefined) dbUpdates.methodology = updates.methodology;
        if (updates.deliverables !== undefined) dbUpdates.deliverables = updates.deliverables;
        if (updates.requirements !== undefined) dbUpdates.requirements = updates.requirements;
        if (updates.scope !== undefined) dbUpdates.scope = updates.scope;
        if (updates.outOfScope !== undefined) dbUpdates.out_of_scope = updates.outOfScope;
        if (updates.faqs !== undefined) dbUpdates.faqs = updates.faqs;
        if (updates.unitPrice !== undefined) dbUpdates.unit_price = updates.unitPrice;
        if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity;
        if (updates.monthlyFee !== undefined) dbUpdates.monthly_fee = updates.monthlyFee;
        if (updates.estimatedDurationDays !== undefined) dbUpdates.estimated_duration_days = updates.estimatedDurationDays;
        if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;

        // Recalculate total
        if (updates.unitPrice !== undefined || updates.quantity !== undefined) {
          const { data: current } = await supabase.from('proposal_items').select('unit_price, quantity, proposal_id').eq('id', id).single();
          const unitPrice = updates.unitPrice ?? parseFloat(current.unit_price);
          const quantity = updates.quantity ?? current.quantity;
          dbUpdates.total_price = unitPrice * quantity;
        }

        const { data: updated, error: err } = await supabase
          .from('proposal_items')
          .update(dbUpdates)
          .eq('id', id)
          .select('proposal_id')
          .single();

        if (err) throw err;

        if (updated?.proposal_id) {
          await recalculateTotals(updated.proposal_id);
        }
      } catch (err: any) {
        console.error('Error updating proposal item:', err);
      }
    },
    []
  );

  // ===== Delete Proposal Item =====
  const deleteProposalItem = useCallback(async (id: string) => {
    try {
      const { data: item } = await supabase.from('proposal_items').select('proposal_id').eq('id', id).single();
      const { error: err } = await supabase.from('proposal_items').delete().eq('id', id);
      if (err) throw err;
      if (item?.proposal_id) {
        await recalculateTotals(item.proposal_id);
      }
    } catch (err: any) {
      console.error('Error deleting proposal item:', err);
    }
  }, []);

  // ===== Reorder Proposal Items =====
  const reorderProposalItems = useCallback(async (proposalId: string, itemIds: string[]) => {
    try {
      const updates = itemIds.map((id, index) => ({
        id,
        sort_order: index,
      }));

      for (const update of updates) {
        await supabase.from('proposal_items').update({ sort_order: update.sort_order }).eq('id', update.id);
      }
    } catch (err: any) {
      console.error('Error reordering items:', err);
    }
  }, []);

  // ===== Recalculate Totals =====
  const recalculateTotals = useCallback(async (proposalId: string) => {
    try {
      const { data: items } = await supabase
        .from('proposal_items')
        .select('total_price')
        .eq('proposal_id', proposalId);

      const subtotal = (items || []).reduce((sum, item) => sum + (parseFloat(item.total_price) || 0), 0);

      const { data: proposal } = await supabase
        .from('proposals')
        .select('discount_percent')
        .eq('id', proposalId)
        .single();

      const discountPercent = parseFloat(proposal?.discount_percent) || 0;
      const totalAmount = subtotal * (1 - discountPercent / 100);

      await supabase
        .from('proposals')
        .update({ subtotal, total_amount: totalAmount })
        .eq('id', proposalId);

      setProposals((prev) =>
        prev.map((p) => (p.id === proposalId ? { ...p, subtotal, totalAmount } : p))
      );
    } catch (err: any) {
      console.error('Error recalculating totals:', err);
    }
  }, []);

  // ===== Send Proposal =====
  const sendProposal = useCallback(async (id: string): Promise<string> => {
    try {
      const { data, error: err } = await supabase
        .from('proposals')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', id)
        .select('share_token')
        .single();

      if (err) throw err;

      setProposals((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, status: 'sent' as ProposalStatus, sentAt: new Date().toISOString() } : p
        )
      );

      return data.share_token;
    } catch (err: any) {
      console.error('Error sending proposal:', err);
      throw err;
    }
  }, []);

  // ===== Mark as Viewed =====
  const markAsViewed = useCallback(async (id: string) => {
    try {
      const { error: err } = await supabase
        .from('proposals')
        .update({ status: 'viewed', viewed_at: new Date().toISOString() })
        .eq('id', id)
        .in('status', ['sent']);

      if (err) throw err;

      setProposals((prev) =>
        prev.map((p) =>
          p.id === id && p.status === 'sent'
            ? { ...p, status: 'viewed' as ProposalStatus, viewedAt: new Date().toISOString() }
            : p
        )
      );
    } catch (err: any) {
      console.error('Error marking as viewed:', err);
    }
  }, []);

  // ===== Accept Proposal =====
  const acceptProposal = useCallback(async (id: string) => {
    try {
      const { error: err } = await supabase
        .from('proposals')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', id);

      if (err) throw err;

      setProposals((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, status: 'accepted' as ProposalStatus, acceptedAt: new Date().toISOString() }
            : p
        )
      );
    } catch (err: any) {
      console.error('Error accepting proposal:', err);
    }
  }, []);

  // ===== Reject Proposal =====
  const rejectProposal = useCallback(async (id: string, reason: string) => {
    try {
      const { error: err } = await supabase
        .from('proposals')
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejection_reason: reason,
        })
        .eq('id', id);

      if (err) throw err;

      setProposals((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                status: 'rejected' as ProposalStatus,
                rejectedAt: new Date().toISOString(),
                rejectionReason: reason,
              }
            : p
        )
      );
    } catch (err: any) {
      console.error('Error rejecting proposal:', err);
    }
  }, []);

  // ===== Get Proposal by Token (Public) =====
  const getProposalByToken = useCallback(
    async (token: string): Promise<{ proposal: Proposal; items: ProposalItem[] } | null> => {
      try {
        const { data: p, error: err } = await supabase
          .from('proposals')
          .select('*')
          .eq('share_token', token)
          .in('status', ['sent', 'viewed', 'accepted', 'rejected'])
          .single();

        if (err) throw err;

        const { data: itemsData } = await supabase
          .from('proposal_items')
          .select('*')
          .eq('proposal_id', p.id)
          .order('sort_order', { ascending: true });

        const proposal: Proposal = {
          id: p.id,
          organizationId: p.organization_id,
          dealId: p.deal_id,
          clientId: p.client_id,
          proposalNumber: p.proposal_number,
          title: p.title,
          clientName: p.client_name,
          clientCompany: p.client_company,
          clientEmail: p.client_email,
          clientPhone: p.client_phone,
          clientLogoUrl: p.client_logo_url,
          introduction: p.introduction,
          objective: p.objective,
          strengths: p.strengths || [],
          specificObjectives: p.specific_objectives || [],
          centralGap: p.central_gap || [],
          gapTitle: p.gap_title || null,
          gapDescription: p.gap_description || null,
          phases: p.phases || null,
          planAccion: p.plan_accion || null,
          hiddenSlides: p.hidden_slides || [],
          termsAndConditions: p.terms_and_conditions,
          validityDays: p.validity_days,
          subtotal: parseFloat(p.subtotal) || 0,
          discountPercent: parseFloat(p.discount_percent) || 0,
          totalAmount: parseFloat(p.total_amount) || 0,
          currency: p.currency,
          paymentTerms: p.payment_terms,
          estimatedDurationDays: p.estimated_duration_days,
          proposedStartDate: p.proposed_start_date,
          status: p.status,
          sentAt: p.sent_at,
          viewedAt: p.viewed_at,
          acceptedAt: p.accepted_at,
          rejectedAt: p.rejected_at,
          rejectionReason: p.rejection_reason,
          shareToken: p.share_token,
          createdBy: p.created_by,
          ownerId: p.owner_id,
          createdAt: p.created_at,
          updatedAt: p.updated_at,
        };

        const items: ProposalItem[] = (itemsData || []).map((item: any) => ({
          id: item.id,
          proposalId: item.proposal_id,
          productId: item.product_id,
          name: item.name,
          description: item.description,
          benefits: item.benefits || [],
          methodology: item.methodology,
          deliverables: item.deliverables || [],
          requirements: item.requirements,
          unitPrice: parseFloat(item.unit_price) || 0,
          quantity: item.quantity || 1,
          totalPrice: parseFloat(item.total_price) || 0,
          monthlyFee: item.monthly_fee ? parseFloat(item.monthly_fee) : null,
          estimatedDurationDays: item.estimated_duration_days,
          sortOrder: item.sort_order,
          createdAt: item.created_at,
        }));

        return { proposal, items };
      } catch (err: any) {
        console.error('Error getting proposal by token:', err);
        return null;
      }
    },
    []
  );

  // ===== Get Stats =====
  const getStats = useCallback((): ProposalStats => {
    const draftCount = proposals.filter((p) => p.status === 'draft').length;
    const sentCount = proposals.filter((p) => p.status === 'sent').length;
    const viewedCount = proposals.filter((p) => p.status === 'viewed').length;
    const acceptedCount = proposals.filter((p) => p.status === 'accepted').length;
    const rejectedCount = proposals.filter((p) => p.status === 'rejected').length;

    const totalValue = proposals
      .filter((p) => p.status !== 'draft')
      .reduce((sum, p) => sum + p.totalAmount, 0);

    const acceptedValue = proposals
      .filter((p) => p.status === 'accepted')
      .reduce((sum, p) => sum + p.totalAmount, 0);

    const closed = acceptedCount + rejectedCount;
    const conversionRate = closed > 0 ? Math.round((acceptedCount / closed) * 100) : 0;

    return {
      totalProposals: proposals.length,
      draftCount,
      sentCount,
      viewedCount,
      acceptedCount,
      rejectedCount,
      totalValue,
      acceptedValue,
      conversionRate,
    };
  }, [proposals]);

  return (
    <ProposalContext.Provider
      value={{
        proposals,
        loading,
        error,
        fetchProposals,
        getProposal,
        addProposal,
        updateProposal,
        deleteProposal,
        duplicateProposal,
        fetchProposalItems,
        addProposalItem,
        updateProposalItem,
        deleteProposalItem,
        reorderProposalItems,
        sendProposal,
        markAsViewed,
        acceptProposal,
        rejectProposal,
        getProposalByToken,
        recalculateTotals,
        getStats,
        generateProposalNumber,
      }}
    >
      {children}
    </ProposalContext.Provider>
  );
}

export function useProposals() {
  const context = useContext(ProposalContext);
  if (!context) {
    throw new Error('useProposals must be used within a ProposalProvider');
  }
  return context;
}
