"""add_project_economics_and_stage_costs

Revision ID: 2b576b2363d4
Revises: 0642e9809e43
Create Date: 2026-02-17 00:38:41.397168

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2b576b2363d4'
down_revision = '0642e9809e43'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add economic fields to projects table
    op.add_column('projects', sa.Column('sale_price', sa.Numeric(10, 2), nullable=True))
    op.add_column('projects', sa.Column('sale_includes_tax', sa.Boolean(), nullable=False, server_default='false'))
    
    # Add operational cost fields to project_stages table
    op.add_column('project_stages', sa.Column('has_operational_cost', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('project_stages', sa.Column('cost_per_unit', sa.Numeric(10, 2), nullable=True))


def downgrade() -> None:
    op.drop_column('project_stages', 'cost_per_unit')
    op.drop_column('project_stages', 'has_operational_cost')
    op.drop_column('projects', 'sale_includes_tax')
    op.drop_column('projects', 'sale_price')
