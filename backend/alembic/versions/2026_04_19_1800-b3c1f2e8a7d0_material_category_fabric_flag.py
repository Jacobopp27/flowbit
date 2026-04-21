"""material_category_fabric_flag

Backfills category = 'tela' for existing materials whose unit suggests fabric
(mts, metros, mt, m).  New materials set their own category via the form.

Revision ID: b3c1f2e8a7d0
Revises: da04f2d83f8d
Create Date: 2026-04-19 18:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'b3c1f2e8a7d0'
down_revision = 'da04f2d83f8d'
branch_labels = None
depends_on = None

METER_UNITS = ('mts', 'metros', 'mt', 'm', 'metro')


def upgrade():
    conn = op.get_bind()
    # Auto-classify: materials measured in meters → category = "tela"
    # This is a BEST-GUESS backfill; operators can manually fix outliers
    # (e.g. velcro, elastic tape) via the Materials form.
    placeholders = ', '.join(f"'{u}'" for u in METER_UNITS)
    conn.execute(
        sa.text(
            f"UPDATE materials SET category = 'tela' "
            f"WHERE LOWER(unit) IN ({placeholders}) "
            f"AND (category IS NULL OR category = '')"
        )
    )


def downgrade():
    # Reversing would blindly clear categories set by users — skip.
    pass
