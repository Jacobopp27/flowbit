import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/services/api';

interface DashboardMetrics {
  view_type: string;
  period: {
    year: number | null;
    month: number | null;
  };
  summary: {
    total_projects: number;
    active_projects: number;
    completed_projects: number;
    completion_rate: number;
  };
  financial: {
    projected_revenue: number;
    actual_sales_revenue: number;
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
  const [viewType, setViewType] = useState<'total' | 'monthly'>('total');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadDashboardMetrics();
  }, [viewType, selectedYear, selectedMonth]);

  const loadDashboardMetrics = async () => {
    try {
      const params = new URLSearchParams({ view: viewType });
      if (viewType === 'monthly') {
        params.append('year', selectedYear.toString());
        params.append('month', selectedMonth.toString());
      }
      const response = await api.get(`/projects/dashboard/metrics?${params}`);
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
      <div className="pb-2">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Panel de Control</h1>
        <p className="text-sm text-gray-600 mt-1">
          Vista general de operaciones y métricas clave
        </p>
      </div>

      {/* View Selector */}
      <div className="flex items-center gap-4 p-4 bg-white rounded-lg border">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Vista:</label>
          <select
            value={viewType}
            onChange={(e) => setViewType(e.target.value as 'total' | 'monthly')}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="total">Total Acumulado</option>
            <option value="monthly">Por Mes</option>
          </select>
        </div>

        {viewType === 'monthly' && (
          <>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Año:</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Mes:</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[
                  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
                ].map((month, index) => (
                  <option key={index} value={index + 1}>{month}</option>
                ))}
              </select>
            </div>
          </>
        )}

        {viewType === 'monthly' && metrics && (
          <div className="ml-auto text-sm text-gray-600">
            Mostrando datos de: <span className="font-semibold text-gray-900">
              {[
                'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
              ][selectedMonth - 1]} {selectedYear}
            </span>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Proyectos Activos</CardTitle>
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
              </svg>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{metrics.summary.active_projects}</div>
            <p className="text-xs text-gray-500 mt-1">
              {metrics.summary.total_projects} proyectos totales
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Ingresos</CardTitle>
            <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
              </svg>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-gray-500">Ventas PT</p>
                <div className="text-2xl font-bold text-green-600">
                  ${metrics.financial.actual_sales_revenue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500">Proyectos</p>
                <div className="text-2xl font-bold text-blue-600">
                  ${metrics.financial.projected_revenue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Ganancia</CardTitle>
            <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${
              (metrics.financial.actual_sales_revenue + metrics.financial.projected_revenue - metrics.financial.total_costs) >= 0 ? 'text-emerald-600' : 'text-red-600'
            }`}>
              ${(metrics.financial.actual_sales_revenue + metrics.financial.projected_revenue - metrics.financial.total_costs).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Costos: ${metrics.financial.total_costs.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Tasa de Completitud</CardTitle>
            <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{metrics.summary.completion_rate}%</div>
            <p className="text-xs text-gray-500 mt-1">
              {metrics.summary.completed_projects} completados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Timeline Status */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-t-4 border-t-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              Estado de Plazos
            </CardTitle>
            <CardDescription>
              Proyectos a tiempo vs retrasados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-sm font-medium text-gray-700">A Tiempo</span>
                </div>
                <span className="text-2xl font-bold text-green-600">{metrics.timeline.on_time_count}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <span className="text-sm font-medium text-gray-700">Retrasados</span>
                </div>
                <span className="text-2xl font-bold text-red-600">{metrics.timeline.delayed_count}</span>
              </div>

              {metrics.timeline.delayed_projects.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-sm font-semibold mb-3 text-red-600 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Proyectos Retrasados:
                  </h4>
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

        <Card className="border-t-4 border-t-emerald-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
              </svg>
              Análisis Financiero
            </CardTitle>
            <CardDescription>
              Desglose de costos y ganancias
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                <span className="text-sm text-gray-700 font-medium">Ventas PT</span>
                <span className="font-semibold text-green-600">
                  ${metrics.financial.actual_sales_revenue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                <span className="text-sm text-gray-700 font-medium">Proyectos</span>
                <span className="font-semibold text-blue-600">
                  ${metrics.financial.projected_revenue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-sm text-gray-700 font-medium">Materiales</span>
                <span className="font-semibold text-gray-900">
                  ${metrics.financial.material_costs.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-sm text-gray-700 font-medium">Operativos</span>
                <span className="font-semibold text-gray-900">
                  ${metrics.financial.operational_costs.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t-2">
                <span className="text-sm font-semibold text-gray-700">Total Costos</span>
                <span className="font-bold text-gray-900">
                  ${metrics.financial.total_costs.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t-2 bg-emerald-50 -mx-6 px-6 py-3 mt-3">
                <span className="text-sm font-semibold text-gray-700">Ganancia Neta</span>
                <span className={`text-lg font-bold ${
                  (metrics.financial.actual_sales_revenue + metrics.financial.projected_revenue - metrics.financial.total_costs) >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  ${(metrics.financial.actual_sales_revenue + metrics.financial.projected_revenue - metrics.financial.total_costs).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Projects */}
      <Card className="border-t-4 border-t-indigo-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
            </svg>
            Proyectos Activos
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
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:shadow-sm cursor-pointer transition-all"
                  onClick={() => navigate(`/admin/projects/${project.id}`)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-900">{project.name}</h4>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                        project.status === 'on_time' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {project.status === 'on_time' ? 'A tiempo' : 'Retrasado'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{project.client}</p>
                    {project.deadline && (
                      <p className="text-xs text-gray-500 mt-1">
                        <span className="font-medium">Fecha límite:</span> {new Date(project.deadline).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-2xl font-bold text-indigo-600">{project.progress}%</div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide">progreso</div>
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
          <Card className="border-t-4 border-t-amber-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                Etapas Bloqueadas
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
                    className="p-3 border-l-4 border-amber-500 bg-amber-50 rounded-lg hover:bg-amber-100 cursor-pointer transition-colors"
                    onClick={() => navigate(`/admin/projects/${stage.project_id}`)}
                  >
                    <div className="font-semibold text-sm text-gray-900">{stage.project_name}</div>
                    <div className="text-xs text-gray-600 mt-1">
                      {stage.stage_name} · {stage.dependencies_count} dependencia(s)
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Low Inventory */}
        {metrics.low_inventory_alerts.length > 0 && (
          <Card className="border-t-4 border-t-red-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Inventario Bajo
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
                    className="flex justify-between p-3 border-l-4 border-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <span className="text-sm font-semibold text-gray-900">{material.material_name}</span>
                    <span className="text-sm font-medium text-red-600">
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
