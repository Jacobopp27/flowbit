import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import projectService, {
  ProjectDetail as ProjectDetailType,
  FinancialSummary,
} from '../../services/projects';

export function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    final_deadline: '',
    notes: '',
  });

  useEffect(() => {
    if (id) {
      loadProject(parseInt(id));
    }
  }, [id]);

  const loadProject = async (projectId: number) => {
    try {
      const data = await projectService.getById(projectId);
      setProject(data);
      setEditData({
        final_deadline: data.final_deadline || '',
        notes: data.notes || '',
      });
      
      // Load financial summary
      try {
        const financialData = await projectService.getFinancialSummary(projectId);
        setFinancialSummary(financialData);
      } catch (error) {
        console.error('Error loading financial summary:', error);
        // Non-critical, continue without financial data
      }
    } catch (error) {
      console.error('Error loading project:', error);
      alert('Error al cargar el proyecto');
      navigate('/admin/projects');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      BLOCKED: 'bg-gray-300 text-gray-800',
      READY: 'bg-blue-100 text-blue-800',
      IN_PROGRESS: 'bg-blue-500 text-white',
      DONE: 'bg-green-500 text-white',
      pending: 'bg-gray-200 text-gray-800',
      in_progress: 'bg-blue-200 text-blue-800',
      completed: 'bg-green-200 text-green-800',
      delayed: 'bg-red-200 text-red-800',
    };
    return colors[status] || 'bg-gray-200 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      BLOCKED: 'Bloqueada',
      READY: 'Lista',
      IN_PROGRESS: 'En Progreso',
      DONE: 'Completada',
      pending: 'Pendiente',
      in_progress: 'En Progreso',
      completed: 'Completada',
      delayed: 'Retrasada',
    };
    return labels[status] || status;
  };

  const handleSaveEdit = async () => {
    if (!project) return;

    // Validate dates
    if (editData.final_deadline) {
      const startDate = new Date(project.start_date);
      const endDate = new Date(editData.final_deadline);
      if (endDate < startDate) {
        alert('La fecha de entrega no puede ser anterior a la fecha de inicio');
        return;
      }
    }

    try {
      await projectService.update(project.project_id, {
        final_deadline: editData.final_deadline,
        notes: editData.notes,
      });
      await loadProject(project.project_id);
      setIsEditing(false);
      alert('Proyecto actualizado correctamente');
    } catch (error) {
      console.error('Error updating project:', error);
      alert('Error al actualizar el proyecto');
    }
  };

  const handleCancelEdit = () => {
    if (project) {
      setEditData({
        final_deadline: project.final_deadline || '',
        notes: project.notes || '',
      });
    }
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Cargando proyecto...</div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  const completedStages = project.stages.filter(s => s.status === 'DONE').length;
  const totalStages = project.stages.length;
  const progress = totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/admin/projects')}
          className="text-blue-600 hover:underline mb-2"
        >
          ← Volver a proyectos
        </button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">{project.project_name}</h1>
            <p className="text-gray-600">Cliente: {project.client_name}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-gray-600">Progreso del Proyecto</div>
              <div className="text-2xl font-bold text-blue-600">{progress}%</div>
              <div className="text-sm text-gray-500">
                {completedStages} / {totalStages} etapas
              </div>
            </div>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {isEditing ? 'Cancelar' : 'Editar Proyecto'}
            </button>
          </div>
        </div>
      </div>

      {/* Información General */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Información General</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <div className="text-sm text-gray-600">Fecha de Inicio</div>
            <div className="text-lg font-semibold">
              {new Date(project.start_date).toLocaleDateString('es-MX')}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Fecha de Entrega</div>
            {isEditing ? (
              <input
                type="date"
                value={editData.final_deadline}
                onChange={(e) => setEditData({ ...editData, final_deadline: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            ) : (
              <div className="text-lg font-semibold">
                {new Date(project.final_deadline).toLocaleDateString('es-MX')}
              </div>
            )}
          </div>
          <div>
            <div className="text-sm text-gray-600">Estado General</div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${progress === 100 ? 'bg-green-500' : progress > 0 ? 'bg-blue-500' : 'bg-gray-400'}`} />
              <span className="font-semibold">
                {progress === 100 ? 'Completado' : progress > 0 ? 'En Progreso' : 'Pendiente'}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t">
          <div className="text-sm text-gray-600 mb-1">Notas del Proyecto</div>
          {isEditing ? (
            <textarea
              value={editData.notes}
              onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Descripción o notas sobre el proyecto..."
            />
          ) : (
            <div className="text-gray-800 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">
              {project.notes || 'Sin notas'}
            </div>
          )}
        </div>
        {isEditing && (
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={handleCancelEdit}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveEdit}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Guardar Cambios
            </button>
          </div>
        )}
      </div>

      {/* Productos del Proyecto */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Productos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {project.products && project.products.map((prod) => (
            <div key={prod.product_id} className="border rounded-lg p-4">
              <div className="font-medium text-gray-800">{prod.product_name}</div>
              <div className="text-sm text-gray-600 mt-1">
                Cantidad: <span className="font-semibold">{prod.quantity}</span>
              </div>
            </div>
          ))}
          {(!project.products || project.products.length === 0) && (
            <div className="text-gray-500 col-span-full">
              No hay productos asociados a este proyecto
            </div>
          )}
        </div>
      </div>

      {/* Resumen Financiero */}
      {financialSummary && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">💰 Resumen Financiero</h2>
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Sale Price */}
            {financialSummary.sale_price > 0 && (
              <div className="border rounded-lg p-4 bg-green-50 border-green-200">
                <div className="text-sm text-gray-600 mb-1">💵 Precio de Venta</div>
                <div className="text-2xl font-bold text-green-700">
                  ${financialSummary.sale_price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </div>
                {financialSummary.iva_breakdown && (
                  <div className="text-xs text-gray-600 mt-1">
                    <div>Base: ${financialSummary.iva_breakdown.base_price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</div>
                    <div>IVA (19%): ${financialSummary.iva_breakdown.iva_amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</div>
                  </div>
                )}
                {!financialSummary.sale_includes_tax && (
                  <div className="text-xs text-gray-600 mt-1">Sin IVA</div>
                )}
              </div>
            )}

            {/* Material Costs */}
            <div className="border rounded-lg p-4 bg-amber-50 border-amber-200">
              <div className="text-sm text-gray-600 mb-1">📦 Costos de Materiales</div>
              <div className="text-2xl font-bold text-amber-700">
                ${financialSummary.material_costs.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {financialSummary.material_breakdown.length} material(es)
              </div>
            </div>

            {/* Operational Costs */}
            <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
              <div className="text-sm text-gray-600 mb-1">⚙️ Costos Operativos</div>
              <div className="text-2xl font-bold text-blue-700">
                ${financialSummary.operational_costs.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {financialSummary.operational_breakdown.length} etapa(s)
              </div>
            </div>

            {/* Estimated Profit */}
            {financialSummary.sale_price > 0 && (() => {
              const profitColor = financialSummary.estimated_profit >= 0 ? 'text-green-700' : 'text-red-700';
              const bgColor = financialSummary.estimated_profit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';
              
              return (
                <div className={`border rounded-lg p-4 ${bgColor}`}>
                  <div className="text-sm text-gray-600 mb-1">✅ Ganancia Neta</div>
                  <div className={`text-2xl font-bold ${profitColor}`}>
                    ${financialSummary.estimated_profit.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    Margen: {financialSummary.profit_margin_percent.toFixed(1)}%
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Detailed Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Material Breakdown */}
            {financialSummary.material_breakdown.length > 0 && (
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3 text-gray-800">📦 Desglose de Materiales</h3>
                <div className="space-y-2">
                  {financialSummary.material_breakdown.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        {item.material_name} ({item.total_quantity} {item.unit})
                      </span>
                      <span className="font-medium">
                        ${item.total_cost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                  <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
                    <span>Total Materiales:</span>
                    <span>${financialSummary.material_costs.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Operational Breakdown */}
            {financialSummary.operational_breakdown.length > 0 && (
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3 text-gray-800">⚙️ Desglose Operativo</h3>
                <div className="space-y-2">
                  {financialSummary.operational_breakdown.map((item, idx) => (
                    <div key={idx} className="text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">{item.stage_name}</span>
                        <span className="font-medium">
                          ${item.total_cost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        ${item.cost_per_unit.toFixed(2)}/u × {item.qty_done} unidades
                      </div>
                    </div>
                  ))}
                  <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
                    <span>Total Operativo:</span>
                    <span>${financialSummary.operational_costs.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Etapas del Proyecto */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Etapas del Proyecto</h2>
        <div className="space-y-3">
          {project.stages.map((stage) => (
            <div key={stage.project_stage_id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{stage.stage_name}</h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(stage.status)}`}>
                      {getStatusLabel(stage.status)}
                    </span>
                  </div>
                  {stage.notes && (
                    <p className="text-sm text-gray-600 mb-2">📝 {stage.notes}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/admin/projects/${project.project_id}/stages/${stage.project_stage_id}`)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                  >
                    Ver Etapa
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">Planificado</div>
                  <div className="font-medium">
                    {new Date(stage.planned_due_date).toLocaleDateString('es-MX')}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Cantidad</div>
                  <div className="font-medium">
                    {stage.qty_done || 0} / {stage.qty_required || 0}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Inicio Real</div>
                  <div className="font-medium">
                    {stage.actual_started_at
                      ? new Date(stage.actual_started_at).toLocaleDateString('es-MX')
                      : '-'}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Fin Real</div>
                  <div className="font-medium">
                    {stage.actual_done_at
                      ? new Date(stage.actual_done_at).toLocaleDateString('es-MX')
                      : '-'}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Tiempo Transcurrido</div>
                  <div className="font-medium">
                    {stage.actual_started_at && stage.actual_done_at ? (() => {
                      const start = new Date(stage.actual_started_at);
                      const end = new Date(stage.actual_done_at);
                      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                      return `${days} día${days !== 1 ? 's' : ''}`;
                    })() : stage.actual_started_at ? (() => {
                      const start = new Date(stage.actual_started_at);
                      const now = new Date();
                      const days = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                      return `${days} día${days !== 1 ? 's' : ''} (en curso)`;
                    })() : '-'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
