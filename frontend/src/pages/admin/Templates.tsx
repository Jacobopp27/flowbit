import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { templatesService, TemplateListResponse } from '@/services/templates';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, FileText } from 'lucide-react';

export function Templates() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<TemplateListResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await templatesService.listTemplates();
      setTemplates(data);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.detail || 'Error al cargar plantillas',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`¿Estás seguro de eliminar la plantilla "${name}"?\n\nEsto no afectará los proyectos existentes.`)) {
      return;
    }

    try {
      await templatesService.deleteTemplate(id);
      toast({
        title: 'Éxito',
        description: 'Plantilla eliminada correctamente',
      });
      loadTemplates();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.detail || 'Error al eliminar plantilla',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-600">Cargando plantillas...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Plantillas de Proyectos</h1>
          <p className="text-gray-600 mt-2">
            Crea plantillas para agilizar la creación de proyectos repetitivos
          </p>
        </div>
        <button
          onClick={() => navigate('/admin/templates/new')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Nueva Plantilla
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            No hay plantillas creadas
          </h2>
          <p className="text-gray-600 mb-6">
            Crea tu primera plantilla para agilizar la creación de proyectos
          </p>
          <button
            onClick={() => navigate('/admin/templates/new')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Crear Primera Plantilla
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {template.name}
                  </h3>
                  {template.description && (
                    <p className="text-sm text-gray-600 mb-3">
                      {template.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                      {template.stages_count} etapas
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-xs text-gray-500 mb-4">
                Actualizado: {new Date(template.updated_at).toLocaleDateString('es-MX')}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/admin/templates/${template.id}/edit`)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Edit className="h-4 w-4" />
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(template.id, template.name)}
                  className="flex items-center justify-center gap-2 px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
