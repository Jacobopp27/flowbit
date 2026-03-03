from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List
from datetime import date, timedelta

from app.database import get_db
from app.models.template import ProjectTemplate, ProjectTemplateStage, ProjectTemplateStageDependency
from app.models.stage import Stage
from app.schemas.template import (
    TemplateCreate,
    TemplateUpdate,
    TemplateListResponse,
    TemplateDetailResponse,
    TemplateStageResponse,
    ApplyTemplateRequest,
    ApplyTemplateResponse,
    AppliedStageResponse,
)
from app.api.auth import get_current_user, check_admin_or_company_admin
from app.models.user import User

router = APIRouter()


@router.get("/", response_model=List[TemplateListResponse])
def list_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all templates for the user's company"""
    templates = db.query(ProjectTemplate).filter(
        ProjectTemplate.company_id == current_user.company_id
    ).all()

    result = []
    for template in templates:
        stages_count = db.query(ProjectTemplateStage).filter(
            ProjectTemplateStage.template_id == template.id
        ).count()

        result.append(TemplateListResponse(
            id=template.id,
            name=template.name,
            description=template.description,
            stages_count=stages_count,
            created_at=template.created_at,
            updated_at=template.updated_at,
        ))

    return result


@router.get("/{template_id}", response_model=TemplateDetailResponse)
def get_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get detailed information about a template"""
    template = db.query(ProjectTemplate).filter(
        and_(
            ProjectTemplate.id == template_id,
            ProjectTemplate.company_id == current_user.company_id
        )
    ).first()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )

    # Get stages with their dependencies
    template_stages = db.query(ProjectTemplateStage).filter(
        ProjectTemplateStage.template_id == template_id
    ).order_by(ProjectTemplateStage.stage_order).all()

    stages_response = []
    for ts in template_stages:
        # Get dependencies for this stage
        dependencies = db.query(ProjectTemplateStageDependency).filter(
            ProjectTemplateStageDependency.template_stage_id == ts.id
        ).all()

        depends_on_stage_ids = [
            dep.depends_on_stage.stage_id for dep in dependencies
        ]

        stages_response.append(TemplateStageResponse(
            id=ts.id,
            stage_id=ts.stage_id,
            stage_name=ts.stage.name,
            duration_days=ts.duration_days,
            stage_order=ts.stage_order,
            has_operational_cost=ts.has_operational_cost,
            cost_per_unit=float(ts.cost_per_unit) if ts.cost_per_unit else None,
            depends_on_stage_ids=depends_on_stage_ids,
        ))

    return TemplateDetailResponse(
        id=template.id,
        name=template.name,
        description=template.description,
        stages=stages_response,
        created_at=template.created_at,
        updated_at=template.updated_at,
    )


@router.post("/", response_model=TemplateDetailResponse, status_code=status.HTTP_201_CREATED)
def create_template(
    template_data: TemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_or_company_admin)
):
    """Create a new project template"""
    # Check if template name is unique within company
    existing = db.query(ProjectTemplate).filter(
        and_(
            ProjectTemplate.company_id == current_user.company_id,
            ProjectTemplate.name == template_data.name
        )
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Template with name '{template_data.name}' already exists"
        )

    # Validate that all stages exist and belong to the company
    stage_ids = [s.stage_id for s in template_data.stages]
    stages = db.query(Stage).filter(
        and_(
            Stage.id.in_(stage_ids),
            Stage.company_id == current_user.company_id
        )
    ).all()

    if len(stages) != len(stage_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more stages not found or do not belong to your company"
        )

    # Validate dependencies reference valid stages
    for stage_data in template_data.stages:
        for dep_stage_id in stage_data.depends_on_stage_ids:
            if dep_stage_id not in stage_ids:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Dependency stage {dep_stage_id} is not included in template stages"
                )

    # Create template
    template = ProjectTemplate(
        company_id=current_user.company_id,
        name=template_data.name,
        description=template_data.description,
        created_by=current_user.id,
    )
    db.add(template)
    db.flush()

    # Create template stages
    stage_id_to_template_stage = {}
    for stage_data in template_data.stages:
        ts = ProjectTemplateStage(
            template_id=template.id,
            stage_id=stage_data.stage_id,
            duration_days=stage_data.duration_days,
            stage_order=stage_data.stage_order,
            has_operational_cost=stage_data.has_operational_cost,
            cost_per_unit=stage_data.cost_per_unit,
        )
        db.add(ts)
        db.flush()
        stage_id_to_template_stage[stage_data.stage_id] = ts

    # Create dependencies
    for stage_data in template_data.stages:
        template_stage = stage_id_to_template_stage[stage_data.stage_id]
        for dep_stage_id in stage_data.depends_on_stage_ids:
            dep_template_stage = stage_id_to_template_stage[dep_stage_id]
            dependency = ProjectTemplateStageDependency(
                template_id=template.id,
                template_stage_id=template_stage.id,
                depends_on_template_stage_id=dep_template_stage.id,
            )
            db.add(dependency)

    db.commit()
    db.refresh(template)

    return get_template(template.id, db, current_user)


@router.put("/{template_id}", response_model=TemplateDetailResponse)
def update_template(
    template_id: int,
    template_data: TemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_or_company_admin)
):
    """Update a template"""
    template = db.query(ProjectTemplate).filter(
        and_(
            ProjectTemplate.id == template_id,
            ProjectTemplate.company_id == current_user.company_id
        )
    ).first()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )

    # Update name if provided
    if template_data.name is not None:
        # Check uniqueness
        existing = db.query(ProjectTemplate).filter(
            and_(
                ProjectTemplate.company_id == current_user.company_id,
                ProjectTemplate.name == template_data.name,
                ProjectTemplate.id != template_id
            )
        ).first()

        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Template with name '{template_data.name}' already exists"
            )

        template.name = template_data.name

    if template_data.description is not None:
        template.description = template_data.description

    # If stages provided, replace all stages
    if template_data.stages is not None:
        # Validate stages
        stage_ids = [s.stage_id for s in template_data.stages]
        stages = db.query(Stage).filter(
            and_(
                Stage.id.in_(stage_ids),
                Stage.company_id == current_user.company_id
            )
        ).all()

        if len(stages) != len(stage_ids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="One or more stages not found or do not belong to your company"
            )

        # Validate dependencies
        for stage_data in template_data.stages:
            for dep_stage_id in stage_data.depends_on_stage_ids:
                if dep_stage_id not in stage_ids:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Dependency stage {dep_stage_id} is not included in template stages"
                    )

        # Delete existing stages and dependencies (CASCADE will handle dependencies)
        db.query(ProjectTemplateStage).filter(
            ProjectTemplateStage.template_id == template_id
        ).delete()

        # Create new stages
        stage_id_to_template_stage = {}
        for stage_data in template_data.stages:
            ts = ProjectTemplateStage(
                template_id=template.id,
                stage_id=stage_data.stage_id,
                duration_days=stage_data.duration_days,
                stage_order=stage_data.stage_order,
                has_operational_cost=stage_data.has_operational_cost,
                cost_per_unit=stage_data.cost_per_unit,
            )
            db.add(ts)
            db.flush()
            stage_id_to_template_stage[stage_data.stage_id] = ts

        # Create new dependencies
        for stage_data in template_data.stages:
            template_stage = stage_id_to_template_stage[stage_data.stage_id]
            for dep_stage_id in stage_data.depends_on_stage_ids:
                dep_template_stage = stage_id_to_template_stage[dep_stage_id]
                dependency = ProjectTemplateStageDependency(
                    template_id=template.id,
                    template_stage_id=template_stage.id,
                    depends_on_template_stage_id=dep_template_stage.id,
                )
                db.add(dependency)

    db.commit()
    db.refresh(template)

    return get_template(template.id, db, current_user)


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_or_company_admin)
):
    """Delete a template"""
    template = db.query(ProjectTemplate).filter(
        and_(
            ProjectTemplate.id == template_id,
            ProjectTemplate.company_id == current_user.company_id
        )
    ).first()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )

    db.delete(template)
    db.commit()

    return None


@router.post("/{template_id}/apply", response_model=ApplyTemplateResponse)
def apply_template(
    template_id: int,
    request: ApplyTemplateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Apply template to convert durations to absolute dates"""
    template = db.query(ProjectTemplate).filter(
        and_(
            ProjectTemplate.id == template_id,
            ProjectTemplate.company_id == current_user.company_id
        )
    ).first()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )

    # Get template stages ordered
    template_stages = db.query(ProjectTemplateStage).filter(
        ProjectTemplateStage.template_id == template_id
    ).order_by(ProjectTemplateStage.stage_order).all()

    if not template_stages:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Template has no stages"
        )

    # Calculate total duration
    total_duration = sum(ts.duration_days for ts in template_stages)

    # Determine start date
    if request.start_date:
        start_date = request.start_date
    elif request.final_deadline:
        # Calculate backwards from deadline
        start_date = request.final_deadline - timedelta(days=total_duration)
    else:
        # Default to today
        start_date = date.today()

    # Calculate end date (duration is inclusive: 1 day = same day, 2 days = next day)
    end_date = start_date + timedelta(days=total_duration - 1)

    # Build stage responses with calculated dates
    applied_stages = []
    current_date = start_date

    for ts in template_stages:
        # Calculate planned due date for this stage (inclusive duration)
        # If duration is 1 day and starts today, it ends today
        # If duration is 2 days and starts today, it ends tomorrow
        planned_due_date = current_date + timedelta(days=ts.duration_days - 1)

        # Get dependencies for this stage
        dependencies = db.query(ProjectTemplateStageDependency).filter(
            ProjectTemplateStageDependency.template_stage_id == ts.id
        ).all()

        depends_on_stage_ids = [
            dep.depends_on_stage.stage_id for dep in dependencies
        ]

        applied_stages.append(AppliedStageResponse(
            stage_id=ts.stage_id,
            stage_name=ts.stage.name,
            planned_due_date=planned_due_date,
            has_operational_cost=ts.has_operational_cost,
            cost_per_unit=float(ts.cost_per_unit) if ts.cost_per_unit else None,
            depends_on=depends_on_stage_ids,
            stage_order=ts.stage_order,
        ))

        # Next stage starts the day after this one ends
        current_date = planned_due_date + timedelta(days=1)

    return ApplyTemplateResponse(
        stages=applied_stages,
        calculated_start_date=start_date,
        calculated_end_date=end_date,
    )
