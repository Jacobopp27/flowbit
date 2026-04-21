"""add_iva_gift_to_quotations

Revision ID: da04f2d83f8d
Revises: d157742e9f9c
Create Date: 2026-04-17 15:04:00

"""
from alembic import op
import sqlalchemy as sa

revision = 'da04f2d83f8d'
down_revision = 'd157742e9f9c'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('quotations', sa.Column('iva_rate', sa.Numeric(precision=5, scale=4), nullable=False, server_default='0.19'))
    op.add_column('quotations', sa.Column('gift_note', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('quotations', 'gift_note')
    op.drop_column('quotations', 'iva_rate')
