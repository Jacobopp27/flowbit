import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import projectService, { MyWorkStages, WorkStageItem } from '@/services/projects';

export function MyWork() {
  const navigate = useNavigate();
  const [workStages, setWorkStages] = useState<MyWorkStages | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMyWorkStages();
  }, []);

  const loadMyWorkStages = async () => {
    try {
      const data = await projectService.getMyWorkStages();
      setWorkStages(data);
      setError(null);
    } catch (error: any) {
      console.error('Error loading work stages:', error);
      const errorMsg = error.response?.data?.detail || error.message || 'Error desconocido';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const getDeadlineBadge = (status: string, days: number | null) => {
    if (!days) return null;
    
    if (status === 'overdue') {
      return <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">⚠️ {Math.abs(days)}d retrasado</span>;
    }
    if (status === 'urgent') {
      return <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700">⏰ {days}d restantes</span>;
    }
    return <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">✓ {days}d restantes</span>;
  };

  const renderStageCard = (stage: WorkStageItem) => (
    <div
      key={stage.project_stage_id}
      className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
      onClick={() => navigate(`/worker/projects/${stage.project_id}/stages/${stage.project_stage_id}`)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h4 className="font-semibold text-lg">{stage.project_name}</h4>
          <p className="text-sm text-gray-600">{stage.client_name}</p>
        </div>
        {getDeadlineBadge(stage.deadline_status, stage.days_to_deadline)}
      </div>
      
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">{stage.stage_name}</span>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Progreso</span>
          <span className="font-medium">{stage.progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${stage.progress}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>{stage.qty_done} / {stage.qty_required} unidades</span>
          {stage.deadline && (
            <span>Fecha límite: {new Date(stage.deadline).toLocaleDateString('es-MX')}</span>
          )}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Cargando mis tareas...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mis Tareas</h1>
        </div>
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <div className="text-red-500 text-lg">⚠️ Error al cargar las tareas</div>
              <div className="text-sm text-gray-600">{error}</div>
              <button
                onClick={loadMyWorkStages}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Reintentar
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!workStages) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Error al cargar las tareas</div>
      </div>
    );
  }

  const totalStages = 
    workStages.blocked.length +
    workStages.ready.length +
    workStages.in_progress.length +
    workStages.completed.length;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mis Tareas</h1>
        <p className="text-muted-foreground">
          Etapas de proyectos asignadas - Total: {totalStages}
        </p>
      </div>

      {/* In Progress - Priority */}
      {workStages.in_progress.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>🔥</span> En Progreso
            </CardTitle>
            <CardDescription>
              Etapas en las que estás trabajando actualmente ({workStages.in_progress.length})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {workStages.in_progress.map(renderStageCard)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ready to Start */}
      {workStages.ready.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>✅</span> Listas para Iniciar
            </CardTitle>
            <CardDescription>
              Etapas disponibles para comenzar ({workStages.ready.length})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {workStages.ready.map(renderStageCard)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Blocked */}
      {workStages.blocked.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-600">
              <span>🔒</span> Bloqueadas
            </CardTitle>
            <CardDescription>
              Etapas esperando dependencias ({workStages.blocked.length})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {workStages.blocked.map(renderStageCard)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completed */}
      {workStages.completed.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <span>✓</span> Completadas
            </CardTitle>
            <CardDescription>
              Etapas finalizadas ({workStages.completed.length})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {workStages.completed.slice(0, 5).map(renderStageCard)}
              {workStages.completed.length > 5 && (
                <p className="text-sm text-gray-500 text-center pt-2">
                  Y {workStages.completed.length - 5} etapas completadas más...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {totalStages === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">No tienes etapas asignadas actualmente</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
