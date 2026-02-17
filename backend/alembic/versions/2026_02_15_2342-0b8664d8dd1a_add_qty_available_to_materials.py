"""add_qty_available_to_materials

Revision ID: 0b8664d8dd1a
Revises: 8bcb192c9bf5
Create Date: 2026-02-15 23:42:53.224537

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0b8664d8dd1a'
down_revision = '8bcb192c9bf5'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add qty_available column to materials table
    op.add_column('materials', sa.Column('qty_available', sa.Numeric(precision=10, scale=2), nullable=False, server_default='0'))
    op.add_column('materials', sa.Column('cost_per_unit', sa.Numeric(precision=10, scale=2), nullable=True))
    op.add_column('materials', sa.Column('category', sa.String(), nullable=True))


def downgrade() -> None:
    # Remove columns from materials table
    op.drop_column('materials', 'category')
    op.drop_column('materials', 'cost_per_unit')
    op.drop_column('materials', 'qty_available')
