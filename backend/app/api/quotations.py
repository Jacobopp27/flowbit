from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import io
import os
import uuid

from app.database import get_db
from app.models.user import User
from app.models.quotation import Quotation, QuotationItem, QuotationStatus
from app.models.stage import Product, ProductBOMItem, Material, Supplier, Stage, StageStatus
from app.models.project import (
    Project, ProjectStage, ProjectProduct,
    ProjectMaterialRequirement, ProjectStageDependency
)
from app.models.template import ProjectTemplate, ProjectTemplateStage, ProjectTemplateStageDependency
from app.schemas.quotation import (
    QuotationCreate, QuotationUpdate, QuotationStatusUpdate,
    QuotationOut, QuotationListItem, QuotationItemOut,
    GenerateOrdersRequest, GenerateOrdersResponse,
)
from app.api.auth import check_admin_or_company_admin

router = APIRouter()


# ── Helpers ────────────────────────────────────────────────────────────────────

def _next_quotation_number(db: Session, company_id: int) -> str:
    count = db.query(Quotation).filter(Quotation.company_id == company_id).count()
    return f"COT-{(count + 1):03d}"


def _quotation_to_out(q: Quotation, db: Session) -> QuotationOut:
    items = []
    for it in q.items:
        product_name = None
        if it.product_id:
            p = db.query(Product).filter(Product.id == it.product_id).first()
            product_name = p.name if p else None
        items.append(QuotationItemOut(
            id=it.id,
            quotation_id=it.quotation_id,
            product_id=it.product_id,
            reference=it.reference,
            description=it.description,
            has_sizes=it.has_sizes,
            sizes_breakdown=it.sizes_breakdown or {},
            unit_price=float(it.unit_price) if it.unit_price else None,
            notes=it.notes,
            order=it.order,
            product_name=product_name,
            design_image_path=it.design_image_path,
            material_overrides=it.material_overrides,
        ))

    project_id = None
    if q.projects:
        project_id = q.projects[0].id

    return QuotationOut(
        id=q.id,
        number=q.number,
        status=q.status,
        client_name=q.client_name,
        client_nit=q.client_nit,
        client_contact=q.client_contact,
        client_phone=q.client_phone,
        client_email=q.client_email,
        event_name=q.event_name,
        delivery_date=q.delivery_date,
        iva_rate=float(q.iva_rate) if q.iva_rate else 0.19,
        discount=float(q.discount) if q.discount else 0,
        gift_note=q.gift_note,
        observations=q.observations,
        payment_conditions=q.payment_conditions,
        molderia=q.molderia,
        design_image_path=q.design_image_path,
        items=items,
        created_at=q.created_at,
        updated_at=q.updated_at,
        project_id=project_id,
    )


# ── CRUD ───────────────────────────────────────────────────────────────────────

@router.get("/", response_model=List[QuotationListItem])
def list_quotations(
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_or_company_admin),
):
    if not current_user.company_id:
        raise HTTPException(status_code=403, detail="Admin must belong to a company")

    quotations = (
        db.query(Quotation)
        .filter(Quotation.company_id == current_user.company_id)
        .order_by(Quotation.created_at.desc())
        .all()
    )

    result = []
    for q in quotations:
        project_id = q.projects[0].id if q.projects else None
        result.append(QuotationListItem(
            id=q.id,
            number=q.number,
            status=q.status,
            client_name=q.client_name,
            event_name=q.event_name,
            delivery_date=q.delivery_date,
            total_items=len(q.items),
            created_at=q.created_at,
            project_id=project_id,
        ))
    return result


@router.post("/", response_model=QuotationOut, status_code=201)
def create_quotation(
    payload: QuotationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_or_company_admin),
):
    if not current_user.company_id:
        raise HTTPException(status_code=403, detail="Admin must belong to a company")

    quotation = Quotation(
        company_id=current_user.company_id,
        number=_next_quotation_number(db, current_user.company_id),
        client_name=payload.client_name,
        client_nit=payload.client_nit,
        client_contact=payload.client_contact,
        client_phone=payload.client_phone,
        client_email=payload.client_email,
        event_name=payload.event_name,
        delivery_date=payload.delivery_date,
        iva_rate=payload.iva_rate,
        discount=payload.discount,
        gift_note=payload.gift_note,
        observations=payload.observations,
        payment_conditions=payload.payment_conditions,
        molderia=payload.molderia,
    )
    db.add(quotation)
    db.flush()

    for idx, it in enumerate(payload.items):
        item = QuotationItem(
            quotation_id=quotation.id,
            product_id=it.product_id,
            reference=it.reference,
            description=it.description,
            has_sizes=it.has_sizes,
            sizes_breakdown=it.sizes_breakdown,
            unit_price=it.unit_price,
            notes=it.notes,
            order=it.order if it.order is not None else idx,
            material_overrides=it.material_overrides,
        )
        db.add(item)

    db.commit()
    db.refresh(quotation)
    return _quotation_to_out(quotation, db)


@router.get("/{quotation_id}", response_model=QuotationOut)
def get_quotation(
    quotation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_or_company_admin),
):
    q = db.query(Quotation).filter(
        Quotation.id == quotation_id,
        Quotation.company_id == current_user.company_id,
    ).first()
    if not q:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")
    return _quotation_to_out(q, db)


@router.put("/{quotation_id}", response_model=QuotationOut)
def update_quotation(
    quotation_id: int,
    payload: QuotationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_or_company_admin),
):
    q = db.query(Quotation).filter(
        Quotation.id == quotation_id,
        Quotation.company_id == current_user.company_id,
    ).first()
    if not q:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")

    for field, value in payload.model_dump(exclude_none=True, exclude={"items"}).items():
        setattr(q, field, value)

    if payload.items is not None:
        # Delete existing items and replace, preserving design_image_path
        db.query(QuotationItem).filter(QuotationItem.quotation_id == q.id).delete()
        for idx, it in enumerate(payload.items):
            item = QuotationItem(
                quotation_id=q.id,
                product_id=it.product_id,
                reference=it.reference,
                description=it.description,
                has_sizes=it.has_sizes,
                sizes_breakdown=it.sizes_breakdown,
                unit_price=it.unit_price,
                notes=it.notes,
                order=it.order if it.order is not None else idx,
                design_image_path=it.design_image_path,
                material_overrides=it.material_overrides,
            )
            db.add(item)

    q.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(q)
    return _quotation_to_out(q, db)


@router.delete("/{quotation_id}", status_code=204)
def delete_quotation(
    quotation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_or_company_admin),
):
    q = db.query(Quotation).filter(
        Quotation.id == quotation_id,
        Quotation.company_id == current_user.company_id,
    ).first()
    if not q:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")
    db.delete(q)
    db.commit()


@router.patch("/{quotation_id}/status", response_model=QuotationOut)
def update_status(
    quotation_id: int,
    payload: QuotationStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_or_company_admin),
):
    q = db.query(Quotation).filter(
        Quotation.id == quotation_id,
        Quotation.company_id == current_user.company_id,
    ).first()
    if not q:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")
    q.status = payload.status
    q.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(q)
    return _quotation_to_out(q, db)


# ── Generate orders ────────────────────────────────────────────────────────────

@router.post("/{quotation_id}/generate-orders", response_model=GenerateOrdersResponse)
def generate_orders(
    quotation_id: int,
    payload: GenerateOrdersRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_or_company_admin),
):
    """
    From an approved quotation, create a Project in flowbiit with stages,
    products and material requirements (BOM × quantities).
    """
    q = db.query(Quotation).filter(
        Quotation.id == quotation_id,
        Quotation.company_id == current_user.company_id,
    ).first()
    if not q:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")
    if q.status != QuotationStatus.APROBADA:
        raise HTTPException(status_code=400, detail="La cotización debe estar aprobada para generar órdenes")
    if q.projects:
        raise HTTPException(status_code=400, detail="Ya se generaron órdenes para esta cotización")

    # --- Create Project ---
    project = Project(
        company_id=current_user.company_id,
        quotation_id=q.id,
        project_name=q.event_name or q.number,
        client_name=q.client_name,
        final_deadline=q.delivery_date,
        notes=payload.notes or q.observations,
    )
    db.add(project)
    db.flush()

    # --- Stages from template or manual list ---
    stage_order_map: dict = {}  # stage_id -> ProjectStage

    if payload.template_id:
        template = db.query(ProjectTemplate).filter(
            ProjectTemplate.id == payload.template_id,
            ProjectTemplate.company_id == current_user.company_id,
        ).first()
        if not template:
            raise HTTPException(status_code=404, detail="Template no encontrado")

        template_stages = (
            db.query(ProjectTemplateStage)
            .filter(ProjectTemplateStage.template_id == template.id)
            .order_by(ProjectTemplateStage.stage_order)
            .all()
        )

        from datetime import timedelta, date as date_type
        start = date_type.today()

        for ts in template_stages:
            due = start + timedelta(days=ts.duration_days or 0)
            ps = ProjectStage(
                project_id=project.id,
                stage_id=ts.stage_id,
                status=StageStatus.READY if ts.stage_order == 0 else StageStatus.BLOCKED,
                planned_due_date=due,
                stage_order=ts.stage_order,
            )
            db.add(ps)
            db.flush()
            stage_order_map[ts.stage_id] = ps

        # Dependencies
        template_deps = db.query(ProjectTemplateStageDependency).filter(
            ProjectTemplateStageDependency.template_id == template.id
        ).all()
        for dep in template_deps:
            from_ps = stage_order_map.get(dep.depends_on_stage_id)
            to_ps = stage_order_map.get(dep.stage_id)
            if from_ps and to_ps:
                sd = ProjectStageDependency(
                    project_id=project.id,
                    stage_id=to_ps.id,
                    depends_on_stage_id=from_ps.id,
                )
                db.add(sd)

    elif payload.stage_ids:
        from datetime import date as date_type
        stage_dates = payload.stage_dates or {}
        for idx, sid in enumerate(payload.stage_ids):
            due_str = stage_dates.get(sid)
            due = None
            if due_str:
                from datetime import date as date_type
                due = date_type.fromisoformat(due_str)
            ps = ProjectStage(
                project_id=project.id,
                stage_id=sid,
                status=StageStatus.READY if idx == 0 else StageStatus.BLOCKED,
                planned_due_date=due,
                stage_order=idx,
            )
            db.add(ps)
            db.flush()
            stage_order_map[sid] = ps

    # --- Products & Material requirements ---
    total_by_product: dict = {}  # product_id -> total qty
    for item in q.items:
        if not item.product_id:
            continue
        qty = sum(item.sizes_breakdown.values()) if item.has_sizes else item.sizes_breakdown.get("total", 0)
        total_by_product[item.product_id] = total_by_product.get(item.product_id, 0) + qty

    for product_id, qty in total_by_product.items():
        pp = ProjectProduct(project_id=project.id, product_id=product_id, quantity=int(qty))
        db.add(pp)

        # BOM → material requirements
        bom_items = db.query(ProductBOMItem).filter(ProductBOMItem.product_id == product_id).all()
        for bom in bom_items:
            mat = db.query(Material).filter(Material.id == bom.material_id).first()
            required_qty = float(bom.qty_per_unit) * qty
            req = ProjectMaterialRequirement(
                project_id=project.id,
                material_id=bom.material_id,
                qty_required=required_qty,
                unit_cost=float(mat.cost_per_unit) if mat and mat.cost_per_unit else 0,
            )
            db.add(req)

    db.commit()
    db.refresh(project)
    return GenerateOrdersResponse(
        project_id=project.id,
        message=f"Proyecto #{project.id} creado exitosamente a partir de la cotización {q.number}",
    )


# ── PDF helpers ───────────────────────────────────────────────────────────────

def _get_project_stages(q: Quotation, db: Session) -> list:
    """
    If the quotation has a linked project, return its stages as
    [{"name": str, "date": str}, …] sorted by stage_order.
    Otherwise return None (pdf_orders will use default empty stage list).
    """
    if not q.projects:
        return None
    project = q.projects[0]
    ps_list = (
        db.query(ProjectStage)
        .filter(ProjectStage.project_id == project.id)
        .order_by(ProjectStage.stage_order)
        .all()
    )
    if not ps_list:
        return None

    stages = []
    for ps in ps_list:
        stage_obj = db.query(Stage).filter(Stage.id == ps.stage_id).first()
        date_str  = ps.planned_due_date.strftime("%d/%m/%Y") if ps.planned_due_date else ""
        stages.append({
            "name": stage_obj.name.upper() if stage_obj else f"Etapa {ps.stage_order + 1}",
            "date": date_str,
        })
    return stages


# ── BOM helper ────────────────────────────────────────────────────────────────

def _build_enriched_items(q: Quotation, db: Session) -> list:
    """Return enriched items list with BOM data for each quotation item."""
    enriched = []
    for item in q.items:
        bom = []
        if item.product_id:
            bom_items = db.query(ProductBOMItem, Material, Supplier).join(
                Material, ProductBOMItem.material_id == Material.id
            ).outerjoin(
                Supplier, Material.supplier_id == Supplier.id
            ).filter(ProductBOMItem.product_id == item.product_id).all()

            qty = (
                sum(item.sizes_breakdown.values())
                if item.has_sizes
                else item.sizes_breakdown.get("total", 0)
            )
            for bi, mat, sup in bom_items:
                overrides = (item.material_overrides or {}).get(str(mat.id), {})
                bom.append({
                    "material": mat.name,
                    "unit": mat.unit,
                    "category": mat.category or "",
                    "qty_per_unit": float(bi.qty_per_unit),
                    "total_qty": float(bi.qty_per_unit) * qty,
                    "supplier": sup.name if sup else None,
                    "color": overrides.get("color", ""),
                    "code": overrides.get("code", ""),
                })
        enriched.append({"item": item, "bom": bom})
    return enriched


# ── PDF endpoints ──────────────────────────────────────────────────────────────

@router.get("/{quotation_id}/pdf")
def quotation_pdf(
    quotation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_or_company_admin),
):
    """Generate the client-facing quotation PDF (matches napsa's official format)."""
    q = db.query(Quotation).filter(
        Quotation.id == quotation_id,
        Quotation.company_id == current_user.company_id,
    ).first()
    if not q:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")

    from app.services.pdf_orders import generate_quotation_pdf
    pdf_bytes = generate_quotation_pdf(q)
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{q.number}.pdf"'},
    )


@router.post("/{quotation_id}/design-image")
async def upload_design_image(
    quotation_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_or_company_admin),
):
    """Upload a design image for the quotation (used in order PDFs)."""
    q = db.query(Quotation).filter(
        Quotation.id == quotation_id,
        Quotation.company_id == current_user.company_id,
    ).first()
    if not q:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")

    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="El archivo debe ser una imagen")

    # Save to static/uploads/designs/
    static_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
    uploads_dir = os.path.join(static_dir, "uploads", "designs")
    os.makedirs(uploads_dir, exist_ok=True)

    # Delete old image if exists
    if q.design_image_path:
        old_path = os.path.join(static_dir, q.design_image_path)
        if os.path.exists(old_path):
            os.remove(old_path)

    ext = (file.filename or "image.jpg").rsplit(".", 1)[-1].lower()
    filename = f"design_{quotation_id}_{uuid.uuid4().hex[:8]}.{ext}"
    rel_path = os.path.join("uploads", "designs", filename)
    full_path = os.path.join(uploads_dir, filename)

    contents = await file.read()
    with open(full_path, "wb") as f:
        f.write(contents)

    q.design_image_path = rel_path
    q.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(q)
    return {"design_image_path": rel_path}


@router.post("/{quotation_id}/items/{item_id}/design-image")
async def upload_item_design_image(
    quotation_id: int,
    item_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_or_company_admin),
):
    """Upload a design image for a specific quotation item (reference)."""
    q = db.query(Quotation).filter(
        Quotation.id == quotation_id,
        Quotation.company_id == current_user.company_id,
    ).first()
    if not q:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")

    item = db.query(QuotationItem).filter(
        QuotationItem.id == item_id,
        QuotationItem.quotation_id == quotation_id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Referencia no encontrada")

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="El archivo debe ser una imagen")

    static_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
    uploads_dir = os.path.join(static_dir, "uploads", "designs")
    os.makedirs(uploads_dir, exist_ok=True)

    if item.design_image_path:
        old_path = os.path.join(static_dir, item.design_image_path)
        if os.path.exists(old_path):
            os.remove(old_path)

    ext = (file.filename or "image.jpg").rsplit(".", 1)[-1].lower()
    filename = f"design_q{quotation_id}_i{item_id}_{uuid.uuid4().hex[:8]}.{ext}"
    rel_path = os.path.join("uploads", "designs", filename)
    full_path = os.path.join(uploads_dir, filename)

    contents = await file.read()
    with open(full_path, "wb") as f:
        f.write(contents)

    item.design_image_path = rel_path
    q.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(item)
    return {"item_id": item_id, "design_image_path": rel_path}


@router.get("/{quotation_id}/cutting-order-pdf")
def cutting_order_pdf(
    quotation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_or_company_admin),
):
    q = db.query(Quotation).filter(
        Quotation.id == quotation_id,
        Quotation.company_id == current_user.company_id,
    ).first()
    if not q:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")

    stages = _get_project_stages(q, db)
    enriched = _build_enriched_items(q, db)
    from app.services.pdf_orders import generate_cutting_order_pdf
    pdf_bytes = generate_cutting_order_pdf(q, stages=stages, enriched_items=enriched)
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="OC-{q.number}.pdf"'},
    )


@router.get("/{quotation_id}/purchase-order-pdf")
def purchase_order_pdf(
    quotation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_or_company_admin),
):
    q = db.query(Quotation).filter(
        Quotation.id == quotation_id,
        Quotation.company_id == current_user.company_id,
    ).first()
    if not q:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")

    enriched_items = _build_enriched_items(q, db)
    from app.services.pdf_orders import generate_purchase_order_pdf
    pdf_bytes = generate_purchase_order_pdf(q, enriched_items)
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="OCP-{q.number}.pdf"'},
    )


@router.get("/{quotation_id}/production-sheet-pdf")
def production_sheet_pdf(
    quotation_id: int,
    tailor_name: str = "",
    tailor_price: float = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_or_company_admin),
):
    q = db.query(Quotation).filter(
        Quotation.id == quotation_id,
        Quotation.company_id == current_user.company_id,
    ).first()
    if not q:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")

    stages = _get_project_stages(q, db)
    enriched = _build_enriched_items(q, db)
    from app.services.pdf_orders import generate_production_sheet_pdf
    pdf_bytes = generate_production_sheet_pdf(q, tailor_name=tailor_name, tailor_price=tailor_price, stages=stages, enriched_items=enriched)
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="FP-{q.number}.pdf"'},
    )
