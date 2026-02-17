import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import stageService, { Stage, StageCreate, StageUpdate } from '@/services/stages';

export function Stages() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [formData, setFormData] = useState<StageCreate>({
    stage_name: '',
    description: '',
    color: '#3b82f6',
    is_purchasing_stage: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadStages();
  }, []);

  const loadStages = async () => {
    try {
      setLoading(true);
      const data = await stageService.getAll();
      setStages(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to load stages',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (stage?: Stage) => {
    if (stage) {
      setEditingStage(stage);
      setFormData({
        stage_name: stage.name,
        description: stage.description || '',
        color: stage.color || '#3b82f6',
        is_purchasing_stage: stage.is_purchasing_stage || false,
      });
    } else {
      setEditingStage(null);
      setFormData({
        stage_name: '',
        description: '',
        color: '#3b82f6',
        is_purchasing_stage: false,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingStage(null);
    setFormData({
      stage_name: '',
      description: '',
      color: '#3b82f6',
      is_purchasing_stage: false,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.stage_name.trim()) {
      toast({
        title: 'Error',
        description: 'Stage name is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      if (editingStage) {
        await stageService.update(editingStage.id, formData as StageUpdate);
        toast({
          title: 'Success',
          description: 'Stage updated successfully',
        });
      } else {
        await stageService.create(formData);
        toast({
          title: 'Success',
          description: 'Stage created successfully',
        });
      }
      
      handleCloseDialog();
      loadStages();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to save stage',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (stage: Stage) => {
    if (!confirm(`Are you sure you want to delete "${stage.name}"?`)) {
      return;
    }

    try {
      await stageService.delete(stage.id);
      toast({
        title: 'Success',
        description: 'Stage deleted successfully',
      });
      loadStages();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to delete stage',
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
          <h1 className="text-3xl font-bold tracking-tight">Stages</h1>
          <p className="text-muted-foreground">
            Configure workflow stages and dependencies
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          New Stage
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Workflow Stages</CardTitle>
          <CardDescription>
            Define the stages that make up your workflows
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No stages configured yet</p>
              <Button onClick={() => handleOpenDialog()} variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Create your first stage
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {stages.map((stage) => (
                <div
                  key={stage.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: stage.color || '#3b82f6' }}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{stage.name}</h3>
                        {stage.is_purchasing_stage && (
                          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                            Compras
                          </span>
                        )}
                      </div>
                      {stage.description && (
                        <p className="text-sm text-muted-foreground">
                          {stage.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDialog(stage)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(stage)}
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
                {editingStage ? 'Edit Stage' : 'Create New Stage'}
              </DialogTitle>
              <DialogDescription>
                {editingStage
                  ? 'Update the stage details below'
                  : 'Add a new workflow stage to your company'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.stage_name}
                  onChange={(e) =>
                    setFormData({ ...formData, stage_name: e.target.value })
                  }
                  placeholder="e.g., Cut, Sew, Quality Check"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Optional description of this stage"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="color"
                    type="color"
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                    className="w-20 h-10"
                  />
                  <Input
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                    placeholder="#3b82f6"
                    pattern="^#[0-9A-Fa-f]{6}$"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  id="is_purchasing_stage"
                  type="checkbox"
                  checked={formData.is_purchasing_stage || false}
                  onChange={(e) =>
                    setFormData({ ...formData, is_purchasing_stage: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="is_purchasing_stage" className="text-sm font-normal cursor-pointer">
                  Es etapa de compras (materiales/inventario)
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingStage ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
