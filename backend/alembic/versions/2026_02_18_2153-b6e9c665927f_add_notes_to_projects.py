"""add_notes_to_projects

Revision ID: b6e9c665927f
Revises: 2b576b2363d4
Create Date: 2026-02-18 21:53:59.940117

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b6e9c665927f'
down_revision = '2b576b2363d4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add notes column to projects table
    op.add_column('projects', sa.Column('notes', sa.Text(), nullable=True))


def downgrade() -> None:
    # Remove notes column from projects table
    op.drop_column('projects', 'notes')
