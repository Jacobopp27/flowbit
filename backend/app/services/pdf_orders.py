"""
PDF generation service for napsa order documents.

Documents:
  0. Cotización al cliente  → generate_quotation_pdf        (plain, no logos, matches Excel)
  1. Programación de Corte  → generate_cutting_order_pdf
  2. Orden de Compra        → generate_purchase_order_pdf
  3. Ficha de Producción    → generate_production_sheet_pdf
"""

import os
from io import BytesIO
from datetime import date

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph,
    Spacer, HRFlowable, Image as RLImage,
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

# ── Colors ────────────────────────────────────────────────────────────────────
DARK       = colors.HexColor("#1a1a2e")
LIGHT_GRAY = colors.HexColor("#f5f5f5")
MID_GRAY   = colors.HexColor("#cccccc")
BORDER     = colors.HexColor("#999999")
WHITE      = colors.white
BLACK      = colors.black
COND_GRAY  = colors.HexColor("#444444")

W, H = A4
PAGE_MARGIN = 1.8 * cm
CONTENT_W   = W - 2 * PAGE_MARGIN

MONTHS_ES = [
    "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]


# ── Low-level helpers ─────────────────────────────────────────────────────────

def _fmt_cop(val: float) -> str:
    """Format a Colombian peso amount: 1234567 → 1.234.567"""
    return "{:,.0f}".format(val).replace(",", ".")


def _doc(buf, title=""):
    return SimpleDocTemplate(
        buf, pagesize=A4,
        topMargin=PAGE_MARGIN, bottomMargin=PAGE_MARGIN,
        leftMargin=PAGE_MARGIN, rightMargin=PAGE_MARGIN,
        title=title,
    )


def _p(text, size=9, bold=False, align=TA_LEFT, color=BLACK, leading=None):
    """Return a Paragraph with an ad-hoc ParagraphStyle."""
    style = ParagraphStyle(
        "_",
        fontName="Helvetica-Bold" if bold else "Helvetica",
        fontSize=size,
        textColor=color,
        alignment=align,
        leading=leading or max(size * 1.35, size + 2),
        spaceAfter=0,
        spaceBefore=0,
    )
    return Paragraph(text, style)


def _item_qty(item) -> int:
    """Total units for a QuotationItem regardless of has_sizes."""
    if item.has_sizes and item.sizes_breakdown:
        return sum(int(v) for v in item.sizes_breakdown.values())
    return int(item.sizes_breakdown.get("total", 0) if item.sizes_breakdown else 0)


# ── Shared order-document header (Programación / Orden de Compra / Ficha) ────

def _order_header(doc_title: str, quotation, extra_rows=None) -> list:
    """Centered title bar + info table matching the Excel header block."""
    elems = []

    # ---- Title bar (dark background, white text) ----
    t_data = [[_p(doc_title, size=13, bold=True, align=TA_CENTER, color=WHITE)]]
    t_title = Table(t_data, colWidths=[CONTENT_W])
    t_title.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), DARK),
        ("TOPPADDING",    (0, 0), (0, 0), 10),
        ("BOTTOMPADDING", (0, 0), (0, 0), 10),
        ("LEFTPADDING",   (0, 0), (0, 0), 8),
        ("RIGHTPADDING",  (0, 0), (0, 0), 8),
    ]))
    elems.append(t_title)
    elems.append(Spacer(1, 0.3 * cm))

    # ---- Info table ----
    today    = date.today().strftime("%d/%m/%Y")
    delivery = quotation.delivery_date.strftime("%d/%m/%Y") if quotation.delivery_date else "—"
    total_q  = sum(_item_qty(i) for i in quotation.items)
    first_desc = (quotation.items[0].description or "—") if quotation.items else "—"

    label_w = 4.8 * cm
    value_w = CONTENT_W - label_w

    rows = [
        [_p("Fecha",                   bold=True), _p(today)],
        [_p("Cliente",                 bold=True), _p(quotation.client_name.upper())],
        [_p("Tipo de prenda",          bold=True), _p(quotation.event_name or "—")],
        [_p("Descripción de cotización", bold=True),
         _p(first_desc if len(first_desc) < 300 else first_desc[:297] + "…", size=8)],
        [_p("Cantidad",                bold=True), _p(str(total_q))],
    ]
    if extra_rows:
        rows.extend(extra_rows)

    t_info = Table(rows, colWidths=[label_w, value_w])
    t_info.setStyle(TableStyle([
        ("GRID",         (0, 0), (-1, -1), 0.5, BORDER),
        ("BACKGROUND",   (0, 0), (0, -1), LIGHT_GRAY),
        ("TOPPADDING",   (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 4),
        ("LEFTPADDING",  (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("VALIGN",       (0, 0), (-1, -1), "MIDDLE"),
    ]))
    elems.append(t_info)
    elems.append(Spacer(1, 0.4 * cm))
    return elems


# ── Size-breakdown table ──────────────────────────────────────────────────────

# Fixed column order (children then adults, matching the Excel)
CHILD_COLS = ["2", "4", "6", "8", "10", "12"]
ADULT_COLS = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"]
ALL_STD    = CHILD_COLS + ADULT_COLS


def _size_breakdown_table(item) -> list:
    """
    Returns a list of flowables for the size breakdown of a single item.

    - Standard sizes  → wide Género/Talla table with Hombre / Dama / UNISEX rows
    - Custom sizes    → compact key/value table
    - No sizes        → plain qty paragraph
    """
    elems = []
    sizes = item.sizes_breakdown or {}

    if not (item.has_sizes and sizes):
        qty = _item_qty(item)
        elems.append(_p(f"Cantidad: <b>{qty}</b>"))
        return elems

    used_keys = list(sizes.keys())
    is_standard = any(k in ALL_STD for k in used_keys)

    if is_standard:
        # Only show size columns that are actually present in any item
        present = [s for s in ALL_STD if s in sizes]
        cols    = ["Género/Talla"] + present + ["TOTAL"]

        # Dynamic col widths that sum to CONTENT_W
        n_size_cols = len(present)
        label_w = 2.4 * cm
        total_w = 1.4 * cm
        size_w  = (CONTENT_W - label_w - total_w) / max(n_size_cols, 1)
        col_w   = [label_w] + [size_w] * n_size_cols + [total_w]

        def _th(t): return _p(t, size=7, bold=True, align=TA_CENTER, color=WHITE)
        def _td(t): return _p(str(t), size=7, align=TA_CENTER)

        header_row = [_th(c) for c in cols]

        # All sizes go into the UNISEX row
        unisex_vals = [sizes.get(s, "") for s in present]
        unisex_total = sum(int(v) for v in sizes.values())

        def _make_row(label, vals, row_total):
            row = [_p(label, size=7)]
            for v in vals:
                row.append(_td(v) if v != "" else _td(""))
            row.append(_td(row_total) if row_total else _td(""))
            return row

        hombre_row = _make_row("Hombre", [""] * n_size_cols, "")
        dama_row   = _make_row("Dama",   [""] * n_size_cols, "")
        unisex_row = _make_row("UNISEX", unisex_vals, unisex_total)
        total_row  = (
            [_p("Total General", size=7, bold=True)]
            + [_p("", size=7)] * n_size_cols
            + [_p(str(unisex_total), size=7, bold=True, align=TA_CENTER)]
        )

        t = Table(
            [header_row, hombre_row, dama_row, unisex_row, total_row],
            colWidths=col_w,
        )
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0),  DARK),
            ("TEXTCOLOR",  (0, 0), (-1, 0),  WHITE),
            ("FONTNAME",   (0, 0), (-1, 0),  "Helvetica-Bold"),
            ("GRID",       (0, 0), (-1, -1), 0.3, MID_GRAY),
            ("ALIGN",      (1, 0), (-1, -1), "CENTER"),
            ("VALIGN",     (0, 0), (-1, -1), "MIDDLE"),
            ("FONTSIZE",   (0, 0), (-1, -1), 7),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING",(0, 0), (-1, -1), 3),
            ("BACKGROUND", (0, -1), (-1, -1), LIGHT_GRAY),
            ("FONTNAME",   (0, -1), (-1, -1), "Helvetica-Bold"),
        ]))

    else:
        # Custom (non-standard) sizes — simple 2-row table
        header_cells = [_p(k, size=8, bold=True, align=TA_CENTER, color=WHITE) for k in used_keys]
        header_cells.append(_p("TOTAL", size=8, bold=True, align=TA_CENTER, color=WHITE))
        value_cells = [_p(str(sizes[k]), size=8, align=TA_CENTER) for k in used_keys]
        value_cells.append(_p(str(sum(int(v) for v in sizes.values())), size=8, bold=True, align=TA_CENTER))
        col_w = [2.2 * cm] * len(header_cells)

        t = Table([header_cells, value_cells], colWidths=col_w)
        t.setStyle(TableStyle([
            ("BACKGROUND",   (0, 0), (-1, 0),  DARK),
            ("GRID",         (0, 0), (-1, -1), 0.3, MID_GRAY),
            ("ALIGN",        (0, 0), (-1, -1), "CENTER"),
            ("FONTSIZE",     (0, 0), (-1, -1), 8),
            ("TOPPADDING",   (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING",(0, 0), (-1, -1), 4),
        ]))

    elems.append(t)
    return elems


# ── RUTA section ──────────────────────────────────────────────────────────────

def _ruta_section(stages=None) -> list:
    """
    RUTA table: 3 rows × 5 cols — no wrapping text.

    Row 1 (dark header): RUTA | 1 | 2 | 3 | 4
    Row 2 (stage names): PROCESO | CORTE | BORDADO | CONFECCIÓN | EMPAQUE
    Row 3 (dates):       FECHA   | …     | …       | …          | …
    """
    if not stages:
        stages = [
            {"name": "CORTE",      "date": ""},
            {"name": "BORDADO",    "date": ""},
            {"name": "CONFECCIÓN", "date": ""},
            {"name": "EMPAQUE",    "date": ""},
        ]

    n       = min(len(stages), 4)
    label_w = 2.2 * cm
    step_w  = (CONTENT_W - label_w) / n      # ~3.8 cm each for n=4
    col_w   = [label_w] + [step_w] * n

    def _th(t): return _p(t, size=8, bold=True, align=TA_CENTER, color=WHITE)
    def _td(t): return _p(t, size=8, bold=True, align=TA_CENTER)
    def _tv(t): return _p(t, size=8, align=TA_CENTER)

    row_hdr  = [_th("RUTA")]    + [_th(str(i + 1))              for i in range(n)]
    row_name = [_td("PROCESO")] + [_td(stages[i]["name"])       for i in range(n)]
    row_date = [_td("FECHA")]   + [_tv(stages[i].get("date",""))for i in range(n)]

    t = Table([row_hdr, row_name, row_date], colWidths=col_w)
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0),  DARK),
        ("TEXTCOLOR",     (0, 0), (-1, 0),  WHITE),
        ("FONTNAME",      (0, 0), (-1, 0),  "Helvetica-Bold"),
        ("BACKGROUND",    (0, 1), (0, -1),  LIGHT_GRAY),
        ("FONTNAME",      (0, 1), (0, -1),  "Helvetica-Bold"),
        ("GRID",          (0, 0), (-1, -1), 0.4, BORDER),
        ("ALIGN",         (0, 0), (-1, -1), "CENTER"),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("FONTSIZE",      (0, 0), (-1, -1), 8),
        ("TOPPADDING",    (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))

    elems = [Spacer(1, 0.3 * cm), t]
    return elems


# ─────────────────────────────────────────────────────────────────────────────
# 0. Cotización al cliente   (matches exact format of the real napsa PDF)
# ─────────────────────────────────────────────────────────────────────────────

_STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")

NAPSA_TEAL    = colors.HexColor("#007b8a")
NAPSA_RED     = colors.HexColor("#cc2200")
ORANGE        = colors.HexColor("#e67e22")
TABLE_HDR_GRAY = colors.HexColor("#d0d0d0")   # label cell background in order PDFs


def _load_static(filename: str):
    path = os.path.join(_STATIC_DIR, filename)
    return path if os.path.exists(path) else None


def _split_bom(enriched_items: list):
    """Split BOM entries into (fabrics, components) lists."""
    fabrics    = []
    components = []
    for entry in enriched_items:
        for b in entry.get("bom", []):
            cat  = (b.get("category") or "").lower().strip()
            unit = (b.get("unit") or "").lower().strip()
            if cat == "tela" or (not cat and unit in ("mts", "metros", "mt", "m")):
                fabrics.append(b)
            else:
                components.append(b)
    return fabrics, components


def _find_item_bom(item, enriched_items) -> list:
    """Return BOM list for a specific item from enriched_items."""
    if not enriched_items:
        return []
    for entry in enriched_items:
        ei = entry["item"]
        if (hasattr(ei, "id") and hasattr(item, "id") and ei.id == item.id):
            return entry["bom"]
    # Fallback: match by reference
    for entry in enriched_items:
        if entry["item"].reference == item.reference:
            return entry["bom"]
    return []


def _item_design_img(item, quotation=None, width=6.5*cm, height=7.0*cm):
    """Return RLImage for an item's per-reference design image only."""
    img_path = getattr(item, "design_image_path", None)
    if not img_path:
        return None
    full = os.path.join(_STATIC_DIR, img_path)
    return RLImage(full, width=width, height=height) if os.path.exists(full) else None


def _item_info_header(doc_title: str, item, quotation, extra_rows=None) -> list:
    """
    Per-reference page header for all 3 order PDFs:
      - napsa-logo (left) + dark title bar (right)
      - Info table: Fecha / Cliente (bold) / Tipo de prenda = item.reference (RED) /
                    Descripción = item.description / Moldería / Cantidad (this item)
                    [+ extra_rows]
    """
    elems = []

    logo_path = _load_static("napsa-logo.png")
    logo_w    = 3.2 * cm
    title_w   = CONTENT_W - logo_w

    logo_cell = (
        RLImage(logo_path, width=logo_w - 0.4 * cm, height=1.8 * cm)
        if logo_path
        else _p("NAPSA", bold=True, align=TA_CENTER)
    )
    t_hdr = Table([[logo_cell, _p(doc_title, size=13, bold=True, align=TA_CENTER, color=WHITE)]],
                  colWidths=[logo_w, title_w])
    t_hdr.setStyle(TableStyle([
        ("BACKGROUND",    (1, 0), (1, 0), DARK),
        ("VALIGN",        (0, 0), (-1, 0), "MIDDLE"),
        ("ALIGN",         (0, 0), (0, 0), "CENTER"),
        ("TOPPADDING",    (0, 0), (-1, 0), 8),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
        ("LEFTPADDING",   (0, 0), (-1, 0), 4),
        ("RIGHTPADDING",  (0, 0), (-1, 0), 4),
        ("BOX",           (0, 0), (-1, 0), 0.5, BORDER),
    ]))
    elems.append(t_hdr)

    today_str = date.today().strftime("%d/%m/%Y")
    qty       = _item_qty(item)
    desc      = (item.description or "")[:300]
    molderia  = getattr(quotation, "molderia", None) or ""
    label_w   = 4.0 * cm
    value_w   = CONTENT_W - label_w

    info_rows = [
        [_p("Fecha",          bold=True), _p(today_str)],
        [_p("Cliente",        bold=True), _p(quotation.client_name.upper(), bold=True, size=10)],
        [_p("Tipo de prenda", bold=True), _p(item.reference, color=NAPSA_RED)],
        [_p("Descripción",    bold=True), _p(desc, size=8)],
        [_p("Moldería",       bold=True), _p(molderia)],
        [_p("Cantidad",       bold=True), _p(str(qty))],
    ]
    if extra_rows:
        info_rows.extend(extra_rows)

    t_info = Table(info_rows, colWidths=[label_w, value_w])
    t_info.setStyle(TableStyle([
        ("GRID",         (0, 0), (-1, -1), 0.5, BORDER),
        ("BACKGROUND",   (0, 0), (0, -1), TABLE_HDR_GRAY),
        ("TOPPADDING",   (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 4),
        ("LEFTPADDING",  (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("VALIGN",       (0, 0), (-1, -1), "MIDDLE"),
    ]))
    elems.append(t_info)
    return elems


def _telas_section_elems(fabrics: list) -> list:
    """Telas grid + consumo teórico/comprar rows (up to 4 telas, 2 per row)."""
    if not fabrics:
        return []

    fabrics = fabrics[:4]
    n = len(fabrics)
    elems = [Spacer(1, 0.15 * cm)]

    def _tg(t): return _p(t, size=7.5, bold=True, align=TA_CENTER)
    def _tv(t): return _p(str(t), size=7.5)

    lbl_w = 1.6 * cm
    val_w = (CONTENT_W - 4 * lbl_w) / 4
    col_w = [lbl_w, val_w, lbl_w, val_w, lbl_w, val_w, lbl_w, val_w]

    def _blank():
        return [_tg(""), _tv(""), _tg(""), _tv("")]

    grid_rows = []
    for r in range(0, n, 2):
        f1 = fabrics[r]
        f2 = fabrics[r + 1] if r + 1 < n else None
        grid_rows.append(
            [_tg(f"Tela {r+1}"), _tv(f1["material"]), _tg("Ref/Cod"), _tv(f1.get("code") or "")]
            + ([_tg(f"Tela {r+2}"), _tv(f2["material"]), _tg("Ref/Cod"), _tv(f2.get("code") or "")] if f2 else _blank())
        )
        grid_rows.append(
            [_tg(f"Color {r+1}"), _tv(f1.get("color") or ""), _tg("Proveedor"), _tv(f1.get("supplier") or "")]
            + ([_tg(f"Color {r+2}"), _tv(f2.get("color") or ""), _tg("Proveedor"), _tv(f2.get("supplier") or "")] if f2 else _blank())
        )

    t_grid = Table(grid_rows, colWidths=col_w)
    ts = [
        ("GRID",          (0, 0), (-1, -1), 0.4, BORDER),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",    (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING",   (0, 0), (-1, -1), 3),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 3),
    ]
    for col in [0, 2, 4, 6]:
        ts.append(("BACKGROUND", (col, 0), (col, -1), TABLE_HDR_GRAY))
    t_grid.setStyle(TableStyle(ts))
    elems.append(t_grid)

    # Consumo teórico / Comprar
    cons_lbl_w = 3.2 * cm
    pair_w     = (CONTENT_W - cons_lbl_w) / n
    cons_col_w = [cons_lbl_w] + [pair_w * 0.52, pair_w * 0.48] * n

    def _tc(t): return _p(str(t), size=7.5, align=TA_CENTER)

    cons_row = [_tg("Consumo teórico")]
    comp_row = [_tg("Comprar")]
    for i, f in enumerate(fabrics):
        cons_row += [_tg(f"Tela {i+1}"), _tc(f"{float(f.get('qty_per_unit', 0)):.2f}")]
        comp_row += [_tv(f.get("supplier") or f"Tela {i+1}"),
                     _tc(f"{float(f.get('total_qty', 0)):.2f}")]

    t_cons = Table([cons_row, comp_row], colWidths=cons_col_w)
    ts_c = [
        ("GRID",         (0, 0), (-1, -1), 0.4, BORDER),
        ("BACKGROUND",   (0, 0), (0, -1), TABLE_HDR_GRAY),
        ("TOPPADDING",   (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 4),
        ("LEFTPADDING",  (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("VALIGN",       (0, 0), (-1, -1), "MIDDLE"),
    ]
    for ci in range(1, len(cons_col_w), 2):
        ts_c.append(("BACKGROUND", (ci, 0), (ci, 0), TABLE_HDR_GRAY))
    t_cons.setStyle(TableStyle(ts_c))
    elems.append(t_cons)
    return elems


def generate_quotation_pdf(quotation) -> bytes:
    """
    Client-facing quotation PDF matching the real napsa PDF format:
      - Header image (blue water banner + logo) within normal content margins
      - Date (capitalized month), greeting, client name (large bold), contact (teal bold)
      - Items table with LIGHT GRAY header + black text (matching real napsa PDF)
      - CONDICIONES (with orange highlight for delivery time)
      - Authorization paragraph (bold)
      - Atentamente + signature image + closing
      - Footer image (has contact info embedded)
    """
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        topMargin=1.8 * cm, bottomMargin=1.5 * cm,
        leftMargin=1.8 * cm, rightMargin=1.8 * cm,
        title=quotation.number,
    )
    PAGE_W = A4[0] - 3.6 * cm   # usable content width

    elems = []

    # ── Header image ──────────────────────────────────────────────────────────
    header_path = _load_static("napsa-header.jpg")
    footer_path = _load_static("napsa-footer.jpg")
    sig_path    = _load_static("napsa-signature.jpg")

    if header_path:
        elems.append(RLImage(header_path, width=PAGE_W, height=3.2 * cm))
    else:
        fb = Table([[_p("NAPSA", size=16, bold=True, align=TA_CENTER, color=WHITE)]],
                   colWidths=[PAGE_W])
        fb.setStyle(TableStyle([
            ("BACKGROUND",   (0, 0), (0, 0), DARK),
            ("TOPPADDING",   (0, 0), (0, 0), 14),
            ("BOTTOMPADDING",(0, 0), (0, 0), 14),
        ]))
        elems.append(fb)

    elems.append(Spacer(1, 0.5 * cm))

    # ── Date ──────────────────────────────────────────────────────────────────
    today = date.today()
    elems.append(_p(
        f"Medellín, {today.day} de {MONTHS_ES[today.month]} de {today.year}",
        size=10,
    ))
    elems.append(Spacer(1, 0.4 * cm))

    # ── Greeting + client ─────────────────────────────────────────────────────
    elems.append(_p("Señores:", size=10))
    elems.append(Spacer(1, 0.05 * cm))
    elems.append(_p(quotation.client_name.upper(), size=16, bold=True, color=DARK))

    contact_parts = [p for p in [quotation.client_phone, quotation.client_contact] if p]
    if contact_parts:
        elems.append(_p(
            "  ".join(contact_parts),
            size=11, bold=True, color=NAPSA_TEAL,
        ))
    if quotation.event_name:
        elems.append(_p(quotation.event_name, size=10))

    elems.append(Spacer(1, 0.6 * cm))

    # ── Intro ─────────────────────────────────────────────────────────────────
    intro_s = ParagraphStyle("intro", fontName="Helvetica", fontSize=9, leading=13)
    elems.append(Paragraph(
        "De acuerdo a su amable solicitud, le estamos cotizando los siguientes productos:",
        intro_s,
    ))
    elems.append(Paragraph(
        "Le solicitamos leer atentamente las notas al final de esta cotización.",
        intro_s,
    ))
    elems.append(Spacer(1, 0.1 * cm))

    # ── Items table ───────────────────────────────────────────────────────────
    # Col widths: REF | DESCRIPCIÓN | CANTIDAD | V/L UNITARIO $ | TOTAL $
    # Sum = PAGE_W ≈ 17.4 cm
    col_w = [1.8 * cm, 7.7 * cm, 2.0 * cm, 3.1 * cm, 2.8 * cm]

    TABLE_HDR_BG = colors.HexColor("#d0d0d0")   # light gray — matches real napsa PDF

    def _th(t):
        return Paragraph(f"<b>{t}</b>",
                         ParagraphStyle("th", fontName="Helvetica-Bold", fontSize=8,
                                        textColor=BLACK, alignment=TA_CENTER, leading=11))

    hdr = [_th("REF"), _th("DESCRIPCIÓN"), _th("CANTIDAD"),
           _th("V/L UNITARIO $"), _th("TOTAL $")]

    rows     = [hdr]
    subtotal = 0.0
    total_qty = 0

    cell_s = ParagraphStyle("cell", fontName="Helvetica", fontSize=9, leading=13)
    ref_s  = ParagraphStyle("ref",  fontName="Helvetica", fontSize=9, alignment=TA_LEFT,   leading=13)
    qty_s  = ParagraphStyle("qty",  fontName="Helvetica", fontSize=9, alignment=TA_CENTER, leading=13)
    up_s   = ParagraphStyle("up",   fontName="Helvetica", fontSize=9, alignment=TA_RIGHT,  leading=13)
    tot_s  = ParagraphStyle("tot",  fontName="Helvetica", fontSize=9, alignment=TA_RIGHT,  leading=13)

    for item in sorted(quotation.items, key=lambda x: x.order):
        qty      = _item_qty(item)
        total_qty += qty
        unit_p   = float(item.unit_price) if item.unit_price else 0.0
        line_t   = qty * unit_p
        subtotal += line_t

        rows.append([
            Paragraph(str(item.reference),              ref_s),
            Paragraph(item.description or item.reference, cell_s),
            Paragraph(str(qty),                         qty_s),
            Paragraph(f"$ {_fmt_cop(unit_p)}",          up_s),
            Paragraph(f"$ {_fmt_cop(line_t)}",          tot_s),
        ])

    # ── Financial rows ────────────────────────────────────────────────────────
    iva_rate    = float(quotation.iva_rate)  if quotation.iva_rate  else 0.0
    discount    = float(quotation.discount)  if quotation.discount  else 0.0
    extra_spans = []

    def _bold_right(t, size=9):
        return Paragraph(t, ParagraphStyle("br", fontName="Helvetica-Bold", fontSize=size,
                                           alignment=TA_RIGHT, leading=13))
    def _reg_right(t, size=9):
        return Paragraph(t, ParagraphStyle("rr", fontName="Helvetica", fontSize=size,
                                           alignment=TA_RIGHT, leading=13))
    def _center_p(t, size=9, bold=False):
        return Paragraph(t, ParagraphStyle("ct",
                                           fontName="Helvetica-Bold" if bold else "Helvetica",
                                           fontSize=size, alignment=TA_CENTER, leading=13))
    _empty = Paragraph("", ParagraphStyle("e", fontSize=7))

    if iva_rate > 0:
        iva_amt  = subtotal * iva_rate
        total    = subtotal + iva_amt - discount

        bank_idx = len(rows)
        rows.append([
            Paragraph("Favor consignar en Bancolombia a nombre de Posada Atehortua S.A "
                      "cta corriente 01740361528",
                      ParagraphStyle("bk", fontName="Helvetica", fontSize=7.5, leading=11)),
            _empty, _empty,
            _bold_right("Subtotal:"),
            _reg_right(f"$ {_fmt_cop(subtotal)}"),
        ])
        extra_spans.append(("SPAN", (0, bank_idx), (2, bank_idx)))

        iva_idx = len(rows)
        rows.append([_empty, _empty, _empty,
                     _reg_right(f"IVA {int(round(iva_rate * 100))}%:"),
                     _reg_right(f"$ {_fmt_cop(iva_amt)}")])
        extra_spans.append(("SPAN", (0, iva_idx), (2, iva_idx)))

        if discount > 0:
            disc_idx = len(rows)
            rows.append([_empty, _empty, _empty,
                         _reg_right("Descuento:"),
                         _reg_right(f"- $ {_fmt_cop(discount)}")])
            extra_spans.append(("SPAN", (0, disc_idx), (2, disc_idx)))

        tot_idx = len(rows)
        rows.append([
            _empty, _empty,
            _center_p(str(total_qty)),
            _bold_right("TOTAL COTIZADO:"),
            _bold_right(f"$ {_fmt_cop(total)}", size=10),
        ])
        extra_spans.append(("SPAN", (0, tot_idx), (1, tot_idx)))

    else:
        total   = subtotal - discount
        tot_idx = len(rows)
        rows.append([
            _empty, _empty,
            _center_p(str(total_qty)),
            _bold_right("TOTAL COTIZADO:"),
            _bold_right(f"$ {_fmt_cop(total)}", size=10),
        ])

    ts = [
        # Header row: light gray bg, black bold text
        ("BACKGROUND",    (0, 0),  (-1, 0),        TABLE_HDR_BG),
        ("FONTNAME",      (0, 0),  (-1, 0),        "Helvetica-Bold"),
        # All cells
        ("GRID",          (0, 0),  (-1, -1),        0.4, MID_GRAY),
        ("BACKGROUND",    (0, 1),  (-1, tot_idx - 1), WHITE),
        ("VALIGN",        (0, 0),  (-1, -1),        "MIDDLE"),
        ("TOPPADDING",    (0, 0),  (-1, -1),        6),
        ("BOTTOMPADDING", (0, 0),  (-1, -1),        6),
        ("LEFTPADDING",   (0, 0),  (-1, -1),        5),
        ("RIGHTPADDING",  (0, 0),  (-1, -1),        5),
        # Column alignment
        ("ALIGN",         (0, 0),  (0, -1),         "LEFT"),    # REF
        ("ALIGN",         (1, 0),  (1, -1),         "LEFT"),    # DESC
        ("ALIGN",         (2, 0),  (2, -1),         "CENTER"),  # CANTIDAD
        ("ALIGN",         (3, 0),  (4, -1),         "RIGHT"),   # prices
        # Total row: light gray bg + bold
        ("BACKGROUND",    (0, tot_idx), (-1, tot_idx), TABLE_HDR_BG),
        ("FONTNAME",      (3, tot_idx), (-1, tot_idx), "Helvetica-Bold"),
    ]
    ts.extend(extra_spans)

    items_t = Table(rows, colWidths=col_w)
    items_t.setStyle(TableStyle(ts))
    elems.append(items_t)
    elems.append(Spacer(1, 0.5 * cm))

    # ── CONDICIONES ───────────────────────────────────────────────────────────
    cond_s = ParagraphStyle(
        "cond", fontName="Helvetica", fontSize=9, leading=14, textColor=BLACK,
    )
    elems.append(Paragraph("<b>CONDICIONES</b>", cond_s))
    elems.append(Spacer(1, 0.1 * cm))

    payment = quotation.payment_conditions or "50% anticipo y saldo contra entrega"
    conditions = [
        "* Esta cotización esta sujeta a la variación de precio, si la cantidades cotizadas cambian.",
        "* En esta modalidad, el diseño se elabora de manera EXCLUSIVA para su Empresa, de acuerdo "
        "a los colores y logos que usted elija y apruebe.",
        "* Validez de la Cotización: 15 Días Calendario",
        "* Cantidad mínima por item: 15 unidades",
        (
            "* Fecha de Entrega: La fecha de entrega del pedido le será informada, una vez usted "
            "apruebe la propuesta de diseño, sean entregadas las tallas y realizado el anticipo del "
            "50% según sea acordado, momento en el cuál comienza el proceso productivo "
            "<font color='#e67e22'>(son 30 a 40 días hábiles dependiendo de la disponibilidad "
            "de telas e insumos)</font>."
        ),
        f"* Forma de pago:  {payment}",
        "* Toda compra deberá estar acompañada por una orden por escrito",
    ]
    if quotation.observations:
        conditions.append(f"* {quotation.observations}")

    for c in conditions:
        elems.append(Paragraph(c, cond_s))
        elems.append(Spacer(1, 0.07 * cm))

    elems.append(Spacer(1, 0.35 * cm))

    # ── Authorization ─────────────────────────────────────────────────────────
    auth_s = ParagraphStyle("auth", fontName="Helvetica-Bold", fontSize=9, leading=14)
    elems.append(Paragraph(
        "FAVOR DILIGENCIAR Y FIRMAR: Yo ____________________________________________ certifico que "
        "tengo plena autorizacion por parte de las diferentes Empresas para usar sus logos y "
        "garantizo que en caso de suministrar el diseño es de mi entera autoria. Con esto eximo a "
        "napsa de cualquier reponsabilidad con el uso de logos y de diseños.",
        auth_s,
    ))
    elems.append(Spacer(1, 0.35 * cm))

    # ── Closing ───────────────────────────────────────────────────────────────
    close_s = ParagraphStyle("close", fontName="Helvetica-Bold", fontSize=10, leading=14)
    elems.append(Paragraph("Atentamente,", close_s))
    elems.append(Spacer(1, 0.3 * cm))

    # Signature image (if available)
    if sig_path:
        elems.append(RLImage(sig_path, width=4.5 * cm, height=1.5 * cm))
    else:
        elems.append(Spacer(1, 1.4 * cm))

    sig_s = ParagraphStyle("sig", fontName="Helvetica-Bold", fontSize=10, leading=14)
    reg_s = ParagraphStyle("reg", fontName="Helvetica",      fontSize=10, leading=14)
    elems.append(Paragraph("Juan Carlos Posada A.", sig_s))
    elems.append(Paragraph("Gerente Comercial",     sig_s))
    elems.append(Paragraph("NAPSA S.A",             reg_s))
    elems.append(Paragraph("Tel. 604 5574570",      reg_s))
    elems.append(Paragraph("Cel 310 895 65 87",     reg_s))
    elems.append(Spacer(1, 0.5 * cm))

    # ── Footer image (has address/contact info embedded) ──────────────────────
    if footer_path:
        elems.append(RLImage(footer_path, width=PAGE_W, height=2.2 * cm))
    elif header_path:
        elems.append(RLImage(header_path, width=PAGE_W, height=2.2 * cm))

    doc.build(elems)
    return buf.getvalue()


# ─────────────────────────────────────────────────────────────────────────────
# 1. Programación de Corte  — one page per reference
# ─────────────────────────────────────────────────────────────────────────────

def generate_cutting_order_pdf(quotation, stages=None, enriched_items=None) -> bytes:
    """One page per reference: header → telas → design+notes → sizes → RUTA."""
    from reportlab.platypus import PageBreak
    buf   = BytesIO()
    doc   = _doc(buf, title=f"OC-{quotation.number}")
    elems = []

    for idx, item in enumerate(sorted(quotation.items, key=lambda x: x.order)):
        if idx > 0:
            elems.append(PageBreak())

        elems.extend(_item_info_header("PROGRAMACIÓN DE CORTE", item, quotation))

        item_bom = _find_item_bom(item, enriched_items)
        fabrics, _ = _split_bom([{"item": item, "bom": item_bom}])
        elems.extend(_telas_section_elems(fabrics))

        # Design image (left) + notes (right)
        design_img = _item_design_img(item, quotation)
        notes = item.notes or ""
        if quotation.observations:
            notes += ("\n" if notes else "") + quotation.observations
        if design_img or notes:
            elems.append(Spacer(1, 0.15 * cm))
            img_w = CONTENT_W * 0.45
            txt_w = CONTENT_W - img_w
            img_cell  = design_img if design_img else _p("(sin imagen)", size=8, align=TA_CENTER)
            text_cell = _p(notes, size=8, leading=12) if notes else _p("", size=8)
            t_design = Table([[img_cell, text_cell]], colWidths=[img_w, txt_w])
            t_design.setStyle(TableStyle([
                ("BOX",           (0, 0), (-1, -1), 0.4, BORDER),
                ("INNERGRID",     (0, 0), (-1, -1), 0.3, MID_GRAY),
                ("VALIGN",        (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING",    (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING",   (0, 0), (-1, -1), 4),
                ("RIGHTPADDING",  (0, 0), (-1, -1), 4),
            ]))
            elems.append(t_design)

        elems.append(Spacer(1, 0.2 * cm))
        elems.extend(_size_breakdown_table(item))
        elems.append(Spacer(1, 0.2 * cm))
        elems.extend(_ruta_section(stages))

    doc.build(elems)
    return buf.getvalue()


# ─────────────────────────────────────────────────────────────────────────────
# 2. Orden de Compra  — one page per reference
# ─────────────────────────────────────────────────────────────────────────────

def generate_purchase_order_pdf(quotation, enriched_items: list) -> bytes:
    """One page per reference: header → dibujo → COMPONENTES → TELAS."""
    from reportlab.platypus import PageBreak
    buf   = BytesIO()
    doc   = _doc(buf, title=f"OCP-{quotation.number}")
    elems = []

    def _th(t): return _p(t, size=7, bold=True, align=TA_CENTER, color=WHITE)
    def _tc(t): return _p(str(t), size=7, align=TA_CENTER)
    def _tl(t): return _p(str(t), size=7)

    for idx, item in enumerate(sorted(quotation.items, key=lambda x: x.order)):
        if idx > 0:
            elems.append(PageBreak())

        elems.extend(_item_info_header("ORDEN DE COMPRA", item, quotation))

        # ── Dibujo (compact design image) ────────────────────────────────────
        design_img = _item_design_img(item, quotation, width=5.0 * cm, height=4.5 * cm)
        if design_img:
            elems.append(Spacer(1, 0.1 * cm))
            dib_label_w = 1.8 * cm
            dib_img_w   = CONTENT_W - dib_label_w
            t_dib = Table(
                [[_p("Dibujo", size=8, bold=True), design_img]],
                colWidths=[dib_label_w, dib_img_w],
            )
            t_dib.setStyle(TableStyle([
                ("BOX",           (0, 0), (-1, -1), 0.5, BORDER),
                ("INNERGRID",     (0, 0), (-1, -1), 0.3, MID_GRAY),
                ("BACKGROUND",    (0, 0), (0, 0),   TABLE_HDR_GRAY),
                ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING",    (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING",   (0, 0), (-1, -1), 4),
                ("RIGHTPADDING",  (0, 0), (-1, -1), 4),
            ]))
            elems.append(t_dib)

        elems.append(Spacer(1, 0.2 * cm))

        item_bom = _find_item_bom(item, enriched_items)
        all_fabrics, all_components = _split_bom([{"item": item, "bom": item_bom}])

        # ── COMPONENTES ──────────────────────────────────────────────────────
        elems.append(Table([[_p("COMPONENTES", size=8, bold=True, color=WHITE)]],
                           colWidths=[CONTENT_W]))
        elems[-1].setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),DARK),
                                       ("TOPPADDING",(0,0),(-1,-1),5),("BOTTOMPADDING",(0,0),(-1,-1),5),
                                       ("LEFTPADDING",(0,0),(-1,-1),6)]))

        comp_hdrs = ["#", "INSUMO/PROCESO", "MEDIDA", "CANTIDAD", "COLOR", "TOTAL", "OBSERVACION", "PROVEEDOR", "APROBACIÓN"]
        comp_col_w = [0.6*cm, 4.5*cm, 1.5*cm, 1.7*cm, 1.5*cm, 1.4*cm, 2.2*cm, 2.2*cm, 1.8*cm]

        comp_rows = [[_th(h) for h in comp_hdrs]]
        for j in range(max(len(all_components), 5)):
            if j < len(all_components):
                b = all_components[j]
                comp_rows.append([_tc(j+1), _tl(b["material"]),
                                   _tc(b.get("unit","")),
                                   _tc(f"{float(b.get('qty_per_unit',0)):.2f}"),
                                   _tc(b.get("color") or ""), _tc(f"{float(b.get('total_qty',0)):.2f}"),
                                   _tc(b.get("code") or ""), _tl(b.get("supplier") or ""), _tc("")])
            else:
                comp_rows.append([_tc(j+1)] + [_tl("") if k==1 else _tc("") for k in range(8)])

        t_comp = Table(comp_rows, colWidths=comp_col_w)
        t_comp.setStyle(TableStyle([
            ("BACKGROUND",(0,0),(-1,0),DARK),("GRID",(0,0),(-1,-1),0.3,MID_GRAY),
            ("ROWBACKGROUNDS",(0,1),(-1,-1),[WHITE,LIGHT_GRAY]),
            ("TOPPADDING",(0,0),(-1,-1),3),("BOTTOMPADDING",(0,0),(-1,-1),3),
            ("LEFTPADDING",(0,0),(-1,-1),3),("RIGHTPADDING",(0,0),(-1,-1),3),
            ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
        ]))
        elems.append(t_comp)
        elems.append(Spacer(1, 0.3 * cm))

        # ── TELAS ─────────────────────────────────────────────────────────────
        elems.append(Table([[_p("TELAS", size=8, bold=True, color=WHITE)]],
                           colWidths=[CONTENT_W]))
        elems[-1].setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),DARK),
                                       ("TOPPADDING",(0,0),(-1,-1),5),("BOTTOMPADDING",(0,0),(-1,-1),5),
                                       ("LEFTPADDING",(0,0),(-1,-1),6)]))

        tela_hdrs = ["#", "TELA", "REFERENCIA", "CODIGO", "COLOR", "PROMEDIO", "TOTAL", "PROVEEDOR", "OBSERVACION"]
        tela_col_w = [0.6*cm, 1.8*cm, 2.6*cm, 1.4*cm, 1.6*cm, 1.8*cm, 1.4*cm, 2.4*cm, 3.8*cm]

        tela_rows = [[_th(h) for h in tela_hdrs]]
        for j in range(max(len(all_fabrics), 4)):
            if j < len(all_fabrics):
                f = all_fabrics[j]
                tela_rows.append([_tc(j+1), _tl(f"TELA {j+1}"), _tl(f["material"]),
                                   _tc(f.get("code") or ""), _tc(f.get("color") or ""),
                                   _tc(f"{float(f.get('qty_per_unit',0)):.2f}"),
                                   _tc(f"{float(f.get('total_qty',0)):.2f}"),
                                   _tl(f.get("supplier") or ""), _tc("")])
            else:
                tela_rows.append([_tc(j+1)] + [_tl("") if k in (1,2,7) else _tc("") for k in range(8)])

        t_tela = Table(tela_rows, colWidths=tela_col_w)
        t_tela.setStyle(TableStyle([
            ("BACKGROUND",(0,0),(-1,0),DARK),("GRID",(0,0),(-1,-1),0.3,MID_GRAY),
            ("ROWBACKGROUNDS",(0,1),(-1,-1),[WHITE,LIGHT_GRAY]),
            ("TOPPADDING",(0,0),(-1,-1),3),("BOTTOMPADDING",(0,0),(-1,-1),3),
            ("LEFTPADDING",(0,0),(-1,-1),3),("RIGHTPADDING",(0,0),(-1,-1),3),
            ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
        ]))
        elems.append(t_tela)

    doc.build(elems)
    return buf.getvalue()


# ─────────────────────────────────────────────────────────────────────────────
# 3. Ficha de Producción  — one page per reference
# ─────────────────────────────────────────────────────────────────────────────

def generate_production_sheet_pdf(
    quotation,
    tailor_name: str = "",
    tailor_price: float = 0,
    stages=None,
    enriched_items=None,
) -> bytes:
    """One page per reference: header → design+insumos → sizes → RUTA → clauses."""
    from reportlab.platypus import PageBreak
    buf = BytesIO()
    doc = _doc(buf, title=f"FP-{quotation.number}")
    elems = []

    def _th(t): return _p(t, size=7, bold=True, align=TA_CENTER, color=WHITE)
    def _tc(t): return _p(str(t), size=7, align=TA_CENTER)
    def _tl(t): return _p(str(t), size=7)

    delivery = quotation.delivery_date.strftime("%d/%m/%Y") if quotation.delivery_date else ""

    ins_style = TableStyle([
        ("BACKGROUND",(0,0),(-1,0),DARK),("GRID",(0,0),(-1,-1),0.3,MID_GRAY),
        ("ROWBACKGROUNDS",(0,1),(-1,-1),[WHITE,LIGHT_GRAY]),
        ("TOPPADDING",(0,0),(-1,-1),3),("BOTTOMPADDING",(0,0),(-1,-1),3),
        ("LEFTPADDING",(0,0),(-1,-1),2),("RIGHTPADDING",(0,0),(-1,-1),2),
        ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
    ])
    ins_hdrs = ["#", "INSUMOS/PROCESO", "MEDIDA", "CANT", "COLOR", "TOTAL", "OBSERVACIONES", "PROVEEDOR"]

    for idx, item in enumerate(sorted(quotation.items, key=lambda x: x.order)):
        if idx > 0:
            elems.append(PageBreak())

        extra_rows = [
            [_p("Confeccionista",    bold=True), _p(tailor_name or "")],
            [_p("Precio confección", bold=True), _p(f"$ {_fmt_cop(tailor_price)}" if tailor_price else "")],
            [_p("Fecha de entrega",  bold=True), _p(delivery)],
        ]
        elems.extend(_item_info_header("FICHA DE PRODUCCIÓN", item, quotation, extra_rows=extra_rows))

        item_bom = _find_item_bom(item, enriched_items)
        all_fabrics, all_components = _split_bom([{"item": item, "bom": item_bom}])

        # ── Design image (left ~38%) + INSUMOS table (right ~62%) ────────────
        design_img = _item_design_img(item, quotation)
        elems.append(Spacer(1, 0.15 * cm))

        def _ins_rows(n_min, col_list):
            rows = [[_th(h) for h in ins_hdrs]]
            for j in range(max(len(all_components), n_min)):
                if j < len(all_components):
                    b = all_components[j]
                    rows.append([_tc(j+1), _tl(b["material"]),
                                  _tc(b.get("unit","")),
                                  _tc(f"{float(b.get('qty_per_unit',0)):.2f}"),
                                  _tc(b.get("color") or ""), _tc(f"{float(b.get('total_qty',0)):.2f}"),
                                  _tc(b.get("code") or ""), _tl(b.get("supplier") or "")])
                else:
                    rows.append([_tc(j+1)] + [_tl("") if k in (1,7) else _tc("") for k in range(7)])
            t = Table(rows, colWidths=col_list)
            t.setStyle(ins_style)
            return t

        if design_img:
            img_w = CONTENT_W * 0.38
            ins_w = CONTENT_W - img_w
            t_ins = _ins_rows(7, [0.5*cm, 2.5*cm, 1.0*cm, 0.9*cm, 1.0*cm, 1.0*cm, 1.8*cm, 2.3*cm])
            t_layout = Table([[design_img, t_ins]], colWidths=[img_w, ins_w])
            t_layout.setStyle(TableStyle([
                ("BOX",(0,0),(-1,-1),0.4,BORDER),("INNERGRID",(0,0),(-1,-1),0.3,MID_GRAY),
                ("VALIGN",(0,0),(-1,-1),"TOP"),
                ("TOPPADDING",(0,0),(0,-1),4),("BOTTOMPADDING",(0,0),(0,-1),4),
                ("LEFTPADDING",(0,0),(0,-1),4),("RIGHTPADDING",(0,0),(0,-1),4),
            ]))
            elems.append(t_layout)
        else:
            elems.append(_ins_rows(7, [0.6*cm, 4.2*cm, 1.5*cm, 1.2*cm, 1.5*cm, 1.3*cm, 3.0*cm, 4.1*cm]))

        elems.append(Spacer(1, 0.25 * cm))
        elems.extend(_size_breakdown_table(item))
        elems.append(Spacer(1, 0.2 * cm))
        elems.extend(_ruta_section(stages))
        elems.append(Spacer(1, 0.3 * cm))

        clause_s = ParagraphStyle("clause", fontName="Helvetica", fontSize=7.5, leading=11,
                                  textColor=colors.HexColor("#333333"))
        elems.append(Paragraph(
            "IMPORTANTE: La Marquilla talla es suministrada por el confeccionista igual que los insumos "
            "de terminacion (Plastiflechas, Cinta bolsas)<br/>"
            "* La factura debe especificar cantidad, valor unitario, valor total, Cliente, tipo de prenda<br/>"
            "* Cuenta con 48 horas para reportar faltantes en piezas e insumos, de no ser así el "
            "confeccionista debe asumir el costo y envío nuevamente de estos<br/>"
            "* Incentivo: Si el confeccionista entrega 2 días antes de la fecha pactada en la ficha de "
            "producción se aumentará un 3% al valor total del precio negociado por referencia<br/>"
            "* Cláusula: Si el confeccionista no cumple con la fecha de entrega que se pacta en la ficha "
            "de producción se descontará un 3% del valor total de la factura como penalidad.",
            clause_s,
        ))
        elems.append(Spacer(1, 0.25 * cm))
        elems.append(_p("<b>Terminación:</b>", size=8))
        for t_line in ["* ETIQUETA: Ubicar visible con adhesivo de talla",
                       "* Pulir interna y externamente de manera que no queden hilos en la prenda",
                       "* La entrega de la producción se hace en paquetes por talla y referencia"]:
            elems.append(_p(t_line, size=7.5, leading=11))
        elems.append(Spacer(1, 0.15 * cm))
        elems.append(_p("<b>Normas de Calidad:</b>", size=8))
        elems.append(_p(
            "* No manchas, no picas o roto, no contaminada, bien pulida, al asiento, no estirada, "
            "uniones sin escalas, terminaciones planas, case de costuras correcto, prenda con simetría",
            size=7.5, leading=11,
        ))
        elems.append(Spacer(1, 1.0 * cm))
        sig_rows = [
            [_p("_________________________________"), _p("_________________________________")],
            [_p("Napsa – Producción", size=8),        _p(tailor_name or "Confeccionista", size=8)],
        ]
        sig_t = Table(sig_rows, colWidths=[CONTENT_W / 2, CONTENT_W / 2])
        sig_t.setStyle(TableStyle([("ALIGN",(0,0),(-1,-1),"CENTER"),("TOPPADDING",(0,0),(-1,-1),4)]))
        elems.append(sig_t)

    doc.build(elems)
    return buf.getvalue()
