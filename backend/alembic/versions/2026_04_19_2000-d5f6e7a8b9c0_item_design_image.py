"""item_design_image

Add design_image_path column to quotation_items table (per-reference image).

Revision ID: d5f6e7a8b9c0
Revises: c4e2d3f8b1a5
Create Date: 2026-04-19 20:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'd5f6e7a8b9c0'
down_revision = 'c4e2d3f8b1a5'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('quotation_items',
                  sa.Column('design_image_path', sa.String(), nullable=True))


def downgrade():
    op.drop_column('quotation_items', 'design_image_path')
