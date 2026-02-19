import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import projectService, { ProjectListItem } from '../../services/projects';

export function ProjectsList() {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const data = await projectService.getAll();
      setProjects(data);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('¿Eliminar este proyecto? Se eliminarán también las etapas asociadas.')) {
      try {
        await projectService.delete(id);
        loadProjects();
      } catch (error) {
        console.error('Error deleting project:', error);
        alert('Error al eliminar el proyecto');
      }
    }
  };

  const getProgressPercentage = (completed: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage === 100) return 'bg-green-500';
    if (percentage >= 50) return 'bg-blue-500';
    return 'bg-yellow-500';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Proyectos</h1>
        <button
          onClick={() => navigate('/admin/projects/new')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          + Nuevo Proyecto
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500 mb-4">No hay proyectos creados</p>
          <button
            onClick={() => navigate('/admin/projects/new')}
            className="text-blue-600 hover:underline"
          >
            Crear el primer proyecto
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => {
            const progress = getProgressPercentage(project.completed_stages, project.stages_count);
            
            return (
              <div
                key={project.project_id}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition cursor-pointer"
                onClick={() => navigate(`/admin/projects/${project.project_id}`)}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-800 mb-1">
                        {project.project_name}
                      </h3>
                      <p className="text-gray-600">Cliente: {project.client_name}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(project.project_id);
                      }}
                      className="text-red-600 hover:text-red-800"
                    >
                      🗑️
                    </button>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Inicio:</span>
                      <span>{new Date(project.start_date).toLocaleDateString('es-MX')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Entrega:</span>
                      <span className="font-medium">
                        {new Date(project.final_deadline).toLocaleDateString('es-MX')}
                      </span>
                    </div>
                  </div>

                  <div className="mb-2">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Progreso</span>
                      <span className="font-medium">
                        {project.completed_stages} / {project.stages_count} etapas
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${getProgressColor(progress)}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="text-right text-sm font-medium text-blue-600 mt-4">
                    Ver detalles →
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
