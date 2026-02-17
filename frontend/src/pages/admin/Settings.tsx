import { useState, useEffect } from 'react';
import { settingsService, CompanySettings } from '@/services/settings';

export function Settings() {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await settingsService.getSettings();
      setSettings(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al cargar configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (field: 'track_raw_materials_inventory' | 'track_finished_products_inventory') => {
    if (!settings) return;

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const newValue = !settings[field];
      const updated = await settingsService.updateSettings({
        [field]: newValue
      });

      setSettings(updated);
      setSuccessMessage('Configuración actualizada correctamente');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al actualizar configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-600">Cargando configuración...</div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-600">No se pudo cargar la configuración</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-600 mt-2">
          Configura cómo {settings.company_name} gestiona los inventarios
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800">{successMessage}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y">
        {/* Raw Materials Inventory */}
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Inventario de Materia Prima
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Activa esta opción si deseas mantener un inventario centralizado de materias primas.
                Las compras generales sumarán al inventario, y las compras en proyectos restarán del mismo.
              </p>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Módulo de compras generales de MP</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Compras en proyectos restan del inventario</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Control de disponibilidad por material</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => handleToggle('track_raw_materials_inventory')}
              disabled={saving}
              className={`
                relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
                transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                ${settings.track_raw_materials_inventory ? 'bg-blue-600' : 'bg-gray-200'}
                ${saving ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <span
                className={`
                  pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 
                  transition duration-200 ease-in-out
                  ${settings.track_raw_materials_inventory ? 'translate-x-5' : 'translate-x-0'}
                `}
              />
            </button>
          </div>
        </div>

        {/* Finished Products Inventory */}
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Inventario de Producto Terminado
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Activa esta opción si produces para inventario antes de vender. 
                Al finalizar proyectos, los productos se agregarán al inventario en lugar de considerarse como ventas directas.
              </p>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Productos finalizados van a inventario</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Control de stock de productos terminados</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Separación entre producción y ventas</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => handleToggle('track_finished_products_inventory')}
              disabled={saving}
              className={`
                relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
                transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                ${settings.track_finished_products_inventory ? 'bg-blue-600' : 'bg-gray-200'}
                ${saving ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <span
                className={`
                  pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 
                  transition duration-200 ease-in-out
                  ${settings.track_finished_products_inventory ? 'translate-x-5' : 'translate-x-0'}
                `}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Current Status Summary */}
      <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Resumen de Configuración Actual</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className={settings.track_raw_materials_inventory ? 'text-green-600' : 'text-gray-400'}>
              {settings.track_raw_materials_inventory ? '✓' : '○'}
            </span>
            <span className="text-blue-900">
              {settings.track_raw_materials_inventory 
                ? 'Inventario de MP activo - Las compras suman/restan del inventario'
                : 'Inventario de MP desactivado - Compras directas por proyecto'
              }
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={settings.track_finished_products_inventory ? 'text-green-600' : 'text-gray-400'}>
              {settings.track_finished_products_inventory ? '✓' : '○'}
            </span>
            <span className="text-blue-900">
              {settings.track_finished_products_inventory
                ? 'Inventario de PT activo - Productos van a inventario al finalizar'
                : 'Inventario de PT desactivado - Productos son ventas directas'
              }
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
