import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Loader2,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  X,
  Sparkles,
  LayoutList,
  Presentation,
} from 'lucide-react';
import { fetchWithTimeout, AI_TIMEOUT_MS } from '../../lib/fetchTimeout';
import { useProposals } from '../../context/ProposalContext';
import { useProjects } from '../../context/ProjectContext';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';
import type { ProposalItem, ProposalItemDeliverable, ProposalItemFAQ } from '../../types/proposals';
import type { Product } from '../../types/projects';

interface ServiceItemForm {
  id?: string;
  productId: string | null;
  name: string;
  description: string;
  unitPrice: number;
  quantity: number;
  benefits: string[];
  methodology: string;
  deliverables: ProposalItemDeliverable[];
  requirements: string;
  scope: string;
  outOfScope: string;
  faqs: ProposalItemFAQ[];
  estimatedDurationDays: number | null;
  isExpanded: boolean;
}

export function ProposalForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const dealId = searchParams.get('dealId');

  const {
    addProposal,
    updateProposal,
    getProposal,
    fetchProposalItems,
    addProposalItem,
    updateProposalItem,
    deleteProposalItem,
  } = useProposals();
  const { products, fetchProducts } = useProjects();
  const { deals, leads, fetchDeals, fetchLeads } = useCRM();
  const { appUser } = useAuth();

  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showProductModal, setShowProductModal] = useState(false);

  // Client info
  const [clientName, setClientName] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');

  // Proposal info
  const [title, setTitle] = useState('');
  const [introduction, setIntroduction] = useState('');
  const [objective, setObjective] = useState('');
  const [strengths, setStrengths] = useState<string[]>([]);
  const [specificObjectives, setSpecificObjectives] = useState<string[]>([]);
  const [centralGap, setCentralGap] = useState<{ current: string; desired: string }[]>([]);
  const [aiRawText, setAiRawText] = useState('');
  const [aiParsing, setAiParsing] = useState(false);
  const [showAiInput, setShowAiInput] = useState(false);
  const [wizardMode, setWizardMode] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [validityDays, setValidityDays] = useState(30);

  // Service items
  const [serviceItems, setServiceItems] = useState<ServiceItemForm[]>([]);
  const [existingItemIds, setExistingItemIds] = useState<Set<string>>(new Set());
  const [deletedItemIds, setDeletedItemIds] = useState<string[]>([]);

  // Pricing
  const [discountPercent, setDiscountPercent] = useState(0);

  // Terms
  const [termsAndConditions, setTermsAndConditions] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');

  // Associated deal ID for new proposals
  const [linkedDealId, setLinkedDealId] = useState<string | null>(null);

  // Calculate totals
  const subtotal = serviceItems.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );
  const totalAmount = subtotal * (1 - discountPercent / 100);

  // Load products and CRM data
  useEffect(() => {
    fetchProducts();
    fetchDeals();
    fetchLeads();
  }, [fetchProducts, fetchDeals, fetchLeads]);

  // Load existing proposal if editing
  useEffect(() => {
    const loadData = async () => {
      setInitialLoading(true);

      if (isEditing && id) {
        const proposal = await getProposal(id);
        if (proposal) {
          setClientName(proposal.clientName);
          setClientCompany(proposal.clientCompany || '');
          setClientEmail(proposal.clientEmail || '');
          setClientPhone(proposal.clientPhone || '');
          setTitle(proposal.title);
          setIntroduction(proposal.introduction || '');
          setObjective(proposal.objective || '');
          setStrengths(proposal.strengths || []);
          setSpecificObjectives(proposal.specificObjectives || []);
          setCentralGap(proposal.centralGap || []);
          setValidityDays(proposal.validityDays);
          setDiscountPercent(proposal.discountPercent);
          setTermsAndConditions(proposal.termsAndConditions || '');
          setPaymentTerms(proposal.paymentTerms || '');
          setLinkedDealId(proposal.dealId);

          // Load items
          const items = await fetchProposalItems(id);
          const itemIds = new Set<string>(items.map((i) => i.id));
          setExistingItemIds(itemIds);
          setServiceItems(
            items.map((item) => ({
              id: item.id,
              productId: item.productId,
              name: item.name,
              description: item.description || '',
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              benefits: item.benefits || [],
              methodology: item.methodology || '',
              deliverables: item.deliverables || [],
              requirements: item.requirements || '',
              scope: item.scope || '',
              outOfScope: item.outOfScope || '',
              faqs: item.faqs || [],
              estimatedDurationDays: item.estimatedDurationDays,
              isExpanded: false,
            }))
          );
        }
      } else if (dealId) {
        // Pre-fill from deal
        const deal = deals.find((d) => d.id === dealId);
        if (deal) {
          setTitle(`Propuesta - ${deal.name}`);
          setLinkedDealId(dealId);

          // Get client info from linked lead or deal
          if (deal.leadId) {
            const lead = leads.find((l) => l.id === deal.leadId);
            if (lead) {
              setClientName(lead.contactName);
              setClientCompany(lead.company || '');
              setClientEmail(lead.email || '');
              setClientPhone(lead.phone || '');
            }
          } else if (deal.clientName) {
            setClientName(deal.clientName);
          }
        }
      }

      setInitialLoading(false);
    };

    loadData();
  }, [id, dealId, isEditing, getProposal, fetchProposalItems, deals, leads]);

  const handleAddProduct = (product: Product) => {
    setServiceItems((prev) => [
      ...prev,
      {
        productId: product.id,
        name: product.name,
        description: product.description || '',
        unitPrice: product.basePrice || 0,
        quantity: 1,
        benefits: product.benefits || [],
        methodology: product.methodology || '',
        deliverables: [],
        requirements: product.requirements || '',
        scope: product.scope || '',
        outOfScope: product.outOfScope || '',
        faqs: product.faqs || [],
        estimatedDurationDays: product.estimatedDurationDays,
        isExpanded: true,
      },
    ]);
    setShowProductModal(false);
  };

  const handleRemoveItem = (index: number) => {
    const item = serviceItems[index];
    if (item.id && existingItemIds.has(item.id)) {
      setDeletedItemIds((prev) => [...prev, item.id!]);
    }
    setServiceItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleToggleExpand = (index: number) => {
    setServiceItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, isExpanded: !item.isExpanded } : item
      )
    );
  };

  const handleItemChange = (
    index: number,
    field: keyof ServiceItemForm,
    value: any
  ) => {
    setServiceItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleBenefitChange = (
    itemIndex: number,
    benefitIndex: number,
    value: string
  ) => {
    setServiceItems((prev) =>
      prev.map((item, i) => {
        if (i !== itemIndex) return item;
        const newBenefits = [...item.benefits];
        newBenefits[benefitIndex] = value;
        return { ...item, benefits: newBenefits };
      })
    );
  };

  const handleAddBenefit = (itemIndex: number) => {
    setServiceItems((prev) =>
      prev.map((item, i) =>
        i === itemIndex ? { ...item, benefits: [...item.benefits, ''] } : item
      )
    );
  };

  const handleRemoveBenefit = (itemIndex: number, benefitIndex: number) => {
    setServiceItems((prev) =>
      prev.map((item, i) => {
        if (i !== itemIndex) return item;
        const newBenefits = item.benefits.filter((_, bi) => bi !== benefitIndex);
        return { ...item, benefits: newBenefits };
      })
    );
  };

  const handleDeliverableChange = (
    itemIndex: number,
    delIndex: number,
    field: 'name' | 'description',
    value: string
  ) => {
    setServiceItems((prev) =>
      prev.map((item, i) => {
        if (i !== itemIndex) return item;
        const newDeliverables = [...item.deliverables];
        newDeliverables[delIndex] = { ...newDeliverables[delIndex], [field]: value };
        return { ...item, deliverables: newDeliverables };
      })
    );
  };

  const handleAddDeliverable = (itemIndex: number) => {
    setServiceItems((prev) =>
      prev.map((item, i) =>
        i === itemIndex
          ? {
              ...item,
              deliverables: [...item.deliverables, { name: '', description: null }],
            }
          : item
      )
    );
  };

  const handleRemoveDeliverable = (itemIndex: number, delIndex: number) => {
    setServiceItems((prev) =>
      prev.map((item, i) => {
        if (i !== itemIndex) return item;
        const newDeliverables = item.deliverables.filter((_, di) => di !== delIndex);
        return { ...item, deliverables: newDeliverables };
      })
    );
  };

  const handleAiParse = async () => {
    if (!aiRawText.trim() || aiParsing) return;
    setAiParsing(true);
    try {
      const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
      if (!apiKey) { alert('API key de Anthropic no configurada'); return; }

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
            content: `Analiza el siguiente texto de diagnostico/briefing de un cliente y extrae la informacion estructurada en formato JSON.

El JSON debe tener exactamente esta estructura:
{
  "objective": "string - objetivo general de la propuesta",
  "strengths": ["array de strings - fortalezas actuales del cliente"],
  "specificObjectives": ["array de strings - objetivos especificos"],
  "centralGap": [{"current": "situacion actual", "desired": "situacion deseada"}],
  "introduction": "string - resumen ejecutivo si se puede inferir del texto (opcional, puede ser vacio)"
}

Reglas:
- Si alguna seccion no tiene informacion en el texto, deja un array vacio o string vacio
- Para centralGap, identifica las brechas entre la situacion actual y la deseada
- Responde SOLO con el JSON, sin markdown, sin explicaciones, sin backticks

Texto del cliente:
${aiRawText}`,
          }],
        }),
      }, AI_TIMEOUT_MS);

      if (!resp.ok) throw new Error(`API error: ${resp.status}`);
      const data = await resp.json();
      const content = data.content?.[0]?.text || '';

      // Parse JSON - handle possible markdown wrapping
      const jsonStr = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(jsonStr);

      if (parsed.objective) setObjective(parsed.objective);
      if (parsed.strengths?.length) setStrengths(parsed.strengths);
      if (parsed.specificObjectives?.length) setSpecificObjectives(parsed.specificObjectives);
      if (parsed.centralGap?.length) setCentralGap(parsed.centralGap);
      if (parsed.introduction && !introduction) setIntroduction(parsed.introduction);

      setShowAiInput(false);
      setAiRawText('');
    } catch (err: any) {
      console.error('Error parsing with AI:', err);
      alert('Error al procesar el texto: ' + (err?.message || 'Error desconocido'));
    } finally {
      setAiParsing(false);
    }
  };

  const handleSubmit = async (e: FormEvent, saveAsDraft = false) => {
    e.preventDefault();
    if (!appUser) return;

    setLoading(true);

    try {
      if (isEditing && id) {
        // Update existing proposal
        await updateProposal(id, {
          title,
          clientName,
          clientCompany: clientCompany || undefined,
          clientEmail: clientEmail || undefined,
          clientPhone: clientPhone || undefined,
          introduction: introduction || undefined,
          objective: objective || undefined,
          strengths: strengths.filter(Boolean),
          specificObjectives: specificObjectives.filter(Boolean),
          centralGap: centralGap.filter((g) => g.current || g.desired),
          validityDays,
          discountPercent,
          termsAndConditions: termsAndConditions || undefined,
          paymentTerms: paymentTerms || undefined,
        });

        // Delete removed items
        for (const itemId of deletedItemIds) {
          await deleteProposalItem(itemId);
        }

        // Update or add items
        for (let i = 0; i < serviceItems.length; i++) {
          const item = serviceItems[i];
          if (item.id && existingItemIds.has(item.id)) {
            // Update existing
            await updateProposalItem(item.id, {
              name: item.name,
              description: item.description || undefined,
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              benefits: item.benefits.filter(Boolean),
              methodology: item.methodology || undefined,
              deliverables: item.deliverables.filter((d) => d.name),
              requirements: item.requirements || undefined,
              scope: item.scope || undefined,
              outOfScope: item.outOfScope || undefined,
              faqs: item.faqs.filter((f) => f.question),
              estimatedDurationDays: item.estimatedDurationDays || undefined,
              sortOrder: i,
            });
          } else {
            // Add new
            await addProposalItem({
              proposalId: id,
              productId: item.productId || undefined,
              name: item.name,
              description: item.description || undefined,
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              benefits: item.benefits.filter(Boolean),
              methodology: item.methodology || undefined,
              deliverables: item.deliverables.filter((d) => d.name),
              requirements: item.requirements || undefined,
              scope: item.scope || undefined,
              outOfScope: item.outOfScope || undefined,
              faqs: item.faqs.filter((f) => f.question),
              estimatedDurationDays: item.estimatedDurationDays || undefined,
              sortOrder: i,
            });
          }
        }

        navigate(`/proposals/${id}`);
      } else {
        // Create new proposal
        const newProposal = await addProposal({
          dealId: linkedDealId || undefined,
          title,
          clientName,
          clientCompany: clientCompany || undefined,
          clientEmail: clientEmail || undefined,
          clientPhone: clientPhone || undefined,
          introduction: introduction || undefined,
          objective: objective || undefined,
          strengths: strengths.filter(Boolean),
          specificObjectives: specificObjectives.filter(Boolean),
          centralGap: centralGap.filter((g) => g.current || g.desired),
          validityDays,
          discountPercent,
          termsAndConditions: termsAndConditions || undefined,
          paymentTerms: paymentTerms || undefined,
          ownerId: appUser.id,
        });

        if (newProposal) {
          // Add items
          for (let i = 0; i < serviceItems.length; i++) {
            const item = serviceItems[i];
            await addProposalItem({
              proposalId: newProposal.id,
              productId: item.productId || undefined,
              name: item.name,
              description: item.description || undefined,
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              benefits: item.benefits.filter(Boolean),
              methodology: item.methodology || undefined,
              deliverables: item.deliverables.filter((d) => d.name),
              requirements: item.requirements || undefined,
              scope: item.scope || undefined,
              outOfScope: item.outOfScope || undefined,
              faqs: item.faqs.filter((f) => f.question),
              estimatedDurationDays: item.estimatedDurationDays || undefined,
              sortOrder: i,
            });
          }

          navigate(`/proposals/${newProposal.id}`);
        }
      }
    } catch (err: any) {
      console.error('Error saving proposal:', err);
      alert('Error al guardar propuesta: ' + (err?.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isEditing ? 'Editar Propuesta' : 'Nueva Propuesta'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {isEditing
              ? 'Modifica los datos de la propuesta'
              : 'Completa los datos de la nueva propuesta'}
          </p>
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit">
        <button
          type="button"
          onClick={() => { setWizardMode(false); }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${!wizardMode ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
        >
          <LayoutList className="w-4 h-4" />
          Formulario
        </button>
        <button
          type="button"
          onClick={() => { setWizardMode(true); setWizardStep(0); }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${wizardMode ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
        >
          <Presentation className="w-4 h-4" />
          Paso a paso
        </button>
      </div>

      {/* Wizard Progress */}
      {wizardMode && (
        <div className="flex items-center gap-1">
          {['Cliente', 'Propuesta', 'Diagnostico', 'Servicios', 'Precios', 'Terminos'].map((label, idx) => (
            <div key={label} className="flex items-center gap-1 flex-1">
              <button
                type="button"
                onClick={() => setWizardStep(idx)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors w-full justify-center ${
                  idx === wizardStep
                    ? 'bg-primary-600 text-white'
                    : idx < wizardStep
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                }`}
              >
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{idx + 1}</span>
              </button>
              {idx < 5 && <div className={`w-2 h-0.5 flex-shrink-0 ${idx < wizardStep ? 'bg-primary-400' : 'bg-gray-300 dark:bg-gray-600'}`} />}
            </div>
          ))}
        </div>
      )}

      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
        {/* Client Info Section - Step 0 */}
        {(!wizardMode || wizardStep === 0) && (
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Datos del Cliente
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Nombre del Cliente *</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="input"
                placeholder="Nombre completo"
                required
              />
            </div>
            <div>
              <label className="label">Empresa</label>
              <input
                type="text"
                value={clientCompany}
                onChange={(e) => setClientCompany(e.target.value)}
                className="input"
                placeholder="Nombre de la empresa"
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                className="input"
                placeholder="email@ejemplo.com"
              />
            </div>
            <div>
              <label className="label">Telefono</label>
              <input
                type="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                className="input"
                placeholder="+54 11 1234-5678"
              />
            </div>
          </div>
        </div>
        )}

        {/* Proposal Info Section - Step 1 */}
        {(!wizardMode || wizardStep === 1) && (
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Informacion de la Propuesta
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Titulo *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input"
                placeholder="Titulo de la propuesta"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="label">Introduccion</label>
              <textarea
                value={introduction}
                onChange={(e) => setIntroduction(e.target.value)}
                className="input min-h-[100px]"
                placeholder="Introduccion o resumen ejecutivo..."
                rows={4}
              />
            </div>
            <div>
              <label className="label">Validez (dias)</label>
              <input
                type="number"
                value={validityDays}
                onChange={(e) => setValidityDays(parseInt(e.target.value) || 30)}
                className="input"
                min={1}
              />
            </div>
          </div>
        </div>
        )}

        {/* Diagnostico y Objetivos - Step 2 */}
        {(!wizardMode || wizardStep === 2) && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Diagnostico y Objetivos
            </h2>
            <button
              type="button"
              onClick={() => setShowAiInput(!showAiInput)}
              className="btn btn-secondary flex items-center gap-2 text-sm"
            >
              <Sparkles className="w-4 h-4" />
              {showAiInput ? 'Cerrar' : 'Completar con IA'}
            </button>
          </div>

          {/* AI Input */}
          {showAiInput && (
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg space-y-3">
              <p className="text-sm text-purple-700 dark:text-purple-300">
                Pega el texto del briefing, diagnostico o notas del cliente. La IA completara automaticamente los campos de abajo.
              </p>
              <textarea
                value={aiRawText}
                onChange={(e) => setAiRawText(e.target.value)}
                className="input min-h-[150px]"
                placeholder="Pega aca el texto libre del diagnostico, notas de reunion, briefing del cliente..."
                rows={6}
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAiParse}
                  disabled={aiParsing || !aiRawText.trim()}
                  className="btn btn-primary flex items-center gap-2"
                >
                  {aiParsing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Analizar y completar
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="label">Objetivo de la propuesta</label>
              <textarea
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                className="input min-h-[80px]"
                placeholder="Cual es el objetivo principal de esta propuesta..."
                rows={3}
              />
            </div>

            {/* Fortalezas actuales */}
            <div>
              <label className="label">Fortalezas actuales</label>
              <div className="space-y-2">
                {strengths.map((s, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={s}
                      onChange={(e) => {
                        setStrengths((prev) =>
                          prev.map((v, i) => (i === idx ? e.target.value : v))
                        );
                      }}
                      className="input flex-1"
                      placeholder="Fortaleza..."
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setStrengths((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="p-2 text-gray-400 hover:text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setStrengths((prev) => [...prev, ''])}
                  className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Agregar fortaleza
                </button>
              </div>
            </div>

            {/* Objetivos especificos */}
            <div>
              <label className="label">Objetivos especificos</label>
              <div className="space-y-2">
                {specificObjectives.map((obj, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={obj}
                      onChange={(e) => {
                        setSpecificObjectives((prev) =>
                          prev.map((o, i) => (i === idx ? e.target.value : o))
                        );
                      }}
                      className="input flex-1"
                      placeholder="Objetivo especifico..."
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setSpecificObjectives((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="p-2 text-gray-400 hover:text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setSpecificObjectives((prev) => [...prev, ''])}
                  className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Agregar objetivo
                </button>
              </div>
            </div>

            {/* GAP central - tabla */}
            <div>
              <label className="label">GAP central encontrado</label>
              {centralGap.length > 0 && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mb-2">
                  <div className="grid grid-cols-[1fr_1fr_40px] bg-gray-100 dark:bg-gray-800 px-3 py-2">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Situacion actual</span>
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Situacion deseada</span>
                    <span />
                  </div>
                  {centralGap.map((row, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_1fr_40px] gap-2 px-3 py-2 border-t border-gray-200 dark:border-gray-700">
                      <input
                        type="text"
                        value={row.current}
                        onChange={(e) => {
                          setCentralGap((prev) =>
                            prev.map((r, i) => (i === idx ? { ...r, current: e.target.value } : r))
                          );
                        }}
                        className="input"
                        placeholder="Situacion actual..."
                      />
                      <input
                        type="text"
                        value={row.desired}
                        onChange={(e) => {
                          setCentralGap((prev) =>
                            prev.map((r, i) => (i === idx ? { ...r, desired: e.target.value } : r))
                          );
                        }}
                        className="input"
                        placeholder="Situacion deseada..."
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setCentralGap((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="p-2 text-gray-400 hover:text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => setCentralGap((prev) => [...prev, { current: '', desired: '' }])}
                className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Agregar fila
              </button>
            </div>
          </div>
        </div>
        )}

        {/* Service Items Section - Step 3 */}
        {(!wizardMode || wizardStep === 3) && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Servicios
            </h2>
            <button
              type="button"
              onClick={() => setShowProductModal(true)}
              className="btn btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Agregar Servicio
            </button>
          </div>

          {serviceItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No hay servicios agregados. Haz clic en "Agregar Servicio" para
              comenzar.
            </div>
          ) : (
            <div className="space-y-4">
              {serviceItems.map((item, index) => (
                <div
                  key={index}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                >
                  {/* Item Header */}
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => handleToggleExpand(index)}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                    >
                      {item.isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      )}
                    </button>
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="md:col-span-2">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) =>
                            handleItemChange(index, 'name', e.target.value)
                          }
                          className="input"
                          placeholder="Nombre del servicio"
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) =>
                            handleItemChange(
                              index,
                              'unitPrice',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="input"
                          placeholder="Precio unitario"
                          min={0}
                          step={0.01}
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            handleItemChange(
                              index,
                              'quantity',
                              parseInt(e.target.value) || 1
                            )
                          }
                          className="input"
                          placeholder="Cantidad"
                          min={1}
                        />
                      </div>
                    </div>
                    <div className="text-right min-w-[100px] font-semibold text-gray-900 dark:text-white">
                      ${(item.unitPrice * item.quantity).toLocaleString()}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Item Expanded Content */}
                  {item.isExpanded && (
                    <div className="p-4 space-y-4 border-t border-gray-200 dark:border-gray-700">
                      <div>
                        <label className="label">Descripcion</label>
                        <textarea
                          value={item.description}
                          onChange={(e) =>
                            handleItemChange(index, 'description', e.target.value)
                          }
                          className="input min-h-[80px]"
                          placeholder="Descripcion del servicio..."
                          rows={3}
                        />
                      </div>

                      {/* Benefits */}
                      <div>
                        <label className="label">Beneficios</label>
                        <div className="space-y-2">
                          {item.benefits.map((benefit, bi) => (
                            <div key={bi} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={benefit}
                                onChange={(e) =>
                                  handleBenefitChange(index, bi, e.target.value)
                                }
                                className="input flex-1"
                                placeholder="Beneficio..."
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveBenefit(index, bi)}
                                className="p-2 text-gray-400 hover:text-red-600"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => handleAddBenefit(index)}
                            className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                          >
                            <Plus className="w-4 h-4" />
                            Agregar beneficio
                          </button>
                        </div>
                      </div>

                      {/* Methodology */}
                      <div>
                        <label className="label">Metodologia</label>
                        <textarea
                          value={item.methodology}
                          onChange={(e) =>
                            handleItemChange(index, 'methodology', e.target.value)
                          }
                          className="input min-h-[80px]"
                          placeholder="Metodologia de trabajo..."
                          rows={3}
                        />
                      </div>

                      {/* Deliverables */}
                      <div>
                        <label className="label">Entregables</label>
                        <div className="space-y-2">
                          {item.deliverables.map((del, di) => (
                            <div key={di} className="flex items-start gap-2">
                              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                                <input
                                  type="text"
                                  value={del.name}
                                  onChange={(e) =>
                                    handleDeliverableChange(
                                      index,
                                      di,
                                      'name',
                                      e.target.value
                                    )
                                  }
                                  className="input"
                                  placeholder="Nombre del entregable"
                                />
                                <input
                                  type="text"
                                  value={del.description || ''}
                                  onChange={(e) =>
                                    handleDeliverableChange(
                                      index,
                                      di,
                                      'description',
                                      e.target.value
                                    )
                                  }
                                  className="input"
                                  placeholder="Descripcion (opcional)"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveDeliverable(index, di)}
                                className="p-2 text-gray-400 hover:text-red-600 mt-1"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => handleAddDeliverable(index)}
                            className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                          >
                            <Plus className="w-4 h-4" />
                            Agregar entregable
                          </button>
                        </div>
                      </div>

                      {/* Requirements */}
                      <div>
                        <label className="label">Requisitos</label>
                        <textarea
                          value={item.requirements}
                          onChange={(e) =>
                            handleItemChange(index, 'requirements', e.target.value)
                          }
                          className="input min-h-[80px]"
                          placeholder="Requisitos o dependencias..."
                          rows={3}
                        />
                      </div>

                      {/* Scope */}
                      <div>
                        <label className="label">Alcance (que incluye)</label>
                        <textarea
                          value={item.scope}
                          onChange={(e) =>
                            handleItemChange(index, 'scope', e.target.value)
                          }
                          className="input min-h-[80px]"
                          placeholder="Que incluye este servicio..."
                          rows={3}
                        />
                      </div>

                      {/* Out of Scope */}
                      <div>
                        <label className="label">Fuera de alcance (que NO incluye)</label>
                        <textarea
                          value={item.outOfScope}
                          onChange={(e) =>
                            handleItemChange(index, 'outOfScope', e.target.value)
                          }
                          className="input min-h-[80px]"
                          placeholder="Que NO incluye este servicio..."
                          rows={3}
                        />
                      </div>

                      {/* FAQs */}
                      <div>
                        <label className="label">Preguntas Frecuentes</label>
                        <div className="space-y-2">
                          {item.faqs.map((faq, fi) => (
                            <div key={fi} className="flex items-start gap-2">
                              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                                <input
                                  type="text"
                                  value={faq.question}
                                  onChange={(e) => {
                                    setServiceItems((prev) =>
                                      prev.map((it, ii) => {
                                        if (ii !== index) return it;
                                        const newFaqs = [...it.faqs];
                                        newFaqs[fi] = { ...newFaqs[fi], question: e.target.value };
                                        return { ...it, faqs: newFaqs };
                                      })
                                    );
                                  }}
                                  className="input"
                                  placeholder="Pregunta"
                                />
                                <input
                                  type="text"
                                  value={faq.answer}
                                  onChange={(e) => {
                                    setServiceItems((prev) =>
                                      prev.map((it, ii) => {
                                        if (ii !== index) return it;
                                        const newFaqs = [...it.faqs];
                                        newFaqs[fi] = { ...newFaqs[fi], answer: e.target.value };
                                        return { ...it, faqs: newFaqs };
                                      })
                                    );
                                  }}
                                  className="input"
                                  placeholder="Respuesta"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setServiceItems((prev) =>
                                    prev.map((it, ii) => {
                                      if (ii !== index) return it;
                                      return { ...it, faqs: it.faqs.filter((_, ffi) => ffi !== fi) };
                                    })
                                  );
                                }}
                                className="p-2 text-gray-400 hover:text-red-600 mt-1"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              setServiceItems((prev) =>
                                prev.map((it, ii) =>
                                  ii === index
                                    ? { ...it, faqs: [...it.faqs, { question: '', answer: '' }] }
                                    : it
                                )
                              );
                            }}
                            className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                          >
                            <Plus className="w-4 h-4" />
                            Agregar pregunta
                          </button>
                        </div>
                      </div>

                      {/* Estimated Duration */}
                      <div>
                        <label className="label">Duracion estimada (dias)</label>
                        <input
                          type="number"
                          value={item.estimatedDurationDays || ''}
                          onChange={(e) =>
                            handleItemChange(
                              index,
                              'estimatedDurationDays',
                              e.target.value ? parseInt(e.target.value) : null
                            )
                          }
                          className="input w-48"
                          placeholder="Ej: 30"
                          min={1}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        )}

        {/* Pricing Section - Step 4 */}
        {(!wizardMode || wizardStep === 4) && (
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Precios
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Subtotal</label>
              <div className="input bg-gray-50 dark:bg-gray-800">
                ${subtotal.toLocaleString()}
              </div>
            </div>
            <div>
              <label className="label">Descuento (%)</label>
              <input
                type="number"
                value={discountPercent}
                onChange={(e) =>
                  setDiscountPercent(parseFloat(e.target.value) || 0)
                }
                className="input"
                min={0}
                max={100}
                step={0.01}
              />
            </div>
            <div>
              <label className="label">Total</label>
              <div className="input bg-gray-50 dark:bg-gray-800 font-bold text-lg">
                ${totalAmount.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Terms Section - Step 5 */}
        {(!wizardMode || wizardStep === 5) && (
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Terminos
          </h2>
          <div className="space-y-4">
            <div>
              <label className="label">Terminos y Condiciones</label>
              <textarea
                value={termsAndConditions}
                onChange={(e) => setTermsAndConditions(e.target.value)}
                className="input min-h-[100px]"
                placeholder="Terminos y condiciones de la propuesta..."
                rows={4}
              />
            </div>
            <div>
              <label className="label">Condiciones de Pago</label>
              <input
                type="text"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="input"
                placeholder="Ej: 50% al inicio, 50% al finalizar"
              />
            </div>
          </div>
        </div>
        )}

        {/* Wizard Navigation */}
        {wizardMode && (
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setWizardStep((s) => Math.max(0, s - 1))}
              disabled={wizardStep === 0}
              className="btn btn-secondary flex items-center gap-2 disabled:opacity-40"
            >
              <ArrowLeft className="w-4 h-4" />
              Anterior
            </button>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Paso {wizardStep + 1} de 6
            </span>
            {wizardStep < 5 ? (
              <button
                type="button"
                onClick={() => setWizardStep((s) => Math.min(5, s + 1))}
                className="btn btn-primary flex items-center gap-2"
              >
                Siguiente
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => handleSubmit(e as any, true)}
                  disabled={loading || !clientName || !title}
                  className="btn btn-secondary flex items-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Borrador
                </button>
                <button
                  type="submit"
                  disabled={loading || !clientName || !title}
                  className="btn btn-primary flex items-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Guardar
                </button>
              </div>
            )}
          </div>
        )}

        {/* Footer Buttons (full form mode) */}
        {!wizardMode && (
        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn btn-secondary"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={(e) => handleSubmit(e as any, true)}
            disabled={loading || !clientName || !title}
            className="btn btn-secondary flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Guardar Borrador
          </button>
          <button
            type="submit"
            disabled={loading || !clientName || !title}
            className="btn btn-primary flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Guardar
          </button>
        </div>
        )}
      </form>

      {/* Product Selection Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Seleccionar Producto
              </h3>
              <button
                onClick={() => setShowProductModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {products.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No hay productos disponibles.
                </div>
              ) : (
                <div className="space-y-2">
                  {products.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleAddProduct(product)}
                      className="w-full p-4 text-left border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="font-medium text-gray-900 dark:text-white">
                        {product.name}
                      </div>
                      {product.description && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {product.description}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  // Add custom item
                  setServiceItems((prev) => [
                    ...prev,
                    {
                      productId: null,
                      name: '',
                      description: '',
                      unitPrice: 0,
                      quantity: 1,
                      benefits: [],
                      methodology: '',
                      deliverables: [],
                      requirements: '',
                      scope: '',
                      outOfScope: '',
                      faqs: [],
                      estimatedDurationDays: null,
                      isExpanded: true,
                    },
                  ]);
                  setShowProductModal(false);
                }}
                className="w-full btn btn-secondary"
              >
                Agregar servicio personalizado
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
