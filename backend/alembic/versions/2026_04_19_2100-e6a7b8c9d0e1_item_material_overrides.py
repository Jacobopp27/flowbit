"""item_material_overrides

Add material_overrides JSON column to quotation_items.

Revision ID: e6a7b8c9d0e1
Revises: d5f6e7a8b9c0
Create Date: 2026-04-19 21:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'e6a7b8c9d0e1'
down_revision = 'd5f6e7a8b9c0'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('quotation_items',
                  sa.Column('material_overrides', sa.JSON(), nullable=True))

def downgrade():
    op.drop_column('quotation_items', 'material_overrides')
