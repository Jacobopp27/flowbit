import { useState, useEffect } from 'react';
import { inventoryService, ProductInventoryItem } from '@/services/inventory';
import { settingsService } from '@/services/settings';
import { useToast } from '@/hooks/use-toast';
import { Package, Box } from 'lucide-react';

export function ProductsInventory() {
  const [inventory, setInventory] = useState<ProductInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [inventoryEnabled, setInventoryEnabled] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const settings = await settingsService.getSettings();
      setInventoryEnabled(settings.track_finished_products_inventory);
      
      if (settings.track_finished_products_inventory) {
        const inventoryData = await inventoryService.getProductInventory();
        setInventory(inventoryData);
      }
    } catch (error: any) {
      // Si el error es por inventario desactivado, no mostrar error
      if (error.response?.status !== 400) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.response?.data?.detail || 'Error al cargar inventario',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (!inventoryEnabled) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto mt-12 text-center">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8">
            <Box className="h-16 w-16 text-yellow-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Inventario de Producto Terminado Desactivado
            </h2>
            <p className="text-gray-600 mb-6">
              Para usar este módulo, activa el inventario de producto terminado en la configuración.
              Cuando está activado, los productos de proyectos finalizados se agregan automáticamente al inventario.
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

  const totalUnits = inventory.reduce((sum, item) => {
    const qty = Number(item.qty_available) || 0;
    return sum + qty;
  }, 0);

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Inventario de Producto Terminado</h1>
        <p className="text-gray-600 mt-2">
          Control de stock de productos finalizados listos para venta
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Productos</p>
              <p className="text-3xl font-bold text-gray-900">{inventory.length}</p>
            </div>
            <Package className="h-12 w-12 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Unidades</p>
              <p className="text-3xl font-bold text-green-600">{totalUnits.toFixed(0)}</p>
            </div>
            <Box className="h-12 w-12 text-green-600" />
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Producto
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cantidad Disponible
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {inventory.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center">
                    <Box className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 mb-2">No hay productos en inventario</p>
                    <p className="text-sm text-gray-400">
                      Los productos se agregarán automáticamente cuando finalices proyectos
                    </p>
                  </td>
                </tr>
              ) : (
                inventory.map((item) => {
                  const qty = Number(item.qty_available) || 0;
                  const isLowStock = qty < 5;
                  const isOutOfStock = qty === 0;

                  return (
                    <tr 
                      key={item.id} 
                      className={`hover:bg-gray-50 ${isOutOfStock ? 'bg-red-50' : isLowStock ? 'bg-orange-50' : ''}`}
                    >
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {item.product_name}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-lg font-semibold ${
                          isOutOfStock ? 'text-red-600' : 
                          isLowStock ? 'text-orange-600' : 
                          'text-gray-900'
                        }`}>
                          {qty.toFixed(0)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {isOutOfStock ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Sin Stock
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            Stock Bajo
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
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

      {inventory.length > 0 && (
        <div className="mt-6 bg-blue-50 rounded-lg border border-blue-200 p-4">
          <p className="text-sm text-blue-900">
            <strong>Nota:</strong> Los productos se agregan automáticamente al inventario cuando 
            completas un proyecto desde la página de proyectos.
          </p>
        </div>
      )}
    </div>
  );
}
