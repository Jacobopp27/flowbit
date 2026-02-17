# Import all models here for Alembic to detect them
from app.models.user import Company, User, UserRole, UserStageAccess
from app.models.stage import Stage, StageEdge, StageStatus, Material, Product, ProductBOMItem
from app.models.project import (
    Project,
    ProjectStage,
    ProjectMaterialRequirement,
    TimeLog,
    FinancialEvent,
    FinancialEventType,
    ProjectMaterialPurchase,
)
from app.models.inventory import ProductInventory
from app.models.purchase import MaterialPurchase

__all__ = [
    "Company",
    "User",
    "UserRole",
    "UserStageAccess",
    "Stage",
    "StageEdge",
    "StageStatus",
    "Material",
    "Product",
    "ProductBOMItem",
    "Project",
    "ProjectStage",
    "ProjectMaterialRequirement",
    "TimeLog",
    "FinancialEvent",
    "FinancialEventType",
    "ProductInventory",
    "MaterialPurchase",
    "ProjectMaterialPurchase",
]
