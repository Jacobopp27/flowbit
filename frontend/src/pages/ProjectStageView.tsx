import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, Package, ShoppingCart, Activity } from 'lucide-react';
import projectService, { ProjectStageDetail, ProjectMaterialPurchaseCreate, StageEventLog } from '../services/projects';

export function ProjectStageView() {
  const { projectId, stageId } = useParams();
  const navigate = useNavigate();
  const [stageDetail, setStageDetail] = useState<ProjectStageDetail | null>(null);
  const [eventLog, setEventLog] = useState<StageEventLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchaseForm, setPurchaseForm] = useState<{
    material_id: number;
    quantity_purchased: number;
    unit_cost: number;
    supplier_id?: number;
    purchase_date: string;
    notes: string;
  } | null>(null);
  const [productionForm, setProductionForm] = useState<{
    quantity: number;
    notes: string;
  } | null>(null);

  // Helper function to check if quantity is complete (with tolerance for floating point errors)
  const isQuantityComplete = (remaining: number) => {
    return Math.abs(remaining) < 0.01; // Tolerance of 0.01
  };

  useEffect(() => {
    loadStageDetail();
    loadEventLog();
  }, [projectId, stageId]);

  const loadStageDetail = async () => {
    if (!projectId || !stageId) return;
    
    try {
      const data = await projectService.getStageDetail(parseInt(projectId), parseInt(stageId));
      setStageDetail(data);
    } catch (error) {
      console.error('Error loading stage:', error);
      alert('Error al cargar la etapa');
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  const loadEventLog = async () => {
    if (!projectId || !stageId) return;
    
    try {
      const events = await projectService.getStageEvents(parseInt(projectId), parseInt(stageId));
      setEventLog(events);
    } catch (error) {
      console.error('Error loading event log:', error);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!projectId || !stageId || !stageDetail) return;
    
    // Validate that requirements are met before marking as DONE
    if (newStatus === 'DONE') {
      if (stageDetail.qty_done < stageDetail.qty_required) {
        alert(`No se puede completar la etapa. Faltan ${stageDetail.qty_required - stageDetail.qty_done} unidades por producir.`);
        return;
      }
    }
    
    try {
      await projectService.updateStage(parseInt(projectId), parseInt(stageId), {
        status: newStatus,
      });
      await loadStageDetail();
      await loadEventLog(); // Refresh event log
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error al actualizar el estado');
    }
  };

  const handlePurchaseMaterial = async (materialId: number) => {
    const today = new Date().toISOString().split('T')[0];
    setPurchaseForm({
      material_id: materialId,
      quantity_purchased: 0,
      unit_cost: 0, // Se llenará automáticamente del inventario
      supplier_id: undefined,
      purchase_date: today,
      notes: '',
    });
  };

  const submitPurchase = async () => {
    if (!projectId || !stageId || !purchaseForm) return;
    
    // Validar que la cantidad sea mayor a 0
    if (purchaseForm.quantity_purchased <= 0) {
      alert('La cantidad debe ser mayor a 0');
      return;
    }
    
    // Obtener el costo del material desde el inventario
    const material = stageDetail?.materials.find(m => m.material_id === purchaseForm.material_id);
    if (!material) {
      alert('Material no encontrado');
      return;
    }
    
    try {
      await projectService.purchaseMaterialInStage(
        parseInt(projectId),
        parseInt(stageId),
        {
          ...purchaseForm,
          unit_cost: 0, // El backend lo tomará del inventario o será 0
        } as ProjectMaterialPurchaseCreate
      );
      
      setPurchaseForm(null);
      await loadStageDetail();
      alert('Uso de material registrado exitosamente. Se ha restado del inventario.');
    } catch (error: any) {
      console.error('Error using material:', error);
      alert(error.response?.data?.detail || 'Error al registrar el uso del material');
    }
  };

  const handleOpenProductionForm = () => {
    setProductionForm({
      quantity: 0,
      notes: '',
    });
  };

  const submitProduction = async () => {
    if (!projectId || !stageId || !productionForm || !stageDetail) return;
    
    // Validar que la cantidad sea mayor a 0
    if (productionForm.quantity <= 0) {
      alert('La cantidad debe ser mayor a 0');
      return;
    }
    
    // Validar que no se exceda la cantidad requerida
    const newTotal = stageDetail.qty_done + productionForm.quantity;
    if (newTotal > stageDetail.qty_required) {
      alert(`La cantidad total (${newTotal}) excedería lo requerido (${stageDetail.qty_required})`);
      return;
    }
    
    try {
      await projectService.updateStage(
        parseInt(projectId),
        parseInt(stageId),
        {
          qty_done: newTotal,
          notes: productionForm.notes || stageDetail.notes || undefined,
        }
      );
      
      setProductionForm(null);
      await loadStageDetail();
      alert('Producción registrada exitosamente.');
    } catch (error: any) {
      console.error('Error registrando producción:', error);
      alert(error.response?.data?.detail || 'Error al registrar la producción');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      BLOCKED: 'bg-gray-500',
      READY: 'bg-blue-500',
      IN_PROGRESS: 'bg-yellow-500',
      DONE: 'bg-green-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      BLOCKED: 'Bloqueada',
      READY: 'Lista',
      IN_PROGRESS: 'En Progreso',
      DONE: 'Completada',
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!stageDetail) {
    return <div>Etapa no encontrada</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <button
            onClick={() => navigate(`/admin/projects/${projectId}`)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al Proyecto
          </button>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">{stageDetail.stage_name}</h1>
              <p className="text-lg text-gray-600 mt-1">{stageDetail.project_name}</p>
              <p className="text-sm text-gray-500">Cliente: {stageDetail.client_name}</p>
            </div>

            {/* Status Selector */}
            <div className="ml-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado de la Etapa
              </label>
              <select
                value={stageDetail.stage_status}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={stageDetail.stage_status === 'BLOCKED'}
                className="block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                title={stageDetail.stage_status === 'BLOCKED' ? 'Esta etapa está bloqueada por dependencias incompletas' : ''}
              >
                <option value="BLOCKED">Bloqueada</option>
                <option value="READY">Lista</option>
                <option value="IN_PROGRESS">En Progreso</option>
                <option value="DONE">Completada</option>
              </select>
              {stageDetail.stage_status === 'BLOCKED' && (
                <p className="text-xs text-amber-600 mt-1">
                  Se desbloqueará automáticamente cuando se completen las dependencias
                </p>
              )}
            </div>
          </div>

          {/* Status Bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Progreso: {stageDetail.qty_done} / {stageDetail.qty_required}</span>
              <span>{Math.round((stageDetail.qty_done / stageDetail.qty_required) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full ${getStatusColor(stageDetail.stage_status)}`}
                style={{
                  width: `${Math.min((stageDetail.qty_done / stageDetail.qty_required) * 100, 100)}%`,
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Dependency Warning */}
        {stageDetail.stage_status === 'BLOCKED' && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🔒</span>
              <div>
                <h3 className="font-semibold text-amber-900 mb-1">Etapa Bloqueada</h3>
                <p className="text-sm text-amber-800">
                  Esta etapa no puede iniciarse hasta que se completen todas sus dependencias.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Project Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Dates */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <Calendar className="h-5 w-5 text-blue-600 mr-2" />
              <h3 className="font-semibold text-gray-900">Fechas</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-600">Inicio del Proyecto:</span>
                <p className="font-medium">{stageDetail.start_date || 'No definido'}</p>
              </div>
              <div>
                <span className="text-gray-600">Fecha Límite Final:</span>
                <p className="font-medium">{stageDetail.final_deadline || 'No definido'}</p>
              </div>
              <div>
                <span className="text-gray-600">Fecha Planeada Etapa:</span>
                <p className="font-medium">{stageDetail.planned_due_date}</p>
              </div>
            </div>
          </div>

          {/* Status Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <Clock className="h-5 w-5 text-blue-600 mr-2" />
              <h3 className="font-semibold text-gray-900">Estado Actual</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center">
                <span className={`px-3 py-1 rounded-full text-white text-sm ${getStatusColor(stageDetail.stage_status)}`}>
                  {getStatusLabel(stageDetail.stage_status)}
                </span>
              </div>
              {stageDetail.actual_started_at && (
                <div>
                  <span className="text-gray-600">Iniciado:</span>
                  <p className="font-medium">{new Date(stageDetail.actual_started_at).toLocaleString()}</p>
                </div>
              )}
              {stageDetail.actual_done_at && (
                <div>
                  <span className="text-gray-600">Completado:</span>
                  <p className="font-medium">{new Date(stageDetail.actual_done_at).toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>

          {/* Products */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <Package className="h-5 w-5 text-blue-600 mr-2" />
              <h3 className="font-semibold text-gray-900">Productos</h3>
            </div>
            <div className="space-y-2">
              {stageDetail.products.map((product) => (
                <div key={product.product_id} className="flex justify-between text-sm">
                  <span className="text-gray-700">{product.product_name}</span>
                  <span className="font-medium">{product.quantity} unidades</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Notes */}
        {stageDetail.notes && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Notas</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{stageDetail.notes}</p>
          </div>
        )}

        {/* Production Section (Non-Purchasing Stages) */}
        {!stageDetail.is_purchasing_stage && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Package className="h-5 w-5 text-blue-600 mr-2" />
                <h3 className="text-xl font-semibold text-gray-900">Registro de Producción</h3>
              </div>
              {stageDetail.stage_status === 'IN_PROGRESS' && stageDetail.qty_done < stageDetail.qty_required && (
                <button
                  onClick={handleOpenProductionForm}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Registrar Producción
                </button>
              )}
            </div>

            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-900">
                <strong>Nota:</strong> Registra las unidades producidas en esta etapa. Solo puedes agregar producción cuando el estado esté en "En Progreso".
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Cantidad Requerida</div>
                <div className="text-2xl font-bold text-gray-900">{stageDetail.qty_required}</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Cantidad Producida</div>
                <div className="text-2xl font-bold text-green-600">{stageDetail.qty_done}</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Cantidad Faltante</div>
                <div className="text-2xl font-bold text-orange-600">{stageDetail.qty_required - stageDetail.qty_done}</div>
              </div>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className={`h-4 rounded-full ${getStatusColor(stageDetail.stage_status)}`}
                style={{
                  width: `${Math.min((stageDetail.qty_done / stageDetail.qty_required) * 100, 100)}%`,
                }}
              ></div>
            </div>
            <div className="text-center text-sm text-gray-600 mt-2">
              {Math.round((stageDetail.qty_done / stageDetail.qty_required) * 100)}% Completado
            </div>

            {stageDetail.stage_status !== 'IN_PROGRESS' && stageDetail.qty_done < stageDetail.qty_required && (
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  La producción solo puede ser registrada cuando el estado de la etapa esté en "En Progreso".
                </p>
              </div>
            )}
          </div>
        )}

        {/* Materials (Purchasing Stage Only) */}
        {stageDetail.is_purchasing_stage && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <ShoppingCart className="h-5 w-5 text-blue-600 mr-2" />
              <h3 className="text-xl font-semibold text-gray-900">Materiales del Inventario</h3>
            </div>
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-900">
                <strong>Nota:</strong> En esta etapa de compras, se usan los materiales del inventario de MP.
                Al registrar el uso, se resta del inventario automáticamente.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Material</th>
                    <th className="text-right py-3 px-4">Necesario</th>
                    <th className="text-right py-3 px-4">Usado</th>
                    <th className="text-right py-3 px-4">Faltante</th>
                    <th className="text-right py-3 px-4">Disponible en Inventario</th>
                    <th className="text-right py-3 px-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {stageDetail.materials.map((material) => (
                    <tr key={material.material_id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-medium">{material.material_name}</div>
                        <div className="text-sm text-gray-500">{material.material_unit}</div>
                      </td>
                      <td className="text-right py-3 px-4">{material.qty_needed.toFixed(2)}</td>
                      <td className="text-right py-3 px-4 text-blue-600">{material.qty_purchased.toFixed(2)}</td>
                      <td className={`text-right py-3 px-4 font-semibold ${
                        !isQuantityComplete(material.qty_remaining) ? 'text-orange-600' : 'text-green-600'
                      }`}>
                        {material.qty_remaining.toFixed(2)}
                      </td>
                      <td className={`text-right py-3 px-4 ${
                        material.inventory_available >= material.qty_remaining ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {material.inventory_available.toFixed(2)}
                      </td>
                      <td className="text-right py-3 px-4">
                        {stageDetail.stage_status === 'IN_PROGRESS' && !isQuantityComplete(material.qty_remaining) && (
                          <button
                            onClick={() => handlePurchaseMaterial(material.material_id)}
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
                            disabled={material.inventory_available < material.qty_remaining}
                          >
                            {material.inventory_available >= material.qty_remaining ? 'Usar del Inventario' : 'Sin Stock'}
                          </button>
                        )}
                        {stageDetail.stage_status !== 'IN_PROGRESS' && !isQuantityComplete(material.qty_remaining) && (
                          <span className="text-sm text-gray-500 italic">Solo en progreso</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Event Log */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <Activity className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="text-xl font-semibold text-gray-900">Historial de Cambios</h3>
          </div>
          
          {eventLog.length === 0 ? (
            <p className="text-gray-500 text-sm">No hay cambios registrados aún.</p>
          ) : (
            <div className="space-y-3">
              {eventLog.map((event) => (
                <div key={event.id} className="border-l-4 border-blue-500 pl-4 py-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {event.event_type === 'status_change' && 'Cambio de Estado'}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {event.old_value && event.new_value && (
                          <>
                            <span className="font-medium">{getStatusLabel(event.old_value)}</span>
                            {' → '}
                            <span className="font-medium">{getStatusLabel(event.new_value)}</span>
                          </>
                        )}
                      </p>
                      {event.notes && (
                        <p className="text-xs text-gray-500 mt-1">{event.notes}</p>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-xs text-gray-500">{event.user_name}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(event.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Purchase Form Modal */}
        {purchaseForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
              <h3 className="text-xl font-semibold mb-4">Usar Material del Inventario</h3>
              <p className="text-sm text-gray-600 mb-4">Registra el uso de material del inventario para este proyecto. Se restará automáticamente del stock.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cantidad a Usar *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={purchaseForm.quantity_purchased}
                    onChange={(e) =>
                      setPurchaseForm({ ...purchaseForm, quantity_purchased: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Ej: 10.5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Uso *
                  </label>
                  <input
                    type="date"
                    value={purchaseForm.purchase_date}
                    onChange={(e) =>
                      setPurchaseForm({ ...purchaseForm, purchase_date: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notas (Opcional)
                  </label>
                  <textarea
                    value={purchaseForm.notes}
                    onChange={(e) =>
                      setPurchaseForm({ ...purchaseForm, notes: e.target.value })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Ej: Usado para producción de chaquetas"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setPurchaseForm(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={submitPurchase}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Confirmar Uso
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Production Form Modal */}
        {productionForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
              <h3 className="text-xl font-semibold mb-4">Registrar Producción</h3>
              <p className="text-sm text-gray-600 mb-4">Registra las unidades producidas en esta etapa.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cantidad Producida *
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max={stageDetail ? stageDetail.qty_required - stageDetail.qty_done : 0}
                    value={productionForm.quantity}
                    onChange={(e) =>
                      setProductionForm({ ...productionForm, quantity: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Ej: 10"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Máximo: {stageDetail ? stageDetail.qty_required - stageDetail.qty_done : 0} unidades
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notas (Opcional)
                  </label>
                  <textarea
                    value={productionForm.notes}
                    onChange={(e) =>
                      setProductionForm({ ...productionForm, notes: e.target.value })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Ej: Lote producido en turno matutino"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setProductionForm(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={submitProduction}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Confirmar Producción
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}