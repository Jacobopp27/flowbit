from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from decimal import Decimal

from app.database import get_db
from app.models.user import User, Company
from app.models.project import (
    Project, 
    ProjectStage, 
    ProjectMaterialRequirement, 
    ProjectProduct,
    ProjectMaterialPurchase,
    FinancialEvent,
    FinancialEventType,
    StageEventLog,
    ProjectStageDependency
)
from app.models.stage import Stage, StageStatus, Product, ProductBOMItem, Material, Supplier
from app.models.inventory import ProductInventory
from app.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectListResponse,
    ProjectDetailResponse,
    ProjectStageResponse,
    ProjectStageUpdate,
    MaterialRequirementResponse,
    ProjectMaterialRequirementUpdate,
)
from app.schemas.project_purchases import ProjectMaterialPurchaseCreate, ProjectMaterialPurchaseResponse
from app.api.auth import check_admin_or_company_admin, get_current_user

router = APIRouter()


@router.get("/", response_model=List[ProjectListResponse])
def get_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_or_company_admin)
):
    """Get all projects for the company"""
    if not current_user.company_id:
        raise HTTPException(status_code=403, detail="Admin must belong to a company")
    
    projects = db.query(Project).filter(
        Project.company_id == current_user.company_id
    ).order_by(Project.created_at.desc()).all()
    
    result = []
    for project in projects:
        stages = db.query(ProjectStage).filter(
            ProjectStage.project_id == project.id
        ).all()
        
        result.append(ProjectListResponse(
            id=project.id,
            project_name=project.project_name,
            client_name=project.client_name,
            start_date=project.start_date,
            final_deadline=project.final_deadline,
            created_at=project.created_at,
            stages_count=len(stages),
            completed_stages=sum(1 for s in stages if s.status == StageStatus.DONE)
        ))
    
    return result


@router.get("/dashboard/metrics")
def get_dashboard_metrics(
    view: str = Query("total", regex="^(total|monthly)$"),
    year: int = Query(None),
    month: int = Query(None, ge=1, le=12),
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_or_company_admin)
):
    """
    Get comprehensive dashboard metrics for the company:
    - Active projects count and list
    - Projects completion rate
    - Financial analysis (projected revenue, costs, profit)
    - On-time vs delayed projects
    - Critical stages (blocked stages)
    - Low inventory alerts
    
    Parameters:
    - view: 'total' for all-time metrics, 'monthly' for monthly breakdown
    - year: Year for monthly view (defaults to current year)
    - month: Month for filtering (1-12, optional for monthly view)
    """
    if not current_user.company_id:
        raise HTTPException(status_code=403, detail="Admin must belong to a company")
    
    from datetime import date
    from calendar import monthrange
    today = date.today()
    
    # Set defaults for monthly view
    if view == "monthly":
        if year is None:
            year = today.year
        if month is None:
            month = today.month
    
    # Get all projects for the company
    all_projects = db.query(Project).filter(
        Project.company_id == current_user.company_id
    ).all()
    
    # Classify projects
    active_projects = []
    completed_projects = []
    on_time_projects = []
    delayed_projects = []
    
    total_projected_revenue = 0
    total_material_costs = 0
    total_operational_costs = 0
    
    for project in all_projects:
        stages = db.query(ProjectStage).filter(
            ProjectStage.project_id == project.id
        ).all()
        
        total_stages = len(stages)
        completed_stages = sum(1 for s in stages if s.status == StageStatus.DONE)
        progress = (completed_stages / total_stages * 100) if total_stages > 0 else 0
        
        # Check if project is completed (all stages DONE)
        is_completed = all(s.status == StageStatus.DONE for s in stages) if stages else False
        
        if is_completed:
            completed_projects.append({
                "id": project.id,
                "name": project.project_name,
                "client": project.client_name,
                "completion_date": max((s.actual_done_at for s in stages if s.actual_done_at), default=None)
            })
        else:
            active_projects.append({
                "id": project.id,
                "name": project.project_name,
                "client": project.client_name,
                "progress": round(progress, 1),
                "deadline": project.final_deadline.isoformat() if project.final_deadline else None,
                "status": "delayed" if project.final_deadline and today > project.final_deadline else "on_time"
            })
            
            # Check if delayed
            if project.final_deadline:
                if today > project.final_deadline:
                    delayed_projects.append({
                        "id": project.id,
                        "name": project.project_name,
                        "deadline": project.final_deadline.isoformat(),
                        "days_overdue": (today - project.final_deadline).days
                    })
                else:
                    on_time_projects.append({
                        "id": project.id,
                        "name": project.project_name,
                        "deadline": project.final_deadline.isoformat(),
                        "days_remaining": (project.final_deadline - today).days
                    })
        
        # Financial aggregation
        # For monthly view, include revenue if project's deadline falls in the selected month
        if project.sale_price:
            if view == "monthly":
                # Include revenue if project's deadline is in the selected month
                if project.final_deadline:
                    deadline_date = project.final_deadline
                    start_date = date(year, month, 1)
                    end_date = date(year, month, monthrange(year, month)[1])
                    if start_date <= deadline_date <= end_date:
                        total_projected_revenue += float(project.sale_price)
            else:
                # For total view, include all project revenue
                total_projected_revenue += float(project.sale_price)
        
        # Material costs
        # For monthly view, include costs only if project's deadline is in the selected month
        if view == "monthly":
            if project.final_deadline:
                start_date = date(year, month, 1)
                end_date = date(year, month, monthrange(year, month)[1])
                if start_date <= project.final_deadline <= end_date:
                    material_purchases = db.query(ProjectMaterialPurchase).filter(
                        ProjectMaterialPurchase.project_id == project.id
                    ).all()
                    total_material_costs += sum(
                        float(p.unit_cost) * float(p.quantity_purchased) 
                        for p in material_purchases
                    )
        else:
            material_purchases = db.query(ProjectMaterialPurchase).filter(
                ProjectMaterialPurchase.project_id == project.id
            ).all()
            total_material_costs += sum(
                float(p.unit_cost) * float(p.quantity_purchased) 
                for p in material_purchases
            )
        
        # Operational costs
        # For monthly view, include costs only if project's deadline is in the selected month
        if view == "monthly":
            if project.final_deadline:
                start_date = date(year, month, 1)
                end_date = date(year, month, monthrange(year, month)[1])
                if start_date <= project.final_deadline <= end_date:
                    for stage in stages:
                        if stage.has_operational_cost and stage.cost_per_unit and stage.qty_done:
                            total_operational_costs += float(stage.cost_per_unit) * float(stage.qty_done)
        else:
            # For total view, include all operational costs
            for stage in stages:
                if stage.has_operational_cost and stage.cost_per_unit and stage.qty_done:
                    total_operational_costs += float(stage.cost_per_unit) * float(stage.qty_done)
    
    # Critical stages (blocked stages in active projects)
    critical_stages = []
    blocked_stages = db.query(ProjectStage, Project, Stage).join(
        Project, ProjectStage.project_id == Project.id
    ).join(
        Stage, ProjectStage.stage_id == Stage.id
    ).filter(
        Project.company_id == current_user.company_id,
        ProjectStage.status == StageStatus.BLOCKED
    ).all()
    
    for ps, proj, stage in blocked_stages:
        critical_stages.append({
            "project_id": proj.id,
            "project_name": proj.project_name,
            "stage_id": ps.id,
            "stage_name": stage.name,
            "dependencies_count": db.query(ProjectStageDependency).filter(
                ProjectStageDependency.stage_id == ps.id
            ).count()
        })
    
    # Low inventory alerts
    low_inventory_materials = []
    materials = db.query(Material).filter(
        Material.company_id == current_user.company_id
    ).all()
    
    for material in materials:
        if material.qty_available is not None and material.qty_available < 10:  # Threshold
            low_inventory_materials.append({
                "material_id": material.id,
                "material_name": material.name,
                "qty_available": float(material.qty_available),
                "unit": material.unit
            })
    
    # Calculate totals and profit
    total_costs = total_material_costs + total_operational_costs
    estimated_profit = total_projected_revenue - total_costs
    profit_margin = (estimated_profit / total_projected_revenue * 100) if total_projected_revenue > 0 else 0
    
    # Prepare response with view metadata
    response = {
        "view_type": view,
        "period": {
            "year": year if view == "monthly" else None,
            "month": month if view == "monthly" else None
        },
        "summary": {
            "total_projects": len(all_projects),
            "active_projects": len(active_projects),
            "completed_projects": len(completed_projects),
            "completion_rate": round((len(completed_projects) / len(all_projects) * 100) if all_projects else 0, 1)
        },
        "financial": {
            "projected_revenue": round(total_projected_revenue, 2),
            "material_costs": round(total_material_costs, 2),
            "operational_costs": round(total_operational_costs, 2),
            "total_costs": round(total_costs, 2),
            "estimated_profit": round(estimated_profit, 2),
            "profit_margin_percent": round(profit_margin, 2)
        },
        "timeline": {
            "on_time_count": len(on_time_projects),
            "delayed_count": len(delayed_projects),
            "on_time_projects": on_time_projects[:5],  # Top 5
            "delayed_projects": delayed_projects
        },
        "active_projects": active_projects[:10],  # Top 10
        "critical_stages": critical_stages[:5],  # Top 5
        "low_inventory_alerts": low_inventory_materials[:10]  # Top 10
    }
    
    return response


@router.get("/my-work/stages")
def get_my_work_stages(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get project stages assigned to the current worker, organized by status.
    Returns stages in BLOCKED, READY, IN_PROGRESS, and DONE status,
    prioritized by project deadline (most urgent first).
    """
    from app.models.user import UserRole, UserStageAccess
    from datetime import date
    
    # Verify user is a stage worker
    if current_user.role != UserRole.STAGE_WORKER:
        raise HTTPException(status_code=403, detail="Only stage workers can access this endpoint")
    
    # Get the stage IDs this user has access to
    stage_access = db.query(UserStageAccess).filter(
        UserStageAccess.user_id == current_user.id
    ).all()
    
    if not stage_access or len(stage_access) == 0:
        return {
            "blocked": [],
            "ready": [],
            "in_progress": [],
            "completed": []
        }
    
    accessible_stage_ids = [sa.stage_id for sa in stage_access]
    today = date.today()
    
    # Get all project stages for the stages this worker has access to
    project_stages = db.query(ProjectStage).join(
        Project, ProjectStage.project_id == Project.id
    ).filter(
        ProjectStage.stage_id.in_(accessible_stage_ids),
        Project.company_id == current_user.company_id
    ).order_by(
        Project.final_deadline.asc().nullsfirst()
    ).all()
    
    # Organize stages by status
    blocked_stages = []
    ready_stages = []
    in_progress_stages = []
    completed_stages = []
    
    for ps in project_stages:
        project = db.query(Project).filter(Project.id == ps.project_id).first()
        stage = db.query(Stage).filter(Stage.id == ps.stage_id).first()
        
        if not project or not stage:
            continue
        
        # Calculate days until/past deadline
        days_to_deadline = None
        deadline_status = "on_time"
        if project.final_deadline:
            delta = (project.final_deadline - today).days
            days_to_deadline = delta
            if delta < 0:
                deadline_status = "overdue"
            elif delta <= 7:
                deadline_status = "urgent"
        
        # Build stage info
        stage_info = {
            "project_stage_id": ps.id,
            "project_id": project.id,
            "project_name": project.project_name,
            "client_name": project.client_name,
            "stage_id": stage.id,
            "stage_name": stage.name,
            "status": ps.status.value,
            "qty_required": float(ps.qty_required) if ps.qty_required else 0,
            "qty_done": float(ps.qty_done) if ps.qty_done else 0,
            "progress": round((float(ps.qty_done or 0) / float(ps.qty_required or 1)) * 100, 1),
            "deadline": project.final_deadline.isoformat() if project.final_deadline else None,
            "days_to_deadline": days_to_deadline,
            "deadline_status": deadline_status,
            "actual_started_at": ps.actual_started_at.isoformat() if ps.actual_started_at else None,
            "actual_done_at": ps.actual_done_at.isoformat() if ps.actual_done_at else None
        }
        
        # Categorize by status
        if ps.status == StageStatus.BLOCKED:
            blocked_stages.append(stage_info)
        elif ps.status == StageStatus.READY:
            ready_stages.append(stage_info)
        elif ps.status == StageStatus.IN_PROGRESS:
            in_progress_stages.append(stage_info)
        elif ps.status == StageStatus.DONE:
            completed_stages.append(stage_info)
    
    return {
        "blocked": blocked_stages,
        "ready": ready_stages,
        "in_progress": in_progress_stages,
        "completed": completed_stages
    }


@router.get("/my-work/stage/{project_stage_id}")
def get_my_work_stage_detail(
    project_stage_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed information about a specific project stage for a worker.
    Workers can only access stages they have permission for.
    """
    from app.models.user import UserRole, UserStageAccess
    
    # Verify user is a stage worker
    if current_user.role != UserRole.STAGE_WORKER:
        raise HTTPException(status_code=403, detail="Only stage workers can access this endpoint")
    
    # Get the project stage
    project_stage = db.query(ProjectStage).filter(
        ProjectStage.id == project_stage_id
    ).first()
    
    if not project_stage:
        raise HTTPException(status_code=404, detail="Project stage not found")
    
    # Verify worker has access to this stage
    has_access = db.query(UserStageAccess).filter(
        UserStageAccess.user_id == current_user.id,
        UserStageAccess.stage_id == project_stage.stage_id
    ).first()
    
    if not has_access:
        raise HTTPException(status_code=403, detail="You don't have access to this stage")
    
    # Get related data
    project = db.query(Project).filter(Project.id == project_stage.project_id).first()
    stage = db.query(Stage).filter(Stage.id == project_stage.stage_id).first()
    
    if not project or not stage:
        raise HTTPException(status_code=404, detail="Related data not found")
    
    # Verify project belongs to user's company
    if project.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get dependencies
    dependencies = db.query(ProjectStageDependency).filter(
        ProjectStageDependency.stage_id == project_stage.id
    ).all()
    
    dependency_list = []
    for dep in dependencies:
        dep_stage = db.query(ProjectStage).filter(ProjectStage.id == dep.depends_on_stage_id).first()
        if dep_stage:
            dep_stage_def = db.query(Stage).filter(Stage.id == dep_stage.stage_id).first()
            if dep_stage_def:
                dependency_list.append({
                    "stage_id": dep_stage.id,
                    "stage_name": dep_stage_def.name,
                    "status": dep_stage.status.value
                })
    
    return {
        "project_stage_id": project_stage.id,
        "project_id": project.id,
        "project_name": project.project_name,
        "client_name": project.client_name,
        "stage_id": stage.id,
        "stage_name": stage.name,
        "status": project_stage.status.value,
        "qty_required": float(project_stage.qty_required) if project_stage.qty_required else 0,
        "qty_done": float(project_stage.qty_done) if project_stage.qty_done else 0,
        "planned_due_date": project_stage.planned_due_date.isoformat() if project_stage.planned_due_date else None,
        "actual_started_at": project_stage.actual_started_at.isoformat() if project_stage.actual_started_at else None,
        "actual_done_at": project_stage.actual_done_at.isoformat() if project_stage.actual_done_at else None,
        "notes": project_stage.notes,
        "dependencies": dependency_list,
        "has_operational_cost": project_stage.has_operational_cost,
        "cost_per_unit": float(project_stage.cost_per_unit) if project_stage.cost_per_unit else None
    }


@router.put("/my-work/stage/{project_stage_id}")
def update_my_work_stage(
    project_stage_id: int,
    data: ProjectStageUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update a project stage as a worker.
    Workers can only update stages they have permission for.
    """
    from app.models.user import UserRole, UserStageAccess
    from datetime import datetime
    
    # Verify user is a stage worker
    if current_user.role != UserRole.STAGE_WORKER:
        raise HTTPException(status_code=403, detail="Only stage workers can access this endpoint")
    
    # Get the project stage
    project_stage = db.query(ProjectStage).filter(
        ProjectStage.id == project_stage_id
    ).first()
    
    if not project_stage:
        raise HTTPException(status_code=404, detail="Project stage not found")
    
    # Verify worker has access to this stage
    has_access = db.query(UserStageAccess).filter(
        UserStageAccess.user_id == current_user.id,
        UserStageAccess.stage_id == project_stage.stage_id
    ).first()
    
    if not has_access:
        raise HTTPException(status_code=403, detail="You don't have access to this stage")
    
    # Verify project belongs to user's company
    project = db.query(Project).filter(Project.id == project_stage.project_id).first()
    if not project or project.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Validate status changes
    if data.status:
        new_status = StageStatus(data.status)
        
        # If stage is BLOCKED, check if dependencies are met
        if project_stage.status == StageStatus.BLOCKED and new_status != StageStatus.BLOCKED:
            if not can_stage_be_ready(db, project_stage.id):
                raise HTTPException(
                    status_code=400,
                    detail="Cannot change status: Stage dependencies are not met"
                )
        
        project_stage.status = new_status
        
        # Auto-register dates
        if new_status == StageStatus.IN_PROGRESS and not project_stage.actual_started_at:
            project_stage.actual_started_at = datetime.now()
        
        if new_status == StageStatus.DONE:
            project_stage.actual_done_at = datetime.now()
    
    if data.qty_done is not None:
        project_stage.qty_done = data.qty_done
    
    if data.notes is not None:
        project_stage.notes = data.notes
    
    db.commit()
    db.refresh(project_stage)
    
    stage = db.query(Stage).filter(Stage.id == project_stage.stage_id).first()
    
    return {
        "id": project_stage.id,
        "project_id": project_stage.project_id,
        "stage_id": project_stage.stage_id,
        "stage_name": stage.name if stage else "Unknown",
        "status": project_stage.status.value,
        "qty_required": float(project_stage.qty_required) if project_stage.qty_required else 0,
        "qty_done": float(project_stage.qty_done) if project_stage.qty_done else 0,
        "planned_due_date": project_stage.planned_due_date.isoformat() if project_stage.planned_due_date else None,
        "actual_started_at": project_stage.actual_started_at.isoformat() if project_stage.actual_started_at else None,
        "actual_done_at": project_stage.actual_done_at.isoformat() if project_stage.actual_done_at else None,
        "notes": project_stage.notes
    }


@router.get("/{project_id}", response_model=ProjectDetailResponse)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_or_company_admin)
):
    """Get project details"""
    if not current_user.company_id:
        raise HTTPException(status_code=403, detail="Admin must belong to a company")
    
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.company_id == current_user.company_id
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get products
    products_in_project = db.query(ProjectProduct, Product).join(
        Product, ProjectProduct.product_id == Product.id
    ).filter(
        ProjectProduct.project_id == project_id
    ).all()
    
    products_response = []
    for pp, product in products_in_project:
        products_response.append({
            'product_id': product.id,
            'product_name': product.name,
            'quantity': pp.quantity
        })
    
    # Get stages with stage names
    stages = db.query(ProjectStage, Stage).join(
        Stage, ProjectStage.stage_id == Stage.id
    ).filter(
        ProjectStage.project_id == project_id
    ).order_by(ProjectStage.stage_order).all()
    
    stages_response = []
    for ps, stage in stages:
        # Get dependencies for this stage
        dependencies = db.query(ProjectStageDependency).filter(
            ProjectStageDependency.stage_id == ps.id
        ).all()
        
        depends_on_ids = [dep.depends_on_stage_id for dep in dependencies]
        
        stages_response.append(ProjectStageResponse(
            id=ps.id,
            stage_id=ps.stage_id,
            stage_name=stage.name,
            status=ps.status,
            qty_required=ps.qty_required,
            qty_done=ps.qty_done,
            planned_due_date=ps.planned_due_date,
            actual_ready_at=ps.actual_ready_at,
            actual_started_at=ps.actual_started_at,
            actual_done_at=ps.actual_done_at,
            notes=ps.notes,
            stage_order=ps.stage_order,
            depends_on=depends_on_ids,
            has_operational_cost=ps.has_operational_cost,
            cost_per_unit=float(ps.cost_per_unit) if ps.cost_per_unit else None
        ))
    
    # Get material requirements
    materials = db.query(ProjectMaterialRequirement, Material).join(
        Material, ProjectMaterialRequirement.material_id == Material.id
    ).filter(
        ProjectMaterialRequirement.project_id == project_id
    ).all()
    
    materials_response = []
    for req, material in materials:
        materials_response.append(MaterialRequirementResponse(
            id=req.id,
            material_id=req.material_id,
            material_name=material.name,
            material_unit=material.unit,
            qty_per_unit=req.qty_per_unit,
            qty_total=req.qty_total,
            qty_available=req.qty_available,
            qty_to_buy=req.qty_to_buy
        ))
    
    return ProjectDetailResponse(
        id=project.id,
        project_name=project.project_name,
        client_name=project.client_name,
        start_date=project.start_date,
        final_deadline=project.final_deadline,
        notes=project.notes,
        created_at=project.created_at,
        sale_price=float(project.sale_price) if project.sale_price else None,
        sale_includes_tax=project.sale_includes_tax,
        products=products_response,
        stages=stages_response,
        material_requirements=materials_response
    )


@router.post("/", response_model=ProjectDetailResponse)
def create_project(
    project_data: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_or_company_admin)
):
    """Create new project with products and stages"""
    if not current_user.company_id:
        raise HTTPException(status_code=403, detail="Admin must belong to a company")
    
    # Validate dates
    if project_data.start_date and project_data.final_deadline:
        if project_data.final_deadline < project_data.start_date:
            raise HTTPException(
                status_code=400,
                detail="La fecha de entrega no puede ser anterior a la fecha de inicio"
            )
    
    # Validate stages exist and belong to company
    if not project_data.stages or len(project_data.stages) == 0:
        raise HTTPException(
            status_code=400,
            detail="Project must have at least one stage"
        )
    
    for stage_data in project_data.stages:
        stage = db.query(Stage).filter(
            Stage.id == stage_data.stage_id,
            Stage.company_id == current_user.company_id
        ).first()
        if not stage:
            raise HTTPException(
                status_code=400,
                detail=f"Stage {stage_data.stage_id} not found or doesn't belong to your company"
            )
    
    # Validate products if provided
    if project_data.products:
        for product_item in project_data.products:
            product = db.query(Product).filter(
                Product.id == product_item.product_id,
                Product.company_id == current_user.company_id
            ).first()
            if not product:
                raise HTTPException(
                    status_code=400,
                    detail=f"Product {product_item.product_id} not found or doesn't belong to your company"
                )
    
    # Create project
    new_project = Project(
        company_id=current_user.company_id,
        project_name=project_data.project_name,
        client_name=project_data.client_name,
        start_date=project_data.start_date,
        final_deadline=project_data.final_deadline,
        notes=project_data.notes,
        sale_price=project_data.sale_price,
        sale_includes_tax=project_data.sale_includes_tax,
    )
    
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    
    # Create project products
    total_sum = 0
    for product_item in project_data.products:
        project_product = ProjectProduct(
            project_id=new_project.id,
            product_id=product_item.product_id,
            quantity=product_item.quantity
        )
        db.add(project_product)
        total_sum += product_item.quantity
    
    # Create project stages (use total sum as default qty_required)
    stage_id_map = {}  # Map temporary indices to actual project_stage.id
    
    for idx, stage_data in enumerate(project_data.stages):
        project_stage = ProjectStage(
            project_id=new_project.id,
            stage_id=stage_data.stage_id,
            status=StageStatus.BLOCKED,
            qty_required=stage_data.qty_required if stage_data.qty_required is not None else total_sum,
            qty_done=0,
            planned_due_date=stage_data.planned_due_date,
            notes=stage_data.notes,
            stage_order=stage_data.stage_order,
            has_operational_cost=stage_data.has_operational_cost,
            cost_per_unit=stage_data.cost_per_unit,
        )
        db.add(project_stage)
        db.flush()  # Get the ID without committing
        stage_id_map[idx] = project_stage.id
    
    # Create stage dependencies
    for idx, stage_data in enumerate(project_data.stages):
        if stage_data.depends_on:
            for dep_stage_id in stage_data.depends_on:
                # Find which index has this stage_id
                dep_idx = next((i for i, s in enumerate(project_data.stages) if s.stage_id == dep_stage_id), None)
                if dep_idx is not None:
                    dependency = ProjectStageDependency(
                        project_id=new_project.id,
                        stage_id=stage_id_map[idx],
                        depends_on_stage_id=stage_id_map[dep_idx]
                    )
                    db.add(dependency)
    
    # Generate material requirements from BOM if products provided
    if project_data.products:
        material_totals = {}  # material_id -> total_qty
        
        for product_item in project_data.products:
            # Get BOM items for this product
            bom_items = db.query(ProductBOMItem, Material).join(
                Material, ProductBOMItem.material_id == Material.id
            ).filter(
                ProductBOMItem.product_id == product_item.product_id
            ).all()
            
            for bom_item, material in bom_items:
                qty_for_this_product = bom_item.qty_per_unit * product_item.quantity
                
                if material.id not in material_totals:
                    material_totals[material.id] = 0
                material_totals[material.id] += qty_for_this_product
        
        # Create material requirements
        for material_id, qty_total in material_totals.items():
            material_req = ProjectMaterialRequirement(
                project_id=new_project.id,
                material_id=material_id,
                qty_per_unit=qty_total / total_sum,  # Average per unit based on total products
                qty_total=qty_total,
                qty_available=0,
                qty_to_buy=qty_total,
            )
            db.add(material_req)
    
    db.commit()
    
    # Auto-update stage statuses based on dependencies
    auto_update_stage_status(db, new_project.id)
    
    # Return full project details
    return get_project(new_project.id, db, current_user)


@router.put("/{project_id}", response_model=ProjectDetailResponse)
def update_project(
    project_id: int,
    project_data: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_or_company_admin)
):
    """Update project - can update basic info, products, stages, and economics"""
    if not current_user.company_id:
        raise HTTPException(status_code=403, detail="Admin must belong to a company")
    
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.company_id == current_user.company_id
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Validate dates if being updated
    start_date = project_data.start_date if project_data.start_date is not None else project.start_date
    final_deadline = project_data.final_deadline if project_data.final_deadline is not None else project.final_deadline
    
    if start_date and final_deadline and final_deadline < start_date:
        raise HTTPException(
            status_code=400,
            detail="La fecha de entrega no puede ser anterior a la fecha de inicio"
        )
    
    # Update basic fields
    if project_data.project_name is not None:
        project.project_name = project_data.project_name
    if project_data.client_name is not None:
        project.client_name = project_data.client_name
    if project_data.start_date is not None:
        project.start_date = project_data.start_date
    if project_data.final_deadline is not None:
        project.final_deadline = project_data.final_deadline
    if project_data.notes is not None:
        project.notes = project_data.notes
    if project_data.sale_price is not None:
        project.sale_price = project_data.sale_price
    if project_data.sale_includes_tax is not None:
        project.sale_includes_tax = project_data.sale_includes_tax
    
    # Update products if provided
    if project_data.products is not None:
        # Delete existing products
        db.query(ProjectProduct).filter(ProjectProduct.project_id == project_id).delete()
        
        # Add new products
        for product_item in project_data.products:
            project_product = ProjectProduct(
                project_id=project_id,
                product_id=product_item.product_id,
                quantity=product_item.quantity
            )
            db.add(project_product)
    
    # Update stages if provided
    if project_data.stages is not None:
        # Delete existing stages and dependencies
        db.query(ProjectStageDependency).filter(ProjectStageDependency.project_id == project_id).delete()
        db.query(ProjectStage).filter(ProjectStage.project_id == project_id).delete()
        
        # Add new stages
        stage_id_map = {}
        total_sum = sum(p.quantity for p in project_data.products) if project_data.products else 0
        
        for idx, stage_data in enumerate(project_data.stages):
            project_stage = ProjectStage(
                project_id=project_id,
                stage_id=stage_data.stage_id,
                status=StageStatus.BLOCKED,
                qty_required=stage_data.qty_required if stage_data.qty_required is not None else total_sum,
                qty_done=0,
                planned_due_date=stage_data.planned_due_date,
                notes=stage_data.notes,
                stage_order=stage_data.stage_order,
                has_operational_cost=stage_data.has_operational_cost,
                cost_per_unit=stage_data.cost_per_unit,
            )
            db.add(project_stage)
            db.flush()
            stage_id_map[idx] = project_stage.id
        
        # Create dependencies
        for idx, stage_data in enumerate(project_data.stages):
            if stage_data.depends_on:
                for dep_stage_id in stage_data.depends_on:
                    dep_idx = next((i for i, s in enumerate(project_data.stages) if s.stage_id == dep_stage_id), None)
                    if dep_idx is not None:
                        dependency = ProjectStageDependency(
                            project_id=project_id,
                            stage_id=stage_id_map[idx],
                            depends_on_stage_id=stage_id_map[dep_idx]
                        )
                        db.add(dependency)
        
        # Auto-update stage statuses
        db.commit()
        auto_update_stage_status(db, project_id)
    
    db.commit()
    
    return get_project(project_id, db, current_user)


def can_stage_be_ready(db: Session, project_stage_id: int) -> bool:
    """
    Check if a stage can be set to READY based on dependencies.
    Returns True if all dependencies are DONE.
    """
    dependencies = db.query(ProjectStageDependency).filter(
        ProjectStageDependency.stage_id == project_stage_id
    ).all()
    
    for dep in dependencies:
        dep_stage = db.query(ProjectStage).filter(
            ProjectStage.id == dep.depends_on_stage_id
        ).first()
        if not dep_stage or dep_stage.status != StageStatus.DONE:
            return False
    
    return True


def auto_update_stage_status(db: Session, project_id: int):
    """
    Auto-update stage statuses based on dependencies.
    Stages become READY when all their dependencies are DONE.
    """
    from app.services import notification_service
    
    stages = db.query(ProjectStage).filter(
        ProjectStage.project_id == project_id,
        ProjectStage.status == StageStatus.BLOCKED
    ).all()
    
    for stage in stages:
        if can_stage_be_ready(db, stage.id):
            stage.status = StageStatus.READY
            # 🔔 Notify workers that this stage is now ready (Type 1)
            notification_service.notify_stage_ready(db, stage.id)
    
    db.commit()


@router.put("/{project_id}/stages/{stage_id}", response_model=ProjectStageResponse)
def update_project_stage(
    project_id: int,
    stage_id: int,
    stage_data: ProjectStageUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update project stage - accessible by admins and workers with stage access"""
    from app.models.user import UserRole, UserStageAccess
    
    if not current_user.company_id:
        raise HTTPException(status_code=403, detail="User must belong to a company")
    
    # Verify project belongs to company
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.company_id == current_user.company_id
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get project stage
    project_stage = db.query(ProjectStage).filter(
        ProjectStage.id == stage_id,
        ProjectStage.project_id == project_id
    ).first()
    
    if not project_stage:
        raise HTTPException(status_code=404, detail="Project stage not found")
    
    # If user is a worker, verify they have access to this stage
    if current_user.role == UserRole.STAGE_WORKER:
        has_access = db.query(UserStageAccess).filter(
            UserStageAccess.user_id == current_user.id,
            UserStageAccess.stage_id == project_stage.stage_id
        ).first()
        
        if not has_access:
            raise HTTPException(status_code=403, detail="You don't have access to this stage")
    
    # Capture old status for logging
    old_status = project_stage.status
    
    # Update fields
    if stage_data.status is not None:
        # Validate: Cannot change status if stage is BLOCKED (unless setting to BLOCKED)
        if old_status == StageStatus.BLOCKED and stage_data.status != StageStatus.BLOCKED:
            # Check if dependencies are met
            if not can_stage_be_ready(db, project_stage.id):
                raise HTTPException(
                    status_code=400,
                    detail="No se puede cambiar el estado. Esta etapa está bloqueada porque tiene dependencias incompletas."
                )
        
        # Auto-register actual_started_at when moving to IN_PROGRESS for the first time
        if stage_data.status == StageStatus.IN_PROGRESS and old_status != StageStatus.IN_PROGRESS:
            if not project_stage.actual_started_at:
                from datetime import datetime
                project_stage.actual_started_at = datetime.now()
        
        # Auto-register actual_done_at when moving to DONE
        if stage_data.status == StageStatus.DONE and old_status != StageStatus.DONE:
            from datetime import datetime
            project_stage.actual_done_at = datetime.now()
        
        project_stage.status = stage_data.status
    if stage_data.qty_required is not None:
        project_stage.qty_required = stage_data.qty_required
    if stage_data.qty_done is not None:
        project_stage.qty_done = stage_data.qty_done
    if stage_data.planned_due_date is not None:
        project_stage.planned_due_date = stage_data.planned_due_date
    if stage_data.notes is not None:
        project_stage.notes = stage_data.notes
    if stage_data.has_operational_cost is not None:
        project_stage.has_operational_cost = stage_data.has_operational_cost
    if stage_data.cost_per_unit is not None:
        project_stage.cost_per_unit = stage_data.cost_per_unit
    
    db.commit()
    db.refresh(project_stage)
    
    # Log status change if status was updated
    if stage_data.status is not None and old_status != stage_data.status:
        event_log = StageEventLog(
            project_stage_id=project_stage.id,
            event_type="status_change",
            old_value=old_status.value,
            new_value=stage_data.status.value,
            user_id=current_user.id,
            notes=f"Status changed from {old_status.value} to {stage_data.status.value}"
        )
        db.add(event_log)
        db.commit()
        
        # If this stage was marked as DONE, check if other stages can become READY
        if stage_data.status == StageStatus.DONE:
            auto_update_stage_status(db, project_id)
    
    # Get stage name
    stage = db.query(Stage).filter(Stage.id == project_stage.stage_id).first()
    
    # Get dependencies
    dependencies = db.query(ProjectStageDependency).filter(
        ProjectStageDependency.stage_id == project_stage.id
    ).all()
    depends_on_ids = [dep.depends_on_stage_id for dep in dependencies]
    
    return ProjectStageResponse(
        id=project_stage.id,
        stage_id=project_stage.stage_id,
        stage_name=stage.name if stage else "Unknown",
        status=project_stage.status,
        qty_required=project_stage.qty_required,
        qty_done=project_stage.qty_done,
        planned_due_date=project_stage.planned_due_date,
        actual_ready_at=project_stage.actual_ready_at,
        actual_started_at=project_stage.actual_started_at,
        actual_done_at=project_stage.actual_done_at,
        notes=project_stage.notes,
        stage_order=project_stage.stage_order,
        depends_on=depends_on_ids,
        has_operational_cost=project_stage.has_operational_cost,
        cost_per_unit=float(project_stage.cost_per_unit) if project_stage.cost_per_unit else None
    )


@router.put("/{project_id}/materials/{requirement_id}", response_model=MaterialRequirementResponse)
def update_material_requirement(
    project_id: int,
    requirement_id: int,
    req_data: ProjectMaterialRequirementUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_or_company_admin)
):
    """Update material requirement for project"""
    if not current_user.company_id:
        raise HTTPException(status_code=403, detail="Admin must belong to a company")
    
    # Verify project belongs to company
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.company_id == current_user.company_id
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get material requirement
    requirement = db.query(ProjectMaterialRequirement).filter(
        ProjectMaterialRequirement.id == requirement_id,
        ProjectMaterialRequirement.project_id == project_id
    ).first()
    
    if not requirement:
        raise HTTPException(status_code=404, detail="Material requirement not found")
    
    # Update fields
    if req_data.qty_per_unit is not None:
        requirement.qty_per_unit = req_data.qty_per_unit
        requirement.qty_total = req_data.qty_per_unit * project.total_qty
    
    if req_data.qty_available is not None:
        requirement.qty_available = req_data.qty_available
    
    # Recalculate qty_to_buy
    requirement.qty_to_buy = max(0, requirement.qty_total - requirement.qty_available)
    
    db.commit()
    db.refresh(requirement)
    
    # Get material info
    material = db.query(Material).filter(Material.id == requirement.material_id).first()
    
    req_dict = MaterialRequirementResponse.model_validate(requirement).model_dump()
    req_dict['material_name'] = material.name if material else "Unknown"
    req_dict['material_unit'] = material.unit if material else ""
    
    return MaterialRequirementResponse(**req_dict)


@router.delete("/{project_id}")
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_or_company_admin)
):
    """Delete project"""
    if not current_user.company_id:
        raise HTTPException(status_code=403, detail="Admin must belong to a company")
    
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.company_id == current_user.company_id
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Delete related records (cascade should handle this, but being explicit)
    db.query(ProjectStage).filter(ProjectStage.project_id == project_id).delete()
    db.query(ProjectMaterialRequirement).filter(ProjectMaterialRequirement.project_id == project_id).delete()
    
    db.delete(project)
    db.commit()
    
    return {"message": "Project deleted successfully"}


@router.post("/{project_id}/stages/{project_stage_id}/purchase-material/", response_model=ProjectMaterialPurchaseResponse)
def purchase_material_in_project_stage(
    project_id: int,
    project_stage_id: int,
    purchase_data: ProjectMaterialPurchaseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Purchase/approve a material in the purchasing stage of a project.
    - If company tracks raw materials inventory: SUBTRACTS from materials.qty_available
    - Creates financial_event for the cost
    - Records the purchase in project_material_purchases
    """
    # Get company settings
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Verify project exists and belongs to company
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.company_id == current_user.company_id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Verify project_stage exists and belongs to project
    project_stage = db.query(ProjectStage, Stage).join(
        Stage, ProjectStage.stage_id == Stage.id
    ).filter(
        ProjectStage.id == project_stage_id,
        ProjectStage.project_id == project_id
    ).first()
    
    if not project_stage:
        raise HTTPException(status_code=404, detail="Project stage not found")
    
    project_stage_obj, stage_obj = project_stage
    
    # Verify this is a purchasing stage
    if not stage_obj.is_purchasing_stage:
        raise HTTPException(
            status_code=400, 
            detail="This operation can only be performed on purchasing stages"
        )
    
    # Verify material exists and belongs to company
    material = db.query(Material).filter(
        Material.id == purchase_data.material_id,
        Material.company_id == current_user.company_id
    ).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    
    # Verify supplier if provided
    supplier = None
    if purchase_data.supplier_id:
        supplier = db.query(Supplier).filter(
            Supplier.id == purchase_data.supplier_id,
            Supplier.company_id == current_user.company_id
        ).first()
        if not supplier:
            raise HTTPException(status_code=404, detail="Supplier not found")
    
    # Calculate how much material is needed for this project based on BOM
    # Get all products in the project
    project_products = db.query(ProjectProduct, Product).join(
        Product, ProjectProduct.product_id == Product.id
    ).filter(
        ProjectProduct.project_id == project_id
    ).all()
    
    # Calculate total material needed from BOM
    total_needed = Decimal(0)
    material_in_bom = False
    for project_product, product in project_products:
        bom_item = db.query(ProductBOMItem).filter(
            ProductBOMItem.product_id == product.id,
            ProductBOMItem.material_id == purchase_data.material_id
        ).first()
        if bom_item:
            material_in_bom = True
            total_needed += Decimal(str(bom_item.qty_per_unit)) * Decimal(str(project_product.quantity))
    
    if not material_in_bom:
        raise HTTPException(
            status_code=400, 
            detail="This material is not required in the BOM for any product in this project"
        )
    
    # Calculate how much has already been purchased/used
    already_purchased = db.query(func.sum(ProjectMaterialPurchase.quantity_purchased)).filter(
        ProjectMaterialPurchase.project_id == project_id,
        ProjectMaterialPurchase.material_id == purchase_data.material_id
    ).scalar() or Decimal(0)
    
    # Calculate weighted average cost from actual purchases of this material
    # This gives us the real cost based on purchase history, not a fixed value
    from app.models.purchase import MaterialPurchase
    
    material_purchases = db.query(MaterialPurchase).filter(
        MaterialPurchase.company_id == current_user.company_id,
        MaterialPurchase.material_id == purchase_data.material_id
    ).all()
    
    if material_purchases:
        # Calculate weighted average: (sum of quantity × unit_cost) / total quantity
        total_cost_all_purchases = sum(
            Decimal(str(p.quantity)) * Decimal(str(p.unit_cost)) 
            for p in material_purchases
        )
        total_quantity_all_purchases = sum(Decimal(str(p.quantity)) for p in material_purchases)
        
        if total_quantity_all_purchases > 0:
            unit_cost_from_purchases = total_cost_all_purchases / total_quantity_all_purchases
        else:
            # Fallback to material's cost_per_unit if no valid purchases
            unit_cost_from_purchases = Decimal(str(material.cost_per_unit or 0))
    else:
        # No purchase history, use material's default cost
        unit_cost_from_purchases = Decimal(str(material.cost_per_unit or 0))
    
    total_cost = Decimal(str(purchase_data.quantity_purchased)) * unit_cost_from_purchases
    
    # Create purchase record with calculated weighted average cost
    new_purchase = ProjectMaterialPurchase(
        project_id=project_id,
        project_stage_id=project_stage_id,
        material_id=purchase_data.material_id,
        supplier_id=purchase_data.supplier_id,
        quantity_purchased=float(purchase_data.quantity_purchased),
        unit_cost=float(unit_cost_from_purchases),  # Use weighted average cost
        purchase_date=purchase_data.purchase_date,
        notes=purchase_data.notes,
        created_by=current_user.id
    )
    db.add(new_purchase)
    
    # Update qty_done in the stage (increment with purchased quantity)
    current_qty_done = Decimal(str(project_stage_obj.qty_done or 0))
    project_stage_obj.qty_done = float(current_qty_done + Decimal(str(purchase_data.quantity_purchased)))
    
    # Update material inventory if tracking is enabled
    inventory_updated = False
    if company.track_raw_materials_inventory:
        # Subtract from available inventory
        current_available = Decimal(str(material.qty_available or 0))
        quantity_to_subtract = Decimal(str(purchase_data.quantity_purchased))
        
        if current_available < quantity_to_subtract:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient inventory. Available: {current_available}, Requested: {purchase_data.quantity_purchased}"
            )
        material.qty_available = current_available - quantity_to_subtract
        inventory_updated = True
    
    # Create financial event (cost)
    financial_event = FinancialEvent(
        project_id=project_id,
        type=FinancialEventType.COST,
        amount=total_cost,
        date=purchase_data.purchase_date,
        category="Material Purchase",
        note=f"Purchase of {purchase_data.quantity_purchased} {material.unit} of {material.name}" + 
             (f" from {supplier.name}" if supplier else "")
    )
    db.add(financial_event)
    
    db.commit()
    
    # Calculate remaining quantity needed
    qty_remaining = total_needed - already_purchased - Decimal(str(purchase_data.quantity_purchased))
    
    return ProjectMaterialPurchaseResponse(
        material_id=material.id,
        material_name=material.name,
        quantity_purchased=Decimal(str(purchase_data.quantity_purchased)),
        unit_cost=unit_cost_from_purchases,
        total_cost=Decimal(str(total_cost)),
        qty_required=total_needed,
        qty_remaining=max(Decimal(0), qty_remaining),
        inventory_updated=inventory_updated
    )


@router.get("/{project_id}/financial-summary")
def get_project_financial_summary(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive financial summary for a project including:
    - Sale price (with/without IVA)
    - Material costs (from project_material_purchases)
    - Operational costs (from stages with has_operational_cost)
    - Total costs
    - Estimated profit and margin
    """
    if not current_user.company_id:
        raise HTTPException(status_code=403, detail="User must belong to a company")
    
    # Verify project exists and belongs to company
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.company_id == current_user.company_id
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Calculate material costs from purchases
    material_purchases = db.query(ProjectMaterialPurchase).filter(
        ProjectMaterialPurchase.project_id == project_id
    ).all()
    
    material_costs = sum(
        float(p.unit_cost) * float(p.quantity_purchased) 
        for p in material_purchases
    )
    
    # Get material breakdown
    material_breakdown = []
    material_summary = {}
    for purchase in material_purchases:
        material = db.query(Material).filter(Material.id == purchase.material_id).first()
        if material:
            material_name = material.name
            cost = float(purchase.unit_cost) * float(purchase.quantity_purchased)
            
            if material_name not in material_summary:
                material_summary[material_name] = {
                    "material_name": material_name,
                    "total_quantity": 0,
                    "unit": material.unit,
                    "total_cost": 0
                }
            
            material_summary[material_name]["total_quantity"] += float(purchase.quantity_purchased)
            material_summary[material_name]["total_cost"] += cost
    
    material_breakdown = list(material_summary.values())
    
    # Calculate operational costs from stages
    project_stages = db.query(ProjectStage).filter(
        ProjectStage.project_id == project_id,
        ProjectStage.has_operational_cost == True
    ).all()
    
    operational_costs = sum(
        float(stage.cost_per_unit or 0) * float(stage.qty_done or 0)
        for stage in project_stages
    )
    
    # Get operational breakdown
    operational_breakdown = []
    for stage in project_stages:
        stage_info = db.query(Stage).filter(Stage.id == stage.stage_id).first()
        if stage_info and stage.cost_per_unit:
            operational_breakdown.append({
                "stage_name": stage_info.name,
                "cost_per_unit": float(stage.cost_per_unit),
                "qty_done": float(stage.qty_done or 0),
                "total_cost": float(stage.cost_per_unit) * float(stage.qty_done or 0)
            })
    
    # Calculate totals
    total_costs = material_costs + operational_costs
    sale_price = float(project.sale_price or 0)
    
    # Calculate profit
    estimated_profit = sale_price - total_costs
    profit_margin_percent = (estimated_profit / sale_price * 100) if sale_price > 0 else 0
    
    # IVA breakdown if applicable
    iva_breakdown = None
    if project.sale_includes_tax and sale_price > 0:
        base_price = sale_price / 1.19
        iva_amount = sale_price - base_price
        iva_breakdown = {
            "base_price": round(base_price, 2),
            "iva_amount": round(iva_amount, 2),
            "iva_percentage": 19
        }
    
    return {
        "project_id": project.id,
        "project_name": project.project_name,
        "sale_price": sale_price,
        "sale_includes_tax": project.sale_includes_tax,
        "iva_breakdown": iva_breakdown,
        "material_costs": round(material_costs, 2),
        "material_breakdown": material_breakdown,
        "operational_costs": round(operational_costs, 2),
        "operational_breakdown": operational_breakdown,
        "total_costs": round(total_costs, 2),
        "estimated_profit": round(estimated_profit, 2),
        "profit_margin_percent": round(profit_margin_percent, 2)
    }


@router.post("/{project_id}/complete/")
def complete_project(
    project_id: int,
    current_user: User = Depends(check_admin_or_company_admin),
    db: Session = Depends(get_db)
):
    """
    Mark project as complete and handle inventory updates:
    - If track_finished_products_inventory=true: Add products to inventory
    - Optionally create income financial event
    """
    # Get company settings
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Verify project exists and belongs to company
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.company_id == current_user.company_id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get all project products
    project_products = db.query(ProjectProduct, Product).join(
        Product, ProjectProduct.product_id == Product.id
    ).filter(
        ProjectProduct.project_id == project_id
    ).all()
    
    if not project_products:
        raise HTTPException(
            status_code=400,
            detail="Project has no products"
        )
    
    products_updated = []
    
    # If company tracks finished products inventory, update it
    if company.track_finished_products_inventory:
        for project_product, product in project_products:
            # Check if inventory record exists
            inventory = db.query(ProductInventory).filter(
                ProductInventory.company_id == current_user.company_id,
                ProductInventory.product_id == product.id
            ).first()
            
            if inventory:
                # Update existing
                inventory.qty_available += project_product.quantity
                db.flush()
            else:
                # Create new
                inventory = ProductInventory(
                    company_id=current_user.company_id,
                    product_id=product.id,
                    qty_available=project_product.quantity
                )
                db.add(inventory)
                db.flush()
            
            products_updated.append({
                "product_id": product.id,
                "product_name": product.name,
                "quantity_added": project_product.quantity,
                "new_inventory": float(inventory.qty_available)
            })
    
    db.commit()
    
    return {
        "message": "Project completed successfully",
        "inventory_tracked": company.track_finished_products_inventory,
        "products_updated": products_updated if company.track_finished_products_inventory else None
    }


@router.get("/{project_id}/stages/{stage_id}/detail")
def get_project_stage_detail(
    project_id: int,
    stage_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get detailed information for a specific project stage - accessible by admins and workers with stage access"""
    from app.models.user import UserRole, UserStageAccess
    
    if not current_user.company_id:
        raise HTTPException(status_code=403, detail="User must belong to a company")
    
    # Verify project exists and belongs to company
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.company_id == current_user.company_id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get project stage with stage info
    project_stage = db.query(ProjectStage, Stage).join(
        Stage, ProjectStage.stage_id == Stage.id
    ).filter(
        ProjectStage.id == stage_id,
        ProjectStage.project_id == project_id
    ).first()
    
    if not project_stage:
        raise HTTPException(status_code=404, detail="Project stage not found")
    
    ps, stage = project_stage
    
    # If user is a worker, verify they have access to this stage
    if current_user.role == UserRole.STAGE_WORKER:
        has_access = db.query(UserStageAccess).filter(
            UserStageAccess.user_id == current_user.id,
            UserStageAccess.stage_id == ps.stage_id
        ).first()
        
        if not has_access:
            raise HTTPException(status_code=403, detail="You don't have access to this stage")
    
    # Get project products
    products = db.query(ProjectProduct, Product).join(
        Product, ProjectProduct.product_id == Product.id
    ).filter(
        ProjectProduct.project_id == project_id
    ).all()
    
    products_response = [
        {
            'product_id': product.id,
            'product_name': product.name,
            'quantity': pp.quantity
        }
        for pp, product in products
    ]
    
    # If it's a purchasing stage, get materials info
    materials_info = []
    if stage.is_purchasing_stage:
        # Get materials from BOM
        for pp, product in products:
            bom_items = db.query(ProductBOMItem, Material).join(
                Material, ProductBOMItem.material_id == Material.id
            ).filter(
                ProductBOMItem.product_id == product.id
            ).all()
            
            for bom, material in bom_items:
                total_needed = bom.qty_per_unit * pp.quantity
                
                # Check how much has been purchased for this project/stage
                purchased = db.query(func.sum(ProjectMaterialPurchase.quantity_purchased)).filter(
                    ProjectMaterialPurchase.project_id == project_id,
                    ProjectMaterialPurchase.project_stage_id == stage_id,
                    ProjectMaterialPurchase.material_id == material.id
                ).scalar() or 0
                
                materials_info.append({
                    'material_id': material.id,
                    'material_name': material.name,
                    'material_unit': material.unit,
                    'qty_per_unit': float(bom.qty_per_unit),
                    'qty_needed': float(total_needed),
                    'qty_purchased': float(purchased),
                    'qty_remaining': float(total_needed - purchased),
                    'inventory_available': float(material.qty_available),
                })
    
    return {
        'project_id': project.id,
        'project_name': project.project_name,
        'client_name': project.client_name,
        'start_date': project.start_date,
        'final_deadline': project.final_deadline,
        'stage_id': ps.id,
        'stage_name': stage.name,
        'stage_status': ps.status,
        'is_purchasing_stage': stage.is_purchasing_stage,
        'qty_required': ps.qty_required,
        'qty_done': ps.qty_done,
        'planned_due_date': ps.planned_due_date,
        'actual_ready_at': ps.actual_ready_at,
        'actual_started_at': ps.actual_started_at,
        'actual_done_at': ps.actual_done_at,
        'notes': ps.notes,
        'products': products_response,
        'materials': materials_info if stage.is_purchasing_stage else []
    }


@router.get("/{project_id}/stages/{stage_id}/events")
def get_stage_events(
    project_id: int,
    stage_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get event log for a specific stage - accessible by admins and workers with stage access"""
    from app.models.user import UserRole, UserStageAccess
    
    if not current_user.company_id:
        raise HTTPException(status_code=403, detail="User must belong to a company")
    
    # Verify project belongs to company
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.company_id == current_user.company_id
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Verify stage belongs to project
    project_stage = db.query(ProjectStage).filter(
        ProjectStage.id == stage_id,
        ProjectStage.project_id == project_id
    ).first()
    
    if not project_stage:
        raise HTTPException(status_code=404, detail="Stage not found")
    
    # If user is a worker, verify they have access to this stage
    if current_user.role == UserRole.STAGE_WORKER:
        has_access = db.query(UserStageAccess).filter(
            UserStageAccess.user_id == current_user.id,
            UserStageAccess.stage_id == project_stage.stage_id
        ).first()
        
        if not has_access:
            raise HTTPException(status_code=403, detail="You don't have access to this stage")
    
    # Get event logs
    events = db.query(StageEventLog, User).outerjoin(
        User, StageEventLog.user_id == User.id
    ).filter(
        StageEventLog.project_stage_id == stage_id
    ).order_by(StageEventLog.timestamp.desc()).all()
    
    result = []
    for event, user in events:
        result.append({
            'id': event.id,
            'event_type': event.event_type,
            'old_value': event.old_value,
            'new_value': event.new_value,
            'user_name': user.username if user else 'Unknown',
            'timestamp': event.timestamp,
            'notes': event.notes
        })
    
    return result
