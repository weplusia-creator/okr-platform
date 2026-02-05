import { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Plus,
  Trash2,
  Edit3,
  ChevronDown,
  ChevronUp,
  Save,
  X,
  Loader2,
  Link as LinkIcon,
  Target,
  ClipboardList,
  Star,
  Presentation,
  GripVertical,
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { useProjects } from '../../context/ProjectContext';
import type { Product, ProductTemplateModule, ProductTemplateDeliverable, ProductTemplateObjective } from '../../types/projects';

interface ModuleData {
  deliverables: ProductTemplateDeliverable[];
  objectives: ProductTemplateObjective[];
}

interface NPSStats {
  avg: number;
  nps: number;
  promoters: number;
  passives: number;
  detractors: number;
  total: number;
}

export function Products() {
  const {
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    fetchProductTemplateModules,
    addProductTemplateModule,
    updateProductTemplateModule,
    deleteProductTemplateModule,
    fetchTemplateDeliverables,
    addTemplateDeliverable,
    updateTemplateDeliverable,
    deleteTemplateDeliverable,
    fetchTemplateObjectives,
    addTemplateObjective,
    updateTemplateObjective,
    deleteTemplateObjective,
    fetchAggregatedNPS,
  } = useProjects();

  // Product expand
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [templateModules, setTemplateModules] = useState<Record<string, ProductTemplateModule[]>>({});
  const [loadingModules, setLoadingModules] = useState<string | null>(null);

  // Module expand (within product)
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [moduleData, setModuleData] = useState<Record<string, ModuleData>>({});
  const [loadingModuleData, setLoadingModuleData] = useState<string | null>(null);

  // NPS data per product
  const [npsData, setNpsData] = useState<Record<string, Record<string, NPSStats>>>({});

  // Delete confirms
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteModuleConfirm, setDeleteModuleConfirm] = useState<string | null>(null);
  const [deleteDelConfirm, setDeleteDelConfirm] = useState<string | null>(null);
  const [deleteObjConfirm, setDeleteObjConfirm] = useState<string | null>(null);

  // New product form
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductDesc, setNewProductDesc] = useState('');
  const [savingProduct, setSavingProduct] = useState(false);

  // Edit product
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [editDiagnostic, setEditDiagnostic] = useState(false);

  // New module
  const [addingModuleTo, setAddingModuleTo] = useState<string | null>(null);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [newModuleDesc, setNewModuleDesc] = useState('');

  // Edit module
  const [editingModule, setEditingModule] = useState<string | null>(null);
  const [editModuleTitle, setEditModuleTitle] = useState('');
  const [editModuleDesc, setEditModuleDesc] = useState('');

  // Presentation URL
  const [editingPresentation, setEditingPresentation] = useState<string | null>(null);
  const [presentationUrl, setPresentationUrl] = useState('');

  // New deliverable
  const [addingDeliverableTo, setAddingDeliverableTo] = useState<string | null>(null);
  const [newDelName, setNewDelName] = useState('');
  const [newDelDesc, setNewDelDesc] = useState('');

  // Edit deliverable
  const [editingDel, setEditingDel] = useState<string | null>(null);
  const [editDelName, setEditDelName] = useState('');
  const [editDelDesc, setEditDelDesc] = useState('');

  // New objective
  const [addingObjectiveTo, setAddingObjectiveTo] = useState<string | null>(null);
  const [newObjText, setNewObjText] = useState('');

  // Edit objective
  const [editingObj, setEditingObj] = useState<string | null>(null);
  const [editObjText, setEditObjText] = useState('');

  // ===== HANDLERS =====

  const handleToggleProduct = useCallback(async (productId: string, productName: string) => {
    if (expandedProduct === productId) {
      setExpandedProduct(null);
      setExpandedModule(null);
      return;
    }
    setExpandedProduct(productId);
    setExpandedModule(null);
    if (!templateModules[productId]) {
      setLoadingModules(productId);
      const mods = await fetchProductTemplateModules(productId);
      setTemplateModules(prev => ({ ...prev, [productId]: mods }));
      setLoadingModules(null);
    }
    // Fetch NPS data for this product
    if (!npsData[productName]) {
      const nps = await fetchAggregatedNPS(productName);
      setNpsData(prev => ({ ...prev, [productName]: nps }));
    }
  }, [expandedProduct, templateModules, npsData, fetchProductTemplateModules, fetchAggregatedNPS]);

  const handleToggleModule = useCallback(async (moduleId: string) => {
    if (expandedModule === moduleId) {
      setExpandedModule(null);
      return;
    }
    setExpandedModule(moduleId);
    if (!moduleData[moduleId]) {
      setLoadingModuleData(moduleId);
      const [deliverables, objectives] = await Promise.all([
        fetchTemplateDeliverables(moduleId),
        fetchTemplateObjectives(moduleId),
      ]);
      setModuleData(prev => ({ ...prev, [moduleId]: { deliverables, objectives } }));
      setLoadingModuleData(null);
    }
  }, [expandedModule, moduleData, fetchTemplateDeliverables, fetchTemplateObjectives]);

  const handleCreateProduct = async () => {
    if (!newProductName.trim()) return;
    setSavingProduct(true);
    await addProduct(newProductName.trim(), newProductDesc.trim() || null);
    setNewProductName('');
    setNewProductDesc('');
    setShowNewProduct(false);
    setSavingProduct(false);
  };

  const handleUpdateProduct = async (id: string) => {
    await updateProduct(id, {
      name: editName.trim(),
      description: editDesc.trim() || null,
      basePrice: editPrice ? Number(editPrice) : null,
      estimatedDurationDays: editDuration ? Number(editDuration) : null,
      includesDiagnostic: editDiagnostic,
    });
    setEditingProduct(null);
  };

  const handleDeleteProduct = async (id: string) => {
    await deleteProduct(id);
    setDeleteConfirm(null);
    if (expandedProduct === id) setExpandedProduct(null);
  };

  const handleAddModule = async (productId: string) => {
    if (!newModuleTitle.trim()) return;
    const currentModules = templateModules[productId] || [];
    const mod = await addProductTemplateModule(productId, newModuleTitle.trim(), newModuleDesc.trim() || null, currentModules.length);
    if (mod) {
      setTemplateModules(prev => ({ ...prev, [productId]: [...(prev[productId] || []), mod] }));
    }
    setNewModuleTitle('');
    setNewModuleDesc('');
    setAddingModuleTo(null);
  };

  const handleUpdateModule = async (moduleId: string, productId: string) => {
    await updateProductTemplateModule(moduleId, { title: editModuleTitle.trim(), description: editModuleDesc.trim() || null });
    setTemplateModules(prev => ({
      ...prev,
      [productId]: (prev[productId] || []).map(m =>
        m.id === moduleId ? { ...m, title: editModuleTitle.trim(), description: editModuleDesc.trim() || null } : m
      ),
    }));
    setEditingModule(null);
  };

  const handleDeleteModule = async (moduleId: string, productId: string) => {
    await deleteProductTemplateModule(moduleId);
    setTemplateModules(prev => ({
      ...prev,
      [productId]: (prev[productId] || []).filter(m => m.id !== moduleId),
    }));
    setDeleteModuleConfirm(null);
    if (expandedModule === moduleId) setExpandedModule(null);
  };

  const handleSavePresentation = async (moduleId: string, productId: string) => {
    await updateProductTemplateModule(moduleId, { presentationUrl: presentationUrl.trim() || null });
    setTemplateModules(prev => ({
      ...prev,
      [productId]: (prev[productId] || []).map(m =>
        m.id === moduleId ? { ...m, presentationUrl: presentationUrl.trim() || null } : m
      ),
    }));
    setEditingPresentation(null);
  };

  // Deliverable handlers
  const handleAddDeliverable = async (moduleId: string) => {
    if (!newDelName.trim()) return;
    const current = moduleData[moduleId]?.deliverables || [];
    const del = await addTemplateDeliverable(moduleId, newDelName.trim(), newDelDesc.trim() || null, current.length);
    if (del) {
      setModuleData(prev => ({
        ...prev,
        [moduleId]: { ...prev[moduleId], deliverables: [...(prev[moduleId]?.deliverables || []), del] },
      }));
    }
    setNewDelName('');
    setNewDelDesc('');
    setAddingDeliverableTo(null);
  };

  const handleUpdateDeliverable = async (delId: string, moduleId: string) => {
    await updateTemplateDeliverable(delId, { name: editDelName.trim(), description: editDelDesc.trim() || null });
    setModuleData(prev => ({
      ...prev,
      [moduleId]: {
        ...prev[moduleId],
        deliverables: (prev[moduleId]?.deliverables || []).map(d =>
          d.id === delId ? { ...d, name: editDelName.trim(), description: editDelDesc.trim() || null } : d
        ),
      },
    }));
    setEditingDel(null);
  };

  const handleDeleteDeliverable = async (delId: string, moduleId: string) => {
    await deleteTemplateDeliverable(delId);
    setModuleData(prev => ({
      ...prev,
      [moduleId]: {
        ...prev[moduleId],
        deliverables: (prev[moduleId]?.deliverables || []).filter(d => d.id !== delId),
      },
    }));
    setDeleteDelConfirm(null);
  };

  // Objective handlers
  const handleAddObjective = async (moduleId: string) => {
    if (!newObjText.trim()) return;
    const current = moduleData[moduleId]?.objectives || [];
    const obj = await addTemplateObjective(moduleId, newObjText.trim(), current.length);
    if (obj) {
      setModuleData(prev => ({
        ...prev,
        [moduleId]: { ...prev[moduleId], objectives: [...(prev[moduleId]?.objectives || []), obj] },
      }));
    }
    setNewObjText('');
    setAddingObjectiveTo(null);
  };

  const handleUpdateObjective = async (objId: string, moduleId: string) => {
    await updateTemplateObjective(objId, { text: editObjText.trim() });
    setModuleData(prev => ({
      ...prev,
      [moduleId]: {
        ...prev[moduleId],
        objectives: (prev[moduleId]?.objectives || []).map(o =>
          o.id === objId ? { ...o, text: editObjText.trim() } : o
        ),
      },
    }));
    setEditingObj(null);
  };

  const handleDeleteObjective = async (objId: string, moduleId: string) => {
    await deleteTemplateObjective(objId);
    setModuleData(prev => ({
      ...prev,
      [moduleId]: {
        ...prev[moduleId],
        objectives: (prev[moduleId]?.objectives || []).filter(o => o.id !== objId),
      },
    }));
    setDeleteObjConfirm(null);
  };

  // Drag & drop reorder
  const handleModuleDragEnd = useCallback(async (result: DropResult, productId: string) => {
    if (!result.destination) return;
    const from = result.source.index;
    const to = result.destination.index;
    if (from === to) return;

    const mods = [...(templateModules[productId] || [])];
    const [moved] = mods.splice(from, 1);
    mods.splice(to, 0, moved);

    // Update local state immediately
    setTemplateModules(prev => ({ ...prev, [productId]: mods }));

    // Persist new sort orders
    for (let i = 0; i < mods.length; i++) {
      if (mods[i].sortOrder !== i) {
        await updateProductTemplateModule(mods[i].id, { sortOrder: i });
        mods[i] = { ...mods[i], sortOrder: i };
      }
    }
    setTemplateModules(prev => ({ ...prev, [productId]: [...mods] }));
  }, [templateModules, updateProductTemplateModule]);

  // ===== RENDER =====

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Servicios</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Administrá los servicios, sus módulos, entregables y objetivos
          </p>
        </div>
        <button onClick={() => setShowNewProduct(true)} className="btn-primary">
          <Plus className="w-5 h-5" />
          Nuevo servicio
        </button>
      </div>

      {/* New product form */}
      {showNewProduct && (
        <div className="card p-4 space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Nuevo servicio</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Nombre *</label>
              <input type="text" value={newProductName} onChange={e => setNewProductName(e.target.value)} className="input" placeholder="Ej: WAU 360" autoFocus />
            </div>
            <div>
              <label className="label">Descripción</label>
              <input type="text" value={newProductDesc} onChange={e => setNewProductDesc(e.target.value)} className="input" placeholder="Descripción del servicio" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => { setShowNewProduct(false); setNewProductName(''); setNewProductDesc(''); }} className="btn-secondary">Cancelar</button>
            <button onClick={handleCreateProduct} disabled={savingProduct || !newProductName.trim()} className="btn-primary">
              {savingProduct ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Crear
            </button>
          </div>
        </div>
      )}

      {/* Products list */}
      {products.length === 0 && !showNewProduct ? (
        <div className="card p-12 text-center">
          <Sparkles className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No hay servicios</h3>
          <p className="text-gray-500 dark:text-gray-400">Creá tu primer servicio para definir módulos plantilla</p>
        </div>
      ) : (
        <div className="space-y-4">
          {products.map(product => {
            const isExpanded = expandedProduct === product.id;
            const modules = templateModules[product.id] || [];
            const isEditing = editingProduct === product.id;
            const productNPS = npsData[product.name] || {};

            return (
              <div key={product.id} className="card overflow-hidden">
                {/* Product header */}
                <div className="p-4 flex items-center justify-between">
                  <div className="flex-1">
                    {isEditing ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="input text-sm" autoFocus placeholder="Nombre" />
                          <input type="text" value={editDesc} onChange={e => setEditDesc(e.target.value)} className="input text-sm" placeholder="Descripción" />
                        </div>
                        <div className="flex items-center gap-3">
                          <input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)} className="input text-sm w-32" placeholder="Precio base" />
                          <input type="number" value={editDuration} onChange={e => setEditDuration(e.target.value)} className="input text-sm w-32" placeholder="Duración (días)" />
                          <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                            <input type="checkbox" checked={editDiagnostic} onChange={e => setEditDiagnostic(e.target.checked)} className="rounded" />
                            Incluye diagnóstico BMC
                          </label>
                          <button onClick={() => handleUpdateProduct(product.id)} className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"><Save className="w-4 h-4" /></button>
                          <button onClick={() => setEditingProduct(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><X className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => handleToggleProduct(product.id, product.name)} className="text-left w-full">
                        <div className="flex items-center gap-3">
                          <Sparkles className="w-5 h-5 text-primary-600" />
                          <h4 className="font-semibold text-gray-900 dark:text-white">{product.name}</h4>
                          <span className="text-xs text-lime-700 bg-lime-100 dark:text-lime-300 dark:bg-lime-900/40 px-2 py-0.5 rounded-full">{(templateModules[product.id] || []).length} módulos</span>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400 ml-auto" /> : <ChevronDown className="w-4 h-4 text-gray-400 ml-auto" />}
                        </div>
                        {product.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 ml-8">{product.description}</p>}
                        <div className="flex items-center gap-3 mt-1 ml-8">
                          {product.basePrice != null && <span className="text-xs text-gray-400">${product.basePrice.toLocaleString()}</span>}
                          {product.estimatedDurationDays != null && <span className="text-xs text-gray-400">{product.estimatedDurationDays} días</span>}
                          {product.includesDiagnostic && <span className="text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-1.5 py-0.5 rounded-full">BMC</span>}
                        </div>
                      </button>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="flex items-center gap-1 ml-3">
                      <button onClick={() => { setEditingProduct(product.id); setEditName(product.name); setEditDesc(product.description || ''); setEditPrice(product.basePrice?.toString() || ''); setEditDuration(product.estimatedDurationDays?.toString() || ''); setEditDiagnostic(product.includesDiagnostic); }} className="p-2 text-gray-400 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors" title="Editar"><Edit3 className="w-4 h-4" /></button>
                      {deleteConfirm === product.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleDeleteProduct(product.id)} className="px-2 py-1 text-xs bg-red-600 text-white rounded">Confirmar</button>
                          <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded">No</button>
                        </div>
                      ) : (
                        <button onClick={() => setDeleteConfirm(product.id)} className="p-2 text-gray-400 hover:text-danger-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                  )}
                </div>

                {/* Expanded product: modules */}
                {isExpanded && (
                  <div className="border-t border-gray-200 dark:border-gray-700">
                    {loadingModules === product.id ? (
                      <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary-600" /></div>
                    ) : (
                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">Módulos plantilla</h5>
                          <button onClick={() => { setAddingModuleTo(product.id); setNewModuleTitle(''); setNewModuleDesc(''); }} className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
                            <Plus className="w-3.5 h-3.5" /> Agregar módulo
                          </button>
                        </div>

                        {modules.length === 0 && addingModuleTo !== product.id && (
                          <p className="text-sm text-gray-400 text-center py-4">Este servicio no tiene módulos plantilla aún</p>
                        )}

                        <DragDropContext onDragEnd={(result) => handleModuleDragEnd(result, product.id)}>
                          <Droppable droppableId={`modules-${product.id}`}>
                            {(provided) => (
                              <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
                        {modules.map((mod, idx) => {
                          const isModExpanded = expandedModule === mod.id;
                          const data = moduleData[mod.id];
                          const modNPS = productNPS[mod.title];

                          return (
                            <Draggable key={mod.id} draggableId={mod.id} index={idx}>
                              {(dragProvided, snapshot) => (
                            <div ref={dragProvided.innerRef} {...dragProvided.draggableProps} className={`rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden ${snapshot.isDragging ? 'shadow-lg ring-2 ring-primary-300' : ''}`}>
                              {/* Module header */}
                              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800">
                                <div {...dragProvided.dragHandleProps} className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600">
                                  <GripVertical className="w-4 h-4" />
                                </div>
                                {editingModule === mod.id ? (
                                  <div className="flex-1 flex items-center gap-2">
                                    <input type="text" value={editModuleTitle} onChange={e => setEditModuleTitle(e.target.value)} className="input text-sm flex-1" autoFocus />
                                    <input type="text" value={editModuleDesc} onChange={e => setEditModuleDesc(e.target.value)} className="input text-sm flex-1" placeholder="Descripción" />
                                    <button onClick={() => handleUpdateModule(mod.id, product.id)} className="p-1 text-green-600"><Save className="w-4 h-4" /></button>
                                    <button onClick={() => setEditingModule(null)} className="p-1 text-gray-400"><X className="w-4 h-4" /></button>
                                  </div>
                                ) : (
                                  <>
                                    <button onClick={() => handleToggleModule(mod.id)} className="flex-1 text-left">
                                      <p className="text-sm font-medium text-gray-900 dark:text-white">{mod.title}</p>
                                      {mod.description && <p className="text-xs text-gray-500 dark:text-gray-400">{mod.description}</p>}
                                    </button>
                                    {modNPS && (
                                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${modNPS.nps >= 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                        NPS {modNPS.nps > 0 ? '+' : ''}{modNPS.nps}
                                      </span>
                                    )}
                                    <button onClick={() => { setEditingModule(mod.id); setEditModuleTitle(mod.title); setEditModuleDesc(mod.description || ''); }} className="p-1 text-gray-400 hover:text-primary-600"><Edit3 className="w-3.5 h-3.5" /></button>
                                    {deleteModuleConfirm === mod.id ? (
                                      <div className="flex items-center gap-1">
                                        <button onClick={() => handleDeleteModule(mod.id, product.id)} className="px-2 py-0.5 text-xs bg-red-600 text-white rounded">Sí</button>
                                        <button onClick={() => setDeleteModuleConfirm(null)} className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 rounded">No</button>
                                      </div>
                                    ) : (
                                      <button onClick={() => setDeleteModuleConfirm(mod.id)} className="p-1 text-gray-400 hover:text-danger-600"><Trash2 className="w-3.5 h-3.5" /></button>
                                    )}
                                    <button onClick={() => handleToggleModule(mod.id)} className="p-1 text-gray-400 hover:text-primary-600">
                                      {isModExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </button>
                                  </>
                                )}
                              </div>

                              {/* Module detail */}
                              {isModExpanded && (
                                <div className="p-4 space-y-5">
                                  {loadingModuleData === mod.id ? (
                                    <div className="flex items-center justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary-600" /></div>
                                  ) : (
                                    <>
                                      {/* Presentation */}
                                      <div>
                                        <div className="flex items-center gap-2 mb-2">
                                          <Presentation className="w-4 h-4 text-purple-500" />
                                          <h6 className="text-sm font-medium text-gray-700 dark:text-gray-300">Presentación</h6>
                                        </div>
                                        {editingPresentation === mod.id ? (
                                          <div className="flex items-center gap-2">
                                            <input type="url" value={presentationUrl} onChange={e => setPresentationUrl(e.target.value)} className="input text-sm flex-1" placeholder="URL de la presentación" autoFocus
                                              onKeyDown={e => { if (e.key === 'Enter') handleSavePresentation(mod.id, product.id); if (e.key === 'Escape') setEditingPresentation(null); }} />
                                            <button onClick={() => handleSavePresentation(mod.id, product.id)} className="p-1.5 text-green-600"><Save className="w-4 h-4" /></button>
                                            <button onClick={() => setEditingPresentation(null)} className="p-1.5 text-gray-400"><X className="w-4 h-4" /></button>
                                          </div>
                                        ) : mod.presentationUrl ? (
                                          <div className="flex items-center gap-2">
                                            <a href={mod.presentationUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline truncate flex items-center gap-1">
                                              <LinkIcon className="w-3.5 h-3.5 shrink-0" />
                                              {mod.presentationUrl}
                                            </a>
                                            <button onClick={() => { setEditingPresentation(mod.id); setPresentationUrl(mod.presentationUrl || ''); }} className="p-1 text-gray-400 hover:text-primary-600"><Edit3 className="w-3.5 h-3.5" /></button>
                                          </div>
                                        ) : (
                                          <button onClick={() => { setEditingPresentation(mod.id); setPresentationUrl(''); }} className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
                                            <Plus className="w-3.5 h-3.5" /> Agregar URL
                                          </button>
                                        )}
                                      </div>

                                      {/* Objectives */}
                                      <div>
                                        <div className="flex items-center justify-between mb-2">
                                          <div className="flex items-center gap-2">
                                            <Target className="w-4 h-4 text-blue-500" />
                                            <h6 className="text-sm font-medium text-gray-700 dark:text-gray-300">Objetivos</h6>
                                          </div>
                                          <button onClick={() => { setAddingObjectiveTo(mod.id); setNewObjText(''); }} className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1">
                                            <Plus className="w-3 h-3" /> Agregar
                                          </button>
                                        </div>
                                        <div className="space-y-1.5">
                                          {(data?.objectives || []).map((obj, oi) => (
                                            <div key={obj.id} className="flex items-start gap-2 text-sm">
                                              <span className="text-gray-400 mt-0.5">{oi + 1}.</span>
                                              {editingObj === obj.id ? (
                                                <div className="flex-1 flex items-center gap-2">
                                                  <input type="text" value={editObjText} onChange={e => setEditObjText(e.target.value)} className="input text-sm flex-1" autoFocus
                                                    onKeyDown={e => { if (e.key === 'Enter') handleUpdateObjective(obj.id, mod.id); if (e.key === 'Escape') setEditingObj(null); }} />
                                                  <button onClick={() => handleUpdateObjective(obj.id, mod.id)} className="p-0.5 text-green-600"><Save className="w-3.5 h-3.5" /></button>
                                                  <button onClick={() => setEditingObj(null)} className="p-0.5 text-gray-400"><X className="w-3.5 h-3.5" /></button>
                                                </div>
                                              ) : (
                                                <>
                                                  <span className="flex-1 text-gray-700 dark:text-gray-300">{obj.text}</span>
                                                  <button onClick={() => { setEditingObj(obj.id); setEditObjText(obj.text); }} className="p-0.5 text-gray-400 hover:text-primary-600"><Edit3 className="w-3 h-3" /></button>
                                                  {deleteObjConfirm === obj.id ? (
                                                    <div className="flex items-center gap-1">
                                                      <button onClick={() => handleDeleteObjective(obj.id, mod.id)} className="px-1.5 py-0.5 text-xs bg-red-600 text-white rounded">Sí</button>
                                                      <button onClick={() => setDeleteObjConfirm(null)} className="px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 rounded">No</button>
                                                    </div>
                                                  ) : (
                                                    <button onClick={() => setDeleteObjConfirm(obj.id)} className="p-0.5 text-gray-400 hover:text-danger-600"><Trash2 className="w-3 h-3" /></button>
                                                  )}
                                                </>
                                              )}
                                            </div>
                                          ))}
                                          {(data?.objectives || []).length === 0 && addingObjectiveTo !== mod.id && (
                                            <p className="text-xs text-gray-400">Sin objetivos definidos</p>
                                          )}
                                          {addingObjectiveTo === mod.id && (
                                            <div className="flex items-center gap-2">
                                              <input type="text" value={newObjText} onChange={e => setNewObjText(e.target.value)} className="input text-sm flex-1" placeholder="Objetivo..." autoFocus
                                                onKeyDown={e => { if (e.key === 'Enter') handleAddObjective(mod.id); if (e.key === 'Escape') setAddingObjectiveTo(null); }} />
                                              <button onClick={() => handleAddObjective(mod.id)} disabled={!newObjText.trim()} className="p-1 text-primary-600 disabled:opacity-50"><Save className="w-3.5 h-3.5" /></button>
                                              <button onClick={() => setAddingObjectiveTo(null)} className="p-1 text-gray-400"><X className="w-3.5 h-3.5" /></button>
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {/* Deliverables */}
                                      <div>
                                        <div className="flex items-center justify-between mb-2">
                                          <div className="flex items-center gap-2">
                                            <ClipboardList className="w-4 h-4 text-orange-500" />
                                            <h6 className="text-sm font-medium text-gray-700 dark:text-gray-300">Entregables</h6>
                                          </div>
                                          <button onClick={() => { setAddingDeliverableTo(mod.id); setNewDelName(''); setNewDelDesc(''); }} className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1">
                                            <Plus className="w-3 h-3" /> Agregar
                                          </button>
                                        </div>
                                        <div className="space-y-1.5">
                                          {(data?.deliverables || []).map((del, di) => (
                                            <div key={del.id} className="flex items-start gap-2 text-sm p-2 rounded bg-gray-50 dark:bg-gray-800/50">
                                              <span className="text-gray-400 mt-0.5">{di + 1}.</span>
                                              {editingDel === del.id ? (
                                                <div className="flex-1 flex items-center gap-2">
                                                  <input type="text" value={editDelName} onChange={e => setEditDelName(e.target.value)} className="input text-sm flex-1" autoFocus />
                                                  <input type="text" value={editDelDesc} onChange={e => setEditDelDesc(e.target.value)} className="input text-sm flex-1" placeholder="Descripción" />
                                                  <button onClick={() => handleUpdateDeliverable(del.id, mod.id)} className="p-0.5 text-green-600"><Save className="w-3.5 h-3.5" /></button>
                                                  <button onClick={() => setEditingDel(null)} className="p-0.5 text-gray-400"><X className="w-3.5 h-3.5" /></button>
                                                </div>
                                              ) : (
                                                <>
                                                  <div className="flex-1">
                                                    <p className="font-medium text-gray-900 dark:text-white">{del.name}</p>
                                                    {del.description && <p className="text-xs text-gray-500 dark:text-gray-400">{del.description}</p>}
                                                  </div>
                                                  <button onClick={() => { setEditingDel(del.id); setEditDelName(del.name); setEditDelDesc(del.description || ''); }} className="p-0.5 text-gray-400 hover:text-primary-600"><Edit3 className="w-3 h-3" /></button>
                                                  {deleteDelConfirm === del.id ? (
                                                    <div className="flex items-center gap-1">
                                                      <button onClick={() => handleDeleteDeliverable(del.id, mod.id)} className="px-1.5 py-0.5 text-xs bg-red-600 text-white rounded">Sí</button>
                                                      <button onClick={() => setDeleteDelConfirm(null)} className="px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 rounded">No</button>
                                                    </div>
                                                  ) : (
                                                    <button onClick={() => setDeleteDelConfirm(del.id)} className="p-0.5 text-gray-400 hover:text-danger-600"><Trash2 className="w-3 h-3" /></button>
                                                  )}
                                                </>
                                              )}
                                            </div>
                                          ))}
                                          {(data?.deliverables || []).length === 0 && addingDeliverableTo !== mod.id && (
                                            <p className="text-xs text-gray-400">Sin entregables definidos</p>
                                          )}
                                          {addingDeliverableTo === mod.id && (
                                            <div className="flex items-center gap-2 p-2 rounded bg-primary-50 dark:bg-primary-900/20">
                                              <input type="text" value={newDelName} onChange={e => setNewDelName(e.target.value)} className="input text-sm flex-1" placeholder="Nombre *" autoFocus
                                                onKeyDown={e => { if (e.key === 'Enter') handleAddDeliverable(mod.id); if (e.key === 'Escape') setAddingDeliverableTo(null); }} />
                                              <input type="text" value={newDelDesc} onChange={e => setNewDelDesc(e.target.value)} className="input text-sm flex-1" placeholder="Descripción"
                                                onKeyDown={e => { if (e.key === 'Enter') handleAddDeliverable(mod.id); if (e.key === 'Escape') setAddingDeliverableTo(null); }} />
                                              <button onClick={() => handleAddDeliverable(mod.id)} disabled={!newDelName.trim()} className="p-1 text-primary-600 disabled:opacity-50"><Save className="w-3.5 h-3.5" /></button>
                                              <button onClick={() => setAddingDeliverableTo(null)} className="p-1 text-gray-400"><X className="w-3.5 h-3.5" /></button>
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {/* NPS Aggregated */}
                                      <div>
                                        <div className="flex items-center gap-2 mb-2">
                                          <Star className="w-4 h-4 text-yellow-500" />
                                          <h6 className="text-sm font-medium text-gray-700 dark:text-gray-300">NPS Agregado (todos los proyectos)</h6>
                                        </div>
                                        {modNPS ? (
                                          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2 text-center">
                                              <p className="text-lg font-bold text-gray-900 dark:text-white">{modNPS.avg.toFixed(1)}</p>
                                              <p className="text-xs text-gray-500">Promedio</p>
                                            </div>
                                            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2 text-center">
                                              <p className={`text-lg font-bold ${modNPS.nps >= 0 ? 'text-green-600' : 'text-red-600'}`}>{modNPS.nps > 0 ? '+' : ''}{modNPS.nps}</p>
                                              <p className="text-xs text-gray-500">NPS</p>
                                            </div>
                                            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2 text-center">
                                              <p className="text-lg font-bold text-gray-900 dark:text-white">{modNPS.total}</p>
                                              <p className="text-xs text-gray-500">Respuestas</p>
                                            </div>
                                            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2 text-center">
                                              <p className="text-lg font-bold text-green-600">{modNPS.promoters}</p>
                                              <p className="text-xs text-gray-500">Promotores</p>
                                            </div>
                                            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-2 text-center">
                                              <p className="text-lg font-bold text-yellow-600">{modNPS.passives}</p>
                                              <p className="text-xs text-gray-500">Pasivos</p>
                                            </div>
                                            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2 text-center">
                                              <p className="text-lg font-bold text-red-600">{modNPS.detractors}</p>
                                              <p className="text-xs text-gray-500">Detractores</p>
                                            </div>
                                          </div>
                                        ) : (
                                          <p className="text-xs text-gray-400">Sin datos NPS para este módulo</p>
                                        )}
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </DragDropContext>

                        {/* Add module inline */}
                        {addingModuleTo === product.id && (
                          <div className="flex items-center gap-2 p-3 rounded-lg bg-primary-50 dark:bg-primary-900/20">
                            <input type="text" value={newModuleTitle} onChange={e => setNewModuleTitle(e.target.value)} className="input text-sm flex-1" placeholder="Título del módulo *" autoFocus
                              onKeyDown={e => { if (e.key === 'Enter') handleAddModule(product.id); if (e.key === 'Escape') setAddingModuleTo(null); }} />
                            <input type="text" value={newModuleDesc} onChange={e => setNewModuleDesc(e.target.value)} className="input text-sm flex-1" placeholder="Descripción (opcional)"
                              onKeyDown={e => { if (e.key === 'Enter') handleAddModule(product.id); if (e.key === 'Escape') setAddingModuleTo(null); }} />
                            <button onClick={() => handleAddModule(product.id)} disabled={!newModuleTitle.trim()} className="p-1.5 text-primary-600 disabled:opacity-50"><Save className="w-4 h-4" /></button>
                            <button onClick={() => setAddingModuleTo(null)} className="p-1.5 text-gray-400"><X className="w-4 h-4" /></button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
