import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { quotationsApi, QuotationListItem } from '../../services/quotations';
import { Plus, FileText, ChevronRight, Trash2 } from 'lucide-react';

const STATUS_LABELS: Record<string, { label: string; classes: string }> = {
  borrador: { label: 'Borrador', classes: 'bg-gray-100 text-gray-600' },
  enviada: { label: 'Enviada', classes: 'bg-blue-100 text-blue-700' },
  aprobada: { label: 'Aprobada', classes: 'bg-green-100 text-green-700' },
};

export function Quotations() {
  const [quotations, setQuotations] = useState<QuotationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const data = await quotationsApi.list();
      setQuotations(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('¿Eliminar esta cotización?')) return;
    try {
      await quotationsApi.delete(id);
      load();
    } catch {
      alert('Error al eliminar la cotización');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Cargando cotizaciones...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Cotizaciones</h1>
          <p className="text-sm text-gray-500 mt-1">
            {quotations.length} cotización{quotations.length !== 1 ? 'es' : ''}
          </p>
        </div>
        <button
          onClick={() => navigate('/admin/quotations/new')}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={16} />
          Nueva Cotización
        </button>
      </div>

      {/* Empty state */}
      {quotations.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg shadow">
          <FileText size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 mb-4">No hay cotizaciones aún</p>
          <button
            onClick={() => navigate('/admin/quotations/new')}
            className="text-blue-600 hover:underline"
          >
            Crear la primera cotización
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">No.</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Cliente</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Pedido</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Entrega</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Referencias</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Estado</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Proyecto</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {quotations.map((q) => {
                const status = STATUS_LABELS[q.status] ?? STATUS_LABELS.borrador;
                return (
                  <tr
                    key={q.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/admin/quotations/${q.id}`)}
                  >
                    <td className="px-4 py-3 font-mono font-medium text-gray-800">{q.number}</td>
                    <td className="px-4 py-3 text-gray-800">{q.client_name}</td>
                    <td className="px-4 py-3 text-gray-600">{q.event_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {q.delivery_date
                        ? new Date(q.delivery_date + 'T00:00:00').toLocaleDateString('es-CO')
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{q.total_items}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.classes}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {q.project_id ? (
                        <button
                          className="text-blue-600 hover:underline text-xs flex items-center gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin/projects/${q.project_id}`);
                          }}
                        >
                          Ver proyecto <ChevronRight size={12} />
                        </button>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => handleDelete(q.id, e)}
                        className="text-gray-400 hover:text-red-500 transition"
                        title="Eliminar"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
