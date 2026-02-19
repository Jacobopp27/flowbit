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
      return (
        <div className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-red-100 text-red-700 font-medium">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {Math.abs(days)}d retrasado
        </div>
      );
    }
    if (status === 'urgent') {
      return (
        <div className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 font-medium">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
          {days}d restantes
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-700 font-medium">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        {days}d restantes
      </div>
    );
  };

  const renderStageCard = (stage: WorkStageItem) => (
    <div
      key={stage.project_stage_id}
      className="p-5 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md cursor-pointer transition-all bg-white"
      onClick={() => navigate(`/worker/projects/${stage.project_id}/stages/${stage.project_stage_id}`)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-semibold text-lg text-gray-900">{stage.project_name}</h4>
          <p className="text-sm text-gray-600 mt-0.5">{stage.client_name}</p>
        </div>
        {getDeadlineBadge(stage.deadline_status, stage.days_to_deadline)}
      </div>
      
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-medium border border-blue-200">
          {stage.stage_name}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 font-medium">Progreso</span>
          <span className="font-semibold text-blue-600">{stage.progress}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5">
          <div
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-2.5 rounded-full transition-all shadow-sm"
            style={{ width: `${stage.progress}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs text-gray-500 pt-1">
          <span className="font-medium">{stage.qty_done} / {stage.qty_required} unidades</span>
          {stage.deadline && (
            <span className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
              {new Date(stage.deadline).toLocaleDateString('es-MX')}
            </span>
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
      <div className="space-y-6 p-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Mis Tareas</h1>
        </div>
        <Card className="border-t-4 border-t-red-500 shadow-sm">
          <CardContent className="py-16">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-4 bg-red-100 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900">Error al cargar las tareas</div>
                <div className="text-sm text-gray-600 mt-1">{error}</div>
              </div>
              <button
                onClick={loadMyWorkStages}
                className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
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
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Mis Tareas</h1>
        <p className="text-gray-600 mt-2 text-lg">
          Etapas de proyectos asignadas · Total: <span className="font-semibold text-blue-600">{totalStages}</span>
        </p>
      </div>

      {/* In Progress - Priority */}
      {workStages.in_progress.length > 0 && (
        <Card className="border-t-4 border-t-blue-500 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
              </div>
              En Progreso
            </CardTitle>
            <CardDescription className="text-base">
              Etapas en las que estás trabajando actualmente · <span className="font-semibold">{workStages.in_progress.length}</span> activas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {workStages.in_progress.map(renderStageCard)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ready to Start */}
      {workStages.ready.length > 0 && (
        <Card className="border-t-4 border-t-green-500 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              Listas para Iniciar
            </CardTitle>
            <CardDescription className="text-base">
              Etapas disponibles para comenzar · <span className="font-semibold">{workStages.ready.length}</span> disponibles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {workStages.ready.map(renderStageCard)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Blocked */}
      {workStages.blocked.length > 0 && (
        <Card className="border-t-4 border-t-amber-500 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <div className="p-2 bg-amber-100 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              </div>
              Bloqueadas
            </CardTitle>
            <CardDescription className="text-base">
              Etapas esperando dependencias · <span className="font-semibold">{workStages.blocked.length}</span> bloqueadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {workStages.blocked.map(renderStageCard)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completed */}
      {workStages.completed.length > 0 && (
        <Card className="border-t-4 border-t-emerald-500 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                  <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              Completadas
            </CardTitle>
            <CardDescription className="text-base">
              Etapas finalizadas · <span className="font-semibold">{workStages.completed.length}</span> completadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {workStages.completed.slice(0, 6).map(renderStageCard)}
            </div>
            {workStages.completed.length > 6 && (
              <p className="text-sm text-gray-500 text-center pt-4 font-medium">
                Y {workStages.completed.length - 6} etapas completadas más...
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {totalStages === 0 && (
        <Card className="border-t-4 border-t-gray-300 shadow-sm">
          <CardContent className="py-16 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-gray-100 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <p className="text-lg font-medium text-gray-700">No tienes etapas asignadas</p>
                <p className="text-sm text-gray-500 mt-1">Las nuevas tareas aparecerán aquí cuando te sean asignadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
