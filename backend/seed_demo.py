"""
Seed script para datos demo de Flowbit (video TikTok)
Empresa: herrería / manufactura metálica
Usuario: admin@flowbit.com

Uso:
    cd backend
    python seed_demo.py
"""
import sys
import os
from datetime import date, datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models.user import Company, User
from app.models.stage import Stage, StageEdge, Supplier, Material
from app.models.project import (
    Project, ProjectStage, ProjectMaterialRequirement,
    FinancialEvent, FinancialEventType, StageEventLog, ProjectStageDependency,
    ProjectMaterialPurchase,
)
from app.models.template import ProjectTemplate, ProjectTemplateStage, ProjectTemplateStageDependency
from app.models.purchase import MaterialPurchase
from app.models.notification import Notification  # noqa: F401 — needed for SQLAlchemy mapper
from app.models.stage import StageStatus

db = SessionLocal()

# ---------------------------------------------------------------------------
# 1. Encontrar la empresa del admin
# ---------------------------------------------------------------------------
admin = db.query(User).filter(User.email == "admin@flowbit.com").first()
if not admin:
    print("ERROR: No se encontró el usuario admin@flowbit.com")
    db.close()
    sys.exit(1)

company_id = admin.company_id
company = db.query(Company).filter(Company.id == company_id).first()
print(f"Empresa encontrada: {company.name} (id={company_id})")

# ---------------------------------------------------------------------------
# 2. Limpiar datos existentes (respetando FK, sin tocar usuarios)
# ---------------------------------------------------------------------------
print("\nEliminando datos existentes...")

from sqlalchemy import text

# Usamos SQL directo para controlar el orden exacto de borrado
db.execute(text("""
    DELETE FROM notifications
    WHERE project_id IN (SELECT id FROM projects WHERE company_id = :cid)
       OR project_stage_id IN (
           SELECT ps.id FROM project_stages ps
           JOIN projects p ON ps.project_id = p.id
           WHERE p.company_id = :cid
       )
"""), {"cid": company_id})

db.execute(text("""
    DELETE FROM stage_event_log
    WHERE project_stage_id IN (
        SELECT ps.id FROM project_stages ps
        JOIN projects p ON ps.project_id = p.id
        WHERE p.company_id = :cid
    )
"""), {"cid": company_id})

db.execute(text("""
    DELETE FROM time_logs
    WHERE project_stage_id IN (
        SELECT ps.id FROM project_stages ps
        JOIN projects p ON ps.project_id = p.id
        WHERE p.company_id = :cid
    )
"""), {"cid": company_id})

db.execute(text("""
    DELETE FROM project_stage_dependencies
    WHERE project_id IN (SELECT id FROM projects WHERE company_id = :cid)
"""), {"cid": company_id})

db.execute(text("""
    DELETE FROM project_material_purchases
    WHERE project_id IN (SELECT id FROM projects WHERE company_id = :cid)
"""), {"cid": company_id})

db.execute(text("""
    DELETE FROM project_material_requirements
    WHERE project_id IN (SELECT id FROM projects WHERE company_id = :cid)
"""), {"cid": company_id})

db.execute(text("""
    DELETE FROM project_stages
    WHERE project_id IN (SELECT id FROM projects WHERE company_id = :cid)
"""), {"cid": company_id})

db.execute(text("""
    DELETE FROM financial_events
    WHERE project_id IN (SELECT id FROM projects WHERE company_id = :cid)
"""), {"cid": company_id})

db.execute(text("""
    DELETE FROM project_products
    WHERE project_id IN (SELECT id FROM projects WHERE company_id = :cid)
"""), {"cid": company_id})

db.execute(text("DELETE FROM projects WHERE company_id = :cid"), {"cid": company_id})

db.execute(text("""
    DELETE FROM project_template_stage_dependencies
    WHERE template_id IN (SELECT id FROM project_templates WHERE company_id = :cid)
"""), {"cid": company_id})

db.execute(text("""
    DELETE FROM project_template_stages
    WHERE template_id IN (SELECT id FROM project_templates WHERE company_id = :cid)
"""), {"cid": company_id})

db.execute(text("DELETE FROM project_templates WHERE company_id = :cid"), {"cid": company_id})

db.execute(text("DELETE FROM material_purchases WHERE company_id = :cid"), {"cid": company_id})

db.execute(text("""
    DELETE FROM product_bom_items
    WHERE material_id IN (SELECT id FROM materials WHERE company_id = :cid)
"""), {"cid": company_id})

db.execute(text("DELETE FROM materials WHERE company_id = :cid"), {"cid": company_id})

db.execute(text("""
    DELETE FROM stage_edges
    WHERE from_stage_id IN (SELECT id FROM stages WHERE company_id = :cid)
       OR to_stage_id IN (SELECT id FROM stages WHERE company_id = :cid)
"""), {"cid": company_id})

db.execute(text("""
    DELETE FROM user_stage_access
    WHERE stage_id IN (SELECT id FROM stages WHERE company_id = :cid)
"""), {"cid": company_id})

db.execute(text("DELETE FROM stages WHERE company_id = :cid"), {"cid": company_id})

db.execute(text("DELETE FROM suppliers WHERE company_id = :cid"), {"cid": company_id})

db.commit()
print("Datos eliminados correctamente.")

# ---------------------------------------------------------------------------
# 3. Proveedores
# ---------------------------------------------------------------------------
print("\nCreando proveedores...")

sup_aceros = Supplier(
    company_id=company_id,
    name="Aceros del Norte S.A.",
    contact_name="Carlos Mendoza",
    email="ventas@acerosdelnorte.com",
    phone="81-2345-6789",
    address="Av. Industrial 450, Monterrey, N.L.",
)
sup_pinturas = Supplier(
    company_id=company_id,
    name="Pinturas Industriales MX",
    contact_name="Laura Ríos",
    email="laura.rios@pinturasimx.com",
    phone="81-9876-5432",
    address="Blvd. Manufactura 120, Escobedo, N.L.",
)
sup_ferreteria = Supplier(
    company_id=company_id,
    name="Ferretería Central",
    contact_name="Miguel Vargas",
    email="pedidos@ferreteriacentral.mx",
    phone="81-4567-8901",
    address="Calle Tornillo 88, Guadalupe, N.L.",
)
sup_omega = Supplier(
    company_id=company_id,
    name="Suministros Industriales Omega",
    contact_name="Ana Castillo",
    email="ana.castillo@siomega.com",
    phone="81-1122-3344",
    address="Parque Industrial Las Américas, Apodaca, N.L.",
)

db.add_all([sup_aceros, sup_pinturas, sup_ferreteria, sup_omega])
db.flush()
print(f"  ✓ {sup_aceros.name}")
print(f"  ✓ {sup_pinturas.name}")
print(f"  ✓ {sup_ferreteria.name}")
print(f"  ✓ {sup_omega.name}")

# ---------------------------------------------------------------------------
# 4. Materiales
# ---------------------------------------------------------------------------
print("\nCreando materiales...")

mat_lamina = Material(
    company_id=company_id,
    name='Lámina de acero 1/8"',
    unit="m²",
    supplier_id=sup_aceros.id,
    cost_per_unit=185.00,
    category="Metales",
    qty_available=0,
)
mat_pintura = Material(
    company_id=company_id,
    name="Pintura electrostática negra",
    unit="L",
    supplier_id=sup_pinturas.id,
    cost_per_unit=95.00,
    category="Recubrimientos",
    qty_available=0,
)
mat_perfil = Material(
    company_id=company_id,
    name='Perfil cuadrado 1"',
    unit="m",
    supplier_id=sup_aceros.id,
    cost_per_unit=42.00,
    category="Metales",
    qty_available=0,
)
mat_tornillos = Material(
    company_id=company_id,
    name="Tornillos M8 x 30mm",
    unit="unidad",
    supplier_id=sup_ferreteria.id,
    cost_per_unit=2.50,
    category="Fijaciones",
    qty_available=0,
)
mat_soldadura = Material(
    company_id=company_id,
    name='Soldadura 6013 3/32"',
    unit="kg",
    supplier_id=sup_omega.id,
    cost_per_unit=68.00,
    category="Consumibles",
    qty_available=0,
)

db.add_all([mat_lamina, mat_pintura, mat_perfil, mat_tornillos, mat_soldadura])
db.flush()
print(f"  ✓ {mat_lamina.name}")
print(f"  ✓ {mat_pintura.name}")
print(f"  ✓ {mat_perfil.name}")
print(f"  ✓ {mat_tornillos.name}")
print(f"  ✓ {mat_soldadura.name}")

# ---------------------------------------------------------------------------
# 5. Etapas
# ---------------------------------------------------------------------------
print("\nCreando etapas...")

stage_compra = Stage(
    company_id=company_id,
    name="Compra de materiales",
    description="Adquisición de materia prima con proveedores",
    color="#F59E0B",
    is_purchasing_stage=True,
)
stage_corte = Stage(
    company_id=company_id,
    name="Corte y trazado",
    description="Corte de lámina y perfiles según planos",
    color="#3B82F6",
    is_purchasing_stage=False,
)
stage_soldadura = Stage(
    company_id=company_id,
    name="Soldadura",
    description="Unión de piezas mediante soldadura MIG/TIG",
    color="#EF4444",
    is_purchasing_stage=False,
)
stage_pintura = Stage(
    company_id=company_id,
    name="Pintura y acabado",
    description="Aplicación de pintura electrostática y acabados",
    color="#8B5CF6",
    is_purchasing_stage=False,
)
stage_calidad = Stage(
    company_id=company_id,
    name="Control de calidad",
    description="Inspección final y aprobación del producto",
    color="#10B981",
    is_purchasing_stage=False,
)

db.add_all([stage_compra, stage_corte, stage_soldadura, stage_pintura, stage_calidad])
db.flush()

# Dependencias entre etapas
edges = [
    StageEdge(from_stage_id=stage_compra.id, to_stage_id=stage_corte.id),
    StageEdge(from_stage_id=stage_corte.id, to_stage_id=stage_soldadura.id),
    StageEdge(from_stage_id=stage_soldadura.id, to_stage_id=stage_pintura.id),
    StageEdge(from_stage_id=stage_pintura.id, to_stage_id=stage_calidad.id),
]
db.add_all(edges)
db.flush()
print(f"  ✓ {stage_compra.name} (compra)")
print(f"  ✓ {stage_corte.name}")
print(f"  ✓ {stage_soldadura.name}")
print(f"  ✓ {stage_pintura.name}")
print(f"  ✓ {stage_calidad.name}")
print("  ✓ Dependencias encadenadas")

# ---------------------------------------------------------------------------
# 6. Compras para cargar inventario
# ---------------------------------------------------------------------------
print("\nCargando inventario con compras...")

purchases = [
    MaterialPurchase(
        company_id=company_id, material_id=mat_lamina.id, supplier_id=sup_aceros.id,
        quantity=50, unit_cost=185.00, purchase_date=date(2026, 3, 10),
        notes="Lote inicial para temporada",
    ),
    MaterialPurchase(
        company_id=company_id, material_id=mat_perfil.id, supplier_id=sup_aceros.id,
        quantity=100, unit_cost=42.00, purchase_date=date(2026, 3, 10),
    ),
    MaterialPurchase(
        company_id=company_id, material_id=mat_pintura.id, supplier_id=sup_pinturas.id,
        quantity=20, unit_cost=95.00, purchase_date=date(2026, 3, 12),
    ),
    MaterialPurchase(
        company_id=company_id, material_id=mat_tornillos.id, supplier_id=sup_ferreteria.id,
        quantity=500, unit_cost=2.50, purchase_date=date(2026, 3, 12),
    ),
    MaterialPurchase(
        company_id=company_id, material_id=mat_soldadura.id, supplier_id=sup_omega.id,
        quantity=25, unit_cost=68.00, purchase_date=date(2026, 3, 12),
    ),
]
db.add_all(purchases)
db.flush()

# Actualizar qty_available en materiales
mat_lamina.qty_available = 50
mat_perfil.qty_available = 100
mat_pintura.qty_available = 20
mat_tornillos.qty_available = 500
mat_soldadura.qty_available = 25
db.flush()
print("  ✓ 5 compras registradas, inventario actualizado")

# ---------------------------------------------------------------------------
# 7. Templates
# ---------------------------------------------------------------------------
print("\nCreando templates...")

tpl1 = ProjectTemplate(
    company_id=company_id,
    name="Proyecto Estándar de Herrería",
    description="Flujo completo: compra, corte, soldadura, pintura y calidad",
    created_by=admin.id,
)
db.add(tpl1)
db.flush()

tpl1_stages = [
    ProjectTemplateStage(template_id=tpl1.id, stage_id=stage_compra.id, duration_days=3, stage_order=1),
    ProjectTemplateStage(template_id=tpl1.id, stage_id=stage_corte.id, duration_days=2, stage_order=2),
    ProjectTemplateStage(template_id=tpl1.id, stage_id=stage_soldadura.id, duration_days=3, stage_order=3),
    ProjectTemplateStage(template_id=tpl1.id, stage_id=stage_pintura.id, duration_days=2, stage_order=4),
    ProjectTemplateStage(template_id=tpl1.id, stage_id=stage_calidad.id, duration_days=1, stage_order=5),
]
db.add_all(tpl1_stages)
db.flush()

tpl1_deps = [
    ProjectTemplateStageDependency(template_id=tpl1.id, template_stage_id=tpl1_stages[1].id, depends_on_template_stage_id=tpl1_stages[0].id),
    ProjectTemplateStageDependency(template_id=tpl1.id, template_stage_id=tpl1_stages[2].id, depends_on_template_stage_id=tpl1_stages[1].id),
    ProjectTemplateStageDependency(template_id=tpl1.id, template_stage_id=tpl1_stages[3].id, depends_on_template_stage_id=tpl1_stages[2].id),
    ProjectTemplateStageDependency(template_id=tpl1.id, template_stage_id=tpl1_stages[4].id, depends_on_template_stage_id=tpl1_stages[3].id),
]
db.add_all(tpl1_deps)

tpl2 = ProjectTemplate(
    company_id=company_id,
    name="Fabricación Express",
    description="Flujo rápido sin compra de materiales: corte, soldadura y calidad",
    created_by=admin.id,
)
db.add(tpl2)
db.flush()

tpl2_stages = [
    ProjectTemplateStage(template_id=tpl2.id, stage_id=stage_corte.id, duration_days=1, stage_order=1),
    ProjectTemplateStage(template_id=tpl2.id, stage_id=stage_soldadura.id, duration_days=2, stage_order=2),
    ProjectTemplateStage(template_id=tpl2.id, stage_id=stage_calidad.id, duration_days=1, stage_order=3),
]
db.add_all(tpl2_stages)
db.flush()

tpl2_deps = [
    ProjectTemplateStageDependency(template_id=tpl2.id, template_stage_id=tpl2_stages[1].id, depends_on_template_stage_id=tpl2_stages[0].id),
    ProjectTemplateStageDependency(template_id=tpl2.id, template_stage_id=tpl2_stages[2].id, depends_on_template_stage_id=tpl2_stages[1].id),
]
db.add_all(tpl2_deps)
db.flush()
print(f"  ✓ {tpl1.name}")
print(f"  ✓ {tpl2.name}")

# ---------------------------------------------------------------------------
# 8. Proyectos
# ---------------------------------------------------------------------------
print("\nCreando proyectos...")

# --- Proyecto 1: Puerta corrediza industrial ---
p1 = Project(
    company_id=company_id,
    project_name="Puerta corrediza industrial",
    client_name="Constructora Omega",
    start_date=date(2026, 3, 15),
    final_deadline=date(2026, 4, 15),
    sale_price=18500.00,
    sale_includes_tax=False,
    adds_to_inventory=False,
    notes="Puerta de 4x3m, acabado negro mate. El cliente requiere entrega puntual para apertura de bodega.",
)
db.add(p1)
db.flush()

# Etapas proyecto 1 - ya avanzado (compra DONE, corte DONE, soldadura IN_PROGRESS)
p1_s1 = ProjectStage(
    project_id=p1.id, stage_id=stage_compra.id,
    status=StageStatus.DONE, stage_order=1,
    qty_required=1, qty_done=1,
    planned_due_date=date(2026, 3, 17),
    actual_ready_at=datetime(2026, 3, 15, 9, 0),
    actual_started_at=datetime(2026, 3, 15, 10, 0),
    actual_done_at=datetime(2026, 3, 17, 14, 0),
)
p1_s2 = ProjectStage(
    project_id=p1.id, stage_id=stage_corte.id,
    status=StageStatus.DONE, stage_order=2,
    qty_required=1, qty_done=1,
    planned_due_date=date(2026, 3, 21),
    actual_ready_at=datetime(2026, 3, 17, 14, 0),
    actual_started_at=datetime(2026, 3, 18, 8, 0),
    actual_done_at=datetime(2026, 3, 20, 17, 0),
)
p1_s3 = ProjectStage(
    project_id=p1.id, stage_id=stage_soldadura.id,
    status=StageStatus.IN_PROGRESS, stage_order=3,
    qty_required=1, qty_done=0,
    planned_due_date=date(2026, 3, 27),
    actual_ready_at=datetime(2026, 3, 20, 17, 0),
    actual_started_at=datetime(2026, 3, 24, 8, 0),
)
p1_s4 = ProjectStage(
    project_id=p1.id, stage_id=stage_pintura.id,
    status=StageStatus.BLOCKED, stage_order=4,
    qty_required=1, qty_done=0,
    planned_due_date=date(2026, 4, 3),
)
p1_s5 = ProjectStage(
    project_id=p1.id, stage_id=stage_calidad.id,
    status=StageStatus.BLOCKED, stage_order=5,
    qty_required=1, qty_done=0,
    planned_due_date=date(2026, 4, 8),
)
db.add_all([p1_s1, p1_s2, p1_s3, p1_s4, p1_s5])
db.flush()

# Dependencias proyecto 1
p1_deps = [
    ProjectStageDependency(project_id=p1.id, stage_id=p1_s2.id, depends_on_stage_id=p1_s1.id),
    ProjectStageDependency(project_id=p1.id, stage_id=p1_s3.id, depends_on_stage_id=p1_s2.id),
    ProjectStageDependency(project_id=p1.id, stage_id=p1_s4.id, depends_on_stage_id=p1_s3.id),
    ProjectStageDependency(project_id=p1.id, stage_id=p1_s5.id, depends_on_stage_id=p1_s4.id),
]
db.add_all(p1_deps)

# Materiales proyecto 1
p1_mats = [
    ProjectMaterialRequirement(project_id=p1.id, material_id=mat_lamina.id, qty_per_unit=8, qty_total=8, qty_available=8, qty_to_buy=0),
    ProjectMaterialRequirement(project_id=p1.id, material_id=mat_perfil.id, qty_per_unit=24, qty_total=24, qty_available=24, qty_to_buy=0),
    ProjectMaterialRequirement(project_id=p1.id, material_id=mat_tornillos.id, qty_per_unit=40, qty_total=40, qty_available=40, qty_to_buy=0),
    ProjectMaterialRequirement(project_id=p1.id, material_id=mat_soldadura.id, qty_per_unit=5, qty_total=5, qty_available=5, qty_to_buy=0),
    ProjectMaterialRequirement(project_id=p1.id, material_id=mat_pintura.id, qty_per_unit=3, qty_total=3, qty_available=3, qty_to_buy=0),
]
db.add_all(p1_mats)

# Eventos financieros proyecto 1
db.add(FinancialEvent(
    project_id=p1.id, type=FinancialEventType.INCOME,
    amount=9000.00, date=date(2026, 3, 15),
    category="Anticipo", note="50% anticipado al inicio del proyecto",
))
db.add(FinancialEvent(
    project_id=p1.id, type=FinancialEventType.COST,
    amount=2850.00, date=date(2026, 3, 17),
    category="Materiales", note="Compra de lámina y perfiles",
))
db.flush()
print(f"  ✓ {p1.project_name} (cliente: {p1.client_name}) — en progreso")

# --- Proyecto 2: Estantería industrial 5 niveles ---
p2 = Project(
    company_id=company_id,
    project_name="Estantería industrial 5 niveles",
    client_name="Almacenes García",
    start_date=date(2026, 3, 20),
    final_deadline=date(2026, 5, 10),
    sale_price=32000.00,
    sale_includes_tax=False,
    adds_to_inventory=False,
    notes="6 módulos de estantería de 2.5m de altura. Capacidad 500kg por nivel.",
)
db.add(p2)
db.flush()

p2_s1 = ProjectStage(
    project_id=p2.id, stage_id=stage_compra.id,
    status=StageStatus.DONE, stage_order=1,
    qty_required=6, qty_done=6,
    planned_due_date=date(2026, 3, 24),
    actual_ready_at=datetime(2026, 3, 20, 9, 0),
    actual_started_at=datetime(2026, 3, 20, 10, 0),
    actual_done_at=datetime(2026, 3, 22, 16, 0),
)
p2_s2 = ProjectStage(
    project_id=p2.id, stage_id=stage_corte.id,
    status=StageStatus.READY, stage_order=2,
    qty_required=6, qty_done=0,
    planned_due_date=date(2026, 4, 3),
    actual_ready_at=datetime(2026, 3, 22, 16, 0),
)
p2_s3 = ProjectStage(
    project_id=p2.id, stage_id=stage_soldadura.id,
    status=StageStatus.BLOCKED, stage_order=3,
    qty_required=6, qty_done=0,
    planned_due_date=date(2026, 4, 18),
)
p2_s4 = ProjectStage(
    project_id=p2.id, stage_id=stage_pintura.id,
    status=StageStatus.BLOCKED, stage_order=4,
    qty_required=6, qty_done=0,
    planned_due_date=date(2026, 4, 28),
)
p2_s5 = ProjectStage(
    project_id=p2.id, stage_id=stage_calidad.id,
    status=StageStatus.BLOCKED, stage_order=5,
    qty_required=6, qty_done=0,
    planned_due_date=date(2026, 5, 5),
)
db.add_all([p2_s1, p2_s2, p2_s3, p2_s4, p2_s5])
db.flush()

p2_deps = [
    ProjectStageDependency(project_id=p2.id, stage_id=p2_s2.id, depends_on_stage_id=p2_s1.id),
    ProjectStageDependency(project_id=p2.id, stage_id=p2_s3.id, depends_on_stage_id=p2_s2.id),
    ProjectStageDependency(project_id=p2.id, stage_id=p2_s4.id, depends_on_stage_id=p2_s3.id),
    ProjectStageDependency(project_id=p2.id, stage_id=p2_s5.id, depends_on_stage_id=p2_s4.id),
]
db.add_all(p2_deps)

p2_mats = [
    ProjectMaterialRequirement(project_id=p2.id, material_id=mat_lamina.id, qty_per_unit=6, qty_total=36, qty_available=36, qty_to_buy=0),
    ProjectMaterialRequirement(project_id=p2.id, material_id=mat_perfil.id, qty_per_unit=10, qty_total=60, qty_available=60, qty_to_buy=0),
    ProjectMaterialRequirement(project_id=p2.id, material_id=mat_tornillos.id, qty_per_unit=80, qty_total=480, qty_available=460, qty_to_buy=20),
    ProjectMaterialRequirement(project_id=p2.id, material_id=mat_soldadura.id, qty_per_unit=3, qty_total=18, qty_available=18, qty_to_buy=0),
    ProjectMaterialRequirement(project_id=p2.id, material_id=mat_pintura.id, qty_per_unit=2, qty_total=12, qty_available=12, qty_to_buy=0),
]
db.add_all(p2_mats)

db.add(FinancialEvent(
    project_id=p2.id, type=FinancialEventType.INCOME,
    amount=15000.00, date=date(2026, 3, 20),
    category="Anticipo", note="Anticipo del 47% al iniciar fabricación",
))
db.add(FinancialEvent(
    project_id=p2.id, type=FinancialEventType.COST,
    amount=6840.00, date=date(2026, 3, 22),
    category="Materiales", note="Compra de materiales para 6 módulos",
))
db.flush()
print(f"  ✓ {p2.project_name} (cliente: {p2.client_name}) — en espera de corte")

# ---------------------------------------------------------------------------
# 9. Commit final
# ---------------------------------------------------------------------------
company_name = company.name
db.commit()
db.close()

print("\n" + "="*50)
print("SEED COMPLETADO EXITOSAMENTE")
print("="*50)
print(f"  Empresa:      {company_name}")
print(f"  Proveedores:  4")
print(f"  Materiales:   5 (con inventario cargado)")
print(f"  Etapas:       5 (encadenadas)")
print(f"  Templates:    2")
print(f"  Proyectos:    2")
print(f"  Fin. events:  4 (2 ingresos, 2 costos)")
print("\nInicia sesión como admin@flowbit.com para ver los datos.")
