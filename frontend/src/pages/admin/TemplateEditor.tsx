import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { templatesService, TemplateStageCreate } from '@/services/templates';
import stageService, { Stage } from '@/services/stages';
import { useToast } from '@/hooks/use-toast';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { FormattedNumberInput } from '@/components/ui/formatted-number-input';

export function TemplateEditor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const isEditing = !!id;

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [availableStages, setAvailableStages] = useState<Stage[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  const [selectedStages, setSelectedStages] = useState<TemplateStageCreate[]>([]);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoadingData(true);
    try {
      const stagesData = await stageService.getAll();
      setAvailableStages(stagesData);

      if (isEditing) {
        const template = await templatesService.getTemplate(Number(id));
        setFormData({
          name: template.name,
          description: template.description || '',
        });

        setSelectedStages(
          template.stages.map((s) => ({
            stage_id: s.stage_id,
            duration_days: s.duration_days,
            stage_order: s.stage_order,
            has_operational_cost: s.has_operational_cost,
            cost_per_unit: s.cost_per_unit,
            depends_on_stage_ids: s.depends_on_stage_ids,
          }))
        );
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.detail || 'Error al cargar datos',
      });
    } finally {
      setLoadingData(false);
    }
  };

  const handleAddStage = (stageId: number) => {
    if (!selectedStages.find((s) => s.stage_id === stageId)) {
      setSelectedStages([
        ...selectedStages,
        {
          stage_id: stageId,
          duration_days: 1,
          stage_order: selectedStages.length,
          has_operational_cost: false,
          cost_per_unit: undefined,
          depends_on_stage_ids: [],
        },
      ]);
    }
  };

  const handleRemoveStage = (stageId: number) => {
    const updatedStages = selectedStages
      .filter((s) => s.stage_id !== stageId)
      .map((s, index) => ({
        ...s,
        stage_order: index,
        depends_on_stage_ids: s.depends_on_stage_ids.filter((depId) => depId !== stageId),
      }));
    setSelectedStages(updatedStages);
  };

  const handleStageChange = (stageId: number, field: string, value: any) => {
    setSelectedStages(
      selectedStages.map((s) =>
        s.stage_id === stageId ? { ...s, [field]: value } : s
      )
    );
  };

  const handleToggleDependency = (stageId: number, dependsOnStageId: number) => {
    setSelectedStages(
      selectedStages.map((s) => {
        if (s.stage_id === stageId) {
          const hasDepAlready = s.depends_on_stage_ids.includes(dependsOnStageId);
          return {
            ...s,
            depends_on_stage_ids: hasDepAlready
              ? s.depends_on_stage_ids.filter((id) => id !== dependsOnStageId)
              : [...s.depends_on_stage_ids, dependsOnStageId],
          };
        }
        return s;
      })
    );
  };

  const handleMoveStageUp = (index: number) => {
    if (index === 0) return;
    const newStages = [...selectedStages];
    [newStages[index], newStages[index - 1]] = [newStages[index - 1], newStages[index]];
    newStages.forEach((s, i) => (s.stage_order = i));
    setSelectedStages(newStages);
  };

  const handleMoveStageDown = (index: number) => {
    if (index === selectedStages.length - 1) return;
    const newStages = [...selectedStages];
    [newStages[index], newStages[index + 1]] = [newStages[index + 1], newStages[index]];
    newStages.forEach((s, i) => (s.stage_order = i));
    setSelectedStages(newStages);
  };

  const getStageName = (stageId: number) => {
    return availableStages.find((s) => s.id === stageId)?.name || `Stage ${stageId}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedStages.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Debes agregar al menos una etapa',
      });
      return;
    }

    try {
      setLoading(true);
      if (isEditing) {
        await templatesService.updateTemplate(Number(id), {
          ...formData,
          stages: selectedStages,
        });
        toast({
          title: 'Éxito',
          description: 'Plantilla actualizada correctamente',
        });
      } else {
        await templatesService.createTemplate({
          ...formData,
          stages: selectedStages,
        });
        toast({
          title: 'Éxito',
          description: 'Plantilla creada correctamente',
        });
      }
      navigate('/admin/templates');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.detail || 'Error al guardar plantilla',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-600">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {isEditing ? 'Editar Plantilla' : 'Nueva Plantilla'}
        </h1>
        <p className="text-gray-600 mt-2">
          Define las etapas y duraciones para proyectos repetitivos
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Información Básica</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre de la Plantilla *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ej: Camiseta Básica, Pedido Corporativo"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Descripción opcional de la plantilla..."
              />
            </div>
          </div>
        </div>

        {/* Stages */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Etapas *</h2>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Agregar Etapa
            </label>
            <SearchableSelect
              options={availableStages
                .filter((s) => !selectedStages.find((ss) => ss.stage_id === s.id))
                .map((stage) => ({ value: stage.id, label: stage.name }))}
              onChange={(id) => handleAddStage(Number(id))}
              placeholder="Seleccionar etapa..."
              emptyMessage="No se encontraron etapas"
            />
          </div>

          {selectedStages.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Agrega al menos una etapa para crear la plantilla
            </p>
          ) : (
            <div className="space-y-3">
              {selectedStages.map((item, index) => (
                <div
                  key={item.stage_id}
                  className="p-4 bg-gray-50 rounded border-l-4 border-blue-500"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-blue-600">#{index + 1}</span>
                      <h3 className="font-medium">{getStageName(item.stage_id)}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleMoveStageUp(index)}
                        disabled={index === 0}
                        className="px-2 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveStageDown(index)}
                        disabled={index === selectedStages.length - 1}
                        className="px-2 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-30"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveStage(item.stage_id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">
                        Duración (días) *
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        max="365"
                        value={item.duration_days}
                        onChange={(e) =>
                          handleStageChange(item.stage_id, 'duration_days', parseInt(e.target.value) || 1)
                        }
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                      />
                    </div>
                  </div>

                  {/* Operational Costs */}
                  <div className="pt-3 border-t border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        id={`has_cost_${item.stage_id}`}
                        checked={item.has_operational_cost}
                        onChange={(e) =>
                          handleStageChange(item.stage_id, 'has_operational_cost', e.target.checked)
                        }
                        className="rounded border-gray-300 text-blue-600"
                      />
                      <label htmlFor={`has_cost_${item.stage_id}`} className="text-sm font-medium">
                        Esta etapa tiene costos operativos
                      </label>
                    </div>
                    {item.has_operational_cost && (
                      <div className="ml-6 mt-2">
                        <label className="block text-sm text-gray-600 mb-1">
                          Costo por Unidad
                        </label>
                        <FormattedNumberInput
                          value={item.cost_per_unit || 0}
                          onChange={(val) =>
                            handleStageChange(item.stage_id, 'cost_per_unit', val > 0 ? val : undefined)
                          }
                          placeholder="0"
                          min={0}
                        />
                      </div>
                    )}
                  </div>

                  {/* Dependencies */}
                  {index > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Depende de:
                      </label>
                      <div className="space-y-1">
                        {selectedStages.slice(0, index).map((prevStage) => (
                          <label key={prevStage.stage_id} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={item.depends_on_stage_ids.includes(prevStage.stage_id)}
                              onChange={() => handleToggleDependency(item.stage_id, prevStage.stage_id)}
                              className="rounded border-gray-300 text-blue-600"
                            />
                            <span>{getStageName(prevStage.stage_id)}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/admin/templates')}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
          >
            {loading ? 'Guardando...' : isEditing ? 'Actualizar Plantilla' : 'Crear Plantilla'}
          </button>
        </div>
      </form>
    </div>
  );
}
