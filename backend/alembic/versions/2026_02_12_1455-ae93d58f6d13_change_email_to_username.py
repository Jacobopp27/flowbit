"""change_email_to_username

Revision ID: ae93d58f6d13
Revises: afad577bf460
Create Date: 2026-02-12 14:55:28.728683

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'ae93d58f6d13'
down_revision = 'afad577bf460'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add username column (nullable first, then we'll make it required)
    op.add_column('users', sa.Column('username', sa.String(), nullable=True))
    
    # Create a unique index on username
    op.create_index('ix_users_username', 'users', ['username'], unique=True)


def downgrade() -> None:
    # Remove username column and index
    op.drop_index('ix_users_username', table_name='users')
    op.drop_column('users', 'username')
