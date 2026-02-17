"""add_project_stage_dependencies

Revision ID: 0642e9809e43
Revises: e5f8d15006e4
Create Date: 2026-02-16 22:01:40.793026

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0642e9809e43'
down_revision = 'e5f8d15006e4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add order column to project_stages
    op.add_column('project_stages', sa.Column('stage_order', sa.Integer(), nullable=False, server_default='0'))
    
    # Create project_stage_dependencies table
    op.create_table(
        'project_stage_dependencies',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('stage_id', sa.Integer(), nullable=False),
        sa.Column('depends_on_stage_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['stage_id'], ['project_stages.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['depends_on_stage_id'], ['project_stages.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_project_stage_dependencies_project_id'), 'project_stage_dependencies', ['project_id'], unique=False)
    op.create_index(op.f('ix_project_stage_dependencies_stage_id'), 'project_stage_dependencies', ['stage_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_project_stage_dependencies_stage_id'), table_name='project_stage_dependencies')
    op.drop_index(op.f('ix_project_stage_dependencies_project_id'), table_name='project_stage_dependencies')
    op.drop_table('project_stage_dependencies')
    op.drop_column('project_stages', 'stage_order')
