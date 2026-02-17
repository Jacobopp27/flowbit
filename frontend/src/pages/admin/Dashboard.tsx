import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/services/api';

interface DashboardMetrics {
  summary: {
    total_projects: number;
    active_projects: number;
    completed_projects: number;
    completion_rate: number;
  };
  financial: {
    projected_revenue: number;
    material_costs: number;
    operational_costs: number;
    total_costs: number;
    estimated_profit: number;
    profit_margin_percent: number;
  };
  timeline: {
    on_time_count: number;
    delayed_count: number;
    on_time_projects: Array<{
      id: number;
      name: string;
      deadline: string;
      days_remaining: number;
    }>;
    delayed_projects: Array<{
      id: number;
      name: string;
      deadline: string;
      days_overdue: number;
    }>;
  };
  active_projects: Array<{
    id: number;
    name: string;
    client: string;
    progress: number;
    deadline: string | null;
    status: string;
  }>;
  critical_stages: Array<{
    project_id: number;
    project_name: string;
    stage_id: number;
    stage_name: string;
    dependencies_count: number;
  }>;
  low_inventory_alerts: Array<{
    material_id: number;
    material_name: string;
    qty_available: number;
    unit: string;
  }>;
}

export function AdminDashboard() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardMetrics();
  }, []);

  const loadDashboardMetrics = async () => {
    try {
      const response = await api.get('/projects/dashboard/metrics');
      setMetrics(response.data);
    } catch (error) {
      console.error('Error loading dashboard metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Cargando dashboard...</div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Error al cargar métricas</div>
      </div>
    );
  }
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Vista general de operaciones y métricas clave
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Proyectos Activos</CardTitle>
            <span className="text-2xl">📊</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.summary.active_projects}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.summary.total_projects} proyectos totales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Proyectados</CardTitle>
            <span className="text-2xl">💰</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${metrics.financial.projected_revenue.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Margen: {metrics.financial.profit_margin_percent.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ganancia Estimada</CardTitle>
            <span className="text-2xl">✅</span>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              metrics.financial.estimated_profit >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              ${metrics.financial.estimated_profit.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Costos: ${metrics.financial.total_costs.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Completitud</CardTitle>
            <span className="text-2xl">🎯</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.summary.completion_rate}%</div>
            <p className="text-xs text-muted-foreground">
              {metrics.summary.completed_projects} completados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Timeline Status */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>⏰</span> Estado de Plazos
            </CardTitle>
            <CardDescription>
              Proyectos a tiempo vs retrasados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-sm font-medium">A Tiempo</span>
                </div>
                <span className="text-2xl font-bold text-green-600">{metrics.timeline.on_time_count}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-sm font-medium">Retrasados</span>
                </div>
                <span className="text-2xl font-bold text-red-600">{metrics.timeline.delayed_count}</span>
              </div>

              {metrics.timeline.delayed_projects.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-sm font-medium mb-2 text-red-600">⚠️ Proyectos Retrasados:</h4>
                  <div className="space-y-2">
                    {metrics.timeline.delayed_projects.map(proj => (
                      <div 
                        key={proj.id} 
                        className="flex justify-between text-sm cursor-pointer hover:bg-gray-50 p-2 rounded"
                        onClick={() => navigate(`/admin/projects/${proj.id}`)}
                      >
                        <span className="text-gray-700">{proj.name}</span>
                        <span className="text-red-600 font-medium">{proj.days_overdue}d</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>💵</span> Análisis Financiero
            </CardTitle>
            <CardDescription>
              Desglose de costos y ganancias
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">📦 Materiales</span>
                <span className="font-medium">
                  ${metrics.financial.material_costs.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">⚙️ Operativos</span>
                <span className="font-medium">
                  ${metrics.financial.operational_costs.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-sm font-medium">Total Costos</span>
                <span className="font-bold">
                  ${metrics.financial.total_costs.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-sm font-medium">Ganancia Neta</span>
                <span className={`font-bold ${
                  metrics.financial.estimated_profit >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  ${metrics.financial.estimated_profit.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Projects */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>🚀</span> Proyectos Activos
          </CardTitle>
          <CardDescription>
            Estado de progreso de proyectos en curso
          </CardDescription>
        </CardHeader>
        <CardContent>
          {metrics.active_projects.length === 0 ? (
            <p className="text-sm text-gray-500">No hay proyectos activos</p>
          ) : (
            <div className="space-y-3">
              {metrics.active_projects.map(project => (
                <div 
                  key={project.id} 
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/admin/projects/${project.id}`)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{project.name}</h4>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        project.status === 'on_time' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {project.status === 'on_time' ? '✓ A tiempo' : '⚠ Retrasado'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{project.client}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">{project.progress}%</div>
                      <div className="text-xs text-gray-500">progreso</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alerts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Critical Stages */}
        {metrics.critical_stages.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-600">
                <span>🔒</span> Etapas Bloqueadas
              </CardTitle>
              <CardDescription>
                Etapas que requieren atención inmediata
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {metrics.critical_stages.map(stage => (
                  <div 
                    key={stage.stage_id} 
                    className="p-2 border-l-4 border-amber-500 bg-amber-50 rounded cursor-pointer"
                    onClick={() => navigate(`/admin/projects/${stage.project_id}`)}
                  >
                    <div className="font-medium text-sm">{stage.project_name}</div>
                    <div className="text-xs text-gray-600">
                      {stage.stage_name} - {stage.dependencies_count} dependencia(s)
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Low Inventory */}
        {metrics.low_inventory_alerts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <span>⚠️</span> Inventario Bajo
              </CardTitle>
              <CardDescription>
                Materiales que requieren reabastecimiento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {metrics.low_inventory_alerts.map(material => (
                  <div 
                    key={material.material_id} 
                    className="flex justify-between p-2 border-l-4 border-red-500 bg-red-50 rounded"
                  >
                    <span className="text-sm font-medium">{material.material_name}</span>
                    <span className="text-sm text-red-600">
                      {material.qty_available} {material.unit}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
