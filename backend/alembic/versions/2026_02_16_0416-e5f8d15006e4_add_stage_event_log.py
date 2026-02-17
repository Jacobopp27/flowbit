"""add_stage_event_log

Revision ID: e5f8d15006e4
Revises: 0b8664d8dd1a
Create Date: 2026-02-16 04:16:19.893447

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e5f8d15006e4'
down_revision = '0b8664d8dd1a'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'stage_event_log',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('project_stage_id', sa.Integer(), nullable=False),
        sa.Column('event_type', sa.String(), nullable=False),
        sa.Column('old_value', sa.String(), nullable=True),
        sa.Column('new_value', sa.String(), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('timestamp', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['project_stage_id'], ['project_stages.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_stage_event_log_project_stage_id'), 'stage_event_log', ['project_stage_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_stage_event_log_project_stage_id'), table_name='stage_event_log')
    op.drop_table('stage_event_log')
