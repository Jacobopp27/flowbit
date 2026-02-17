import { useState, useEffect } from 'react';
import materialService, { Material } from '@/services/materials';
import { settingsService } from '@/services/settings';
import { useToast } from '@/hooks/use-toast';
import { Package, AlertCircle } from 'lucide-react';

export function MaterialsInventory() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [inventoryEnabled, setInventoryEnabled] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load settings first
      const settings = await settingsService.getSettings();
      setInventoryEnabled(settings.track_raw_materials_inventory);
      
      // Only load materials if inventory is enabled
      if (settings.track_raw_materials_inventory) {
        const materialsData = await materialService.getAll();
        setMaterials(materialsData);
      }
    } catch (error: any) {
      console.error('Error loading inventory:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.detail || 'Error al cargar inventario',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!inventoryEnabled) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto mt-12 text-center">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8">
            <Package className="h-16 w-16 text-yellow-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Inventario de Materia Prima Desactivado
            </h2>
            <p className="text-gray-600 mb-6">
              Para usar este módulo, activa el inventario de materia prima en la configuración.
            </p>
            <a
              href="/admin/settings"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Ir a Configuración
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-600">Cargando inventario...</div>
      </div>
    );
  }

  const lowStockMaterials = materials.filter(m => {
    const qty = Number(m.qty_available) || 0;
    return qty < 10;
  });
  
  const totalValue = materials.reduce((sum, m) => {
    const cost = Number(m.cost_per_unit) || 0;
    const qty = Number(m.qty_available) || 0;
    return sum + (cost * qty);
  }, 0);

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Inventario de Materia Prima</h1>
        <p className="text-gray-600 mt-2">
          Control de stock de materias primas disponibles
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Materiales</p>
              <p className="text-3xl font-bold text-gray-900">{materials.length}</p>
            </div>
            <Package className="h-12 w-12 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Stock Bajo</p>
              <p className="text-3xl font-bold text-orange-600">{lowStockMaterials.length}</p>
            </div>
            <AlertCircle className="h-12 w-12 text-orange-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Valor Total</p>
              <p className="text-3xl font-bold text-green-600">${totalValue.toFixed(2)}</p>
            </div>
            <div className="text-green-600 text-4xl font-bold">$</div>
          </div>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockMaterials.length > 0 && (
        <div className="mb-6 bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-orange-900">Alerta de Stock Bajo</h3>
              <p className="text-sm text-orange-800 mt-1">
                {lowStockMaterials.length} material{lowStockMaterials.length !== 1 ? 'es' : ''} con stock menor a 10 unidades
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Material
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categoría
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Disponible
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unidad
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Costo/Unidad
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor Total
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {materials.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No hay materiales registrados
                  </td>
                </tr>
              ) : (
                materials.map((material) => {
                  const qty = Number(material.qty_available) || 0;
                  const cost = Number(material.cost_per_unit) || 0;
                  const totalValue = qty * cost;
                  const isLowStock = qty < 10;
                  const isOutOfStock = qty === 0;

                  return (
                    <tr 
                      key={material.id} 
                      className={`hover:bg-gray-50 ${isOutOfStock ? 'bg-red-50' : isLowStock ? 'bg-orange-50' : ''}`}
                    >
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {material.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {material.category || '-'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-sm font-semibold ${
                          isOutOfStock ? 'text-red-600' : 
                          isLowStock ? 'text-orange-600' : 
                          'text-gray-900'
                        }`}>
                          {qty.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-600">
                        {material.unit}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-900">
                        ${cost.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                        ${totalValue.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {isOutOfStock ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Sin Stock
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            Stock Bajo
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Disponible
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
