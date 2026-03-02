"""Add project templates tables

Revision ID: 7b9c4f2e8d3a
Revises: 4a8f2c3d9e1b
Create Date: 2026-03-02 01:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import NUMERIC


# revision identifiers, used by Alembic.
revision = '7b9c4f2e8d3a'
down_revision = '4a8f2c3d9e1b'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create project_templates table
    op.create_table(
        'project_templates',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('company_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_project_templates_company_id'), 'project_templates', ['company_id'], unique=False)
    op.create_index(op.f('ix_project_templates_id'), 'project_templates', ['id'], unique=False)

    # Create project_template_stages table
    op.create_table(
        'project_template_stages',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('template_id', sa.Integer(), nullable=False),
        sa.Column('stage_id', sa.Integer(), nullable=False),
        sa.Column('duration_days', sa.Integer(), nullable=False),
        sa.Column('stage_order', sa.Integer(), nullable=False),
        sa.Column('has_operational_cost', sa.Boolean(), nullable=False),
        sa.Column('cost_per_unit', NUMERIC(10, 2), nullable=True),
        sa.ForeignKeyConstraint(['stage_id'], ['stages.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['template_id'], ['project_templates.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('template_id', 'stage_id', name='uq_template_stage')
    )
    op.create_index(op.f('ix_project_template_stages_id'), 'project_template_stages', ['id'], unique=False)
    op.create_index(op.f('ix_project_template_stages_template_id'), 'project_template_stages', ['template_id'], unique=False)
    op.create_index(op.f('ix_project_template_stages_stage_id'), 'project_template_stages', ['stage_id'], unique=False)

    # Create project_template_stage_dependencies table
    op.create_table(
        'project_template_stage_dependencies',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('template_id', sa.Integer(), nullable=False),
        sa.Column('template_stage_id', sa.Integer(), nullable=False),
        sa.Column('depends_on_template_stage_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['template_id'], ['project_templates.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['template_stage_id'], ['project_template_stages.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['depends_on_template_stage_id'], ['project_template_stages.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('template_stage_id', 'depends_on_template_stage_id', name='uq_template_dependency')
    )
    op.create_index(op.f('ix_project_template_stage_dependencies_id'), 'project_template_stage_dependencies', ['id'], unique=False)
    op.create_index(op.f('ix_project_template_stage_dependencies_template_id'), 'project_template_stage_dependencies', ['template_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_project_template_stage_dependencies_template_id'), table_name='project_template_stage_dependencies')
    op.drop_index(op.f('ix_project_template_stage_dependencies_id'), table_name='project_template_stage_dependencies')
    op.drop_table('project_template_stage_dependencies')

    op.drop_index(op.f('ix_project_template_stages_stage_id'), table_name='project_template_stages')
    op.drop_index(op.f('ix_project_template_stages_template_id'), table_name='project_template_stages')
    op.drop_index(op.f('ix_project_template_stages_id'), table_name='project_template_stages')
    op.drop_table('project_template_stages')

    op.drop_index(op.f('ix_project_templates_id'), table_name='project_templates')
    op.drop_index(op.f('ix_project_templates_company_id'), table_name='project_templates')
    op.drop_table('project_templates')
