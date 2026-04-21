"""stage_product_assignments

Add product_assignments JSON column to project_stages.

Revision ID: f7b8c9d0e1f2
Revises: e6a7b8c9d0e1
Create Date: 2026-04-19 22:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'f7b8c9d0e1f2'
down_revision = 'e6a7b8c9d0e1'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('project_stages',
                  sa.Column('product_assignments', sa.JSON(), nullable=True))

def downgrade():
    op.drop_column('project_stages', 'product_assignments')
