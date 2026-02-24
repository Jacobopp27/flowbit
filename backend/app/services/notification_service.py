from datetime import datetime, date, timedelta
from sqlalchemy.orm import Session
from app.models.notification import Notification
from app.models.user import User, UserStageAccess
from app.models.project import Project, ProjectStage
from app.models.stage import Stage, StageStatus
from typing import Optional


def create_notification(
    db: Session,
    user_id: int,
    notification_type: str,
    title: str,
    message: str,
    project_id: Optional[int] = None,
    project_stage_id: Optional[int] = None
) -> Notification:
    """Create a new notification for a user"""
    notification = Notification(
        user_id=user_id,
        type=notification_type,
        title=title,
        message=message,
        project_id=project_id,
        project_stage_id=project_stage_id
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


def notify_stage_ready(db: Session, project_stage_id: int):
    """Notify workers and admins when a stage becomes ready to start (Type 1)"""
    project_stage = db.query(ProjectStage).filter(
        ProjectStage.id == project_stage_id
    ).first()
    
    if not project_stage:
        return
    
    # Get the stage definition
    stage = db.query(Stage).filter(Stage.id == project_stage.stage_id).first()
    if not stage:
        return
    
    project = project_stage.project
    notified_users = set()  # Avoid duplicate notifications
    
    # 1. Notify company admin
    admin = db.query(User).filter(
        User.company_id == project.company_id,
        User.role.in_(["COMPANY_ADMIN", "SUPER_ADMIN"]),
        User.is_active == True
    ).first()
    
    if admin:
        create_notification(
            db=db,
            user_id=admin.id,
            notification_type="STAGE_READY",
            title=f"Etapa desbloqueada: {stage.name}",
            message=f"La etapa '{stage.name}' del proyecto '{project.project_name}' ahora está lista para comenzar. Cliente: {project.client_name}",
            project_id=project.id,
            project_stage_id=project_stage_id
        )
        notified_users.add(admin.id)
    
    # 2. Notify workers who have access to this stage type
    workers = db.query(User).join(UserStageAccess).filter(
        UserStageAccess.stage_id == stage.id,
        User.company_id == project.company_id,
        User.is_active == True,
        User.id.notin_(notified_users)
    ).all()
    
    for worker in workers:
        create_notification(
            db=db,
            user_id=worker.id,
            notification_type="STAGE_READY",
            title=f"Nueva etapa disponible: {stage.name}",
            message=f"El proyecto '{project.project_name}' está listo para comenzar en la etapa '{stage.name}'. Cliente: {project.client_name}",
            project_id=project.id,
            project_stage_id=project_stage_id
        )


def check_delayed_stages(db: Session):
    """Check for stages that are delayed by 2+ days and notify admins (Type 2)"""
    today = date.today()
    two_days_ago = today - timedelta(days=2)
    
    # Find stages that should have been completed 2+ days ago
    delayed_stages = db.query(ProjectStage).join(Project).filter(
        ProjectStage.status == StageStatus.IN_PROGRESS,
        ProjectStage.planned_due_date <= two_days_ago
    ).all()
    
    for project_stage in delayed_stages:
        project = project_stage.project
        stage = db.query(Stage).filter(Stage.id == project_stage.stage_id).first()
        
        if not stage:
            continue
        
        # Get company admin
        admin = db.query(User).filter(
            User.company_id == project.company_id,
            User.role.in_(["COMPANY_ADMIN", "SUPER_ADMIN"]),
            User.is_active == True
        ).first()
        
        if not admin:
            continue
        
        days_late = (today - project_stage.planned_due_date).days
        
        # Check if we already notified about this delay recently (avoid spam)
        recent_notification = db.query(Notification).filter(
            Notification.user_id == admin.id,
            Notification.type == "STAGE_DELAYED",
            Notification.project_stage_id == project_stage.id,
            Notification.created_at >= datetime.now() - timedelta(days=1)
        ).first()
        
        if recent_notification:
            continue
        
        create_notification(
            db=db,
            user_id=admin.id,
            notification_type="STAGE_DELAYED",
            title=f"⚠️ Etapa retrasada: {stage.name}",
            message=f"La etapa '{stage.name}' del proyecto '{project.project_name}' (Cliente: {project.client_name}) lleva {days_late} días de retraso. Se esperaba completar el {project_stage.planned_due_date.strftime('%d/%m/%Y')}.",
            project_id=project.id,
            project_stage_id=project_stage.id
        )


def check_upcoming_deadlines(db: Session):
    """Check for projects with deadline in 15 days and notify admins (Type 3)"""
    today = date.today()
    deadline_threshold = today + timedelta(days=15)
    
    # Find projects that have deadline exactly 15 days from now
    projects = db.query(Project).filter(
        Project.final_deadline == deadline_threshold
    ).all()
    
    for project in projects:
        # Check if project is completed
        all_stages = db.query(ProjectStage).filter(
            ProjectStage.project_id == project.id
        ).all()
        
        if all(stage.status == StageStatus.DONE for stage in all_stages):
            continue  # Project already completed
        
        # Get current stage (first IN_PROGRESS or READY stage)
        current_stage_ps = db.query(ProjectStage).join(Stage).filter(
            ProjectStage.project_id == project.id,
            ProjectStage.status.in_([StageStatus.IN_PROGRESS, StageStatus.READY])
        ).order_by(ProjectStage.stage_order).first()
        
        if current_stage_ps:
            current_stage = db.query(Stage).filter(
                Stage.id == current_stage_ps.stage_id
            ).first()
            stage_info = f"en la etapa '{current_stage.name}'" if current_stage else "procesando"
        else:
            stage_info = "sin etapas activas"
        
        # Get company admin
        admin = db.query(User).filter(
            User.company_id == project.company_id,
            User.role.in_(["COMPANY_ADMIN", "SUPER_ADMIN"]),
            User.is_active == True
        ).first()
        
        if not admin:
            continue
        
        create_notification(
            db=db,
            user_id=admin.id,
            notification_type="PROJECT_DEADLINE_SOON",
            title=f"⏰ Proyecto próximo a vencer: {project.project_name}",
            message=f"El proyecto '{project.project_name}' (Cliente: {project.client_name}) se debe entregar en 15 días ({deadline_threshold.strftime('%d/%m/%Y')}). Actualmente está {stage_info}.",
            project_id=project.id
        )


def mark_notification_as_read(db: Session, notification_id: int, user_id: int) -> bool:
    """Mark a notification as read"""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == user_id
    ).first()
    
    if not notification:
        return False
    
    notification.is_read = True
    db.commit()
    return True


def mark_all_as_read(db: Session, user_id: int) -> int:
    """Mark all notifications as read for a user. Returns count of updated notifications."""
    count = db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.is_read == False
    ).update({"is_read": True})
    
    db.commit()
    return count


def get_user_notifications(
    db: Session,
    user_id: int,
    unread_only: bool = False,
    limit: int = 50
) -> tuple[list[Notification], int]:
    """Get notifications for a user. Returns (notifications, unread_count)"""
    query = db.query(Notification).filter(Notification.user_id == user_id)
    
    if unread_only:
        query = query.filter(Notification.is_read == False)
    
    notifications = query.order_by(Notification.created_at.desc()).limit(limit).all()
    
    # Get unread count
    unread_count = db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.is_read == False
    ).count()
    
    return notifications, unread_count
