"""quotation_molderia_design_image

Add molderia and design_image_path columns to quotations table.

Revision ID: c4e2d3f8b1a5
Revises: b3c1f2e8a7d0
Create Date: 2026-04-19 19:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'c4e2d3f8b1a5'
down_revision = 'b3c1f2e8a7d0'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('quotations', sa.Column('molderia', sa.String(), nullable=True))
    op.add_column('quotations', sa.Column('design_image_path', sa.String(), nullable=True))


def downgrade():
    op.drop_column('quotations', 'design_image_path')
    op.drop_column('quotations', 'molderia')
