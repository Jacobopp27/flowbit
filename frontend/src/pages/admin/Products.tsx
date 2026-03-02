import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Loader2, Package, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import productService, { Product, ProductCreate, ProductBOMItemCreate } from '@/services/products';
import materialService, { Material } from '@/services/materials';
import { SearchableSelect } from '@/components/ui/searchable-select';

export function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductCreate>({
    name: '',
    sku: '',
    bom_items: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadProducts();
    loadMaterials();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await productService.getAll();
      setProducts(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Error al cargar productos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMaterials = async () => {
    try {
      const data = await materialService.getAll();
      setMaterials(data);
    } catch (error: any) {
      console.error('Failed to load materials:', error);
    }
  };

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        sku: product.sku || '',
        bom_items: product.bom_items.map(item => ({
          material_id: item.material_id,
          qty_per_unit: item.qty_per_unit,
        })),
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        sku: '',
        bom_items: [],
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingProduct(null);
    setFormData({
      name: '',
      sku: '',
      bom_items: [],
    });
  };

  const addBOMItem = () => {
    if (materials.length === 0) {
      toast({
        title: 'Sin materiales',
        description: 'Por favor crea materiales antes de agregar elementos al BOM',
        variant: 'destructive',
      });
      return;
    }
    setFormData({
      ...formData,
      bom_items: [...formData.bom_items, { material_id: materials[0].id, qty_per_unit: 1 }],
    });
  };

  const removeBOMItem = (index: number) => {
    setFormData({
      ...formData,
      bom_items: formData.bom_items.filter((_, i) => i !== index),
    });
  };

  const updateBOMItem = (index: number, field: keyof ProductBOMItemCreate, value: number) => {
    const updatedItems = [...formData.bom_items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setFormData({ ...formData, bom_items: updatedItems });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: 'Error',
        description: 'El nombre del producto es obligatorio',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      const submitData: ProductCreate = {
        name: formData.name,
        sku: formData.sku?.trim() || undefined,
        bom_items: formData.bom_items,
      };

      if (editingProduct) {
        await productService.update(editingProduct.id, submitData);
        toast({
          title: 'Éxito',
          description: 'Producto actualizado correctamente',
        });
      } else {
        await productService.create(submitData);
        toast({
          title: 'Éxito',
          description: 'Producto creado correctamente',
        });
      }
      
      handleCloseDialog();
      loadProducts();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Error al guardar producto',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar "${product.name}"?`)) {
      return;
    }

    try {
      await productService.delete(product.id);
      toast({
        title: 'Éxito',
        description: 'Producto eliminado correctamente',
      });
      loadProducts();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Error al eliminar producto',
        variant: 'destructive',
      });
    }
  };

  const getMaterialName = (materialId: number) => {
    return materials.find(m => m.id === materialId)?.name || 'Desconocido';
  };

  const getMaterialUnit = (materialId: number) => {
    return materials.find(m => m.id === materialId)?.unit || '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Productos</h1>
          <p className="text-muted-foreground">
            Gestiona productos y listas de materiales (BOM)
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Producto
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Catálogo de Productos</CardTitle>
          <CardDescription>
            Ver productos y sus requerimientos de materiales
          </CardDescription>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No hay productos agregados aún</p>
              <Button onClick={() => handleOpenDialog()} variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Agregar tu primer producto
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Package className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{product.name}</h3>
                        {product.sku && (
                          <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(product)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(product)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {product.bom_items.length > 0 && (
                    <div className="ml-14 space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Lista de Materiales:</p>
                      <div className="space-y-1">
                        {product.bom_items.map((item) => (
                          <div key={item.id} className="text-sm flex items-center gap-2">
                            <span className="text-muted-foreground">•</span>
                            <span>{getMaterialName(item.material_id)}</span>
                            <span className="text-muted-foreground">
                              - {item.qty_per_unit} {getMaterialUnit(item.material_id)} por unidad
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? 'Editar Producto' : 'Crear Nuevo Producto'}
              </DialogTitle>
              <DialogDescription>
                {editingProduct
                  ? 'Actualizar detalles del producto y BOM'
                  : 'Agregar un nuevo producto a tu catálogo'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="ej. Camiseta, Mochila"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sku">SKU (Opcional)</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) =>
                    setFormData({ ...formData, sku: e.target.value })
                  }
                  placeholder="ej. CAMISETA-001"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Lista de Materiales (BOM)</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addBOMItem}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar Material
                  </Button>
                </div>

                {formData.bom_items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No se agregaron materiales aún. Haz clic en "Agregar Material" para definir el BOM.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {formData.bom_items.map((item, index) => (
                      <div key={index} className="flex gap-2 items-end">
                        <div className="flex-1">
                          <Label htmlFor={`material-${index}`}>Material</Label>
                          <SearchableSelect
                            value={item.material_id}
                            onChange={(value) =>
                              updateBOMItem(index, 'material_id', Number(value))
                            }
                            options={materials.map((material) => ({
                              value: material.id,
                              label: `${material.name} (${material.unit})`,
                            }))}
                            placeholder="Seleccionar material..."
                            emptyMessage="No se encontraron materiales"
                          />
                        </div>
                        <div className="w-32">
                          <Label htmlFor={`qty-${index}`}>Cant. por unidad</Label>
                          <Input
                            id={`qty-${index}`}
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={item.qty_per_unit}
                            onChange={(e) =>
                              updateBOMItem(index, 'qty_per_unit', parseFloat(e.target.value) || 0)
                            }
                            required
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeBOMItem(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingProduct ? 'Actualizar' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
