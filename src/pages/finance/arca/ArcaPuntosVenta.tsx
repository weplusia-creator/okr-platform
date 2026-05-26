import { useState, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Star,
  Hash,
  Building2,
} from 'lucide-react';
import { useArca } from '../../../context/ArcaContext';
import { formatCuit } from '../../../types/arca';
import { CuitSelector } from '../../../components/arca/CuitSelector';
import { ArcaTabs } from '../../../components/arca/ArcaTabs';

export function ArcaPuntosVenta() {
  const {
    cuits,
    loadingCuits,
    puntosVenta,
    loadingPuntosVenta,
    addPuntoVenta,
    deletePuntoVenta,
    setDefaultPuntoVenta,
  } = useArca();

  const [selectedCuitId, setSelectedCuitId] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newNumero, setNewNumero] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Filter puntos de venta by selected CUIT
  const filteredPuntos = useMemo(() => {
    if (!selectedCuitId) return [];
    return puntosVenta.filter(p => p.organizationCuitId === selectedCuitId);
  }, [selectedCuitId, puntosVenta]);

  const selectedCuit = cuits.find(c => c.id === selectedCuitId);

  const handleAdd = async () => {
    const numero = parseInt(newNumero, 10);
    if (!selectedCuitId || isNaN(numero) || numero <= 0) return;

    try {
      await addPuntoVenta(selectedCuitId, numero, newDescription || undefined);
      setShowAddModal(false);
      setNewNumero('');
      setNewDescription('');
    } catch (err: any) {
      alert('No se pudo crear el punto de venta: ' + (err?.message || 'Error desconocido'));
    }
  };

  const handleDelete = async () => {
    if (deleteTarget) {
      try {
        await deletePuntoVenta(deleteTarget);
        setDeleteTarget(null);
      } catch (err: any) {
        alert('No se pudo eliminar el punto de venta: ' + (err?.message || 'Error desconocido'));
      }
    }
  };

  const handleSetDefault = async (id: string) => {
    try { await setDefaultPuntoVenta(id); }
    catch (err: any) { alert('No se pudo establecer como predeterminado: ' + (err?.message || 'Error desconocido')); }
  };

  // ---------- Loading ----------

  if (loadingCuits || loadingPuntosVenta) {
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
            Puntos de Venta
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Administra los puntos de venta de tus CUITs
          </p>
        </div>
        {selectedCuitId && (
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            <Plus className="w-5 h-5" />
            Agregar Punto de Venta
          </button>
        )}
      </div>

      {/* CUIT Selector */}
      <div className="card p-4">
        <label className="label">Seleccionar CUIT</label>
        <CuitSelector
          value={selectedCuitId}
          onChange={setSelectedCuitId}
          cuits={cuits}
        />
        {selectedCuit && (
          <div className="flex items-center gap-2 mt-2 text-sm text-gray-500 dark:text-gray-400">
            <Building2 className="w-4 h-4" />
            <span>{selectedCuit.businessName} - {formatCuit(selectedCuit.cuit)}</span>
          </div>
        )}
      </div>

      {/* Puntos de Venta List */}
      {!selectedCuitId ? (
        <div className="card p-12 text-center">
          <Hash className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Selecciona un CUIT
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Elige un CUIT de la lista para ver y administrar sus puntos de venta.
          </p>
        </div>
      ) : filteredPuntos.length === 0 ? (
        <div className="card p-12 text-center">
          <Hash className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No hay puntos de venta
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Este CUIT no tiene puntos de venta configurados.
          </p>
          <button onClick={() => setShowAddModal(true)} className="btn-primary inline-flex">
            <Plus className="w-5 h-5" />
            Agregar Punto de Venta
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredPuntos.map(pv => {
            const deleteTargetPV = puntosVenta.find(p => p.id === deleteTarget);
            return (
              <div key={pv.id} className="card p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg font-bold text-gray-600 dark:text-gray-300">
                        {pv.numero}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          Punto de Venta {String(pv.numero).padStart(4, '0')}
                        </h4>
                        {pv.isDefault && (
                          <span className="badge-success">
                            <Star className="w-3 h-3 mr-1" />
                            Por defecto
                          </span>
                        )}
                      </div>
                      {pv.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {pv.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!pv.isDefault && (
                      <button
                        onClick={() => handleSetDefault(pv.id)}
                        className="p-2 text-gray-400 hover:text-warning-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        title="Establecer como predeterminado"
                      >
                        <Star className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteTarget(pv.id)}
                      className="p-2 text-gray-400 hover:text-danger-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Punto de Venta Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Agregar Punto de Venta
            </h3>

            <div className="space-y-4">
              <div>
                <label className="label">Numero</label>
                <input
                  type="number"
                  value={newNumero}
                  onChange={(e) => setNewNumero(e.target.value)}
                  placeholder="Ej: 1"
                  min={1}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Descripcion (opcional)</label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Ej: Sucursal Centro"
                  className="input"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewNumero('');
                  setNewDescription('');
                }}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleAdd}
                className="btn-primary"
                disabled={!newNumero || parseInt(newNumero, 10) <= 0}
              >
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Eliminar Punto de Venta
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Estas seguro de que deseas eliminar este punto de venta?
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
