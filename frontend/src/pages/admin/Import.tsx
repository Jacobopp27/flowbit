import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import importService, {
  ImportResult,
  MaterialPreview,
  PreviewResult,
  ProductPreview,
  SupplierPreview,
} from '@/services/imports';
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  SkipForward,
  Upload,
  XCircle,
} from 'lucide-react';

type PageState = 'idle' | 'loading' | 'preview' | 'importing' | 'done';

function StatusBadge({ status, message }: { status: string; message: string }) {
  if (status === 'new') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
        <CheckCircle2 className="h-3 w-3" /> Nuevo
      </span>
    );
  }
  if (status === 'exists') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
        <SkipForward className="h-3 w-3" /> Ya existe
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"
      title={message}
    >
      <XCircle className="h-3 w-3" /> Error
    </span>
  );
}

function SectionSummary({ items }: { items: { status: string }[] }) {
  const newCount = items.filter((i) => i.status === 'new').length;
  const existsCount = items.filter((i) => i.status === 'exists').length;
  const errorCount = items.filter((i) => i.status === 'error').length;
  return (
    <div className="flex gap-3 text-sm text-muted-foreground">
      {newCount > 0 && <span className="text-green-600 font-medium">{newCount} nuevos</span>}
      {existsCount > 0 && <span>{existsCount} ya existen</span>}
      {errorCount > 0 && <span className="text-red-600 font-medium">{errorCount} con error</span>}
    </div>
  );
}

export function Import() {
  const [pageState, setPageState] = useState<PageState>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDownloadTemplate = async () => {
    try {
      await importService.downloadTemplate();
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo descargar la plantilla',
        variant: 'destructive',
      });
    }
  };

  const handleFile = (file: File) => {
    if (!file.name.endsWith('.xlsx')) {
      toast({
        title: 'Archivo inválido',
        description: 'Solo se aceptan archivos .xlsx',
        variant: 'destructive',
      });
      return;
    }
    setSelectedFile(file);
    setPreview(null);
    setPageState('idle');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handlePreview = async () => {
    if (!selectedFile) return;
    setPageState('loading');
    try {
      const data = await importService.preview(selectedFile);
      setPreview(data);
      setPageState('preview');
    } catch (error: any) {
      toast({
        title: 'Error al procesar el archivo',
        description: error.response?.data?.detail || 'Verifica que el archivo sea válido',
        variant: 'destructive',
      });
      setPageState('idle');
    }
  };

  const handleConfirm = async () => {
    if (!selectedFile) return;
    setPageState('importing');
    try {
      const data = await importService.confirm(selectedFile);
      setResult(data);
      setPageState('done');
    } catch (error: any) {
      toast({
        title: 'Error al importar',
        description: error.response?.data?.detail || 'Ocurrió un error durante la importación',
        variant: 'destructive',
      });
      setPageState('preview');
    }
  };

  const handleReset = () => {
    setPageState('idle');
    setSelectedFile(null);
    setPreview(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const hasErrors =
    preview &&
    [
      ...preview.suppliers,
      ...preview.materials,
      ...preview.products,
    ].some((i) => i.status === 'error');

  const hasNewItems =
    preview &&
    [
      ...preview.suppliers,
      ...preview.materials,
      ...preview.products,
    ].some((i) => i.status === 'new');

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Importar datos</h1>
        <p className="text-muted-foreground">
          Carga proveedores, materiales y productos desde un archivo Excel.
        </p>
      </div>

      {/* Paso 1: Plantilla */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Descarga la plantilla</CardTitle>
          <CardDescription>
            Llena las 3 hojas (Proveedores, Materiales, Productos) y vuelve a subir el archivo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleDownloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Descargar plantilla Excel
          </Button>
        </CardContent>
      </Card>

      {/* Paso 2: Subir archivo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. Sube el archivo completado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer ${
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <FileSpreadsheet className="mb-3 h-10 w-10 text-muted-foreground" />
            {selectedFile ? (
              <div className="text-center">
                <p className="font-medium text-sm">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm font-medium">Arrastra tu archivo aquí</p>
                <p className="text-xs text-muted-foreground mt-1">o haz clic para seleccionarlo</p>
                <p className="text-xs text-muted-foreground">Solo archivos .xlsx</p>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />

          {selectedFile && pageState !== 'done' && (
            <Button
              onClick={handlePreview}
              disabled={pageState === 'loading'}
              className="w-full"
            >
              {pageState === 'loading' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Previsualizar importación
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Paso 3: Preview */}
      {pageState === 'preview' && preview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">3. Revisión previa</CardTitle>
            <CardDescription>
              Revisa lo que se va a importar antes de confirmar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Proveedores */}
            {preview.suppliers.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-sm">Proveedores</h3>
                  <SectionSummary items={preview.suppliers} />
                </div>
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Nombre</th>
                        <th className="px-3 py-2 text-left font-medium">Contacto</th>
                        <th className="px-3 py-2 text-left font-medium">Email</th>
                        <th className="px-3 py-2 text-right font-medium">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.suppliers.map((s: SupplierPreview, idx: number) => (
                        <tr key={idx} className="border-t">
                          <td className="px-3 py-2">{s.nombre}</td>
                          <td className="px-3 py-2 text-muted-foreground">{s.contacto || '—'}</td>
                          <td className="px-3 py-2 text-muted-foreground">{s.email || '—'}</td>
                          <td className="px-3 py-2 text-right">
                            <StatusBadge status={s.status} message={s.message} />
                            {s.message && s.status === 'error' && (
                              <p className="text-xs text-red-600 mt-1">{s.message}</p>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Materiales */}
            {preview.materials.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-sm">Materiales</h3>
                  <SectionSummary items={preview.materials} />
                </div>
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Nombre</th>
                        <th className="px-3 py-2 text-left font-medium">Unidad</th>
                        <th className="px-3 py-2 text-left font-medium">Proveedor</th>
                        <th className="px-3 py-2 text-right font-medium">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.materials.map((m: MaterialPreview, idx: number) => (
                        <tr key={idx} className="border-t">
                          <td className="px-3 py-2">{m.nombre}</td>
                          <td className="px-3 py-2 text-muted-foreground">{m.unidad}</td>
                          <td className="px-3 py-2 text-muted-foreground">{m.proveedor || '—'}</td>
                          <td className="px-3 py-2 text-right">
                            <StatusBadge status={m.status} message={m.message} />
                            {m.message && m.status === 'error' && (
                              <p className="text-xs text-red-600 mt-1">{m.message}</p>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Productos */}
            {preview.products.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-sm">Productos</h3>
                  <SectionSummary items={preview.products} />
                </div>
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Nombre</th>
                        <th className="px-3 py-2 text-left font-medium">SKU</th>
                        <th className="px-3 py-2 text-left font-medium">Materiales (BOM)</th>
                        <th className="px-3 py-2 text-right font-medium">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.products.map((p: ProductPreview, idx: number) => (
                        <tr key={idx} className="border-t">
                          <td className="px-3 py-2 font-medium">{p.nombre}</td>
                          <td className="px-3 py-2 text-muted-foreground">{p.sku || '—'}</td>
                          <td className="px-3 py-2">
                            {p.bom_items.length > 0 ? (
                              <ul className="space-y-0.5">
                                {p.bom_items.map((b, bidx) => (
                                  <li key={bidx} className="text-xs text-muted-foreground">
                                    {b.material} × {b.cantidad}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <StatusBadge status={p.status} message={p.message} />
                            {p.message && p.status === 'error' && (
                              <p className="text-xs text-red-600 mt-1">{p.message}</p>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Acciones */}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={handleReset}>
                Cancelar
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={!hasNewItems || !!hasErrors || pageState === 'importing'}
              >
                {pageState === 'importing' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  'Confirmar importación'
                )}
              </Button>
              {hasErrors && (
                <p className="text-sm text-red-600 self-center">
                  Corrige los errores en el archivo antes de importar.
                </p>
              )}
              {!hasNewItems && !hasErrors && (
                <p className="text-sm text-muted-foreground self-center">
                  No hay registros nuevos para importar.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resultado */}
      {pageState === 'done' && result && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              Importación completada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-700">{result.created.suppliers}</p>
                <p className="text-sm text-muted-foreground">Proveedores creados</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-700">{result.created.materials}</p>
                <p className="text-sm text-muted-foreground">Materiales creados</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-700">{result.created.products}</p>
                <p className="text-sm text-muted-foreground">Productos creados</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleReset} className="w-full">
              Importar otro archivo
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
