import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  quotationsApi,
  QuotationOut,
  QuotationItem,
  QuotationStatus,
  MaterialOverride,
  ExtraBomEntry,
} from '../../services/quotations';
import productService, { Product } from '../../services/products';
import materialService, { Material } from '../../services/materials';
import {
  Plus, Trash2, Download, Scissors, ShoppingCart, ClipboardList,
  ChevronDown, Save, ArrowLeft, Loader2, ExternalLink, FileText, ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// ── helpers ──────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: QuotationStatus; label: string }[] = [
  { value: 'borrador', label: 'Borrador' },
  { value: 'enviada', label: 'Enviada' },
  { value: 'aprobada', label: 'Aprobada' },
];

const STATUS_CLASSES: Record<QuotationStatus, string> = {
  borrador: 'bg-gray-100 text-gray-700',
  enviada: 'bg-blue-100 text-blue-700',
  aprobada: 'bg-green-100 text-green-700',
};

const DEFAULT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

function totalQty(item: QuotationItem): number {
  if (!item.sizes_breakdown) return 0;
  if (item.has_sizes) return Object.values(item.sizes_breakdown).reduce((a, b) => a + (Number(b) || 0), 0);
  return Number(item.sizes_breakdown['total'] || 0);
}

/** Format a number with Colombian thousands separator (dots) */
function formatCOP(n: number | null | undefined): string {
  if (n == null || isNaN(n as number)) return '';
  return Math.round(n as number).toLocaleString('es-CO');
}

/** Parse a Colombian-formatted string back to a number */
function parseCOP(s: string): number | undefined {
  const cleaned = s.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? undefined : num;
}

// ── Main component ────────────────────────────────────────────────────────────

export function QuotationDetail() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();

  // Form state
  const [clientName, setClientName] = useState('');
  const [clientNit, setClientNit] = useState('');
  const [clientContact, setClientContact] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [eventName, setEventName] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [observations, setObservations] = useState('');
  const [paymentConditions, setPaymentConditions] = useState('');
  const [ivaRate, setIvaRate] = useState(0.19);
  const [discount, setDiscount] = useState(0);
  const [giftNote, setGiftNote] = useState('');
  const [molderia, setMolderia] = useState('');
  const [status, setStatus] = useState<QuotationStatus>('borrador');
  const [items, setItems] = useState<QuotationItem[]>([]);

  // Per-item upload: key = item.id
  const [uploadingItemImage, setUploadingItemImage] = useState<Record<number, boolean>>({});

  // Catalog search
  const [catalogSearch, setCatalogSearch] = useState('');
  const [showCatalog, setShowCatalog] = useState(false);

  // Meta
  const [quotation, setQuotation] = useState<QuotationOut | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [generatingProject, setGeneratingProject] = useState(false);
  // Inline new-material form: {itemIdx, name, unit}
  const [newMatForm, setNewMatForm] = useState<{ itemIdx: number; name: string; unit: string } | null>(null);
  const [creatingMat, setCreatingMat] = useState(false);

  // PDF loading states
  const [dlQuotation, setDlQuotation] = useState(false);
  const [dlCutting, setDlCutting] = useState(false);
  const [dlPurchase, setDlPurchase] = useState(false);
  const [dlProduction, setDlProduction] = useState(false);

  useEffect(() => {
    productService.getAll().then((p) => setProducts(p));
    materialService.getAll().then(setMaterials);
    if (!isNew) loadQuotation();
  }, [id]);

  const loadQuotation = async () => {
    try {
      const q = await quotationsApi.get(Number(id));
      setQuotation(q);
      setClientName(q.client_name);
      setClientNit(q.client_nit || '');
      setClientContact(q.client_contact || '');
      setClientPhone(q.client_phone || '');
      setClientEmail(q.client_email || '');
      setEventName(q.event_name || '');
      setDeliveryDate(q.delivery_date || '');
      setObservations(q.observations || '');
      setPaymentConditions(q.payment_conditions || '');
      setIvaRate(q.iva_rate ?? 0.19);
      setDiscount(q.discount);
      setGiftNote(q.gift_note || '');
      setMolderia(q.molderia || '');
      setStatus(q.status);
      setItems(q.items);
    } catch {
      alert('No se pudo cargar la cotización');
      navigate('/admin/quotations');
    } finally {
      setLoading(false);
    }
  };

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!clientName.trim()) { alert('El nombre del cliente es obligatorio'); return; }
    if (items.length === 0) { alert('Agrega al menos una referencia'); return; }

    setSaving(true);
    try {
      const payload = buildPayload();

      if (isNew) {
        const q = await quotationsApi.create(payload);
        navigate(`/admin/quotations/${q.id}`);
      } else {
        const q = await quotationsApi.update(Number(id), payload);
        setQuotation(q);
        setItems(q.items);
        alert('Cotización guardada');
      }
    } catch (err: any) {
      alert('Error al guardar: ' + (err?.response?.data?.detail || err.message));
    } finally {
      setSaving(false);
    }
  };

  // ── Status ────────────────────────────────────────────────────────────────

  const handleStatusChange = async (newStatus: QuotationStatus) => {
    if (isNew) return;
    try {
      const q = await quotationsApi.updateStatus(Number(id), newStatus);
      setStatus(q.status);
      setQuotation(q);
    } catch {
      alert('Error al cambiar estado');
    }
  };

  // ── Items management ──────────────────────────────────────────────────────

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        reference: '',
        has_sizes: false,
        sizes_breakdown: { total: 0 },
        order: prev.length,
      },
    ]);
  };

  const addFromProduct = (productId: number) => {
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    const hasSizes = p.has_sizes ?? false;
    const sizes = p.available_sizes?.length ? p.available_sizes : DEFAULT_SIZES;
    const breakdown = hasSizes
      ? Object.fromEntries(sizes.map((s) => [s, 0]))
      : { total: 0 };
    setItems((prev) => [
      ...prev,
      {
        product_id: productId,
        reference: p.name,
        description: '',
        has_sizes: hasSizes,
        sizes_breakdown: breakdown,
        order: prev.length,
      },
    ]);
  };

  const removeItem = (idx: number) =>
    setItems((prev) => prev.filter((_, i) => i !== idx));

  const updateItem = (idx: number, patch: Partial<QuotationItem>) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const updateSize = (idx: number, size: string, value: string) => {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        return {
          ...it,
          sizes_breakdown: { ...it.sizes_breakdown, [size]: Number(value) || 0 },
        };
      })
    );
  };

  const toggleSizes = (idx: number, hasSizes: boolean) => {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        const p = products.find((x) => x.id === it.product_id);
        const sizes = p?.available_sizes?.length ? p.available_sizes : DEFAULT_SIZES;
        return {
          ...it,
          has_sizes: hasSizes,
          sizes_breakdown: hasSizes
            ? Object.fromEntries(sizes.map((s) => [s, 0]))
            : { total: 0 },
        };
      })
    );
  };


  // ── Build save payload (shared by handleSave and handleGenerateProject) ────

  const buildPayload = (overrideItems?: typeof items) => {
    const its = overrideItems ?? items;
    return {
      client_name: clientName,
      client_nit: clientNit || undefined,
      client_contact: clientContact || undefined,
      client_phone: clientPhone || undefined,
      client_email: clientEmail || undefined,
      event_name: eventName || undefined,
      delivery_date: deliveryDate || undefined,
      observations: observations || undefined,
      payment_conditions: paymentConditions || undefined,
      iva_rate: ivaRate,
      discount,
      gift_note: giftNote || undefined,
      molderia: molderia || undefined,
      items: its.map((it, idx) => ({
        product_id: it.product_id || undefined,
        reference: it.reference,
        description: it.description,
        has_sizes: it.has_sizes,
        sizes_breakdown: it.sizes_breakdown,
        unit_price: it.unit_price || undefined,
        notes: it.notes,
        order: idx,
        design_image_path: it.design_image_path || undefined,
        material_overrides: it.material_overrides || undefined,
        extra_bom: it.extra_bom || undefined,
      })),
    };
  };

  // ── Generate project from quotation ────────────────────────────────────────

  const handleGenerateProject = async () => {
    setGeneratingProject(true);
    try {
      let resolvedItems = [...items];

      // Auto-create products for manual items (those without product_id)
      const manualIndexes = items
        .map((it, i) => (!it.product_id && it.reference ? i : -1))
        .filter((i) => i >= 0);

      if (manualIndexes.length > 0) {
        const refs = manualIndexes
          .map((i) => items[i].reference || '(sin nombre)')
          .join(', ');
        const proceed = confirm(
          `${manualIndexes.length} referencia(s) no tienen producto en el catálogo:\n\n${refs}\n\n¿Crearlos como productos nuevos automáticamente para incluirlos en el proyecto?`
        );
        if (!proceed) return;

        // Create a product for each manual item
        for (const i of manualIndexes) {
          const it = items[i];
          const sizes = it.has_sizes ? Object.keys(it.sizes_breakdown) : undefined;
          const newProduct = await productService.create({
            name: it.reference!,
            bom_items: [],
            has_sizes: it.has_sizes,
            available_sizes: sizes,
          });
          resolvedItems[i] = { ...resolvedItems[i], product_id: newProduct.id };
          // Also update local product list so the item shows the link immediately
          setProducts((prev) => [...prev, newProduct]);
        }

        // Persist the updated product links in the quotation
        setItems(resolvedItems);
        await quotationsApi.update(Number(id), buildPayload(resolvedItems));
      }

      // Build product map from all resolved items
      const productMap: Record<number, number> = {};
      resolvedItems.forEach((it) => {
        if (!it.product_id) return;
        const qty = it.has_sizes
          ? Object.values(it.sizes_breakdown).reduce((a, b) => a + (Number(b) || 0), 0)
          : Number(it.sizes_breakdown['total'] || 0);
        productMap[it.product_id] = (productMap[it.product_id] || 0) + qty;
      });

      // Compute sale price (base without IVA)
      const subtotal = resolvedItems.reduce((acc, it) => {
        const qty = it.has_sizes
          ? Object.values(it.sizes_breakdown).reduce((a, b) => a + (Number(b) || 0), 0)
          : Number(it.sizes_breakdown['total'] || 0);
        return acc + (Number(it.unit_price || 0) * qty);
      }, 0);
      const computedSalePrice = Math.round(subtotal - (discount ?? 0));

      navigate('/admin/projects/new', {
        state: {
          fromQuotation: {
            quotation_id: quotation?.id,
            project_name: eventName || quotation?.number || '',
            client_name: clientName,
            final_deadline: deliveryDate || '',
            notes: observations || '',
            products: Object.entries(productMap).map(([pid, qty]) => ({
              product_id: Number(pid),
              quantity: qty || 1,
            })),
            sale_price: computedSalePrice || undefined,
            sale_includes_tax: false,
          },
        },
      });
    } catch (err: any) {
      alert('Error al preparar el proyecto: ' + (err?.response?.data?.detail || err.message));
    } finally {
      setGeneratingProject(false);
    }
  };

  // ── Create material inline ─────────────────────────────────────────────────

  const handleCreateMaterial = async (itemIdx: number) => {
    if (!newMatForm || !newMatForm.name.trim() || !newMatForm.unit.trim()) return;
    setCreatingMat(true);
    try {
      const created = await materialService.create({
        name: newMatForm.name.trim(),
        unit: newMatForm.unit.trim(),
      });
      // Add to local materials list
      setMaterials((prev) => [...prev, created]);
      // Append to the item's extra_bom
      setItems((prev) =>
        prev.map((it, i) => {
          if (i !== itemIdx) return it;
          return {
            ...it,
            extra_bom: [...(it.extra_bom || []), { material_id: created.id, qty_per_unit: 1 }],
          };
        })
      );
      setNewMatForm(null);
    } catch (err: any) {
      alert('Error al crear material: ' + (err?.response?.data?.detail || err.message));
    } finally {
      setCreatingMat(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Cargando...</div>
      </div>
    );
  }

  const grandTotal = items.reduce((acc, it) => acc + totalQty(it), 0);
  const ordersGenerated = !!quotation?.project_id;

  const catalogFiltered = products
    .filter(p => p.name.toLowerCase().includes(catalogSearch.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Back + title */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/admin/quotations')} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800">
            {isNew ? 'Nueva Cotización' : quotation?.number}
          </h1>
          {!isNew && (
            <p className="text-xs text-gray-400 mt-0.5">
              Creada {quotation?.created_at ? new Date(quotation.created_at).toLocaleDateString('es-CO') : ''}
            </p>
          )}
        </div>

        {/* Status selector */}
        {!isNew && (
          <div className="relative">
            <select
              value={status}
              onChange={(e) => handleStatusChange(e.target.value as QuotationStatus)}
              className={`appearance-none pr-7 pl-3 py-1.5 rounded-full text-sm font-medium cursor-pointer border-0 outline-none ${STATUS_CLASSES[status]}`}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-2.5 pointer-events-none" />
          </div>
        )}

        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {isNew ? 'Crear' : 'Guardar'}
        </Button>
      </div>

      {/* Project banner */}
      {ordersGenerated && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6 flex items-center justify-between">
          <span className="text-green-700 text-sm font-medium">
            ✓ Proyecto #{quotation?.project_id} creado
          </span>
          <button
            onClick={() => navigate(`/admin/projects/${quotation?.project_id}`)}
            className="text-green-700 hover:text-green-900 text-sm flex items-center gap-1"
          >
            Abrir proyecto <ExternalLink size={13} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left col: client + meta */}
        <div className="lg:col-span-1 space-y-4 lg:sticky lg:top-4 lg:self-start">
          <div className="bg-white rounded-lg shadow p-4 space-y-3">
            <h2 className="font-semibold text-gray-700">Cliente</h2>
            <div>
              <Label>Nombre *</Label>
              <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nombre cliente" />
            </div>
            <div>
              <Label>NIT / CC</Label>
              <Input value={clientNit} onChange={(e) => setClientNit(e.target.value)} placeholder="890.123.456-1" />
            </div>
            <div>
              <Label>Contacto</Label>
              <Input value={clientContact} onChange={(e) => setClientContact(e.target.value)} placeholder="Nombre contacto" />
            </div>
            <div>
              <Label>Teléfono</Label>
              <Input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="+57 300 000 0000" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="contacto@empresa.com" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 space-y-3">
            <h2 className="font-semibold text-gray-700">Pedido</h2>
            <div>
              <Label>Nombre del pedido / evento</Label>
              <Input value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="Dotación Movilidad Q1" />
            </div>
            <div>
              <Label>Moldería</Label>
              <Input value={molderia} onChange={(e) => setMolderia(e.target.value)} placeholder="ALCALDIA 2020" />
            </div>
            <div>
              <Label>Fecha de entrega</Label>
              <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>IVA (%)</Label>
                <Input
                  type="number"
                  value={Math.round(ivaRate * 100)}
                  onChange={(e) => setIvaRate(Number(e.target.value) / 100)}
                  min={0} max={100}
                />
              </div>
              <div>
                <Label>Descuento ($)</Label>
                <Input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} min={0} />
              </div>
            </div>
            <div>
              <Label>Obsequio</Label>
              <Input value={giftNote} onChange={(e) => setGiftNote(e.target.value)} placeholder="Obsequio tula sublimada." />
            </div>
            <div>
              <Label>Condiciones de pago</Label>
              <textarea
                className="w-full border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                value={paymentConditions}
                onChange={(e) => setPaymentConditions(e.target.value)}
                placeholder="50% anticipo, 50% contra entrega"
              />
            </div>
            <div>
              <Label>Observaciones</Label>
              <textarea
                className="w-full border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Notas internas o para el cliente..."
              />
            </div>
          </div>


          {/* PDF downloads */}
          {!isNew && (
            <div className="bg-white rounded-lg shadow p-4 space-y-2">
              <h2 className="font-semibold text-gray-700 mb-2">Documentos</h2>
              <button
                disabled={dlQuotation}
                onClick={async () => {
                  setDlQuotation(true);
                  await quotationsApi.downloadQuotationPdf(Number(id), quotation!.number).finally(() => setDlQuotation(false));
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md border border-blue-300 bg-blue-50 text-sm font-medium text-blue-800 hover:bg-blue-100 transition disabled:opacity-60"
              >
                {dlQuotation ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                Cotización (cliente)
                <Download size={12} className="ml-auto text-blue-400" />
              </button>
              <div className="border-t my-2" />
              <button
                disabled={dlCutting}
                onClick={async () => {
                  setDlCutting(true);
                  await quotationsApi.downloadCuttingOrderPdf(Number(id)).finally(() => setDlCutting(false));
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md border text-sm hover:bg-gray-50 transition disabled:opacity-60"
              >
                {dlCutting ? <Loader2 size={14} className="animate-spin" /> : <Scissors size={14} />}
                Programación de Corte
                <Download size={12} className="ml-auto text-gray-400" />
              </button>
              <button
                disabled={dlPurchase}
                onClick={async () => {
                  setDlPurchase(true);
                  await quotationsApi.downloadPurchaseOrderPdf(Number(id)).finally(() => setDlPurchase(false));
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md border text-sm hover:bg-gray-50 transition disabled:opacity-60"
              >
                {dlPurchase ? <Loader2 size={14} className="animate-spin" /> : <ShoppingCart size={14} />}
                Orden de Compra
                <Download size={12} className="ml-auto text-gray-400" />
              </button>
              <button
                disabled={dlProduction}
                onClick={async () => {
                  setDlProduction(true);
                  await quotationsApi.downloadProductionSheetPdf(Number(id)).finally(() => setDlProduction(false));
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md border text-sm hover:bg-gray-50 transition disabled:opacity-60"
              >
                {dlProduction ? <Loader2 size={14} className="animate-spin" /> : <ClipboardList size={14} />}
                Ficha de Producción
                <Download size={12} className="ml-auto text-gray-400" />
              </button>

              {/* Project actions */}
              {status === 'aprobada' && !ordersGenerated && (
                <button
                  onClick={handleGenerateProject}
                  disabled={generatingProject}
                  className="w-full mt-2 flex items-center justify-center gap-2 bg-green-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition disabled:opacity-60"
                >
                  {generatingProject ? (
                    <><Loader2 size={14} className="animate-spin" /> Preparando...</>
                  ) : (
                    'Generar Proyecto'
                  )}
                </button>
              )}
              {status === 'aprobada' && ordersGenerated && (
                <button
                  onClick={() => navigate(`/admin/projects/${quotation?.project_id}`)}
                  className="w-full mt-2 flex items-center justify-center gap-2 border border-green-600 text-green-700 px-3 py-2 rounded-md text-sm font-medium hover:bg-green-50 transition"
                >
                  <ExternalLink size={14} /> Abrir proyecto #{quotation?.project_id}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right col: items */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-gray-700">
                Referencias <span className="text-gray-400 font-normal text-sm">({items.length})</span>
              </h2>
              <div className="flex gap-2">
                {products.length > 0 && (
                  <div className="relative">
                    <input
                      type="text"
                      value={catalogSearch}
                      onChange={(e) => { setCatalogSearch(e.target.value); setShowCatalog(true); }}
                      onFocus={() => setShowCatalog(true)}
                      onBlur={() => setTimeout(() => setShowCatalog(false), 150)}
                      placeholder="Buscar en catálogo..."
                      className="text-sm border rounded-md px-2 py-1 w-44 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    {showCatalog && (
                      <div className="absolute right-0 top-full mt-1 bg-white border rounded-md shadow-lg z-20 w-56 max-h-52 overflow-y-auto">
                        {catalogFiltered.length === 0 ? (
                          <div className="px-3 py-2 text-xs text-gray-400">Sin resultados</div>
                        ) : (
                          catalogFiltered.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onMouseDown={() => {
                                addFromProduct(p.id);
                                setCatalogSearch('');
                                setShowCatalog(false);
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition"
                            >
                              {p.name}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
                <button
                  onClick={addItem}
                  className="flex items-center gap-1 text-sm px-3 py-1.5 border rounded-md hover:bg-gray-50 transition"
                >
                  <Plus size={14} /> Manual
                </button>
              </div>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">
                Agrega una referencia con el botón de arriba
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item, idx) => (
                  <div key={idx} className="border rounded-lg p-4 bg-gray-50 space-y-3">
                    {/* Item header */}
                    <div className="flex items-start gap-3">
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Referencia *</Label>
                          <Input
                            value={item.reference}
                            onChange={(e) => updateItem(idx, { reference: e.target.value })}
                            placeholder="CHAQUETA-RANGLAN"
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Precio unitario ($)</Label>
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={formatCOP(item.unit_price)}
                            onChange={(e) => {
                              const num = parseCOP(e.target.value);
                              updateItem(idx, { unit_price: num });
                            }}
                            placeholder="0"
                            className="text-sm"
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">Descripción</Label>
                          <Input
                            value={item.description || ''}
                            onChange={(e) => updateItem(idx, { description: e.target.value })}
                            placeholder="Descripción del producto"
                            className="text-sm"
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => removeItem(idx)}
                        className="mt-5 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Notes — comes before sizes so Tab order is: Referencia → Precio → Descripción → Notas → Tallas */}
                    <div>
                      <Input
                        value={item.notes || ''}
                        onChange={(e) => updateItem(idx, { notes: e.target.value })}
                        placeholder="Notas especiales (ej: llevan la palabra MOVILIDAD)"
                        className="text-xs text-gray-500"
                      />
                    </div>

                    {/* Sizes toggle */}
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={item.has_sizes}
                          onChange={(e) => toggleSizes(idx, e.target.checked)}
                          className="rounded"
                        />
                        <span className="text-xs text-gray-600">Tiene tallas</span>
                      </label>
                    </div>

                    {/* Size breakdown */}
                    {item.has_sizes ? (
                      <div className="flex flex-wrap gap-2">
                        {(Object.keys(item.sizes_breakdown).length > 0
                          ? Object.keys(item.sizes_breakdown)
                          : DEFAULT_SIZES
                        ).map((size) => (
                          <div key={size} className="flex flex-col items-center gap-0.5">
                            <span className="text-xs font-medium text-gray-500 w-12 text-center">{size}</span>
                            <input
                              type="number"
                              min={0}
                              value={item.sizes_breakdown[size] ?? 0}
                              onChange={(e) => updateSize(idx, size, e.target.value)}
                              className="w-12 text-center border rounded-md px-1 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                            />
                          </div>
                        ))}
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-xs font-medium text-blue-600 w-14 text-center">TOTAL</span>
                          <div className="w-14 text-center border border-blue-200 bg-blue-50 rounded-md px-1 py-1 text-sm font-semibold text-blue-700">
                            {totalQty(item)}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Cantidad total:</span>
                        <input
                          type="number"
                          min={0}
                          value={item.sizes_breakdown['total'] ?? 0}
                          onChange={(e) => updateItem(idx, { sizes_breakdown: { total: Number(e.target.value) } })}
                          className="w-20 border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                      </div>
                    )}

                    {/* BOM editable por cotización */}
                    {(() => {
                      const prod = item.product_id ? products.find(p => p.id === item.product_id) : null;
                      const baseBom = prod?.bom_items || [];
                      const extraBom: ExtraBomEntry[] = item.extra_bom || [];
                      if (baseBom.length === 0 && extraBom.length === 0 && !item.product_id) return null;

                      const updateOverride = (materialIdStr: string, patch: Partial<MaterialOverride>) => {
                        const curr = item.material_overrides || {};
                        updateItem(idx, {
                          material_overrides: {
                            ...curr,
                            [materialIdStr]: { ...curr[materialIdStr], ...patch },
                          },
                        });
                      };

                      const removeBaseMaterial = (materialIdStr: string) => {
                        updateOverride(materialIdStr, { removed: true });
                      };

                      const restoreBaseMaterial = (materialIdStr: string) => {
                        const curr = item.material_overrides || {};
                        const updated = { ...curr };
                        delete updated[materialIdStr];
                        updateItem(idx, { material_overrides: updated });
                      };

                      const addExtraMaterial = () => {
                        const curr = item.extra_bom || [];
                        const usedIds = new Set([
                          ...baseBom.map(b => b.material_id),
                          ...curr.map(e => e.material_id),
                        ]);
                        const first = materials.find(m => !usedIds.has(m.id));
                        if (!first) return;
                        updateItem(idx, { extra_bom: [...curr, { material_id: first.id, qty_per_unit: 1 }] });
                      };

                      const updateExtra = (eIdx: number, patch: Partial<ExtraBomEntry>) => {
                        const curr = item.extra_bom || [];
                        updateItem(idx, {
                          extra_bom: curr.map((e, i) => (i === eIdx ? { ...e, ...patch } : e)),
                        });
                      };

                      const removeExtra = (eIdx: number) => {
                        const curr = item.extra_bom || [];
                        updateItem(idx, { extra_bom: curr.filter((_, i) => i !== eIdx) });
                      };

                      return (
                        <div className="pt-2 border-t border-dashed border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-medium text-gray-500">Materiales</p>
                            <div className="flex items-center gap-2">
                              {materials.length > 0 && (
                                <button
                                  type="button"
                                  onClick={addExtraMaterial}
                                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-0.5"
                                >
                                  <Plus size={11} /> Agregar
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  setNewMatForm(
                                    newMatForm?.itemIdx === idx
                                      ? null
                                      : { itemIdx: idx, name: '', unit: 'm' }
                                  )
                                }
                                className="text-xs text-green-600 hover:text-green-800 flex items-center gap-0.5"
                              >
                                <Plus size={11} /> Nuevo
                              </button>
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            {/* Base BOM items */}
                            {baseBom.map((bom) => {
                              const key = String(bom.material_id);
                              const ov = item.material_overrides?.[key] || {};
                              const isRemoved = ov.removed;
                              const activeMaterialId = ov.swap_material_id ?? bom.material_id;
                              const activeMaterial = materials.find(m => m.id === activeMaterialId);
                              return (
                                <div key={bom.material_id} className={`flex items-center gap-1.5 ${isRemoved ? 'opacity-40' : ''}`}>
                                  {/* Material selector */}
                                  <select
                                    value={activeMaterialId}
                                    disabled={isRemoved}
                                    onChange={(e) => updateOverride(key, { swap_material_id: Number(e.target.value) === bom.material_id ? undefined : Number(e.target.value) })}
                                    className="text-xs border rounded px-1 py-1 w-36 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                                  >
                                    {materials
                                      .slice()
                                      .sort((a, b) => a.name.localeCompare(b.name, 'es'))
                                      .map(m => <option key={m.id} value={m.id}>{m.name}</option>)
                                    }
                                  </select>
                                  {/* Qty per unit */}
                                  <input
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    disabled={isRemoved}
                                    value={ov.qty_per_unit ?? bom.qty_per_unit ?? ''}
                                    placeholder={String(bom.qty_per_unit ?? '')}
                                    onChange={(e) => updateOverride(key, { qty_per_unit: e.target.value === '' ? undefined : Number(e.target.value) })}
                                    className="w-14 border rounded px-1 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-400"
                                    title={`${activeMaterial?.unit ?? ''}`}
                                  />
                                  {/* Color */}
                                  <input
                                    type="text"
                                    placeholder="Color"
                                    disabled={isRemoved}
                                    value={ov.color || ''}
                                    onChange={(e) => updateOverride(key, { color: e.target.value })}
                                    className="flex-1 border rounded px-1 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                                  />
                                  {/* Code */}
                                  <input
                                    type="text"
                                    placeholder="Código"
                                    disabled={isRemoved}
                                    value={ov.code || ''}
                                    onChange={(e) => updateOverride(key, { code: e.target.value })}
                                    className="w-20 border rounded px-1 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                                  />
                                  {/* Remove/restore toggle */}
                                  <button
                                    type="button"
                                    onClick={() => isRemoved ? restoreBaseMaterial(key) : removeBaseMaterial(key)}
                                    className={`text-xs px-1.5 py-0.5 rounded border transition ${isRemoved ? 'text-blue-600 border-blue-300 hover:bg-blue-50' : 'text-gray-400 border-gray-200 hover:text-red-500 hover:border-red-300'}`}
                                    title={isRemoved ? 'Restaurar' : 'Quitar de esta cotización'}
                                  >
                                    {isRemoved ? '↩' : '×'}
                                  </button>
                                </div>
                              );
                            })}

                            {/* Extra BOM items */}
                            {extraBom.map((entry, eIdx) => {
                              const mat = materials.find(m => m.id === entry.material_id);
                              return (
                                <div key={eIdx} className="flex items-center gap-1.5 bg-blue-50 rounded px-1 py-0.5">
                                  <select
                                    value={entry.material_id}
                                    onChange={(e) => updateExtra(eIdx, { material_id: Number(e.target.value) })}
                                    className="text-xs border rounded px-1 py-1 w-36 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                                  >
                                    {materials
                                      .slice()
                                      .sort((a, b) => a.name.localeCompare(b.name, 'es'))
                                      .map(m => <option key={m.id} value={m.id}>{m.name}</option>)
                                    }
                                  </select>
                                  <input
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    value={entry.qty_per_unit}
                                    onChange={(e) => updateExtra(eIdx, { qty_per_unit: Number(e.target.value) })}
                                    className="w-14 border rounded px-1 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-400"
                                    title={mat?.unit ?? ''}
                                    placeholder="Qty"
                                  />
                                  <input
                                    type="text"
                                    placeholder="Color"
                                    value={entry.color || ''}
                                    onChange={(e) => updateExtra(eIdx, { color: e.target.value })}
                                    className="flex-1 border rounded px-1 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                                  />
                                  <input
                                    type="text"
                                    placeholder="Código"
                                    value={entry.code || ''}
                                    onChange={(e) => updateExtra(eIdx, { code: e.target.value })}
                                    className="w-20 border rounded px-1 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeExtra(eIdx)}
                                    className="text-xs text-gray-400 border border-gray-200 rounded px-1.5 py-0.5 hover:text-red-500 hover:border-red-300 transition"
                                  >×</button>
                                </div>
                              );
                            })}
                            {/* Inline new material form */}
                            {newMatForm?.itemIdx === idx && (
                              <div className="flex items-center gap-1.5 mt-1 bg-green-50 border border-green-200 rounded px-2 py-1.5">
                                <input
                                  type="text"
                                  autoFocus
                                  placeholder="Nombre del material *"
                                  value={newMatForm.name}
                                  onChange={(e) => setNewMatForm({ ...newMatForm, name: e.target.value })}
                                  onKeyDown={(e) => e.key === 'Enter' && handleCreateMaterial(idx)}
                                  className="flex-1 border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
                                />
                                <input
                                  type="text"
                                  placeholder="Unidad *"
                                  value={newMatForm.unit}
                                  onChange={(e) => setNewMatForm({ ...newMatForm, unit: e.target.value })}
                                  onKeyDown={(e) => e.key === 'Enter' && handleCreateMaterial(idx)}
                                  className="w-16 border rounded px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-green-400"
                                  list="unit-suggestions"
                                />
                                <datalist id="unit-suggestions">
                                  <option value="m" />
                                  <option value="m²" />
                                  <option value="kg" />
                                  <option value="g" />
                                  <option value="und" />
                                  <option value="rollo" />
                                  <option value="yarda" />
                                </datalist>
                                <button
                                  type="button"
                                  disabled={creatingMat || !newMatForm.name.trim() || !newMatForm.unit.trim()}
                                  onClick={() => handleCreateMaterial(idx)}
                                  className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 disabled:opacity-50 transition whitespace-nowrap"
                                >
                                  {creatingMat ? '...' : 'Crear y agregar'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setNewMatForm(null)}
                                  className="text-xs text-gray-400 hover:text-gray-600"
                                >×</button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Per-item design image */}
                    {!isNew && item.id ? (
                      <div className="flex items-center gap-3 pt-1 border-t border-dashed border-gray-200">
                        {item.design_image_path && (
                          <img
                            src={`/api/static/${item.design_image_path}`}
                            alt="Diseño"
                            className="h-12 w-12 object-contain rounded border bg-white"
                          />
                        )}
                        <label className={`flex items-center gap-1.5 px-2 py-1 rounded border text-xs cursor-pointer transition
                          ${uploadingItemImage[item.id] ? 'opacity-60 cursor-not-allowed' : 'hover:bg-white'}`}>
                          {uploadingItemImage[item.id]
                            ? <Loader2 size={12} className="animate-spin" />
                            : <ImageIcon size={12} />}
                          {item.design_image_path ? 'Cambiar imagen' : 'Imagen de diseño'}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={!!uploadingItemImage[item.id]}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file || !item.id) return;
                              setUploadingItemImage((prev) => ({ ...prev, [item.id!]: true }));
                              try {
                                const res = await quotationsApi.uploadItemDesignImage(Number(id), item.id, file);
                                updateItem(idx, { design_image_path: res.design_image_path });
                              } catch (err: any) {
                                alert('Error al subir imagen: ' + (err?.response?.data?.detail || err.message));
                              } finally {
                                setUploadingItemImage((prev) => ({ ...prev, [item.id!]: false }));
                                e.target.value = '';
                              }
                            }}
                          />
                        </label>
                      </div>
                    ) : !isNew ? (
                      <p className="text-xs text-gray-400 pt-1 border-t border-dashed border-gray-200">
                        Guarda la cotización para subir imagen de diseño por referencia
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}

            {/* Grand total */}
            {items.length > 0 && (
              <div className="mt-4 pt-4 border-t flex justify-between text-sm font-semibold text-gray-700">
                <span>Total prendas</span>
                <span className="text-blue-700 text-lg">{grandTotal}</span>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
