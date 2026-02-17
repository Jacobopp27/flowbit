"""remove_total_qty_add_project_products

Revision ID: 0d672ccfd3c6
Revises: 6938fa6a2cf2
Create Date: 2026-02-12 17:32:45.058555

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0d672ccfd3c6'
down_revision = '6938fa6a2cf2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create project_products table
    op.create_table(
        'project_products',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_project_products_project_id', 'project_products', ['project_id'])
    op.create_index('ix_project_products_product_id', 'project_products', ['product_id'])
    
    # Remove total_qty from projects
    op.drop_column('projects', 'total_qty')


def downgrade() -> None:
    # Add back total_qty
    op.add_column('projects', sa.Column('total_qty', sa.Integer(), nullable=True))
    
    # Drop project_products table
    op.drop_index('ix_project_products_product_id', 'project_products')
    op.drop_index('ix_project_products_project_id', 'project_products')
    op.drop_table('project_products')
