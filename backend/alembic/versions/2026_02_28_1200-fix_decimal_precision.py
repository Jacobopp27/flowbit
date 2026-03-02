"""Fix decimal precision in material calculations

Revision ID: 4a8f2c3d9e1b
Revises: 327ef1d55c07
Create Date: 2026-02-28 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import NUMERIC


# revision identifiers, used by Alembic.
revision = '4a8f2c3d9e1b'
down_revision = '628272f8e4d5'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Change Float to Numeric(10, 2) for precise decimal handling

    # ProjectMaterialRequirement table
    op.alter_column('project_material_requirements', 'qty_per_unit',
                    type_=NUMERIC(10, 2),
                    existing_type=sa.Float(),
                    existing_nullable=False)
    op.alter_column('project_material_requirements', 'qty_total',
                    type_=NUMERIC(10, 2),
                    existing_type=sa.Float(),
                    existing_nullable=False)
    op.alter_column('project_material_requirements', 'qty_available',
                    type_=NUMERIC(10, 2),
                    existing_type=sa.Float(),
                    existing_nullable=False)
    op.alter_column('project_material_requirements', 'qty_to_buy',
                    type_=NUMERIC(10, 2),
                    existing_type=sa.Float(),
                    existing_nullable=False)

    # ProductBOMItem table
    op.alter_column('product_bom_items', 'qty_per_unit',
                    type_=NUMERIC(10, 2),
                    existing_type=sa.Float(),
                    existing_nullable=False)

    # ProjectMaterialPurchase table
    op.alter_column('project_material_purchases', 'quantity_purchased',
                    type_=NUMERIC(10, 2),
                    existing_type=sa.Float(),
                    existing_nullable=False)


def downgrade() -> None:
    # Revert back to Float
    op.alter_column('project_material_requirements', 'qty_per_unit',
                    type_=sa.Float(),
                    existing_type=NUMERIC(10, 2),
                    existing_nullable=False)
    op.alter_column('project_material_requirements', 'qty_total',
                    type_=sa.Float(),
                    existing_type=NUMERIC(10, 2),
                    existing_nullable=False)
    op.alter_column('project_material_requirements', 'qty_available',
                    type_=sa.Float(),
                    existing_type=NUMERIC(10, 2),
                    existing_nullable=False)
    op.alter_column('project_material_requirements', 'qty_to_buy',
                    type_=sa.Float(),
                    existing_type=NUMERIC(10, 2),
                    existing_nullable=False)

    op.alter_column('product_bom_items', 'qty_per_unit',
                    type_=sa.Float(),
                    existing_type=NUMERIC(10, 2),
                    existing_nullable=False)

    op.alter_column('project_material_purchases', 'quantity_purchased',
                    type_=sa.Float(),
                    existing_type=NUMERIC(10, 2),
                    existing_nullable=False)
