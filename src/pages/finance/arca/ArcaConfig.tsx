import { useState } from 'react';
import {
  Building2,
  Plus,
  Key,
  CheckCircle,
  AlertTriangle,
  Trash2,
  Edit2,
  Shield,
  Upload,
} from 'lucide-react';
import { useArca } from '../../../context/ArcaContext';
import type { OrganizationCuit, IVACondition } from '../../../types/arca';
import { formatCuit, IVA_CONDITION_CONFIG } from '../../../types/arca';
import { CertificateUpload } from '../../../components/arca/CertificateUpload';
import { ArcaTabs } from '../../../components/arca/ArcaTabs';
import { parseLocalDate } from '../../../utils/helpers';

import { toast } from '../../../components/ui/toast';
type ModalMode = 'add' | 'edit';

interface CuitFormData {
  cuit: string;
  businessName: string;
  fantasyName: string;
  ivaCondition: IVACondition;
  grossIncomeNumber: string;
  activityStartDate: string;
  address: string;
  environment: 'testing' | 'production';
  isPrimary: boolean;
  isActive: boolean;
}

const emptyCuitForm: CuitFormData = {
  cuit: '',
  businessName: '',
  fantasyName: '',
  ivaCondition: 'responsable_inscripto',
  grossIncomeNumber: '',
  activityStartDate: '',
  address: '',
  environment: 'testing',
  isPrimary: false,
  isActive: true,
};

export function ArcaConfig() {
  const { cuits, loadingCuits, addCuit, updateCuit, deleteCuit, fetchCuits } = useArca();

  // Modal state
  const [showCuitModal, setShowCuitModal] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('add');
  const [editingCuitId, setEditingCuitId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CuitFormData>(emptyCuitForm);

  // Certificate modal
  const [certCuitId, setCertCuitId] = useState<string | null>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<OrganizationCuit | null>(null);

  // ---------- Handlers ----------

  const openAddModal = () => {
    setFormData(emptyCuitForm);
    setModalMode('add');
    setEditingCuitId(null);
    setShowCuitModal(true);
  };

  const openEditModal = (cuit: OrganizationCuit) => {
    setFormData({
      cuit: cuit.cuit,
      businessName: cuit.businessName,
      fantasyName: cuit.fantasyName ?? '',
      ivaCondition: cuit.ivaCondition,
      grossIncomeNumber: cuit.grossIncomeNumber ?? '',
      activityStartDate: cuit.activityStartDate ?? '',
      address: cuit.address ?? '',
      environment: cuit.environment,
      isPrimary: cuit.isPrimary,
      isActive: cuit.isActive,
    });
    setModalMode('edit');
    setEditingCuitId(cuit.id);
    setShowCuitModal(true);
  };

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      if (modalMode === 'add') {
        const result = await addCuit({
          cuit: formData.cuit,
          businessName: formData.businessName,
          fantasyName: formData.fantasyName || null,
          ivaCondition: formData.ivaCondition,
          grossIncomeNumber: formData.grossIncomeNumber || null,
          activityStartDate: formData.activityStartDate || null,
          address: formData.address || null,
          environment: formData.environment,
          isPrimary: formData.isPrimary,
          isActive: formData.isActive,
        });
        if (!result) {
          setSaveError('Error al crear CUIT. Revisá la consola del navegador para más detalles.');
          return;
        }
      } else if (editingCuitId) {
        await updateCuit(editingCuitId, {
          cuit: formData.cuit,
          businessName: formData.businessName,
          fantasyName: formData.fantasyName || null,
          ivaCondition: formData.ivaCondition,
          grossIncomeNumber: formData.grossIncomeNumber || null,
          activityStartDate: formData.activityStartDate || null,
          address: formData.address || null,
          environment: formData.environment,
          isPrimary: formData.isPrimary,
          isActive: formData.isActive,
        });
      }
      setShowCuitModal(false);
    } catch (err: any) {
      setSaveError(err.message || 'Error inesperado');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteTarget) {
      try {
        await deleteCuit(deleteTarget.id);
        setDeleteTarget(null);
      } catch (err: any) {
        toast.error('No se pudo eliminar el CUIT: ' + (err?.message || 'Error desconocido'));
      }
    }
  };

  const handleCertSuccess = () => {
    setCertCuitId(null);
    fetchCuits();
  };

  // ---------- Loading ----------

  if (loadingCuits) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // ---------- Render ----------

  return (
    <div className="space-y-6">
      <ArcaTabs />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Configuracion ARCA
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {cuits.length} CUIT{cuits.length !== 1 ? 's' : ''} configurado{cuits.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={openAddModal} className="btn-primary">
          <Plus className="w-5 h-5" />
          Agregar CUIT
        </button>
      </div>

      {/* CUIT Cards */}
      {cuits.length === 0 ? (
        <div className="card p-12 text-center">
          <Building2 className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No hay CUITs configurados
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Comienza agregando el CUIT de tu organizacion para facturar con ARCA.
          </p>
          <button onClick={openAddModal} className="btn-primary inline-flex">
            <Plus className="w-5 h-5" />
            Agregar CUIT
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {cuits.map(cuit => (
            <div key={cuit.id} className="card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                {/* Left: info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-primary-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                        {cuit.businessName}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                        {formatCuit(cuit.cuit)}
                      </p>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <span className="badge-primary">
                      {IVA_CONDITION_CONFIG[cuit.ivaCondition].label}
                    </span>
                    <span className={cuit.environment === 'production' ? 'badge-success' : 'badge-warning'}>
                      {cuit.environment === 'production' ? 'Produccion' : 'Testing'}
                    </span>
                    {cuit.isPrimary && (
                      <span className="badge-primary">
                        <Shield className="w-3 h-3 mr-1" />
                        Principal
                      </span>
                    )}
                  </div>

                  {/* Certificate status */}
                  <div className="flex items-center gap-2 mt-3 text-sm">
                    {cuit.hasCertificate ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-success-500" />
                        <span className="text-success-700 dark:text-success-400">
                          Certificado instalado
                        </span>
                        {cuit.certificateExpiry && (
                          <span className="text-gray-400 dark:text-gray-500">
                            &middot; Vence: {parseLocalDate(cuit.certificateExpiry).toLocaleDateString('es-AR')}
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-warning-500" />
                        <span className="text-warning-700 dark:text-warning-400">
                          Sin certificado
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Right: actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => setCertCuitId(cuit.id)}
                    className="p-2 text-gray-400 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    title={cuit.hasCertificate ? 'Actualizar certificado' : 'Subir certificado'}
                  >
                    {cuit.hasCertificate ? <Key className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => openEditModal(cuit)}
                    className="p-2 text-gray-400 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {!cuit.isPrimary && (
                    <button
                      onClick={() => setDeleteTarget(cuit)}
                      className="p-2 text-gray-400 hover:text-danger-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit CUIT Modal */}
      {showCuitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              {modalMode === 'add' ? 'Agregar CUIT' : 'Editar CUIT'}
            </h3>

            <div className="space-y-4">
              {/* CUIT */}
              <div>
                <label className="label">CUIT</label>
                <input
                  type="text"
                  value={formData.cuit}
                  onChange={(e) => setFormData(prev => ({ ...prev, cuit: e.target.value }))}
                  placeholder="20345678901"
                  maxLength={13}
                  className="input"
                />
              </div>

              {/* Business Name */}
              <div>
                <label className="label">Razon Social</label>
                <input
                  type="text"
                  value={formData.businessName}
                  onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                  placeholder="Mi Empresa S.A."
                  className="input"
                />
              </div>

              {/* Fantasy Name */}
              <div>
                <label className="label">Nombre de Fantasia</label>
                <input
                  type="text"
                  value={formData.fantasyName}
                  onChange={(e) => setFormData(prev => ({ ...prev, fantasyName: e.target.value }))}
                  placeholder="Mi Marca (opcional)"
                  className="input"
                />
              </div>

              {/* IVA Condition */}
              <div>
                <label className="label">Condicion frente al IVA</label>
                <select
                  value={formData.ivaCondition}
                  onChange={(e) => setFormData(prev => ({ ...prev, ivaCondition: e.target.value as IVACondition }))}
                  className="select"
                >
                  {Object.values(IVA_CONDITION_CONFIG).map(config => (
                    <option key={config.id} value={config.id}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Gross Income Number */}
              <div>
                <label className="label">Numero de Ingresos Brutos</label>
                <input
                  type="text"
                  value={formData.grossIncomeNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, grossIncomeNumber: e.target.value }))}
                  placeholder="Opcional"
                  className="input"
                />
              </div>

              {/* Activity Start Date */}
              <div>
                <label className="label">Fecha de Inicio de Actividades</label>
                <input
                  type="date"
                  value={formData.activityStartDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, activityStartDate: e.target.value }))}
                  className="input"
                />
              </div>

              {/* Address */}
              <div>
                <label className="label">Domicilio Fiscal</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Av. Corrientes 1234, CABA"
                  className="input"
                />
              </div>

              {/* Environment Toggle */}
              <div>
                <label className="label">Entorno</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="environment"
                      value="testing"
                      checked={formData.environment === 'testing'}
                      onChange={() => setFormData(prev => ({ ...prev, environment: 'testing' }))}
                      className="text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Testing</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="environment"
                      value="production"
                      checked={formData.environment === 'production'}
                      onChange={() => setFormData(prev => ({ ...prev, environment: 'production' }))}
                      className="text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Produccion</span>
                  </label>
                </div>
              </div>

              {/* Is Primary */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isPrimary}
                    onChange={(e) => setFormData(prev => ({ ...prev, isPrimary: e.target.checked }))}
                    className="rounded text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Establecer como CUIT principal
                  </span>
                </label>
              </div>
            </div>

            {/* Error */}
            {saveError && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mt-4">
                <p className="text-sm text-red-700 dark:text-red-300">{saveError}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => { setShowCuitModal(false); setSaveError(null); }}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="btn-primary"
                disabled={!formData.cuit || !formData.businessName || saving}
              >
                {saving ? 'Guardando...' : modalMode === 'add' ? 'Agregar' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Certificate Upload Modal */}
      {certCuitId && (
        <CertificateUpload
          cuitId={certCuitId}
          onClose={() => setCertCuitId(null)}
          onSuccess={handleCertSuccess}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Eliminar CUIT
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Estas seguro de que deseas eliminar el CUIT{' '}
              <strong>{formatCuit(deleteTarget.cuit)}</strong> ({deleteTarget.businessName})?
              Esta accion no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="btn-danger"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
