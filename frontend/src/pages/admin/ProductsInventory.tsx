import { useState, useEffect } from 'react';
import { inventoryService, ProductInventoryItem, ProductSale } from '@/services/inventory';
import { settingsService } from '@/services/settings';
import { useToast } from '@/hooks/use-toast';
import { Package, Box, DollarSign, ShoppingCart } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function ProductsInventory() {
  const [inventory, setInventory] = useState<ProductInventoryItem[]>([]);
  const [sales, setSales] = useState<ProductSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [inventoryEnabled, setInventoryEnabled] = useState(true);
  const [showSaleDialog, setShowSaleDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductInventoryItem | null>(null);
  const [saleForm, setSaleForm] = useState({
    quantity: '',
    unit_price: '',
    customer_name: '',
    sale_date: new Date().toISOString().split('T')[0],
    notes: ''
  });
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
        const [inventoryData, salesData] = await Promise.all([
          inventoryService.getProductInventory(),
          inventoryService.getProductSales()
        ]);
        setInventory(inventoryData);
        setSales(salesData);
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

  const handleOpenSaleDialog = (product: ProductInventoryItem) => {
    setSelectedProduct(product);
    setSaleForm({
      quantity: '',
      unit_price: '',
      customer_name: '',
      sale_date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setShowSaleDialog(true);
  };

  const handleSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProduct) return;

    const quantity = parseFloat(saleForm.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'La cantidad debe ser mayor a 0',
      });
      return;
    }

    if (quantity > selectedProduct.qty_available) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Stock insuficiente. Disponible: ${selectedProduct.qty_available}`,
      });
      return;
    }

    const unitPrice = parseFloat(saleForm.unit_price);
    if (isNaN(unitPrice) || unitPrice < 0) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'El precio debe ser mayor o igual a 0',
      });
      return;
    }

    try {
      await inventoryService.registerSale({
        product_id: selectedProduct.product_id,
        quantity,
        unit_price: unitPrice,
        customer_name: saleForm.customer_name || undefined,
        sale_date: saleForm.sale_date,
        notes: saleForm.notes || undefined
      });

      toast({
        title: 'Venta registrada',
        description: `Se registró la venta de ${quantity} unidades de ${selectedProduct.product_name}`,
      });

      setShowSaleDialog(false);
      loadData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.detail || 'Error al registrar venta',
      });
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

  const totalSales = sales.reduce((sum, sale) => sum + sale.total_amount, 0);
  const totalUnitsSold = sales.reduce((sum, sale) => sum + sale.quantity, 0);

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Inventario de Producto Terminado</h1>
        <p className="text-gray-600 mt-2">
          Control de stock de productos finalizados listos para venta
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
              <p className="text-3xl font-bold text-green-600">{totalUnits.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
            </div>
            <Box className="h-12 w-12 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Unidades Vendidas</p>
              <p className="text-3xl font-bold text-purple-600">{totalUnitsSold.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
            </div>
            <ShoppingCart className="h-12 w-12 text-purple-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Ingresos Totales</p>
              <p className="text-3xl font-bold text-emerald-600">${totalSales.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <DollarSign className="h-12 w-12 text-emerald-600" />
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Inventario Actual</h2>
        </div>
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
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {inventory.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
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
                          {qty.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
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
                      <td className="px-6 py-4 text-center">
                        <Button
                          onClick={() => handleOpenSaleDialog(item)}
                          disabled={isOutOfStock}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Registrar Venta
                        </Button>
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
        <div className="mt-6 bg-blue-50 rounded-lg border border-blue-200 p-4 mb-8">
          <p className="text-sm text-blue-900">
            <strong>Nota:</strong> Los productos se agregan automáticamente al inventario cuando 
            completas un proyecto desde la página de proyectos.
          </p>
        </div>
      )}

      {/* Sales History */}
      {sales.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Historial de Ventas</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cantidad
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Precio Unit.
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notas
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(sale.sale_date).toLocaleDateString('es-MX')}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {sale.product_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-center">
                      {sale.quantity.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right">
                      ${sale.unit_price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-green-600 text-right">
                      ${sale.total_amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {sale.customer_name || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {sale.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sale Dialog */}
      <Dialog open={showSaleDialog} onOpenChange={setShowSaleDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Venta</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaleSubmit} className="space-y-4">
            {selectedProduct && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Producto
                  </label>
                  <div className="px-3 py-2 bg-gray-50 rounded-md border border-gray-200">
                    <p className="font-medium text-gray-900">{selectedProduct.product_name}</p>
                    <p className="text-sm text-gray-600">
                      Disponible: {selectedProduct.qty_available.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} unidades
                    </p>
                  </div>
                </div>

                <div>
                  <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
                    Cantidad *
                  </label>
                  <input
                    type="number"
                    id="quantity"
                    value={saleForm.quantity}
                    onChange={(e) => setSaleForm({ ...saleForm, quantity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                    step="1"
                    min="1"
                    max={selectedProduct.qty_available}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="unit_price" className="block text-sm font-medium text-gray-700 mb-1">
                    Precio Unitario *
                  </label>
                  <input
                    type="number"
                    id="unit_price"
                    value={saleForm.unit_price}
                    onChange={(e) => setSaleForm({ ...saleForm, unit_price: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>

                {saleForm.quantity && saleForm.unit_price && (
                  <div className="bg-green-50 border border-green-200 rounded-md p-3">
                    <p className="text-sm text-gray-700">Total de la venta:</p>
                    <p className="text-2xl font-bold text-green-600">
                      ${(parseFloat(saleForm.quantity) * parseFloat(saleForm.unit_price)).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                )}

                <div>
                  <label htmlFor="customer_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del Cliente
                  </label>
                  <input
                    type="text"
                    id="customer_name"
                    value={saleForm.customer_name}
                    onChange={(e) => setSaleForm({ ...saleForm, customer_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Opcional"
                  />
                </div>

                <div>
                  <label htmlFor="sale_date" className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Venta *
                  </label>
                  <input
                    type="date"
                    id="sale_date"
                    value={saleForm.sale_date}
                    onChange={(e) => setSaleForm({ ...saleForm, sale_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                    Notas
                  </label>
                  <textarea
                    id="notes"
                    value={saleForm.notes}
                    onChange={(e) => setSaleForm({ ...saleForm, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Opcional"
                    rows={3}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    onClick={() => setShowSaleDialog(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Registrar Venta
                  </Button>
                </div>
              </>
            )}
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
