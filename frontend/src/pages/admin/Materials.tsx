import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Loader2, Package } from 'lucide-react';
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
import materialService, { Material, MaterialCreate, MaterialUpdate } from '@/services/materials';
import supplierService, { Supplier } from '@/services/suppliers';
import { SearchableSelect } from '@/components/ui/searchable-select';

export function Materials() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [formData, setFormData] = useState<MaterialCreate>({
    name: '',
    unit: '',
    supplier_id: undefined,
    category: undefined,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const METER_UNITS = ['m', 'mt', 'mts', 'metro', 'metros'];
  const isMeterUnit = (u: string) => METER_UNITS.includes(u.trim().toLowerCase());

  const handleUnitChange = (unit: string) => {
    const suggestedCategory = isMeterUnit(unit) ? 'tela' : formData.category;
    setFormData({ ...formData, unit, category: suggestedCategory });
  };

  useEffect(() => {
    loadMaterials();
    loadSuppliers();
  }, []);

  const loadMaterials = async () => {
    try {
      setLoading(true);
      const data = await materialService.getAll();
      setMaterials(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Error al cargar materiales',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSuppliers = async () => {
    try {
      const data = await supplierService.getAll();
      setSuppliers(data);
    } catch (error: any) {
      console.error('Failed to load suppliers:', error);
    }
  };

  const handleOpenDialog = (material?: Material) => {
    if (material) {
      setEditingMaterial(material);
      setFormData({
        name: material.name,
        unit: material.unit,
        supplier_id: material.supplier_id || undefined,
        category: material.category || undefined,
      });
    } else {
      setEditingMaterial(null);
      setFormData({
        name: '',
        unit: '',
        supplier_id: undefined,
        category: undefined,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingMaterial(null);
    setFormData({
      name: '',
      unit: '',
      supplier_id: undefined,
      category: undefined,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.unit.trim()) {
      toast({
        title: 'Error',
        description: 'El nombre del material y la unidad son obligatorios',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      if (editingMaterial) {
        await materialService.update(editingMaterial.id, formData as MaterialUpdate);
        toast({
          title: 'Éxito',
          description: 'Material actualizado correctamente',
        });
      } else {
        await materialService.create(formData);
        toast({
          title: 'Éxito',
          description: 'Material creado correctamente',
        });
      }
      
      handleCloseDialog();
      loadMaterials();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Error al guardar material',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (material: Material) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar "${material.name}"?`)) {
      return;
    }

    try {
      await materialService.delete(material.id);
      toast({
        title: 'Éxito',
        description: 'Material eliminado correctamente',
      });
      loadMaterials();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Error al eliminar material',
        variant: 'destructive',
      });
    }
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
          <h1 className="text-3xl font-bold tracking-tight">Materiales</h1>
          <p className="text-muted-foreground">
            Gestiona materias primas y componentes
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Material
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Catálogo de Materiales</CardTitle>
          <CardDescription>
            Ver y gestionar tu inventario de materiales
          </CardDescription>
        </CardHeader>
        <CardContent>
          {materials.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No hay materiales agregados aún</p>
              <Button onClick={() => handleOpenDialog()} variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Agregar tu primer material
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {materials.map((material) => (
                <div
                  key={material.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{material.name}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                        <span>Unidad: {material.unit}</span>
                        {material.category && (
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            material.category === 'tela'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {material.category === 'tela' ? '🧵 Tela' : '🔩 Insumo'}
                          </span>
                        )}
                        {material.supplier_id && suppliers.length > 0 && (
                          <span>
                            • Proveedor: {suppliers.find(s => s.id === material.supplier_id)?.name || 'Desconocido'}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDialog(material)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(material)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingMaterial ? 'Editar Material' : 'Crear Nuevo Material'}
              </DialogTitle>
              <DialogDescription>
                {editingMaterial
                  ? 'Actualizar los detalles del material'
                  : 'Agregar un nuevo material a tu catálogo'}
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
                  placeholder="ej. Tela de Algodón, Hilo, Botón"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit">Unidad *</Label>
                <Input
                  id="unit"
                  value={formData.unit}
                  onChange={(e) => handleUnitChange(e.target.value)}
                  placeholder="ej. m, kg, unidad, L"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Unidad de medida (metros, kilogramos, unidades, litros, etc.)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Tipo de material</Label>
                <div className="flex gap-2">
                  {[
                    { value: 'tela',   label: '🧵 Tela' },
                    { value: 'insumo', label: '🔩 Insumo / Accesorio' },
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFormData({ ...formData, category: value })}
                      className={`flex-1 rounded-md border px-3 py-2 text-sm transition-colors ${
                        formData.category === value
                          ? 'border-primary bg-primary/10 font-medium text-primary'
                          : 'border-input bg-background text-muted-foreground hover:bg-accent'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Las telas se listan por separado en la Orden de Compra.
                  {isMeterUnit(formData.unit) && formData.category === 'tela' && (
                    <span className="ml-1 text-amber-600">Sugerido por unidad en metros.</span>
                  )}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier">Proveedor (Opcional)</Label>
                <SearchableSelect
                  value={formData.supplier_id || ''}
                  onChange={(value) =>
                    setFormData({
                      ...formData,
                      supplier_id: value ? Number(value) : undefined
                    })
                  }
                  options={[
                    { value: '', label: 'Sin proveedor' },
                    ...suppliers.map((supplier) => ({
                      value: supplier.id,
                      label: supplier.name,
                    }))
                  ]}
                  placeholder="Seleccionar proveedor..."
                  emptyMessage="No se encontraron proveedores"
                />
                <p className="text-xs text-muted-foreground">
                  Selecciona el proveedor para este material
                </p>
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
                {editingMaterial ? 'Actualizar' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
