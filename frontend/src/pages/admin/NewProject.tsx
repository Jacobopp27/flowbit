import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import projectService, { ProjectProductItem, ProjectStageCreate } from '../../services/projects';
import productService, { Product } from '../../services/products';
import stageService, { Stage } from '../../services/stages';
import { templatesService, TemplateListResponse } from '@/services/templates';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { FormattedNumberInput } from '@/components/ui/formatted-number-input';
import { useToast } from '@/hooks/use-toast';

export function NewProject() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [templates, setTemplates] = useState<TemplateListResponse[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    project_name: '',
    client_name: '',
    start_date: '',
    final_deadline: '',
    notes: '',
    sale_price: undefined as number | undefined,
    sale_includes_tax: true,
    adds_to_inventory: false,
  });

  const [selectedProducts, setSelectedProducts] = useState<ProjectProductItem[]>([]);
  const [selectedStages, setSelectedStages] = useState<ProjectStageCreate[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoadingData(true);
    try {
      const [productsData, stagesData, templatesData] = await Promise.all([
        productService.getAll(),
        stageService.getAll(),
        templatesService.listTemplates(),
      ]);
      console.log('Productos cargados:', productsData);
      console.log('Primer producto:', productsData[0]);
      console.log('Etapas cargadas:', stagesData);
      console.log('Primera etapa:', stagesData[0]);
      setProducts(productsData);
      setStages(stagesData);
      setTemplates(templatesData);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Error al cargar productos y etapas');
    } finally {
      setLoadingData(false);
    }
  };

  const handleApplyTemplate = async (templateId: number) => {
    if (!templateId) {
      setSelectedTemplateId(null);
      return;
    }

    try {
      setSelectedTemplateId(templateId);
      const applied = await templatesService.applyTemplate(templateId, {
        start_date: formData.start_date || undefined,
        final_deadline: formData.final_deadline || undefined,
      });

      // Calculate total quantity from selected products (like handleAddStage does)
      const totalQty = selectedProducts.reduce((sum, p) => sum + p.quantity, 0);

      // Convert applied stages to ProjectStageCreate format
      const newStages: ProjectStageCreate[] = applied.stages.map((s) => ({
        stage_id: s.stage_id,
        planned_due_date: s.planned_due_date,
        qty_required: totalQty || undefined,
        stage_order: s.stage_order,
        depends_on: s.depends_on,
        has_operational_cost: s.has_operational_cost,
        cost_per_unit: s.cost_per_unit,
        notes: undefined,
      }));

      setSelectedStages(newStages);

      toast({
        title: 'Plantilla Aplicada',
        description: `${applied.stages.length} etapas agregadas automáticamente`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.detail || 'Error al aplicar plantilla',
      });
    }
  };

  const handleAddProduct = (productId: number) => {
    if (!selectedProducts.find(p => p.product_id === productId)) {
      const product = products.find(p => p.id === productId);
      console.log('Agregando producto:', product);
      setSelectedProducts([...selectedProducts, { product_id: productId, quantity: 1 }]);
    }
  };

  const handleRemoveProduct = (productId: number) => {
    setSelectedProducts(selectedProducts.filter(p => p.product_id !== productId));
  };

  const handleProductQuantityChange = (productId: number, quantity: number) => {
    setSelectedProducts(
      selectedProducts.map(p =>
        p.product_id === productId ? { ...p, quantity: Math.max(1, quantity) } : p
      )
    );
  };

  const handleAddStage = (stageId: number) => {
    const totalQty = selectedProducts.reduce((sum, p) => sum + p.quantity, 0);
    if (!selectedStages.find(s => s.stage_id === stageId)) {
      const stage = stages.find(s => s.id === stageId);
      console.log('Agregando etapa:', stage);
      setSelectedStages([
        ...selectedStages,
        {
          stage_id: stageId,
          planned_due_date: '',
          qty_required: totalQty || undefined,
          stage_order: selectedStages.length,
          depends_on: [],
          has_operational_cost: false,
          cost_per_unit: undefined,
        },
      ]);
    }
  };

  const handleRemoveStage = (stageId: number) => {
    // Remove stage and update dependencies
    const updatedStages = selectedStages
      .filter(s => s.stage_id !== stageId)
      .map(s => ({
        ...s,
        depends_on: s.depends_on.filter(depId => depId !== stageId),
      }));
    setSelectedStages(updatedStages);
  };

  const handleMoveStageUp = (index: number) => {
    if (index === 0) return;
    const newStages = [...selectedStages];
    [newStages[index - 1], newStages[index]] = [newStages[index], newStages[index - 1]];
    // Update order
    newStages.forEach((s, i) => s.stage_order = i);
    setSelectedStages(newStages);
  };

  const handleMoveStageDown = (index: number) => {
    if (index === selectedStages.length - 1) return;
    const newStages = [...selectedStages];
    [newStages[index], newStages[index + 1]] = [newStages[index + 1], newStages[index]];
    // Update order
    newStages.forEach((s, i) => s.stage_order = i);
    setSelectedStages(newStages);
  };

  const handleToggleDependency = (stageId: number, depStageId: number) => {
    setSelectedStages(
      selectedStages.map(s => {
        if (s.stage_id === stageId) {
          const depends_on = s.depends_on.includes(depStageId)
            ? s.depends_on.filter(id => id !== depStageId)
            : [...s.depends_on, depStageId];
          return { ...s, depends_on };
        }
        return s;
      })
    );
  };

  const handleStageChange = (stageId: number, field: string, value: any) => {
    setSelectedStages(
      selectedStages.map(s =>
        s.stage_id === stageId ? { ...s, [field]: value } : s
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedProducts.length === 0) {
      alert('Debes seleccionar al menos un producto');
      return;
    }

    if (selectedStages.length === 0) {
      alert('Debes seleccionar al menos una etapa');
      return;
    }

    if (selectedStages.some(s => !s.planned_due_date)) {
      alert('Todas las etapas deben tener una fecha planificada');
      return;
    }

    // Validate dates
    if (formData.start_date && formData.final_deadline) {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.final_deadline);
      if (endDate < startDate) {
        alert('La fecha de entrega no puede ser anterior a la fecha de inicio');
        return;
      }
    }

    setLoading(true);
    try {
      const project = await projectService.create({
        ...formData,
        products: selectedProducts,
        stages: selectedStages,
        sale_price: formData.sale_price,
        sale_includes_tax: formData.sale_includes_tax,
      });
      navigate(`/admin/projects/${project.project_id}`);
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Error al crear el proyecto');
    } finally {
      setLoading(false);
    }
  };

  const getProductName = (productId: number) => {
    const product = products.find(p => p.id === productId);
    console.log('Buscando nombre del producto:', productId, '→', product?.name);
    return product?.name || '';
  };

  const getStageName = (stageId: number) => {
    const stage = stages.find(s => s.id === stageId);
    console.log('Buscando nombre de etapa:', stageId, '→', stage?.name);
    return stage?.name || '';
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => navigate('/admin/projects')}
          className="text-blue-600 hover:underline mb-2"
        >
          ← Volver a proyectos
        </button>
        <h1 className="text-3xl font-bold text-gray-800">Nuevo Proyecto</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información básica */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Información Básica</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre del Proyecto *
              </label>
              <input
                type="text"
                required
                value={formData.project_name}
                onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Proyecto ABC"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cliente *
              </label>
              <input
                type="text"
                required
                value={formData.client_name}
                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Empresa XYZ"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Inicio *
              </label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Entrega Final *
              </label>
              <input
                type="date"
                required
                value={formData.final_deadline}
                onChange={(e) => setFormData({ ...formData, final_deadline: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas / Descripción
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Descripción o notas sobre el proyecto..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio de Venta
              </label>
              <FormattedNumberInput
                value={formData.sale_price || 0}
                onChange={(val) => setFormData({ ...formData, sale_price: val > 0 ? val : undefined })}
                placeholder="0.00"
                min={0}
                step={0.01}
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="sale_includes_tax"
                checked={formData.sale_includes_tax}
                onChange={(e) => setFormData({ ...formData, sale_includes_tax: e.target.checked })}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="sale_includes_tax" className="ml-2 block text-sm text-gray-700">
                El precio incluye IVA (19%)
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="adds_to_inventory"
                checked={formData.adds_to_inventory}
                onChange={(e) => setFormData({ ...formData, adds_to_inventory: e.target.checked })}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="adds_to_inventory" className="ml-2 block text-sm text-gray-700">
                Agregar productos al inventario PT al finalizar
              </label>
            </div>
          </div>
        </div>

        {/* Productos */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Productos *</h2>
          {loadingData ? (
            <div className="text-gray-500 text-center py-4">Cargando productos...</div>
          ) : (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Agregar Producto {products.length > 0 && `(${products.length} disponibles)`}
                </label>
                <SearchableSelect
                  options={products
                    .filter(p => !selectedProducts.find(sp => sp.product_id === p.id))
                    .map(product => ({ value: product.id, label: product.name }))}
                  onChange={(id) => {
                    handleAddProduct(Number(id));
                  }}
                  placeholder="Seleccionar producto..."
                  emptyMessage="No se encontraron productos"
                />
                {products.length === 0 && (
                  <p className="text-sm text-amber-600 mt-2">
                    No hay productos disponibles. Crea productos primero en la sección de Productos.
                  </p>
                )}
              </div>

              {selectedProducts.length > 0 && (
            <div className="space-y-2">
              {selectedProducts.map((item) => (
                <div key={item.product_id} className="flex items-center gap-4 p-3 bg-gray-50 rounded">
                  <div className="flex-1">
                    <span className="font-medium">{getProductName(item.product_id)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Cantidad:</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        handleProductQuantityChange(item.product_id, parseInt(e.target.value) || 1)
                      }
                      className="w-20 px-2 py-1 border border-gray-300 rounded"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveProduct(item.product_id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
            </>
          )}
        </div>

        {/* Etapas */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Etapas del Proyecto *</h2>
          {loadingData ? (
            <div className="text-gray-500 text-center py-4">Cargando etapas...</div>
          ) : (
            <>
              {/* Template Selector */}
              {templates.length > 0 && (
                <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex-shrink-0 mt-1">
                      <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">
                        Usar Plantilla (Opcional)
                      </h3>
                      <p className="text-xs text-gray-600 mb-3">
                        Selecciona una plantilla para auto-rellenar las etapas con duraciones y configuración predefinida
                      </p>
                      <SearchableSelect
                        value={selectedTemplateId || ''}
                        onChange={(id) => handleApplyTemplate(Number(id))}
                        options={[
                          { value: '', label: 'Sin plantilla - configurar manualmente' },
                          ...templates.map((t) => ({
                            value: t.id,
                            label: `${t.name} (${t.stages_count} etapas)`,
                          })),
                        ]}
                        placeholder="Seleccionar plantilla..."
                        emptyMessage="No se encontraron plantillas"
                      />
                      {selectedTemplateId && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-green-700 bg-green-50 px-3 py-2 rounded">
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span>Etapas agregadas automáticamente. Puedes editarlas antes de crear el proyecto.</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Agregar Etapa Manualmente {stages.length > 0 && `(${stages.length} disponibles)`}
                </label>
                <SearchableSelect
                  options={stages
                    .filter(s => !selectedStages.find(ss => ss.stage_id === s.id))
                    .map(stage => ({ value: stage.id, label: stage.name }))}
                  onChange={(id) => {
                    handleAddStage(Number(id));
                  }}
                  placeholder="Seleccionar etapa..."
                  emptyMessage="No se encontraron etapas"
                />
                {stages.length === 0 && (
                  <p className="text-sm text-amber-600 mt-2">
                    No hay etapas disponibles. Crea etapas primero en la sección de Etapas.
                  </p>
                )}
              </div>

              {selectedStages.length > 0 && (
            <div className="space-y-3">
              {selectedStages.map((item, index) => (
                <div key={item.stage_id} className="p-4 bg-gray-50 rounded border-l-4 border-blue-500">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-blue-600">#{index + 1}</span>
                      <h3 className="font-medium">{getStageName(item.stage_id)}</h3>
                      {item.depends_on.length > 0 && (
                        <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">
                          Depende de {item.depends_on.length} etapa(s)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleMoveStageUp(index)}
                        disabled={index === 0}
                        className="px-2 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-30"
                        title="Mover arriba"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveStageDown(index)}
                        disabled={index === selectedStages.length - 1}
                        className="px-2 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-30"
                        title="Mover abajo"
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">
                        Fecha Planificada *
                      </label>
                      <input
                        type="date"
                        required
                        value={item.planned_due_date}
                        onChange={(e) =>
                          handleStageChange(item.stage_id, 'planned_due_date', e.target.value)
                        }
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">
                        Cantidad Requerida
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={item.qty_required || ''}
                        onChange={(e) =>
                          handleStageChange(
                            item.stage_id,
                            'qty_required',
                            parseInt(e.target.value) || null
                          )
                        }
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">
                        Notas
                      </label>
                      <input
                        type="text"
                        value={item.notes || ''}
                        onChange={(e) => handleStageChange(item.stage_id, 'notes', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                        placeholder="Opcional"
                      />
                    </div>
                  </div>
                  
                  {/* Operational Costs */}
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        id={`has_operational_cost_${item.stage_id}`}
                        checked={item.has_operational_cost}
                        onChange={(e) => handleStageChange(item.stage_id, 'has_operational_cost', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor={`has_operational_cost_${item.stage_id}`} className="text-sm font-medium text-gray-700">
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
                            handleStageChange(
                              item.stage_id,
                              'cost_per_unit',
                              val > 0 ? val : undefined
                            )
                          }
                          placeholder="0.00"
                          min={0}
                          step={0.01}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Este costo se multiplicará por la cantidad producida para calcular el costo total de esta etapa.
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Dependencies */}
                  {index > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Depende de las siguientes etapas:
                      </label>
                      <div className="space-y-1">
                        {selectedStages.slice(0, index).map((prevStage) => (
                          <label key={prevStage.stage_id} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={item.depends_on.includes(prevStage.stage_id)}
                              onChange={() => handleToggleDependency(item.stage_id, prevStage.stage_id)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span>{getStageName(prevStage.stage_id)}</span>
                          </label>
                        ))}
                      </div>
                      {item.depends_on.length === 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          Esta etapa no tiene dependencias y se podrá iniciar cuando el proyecto comience.
                        </p>
                      )}
                      {item.depends_on.length > 0 && (
                        <p className="text-xs text-amber-600 mt-1">
                          Esta etapa se desbloqueará solo cuando {item.depends_on.length === 1 ? 'la etapa seleccionada esté completada' : 'todas las etapas seleccionadas estén completadas'}.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
            </>
          )}
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/admin/projects')}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
          >
            {loading ? 'Creando...' : 'Crear Proyecto'}
          </button>
        </div>
      </form>
    </div>
  );
}
