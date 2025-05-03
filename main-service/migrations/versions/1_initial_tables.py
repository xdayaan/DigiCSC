"""Initial tables

Revision ID: 1_initial_tables
Revises: 
Create Date: 2025-05-03

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '1_initial_tables'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create users table
    op.create_table('users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=True),
        sa.Column('phone', sa.String(), nullable=True),
        sa.Column('language', sa.String(), nullable=True),
        sa.Column('created_on', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_on', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_name'), 'users', ['name'], unique=False)
    op.create_index(op.f('ix_users_phone'), 'users', ['phone'], unique=True)

    # Create freelancers table
    op.create_table('freelancers',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=True),
        sa.Column('email', sa.String(), nullable=True),
        sa.Column('phone', sa.String(), nullable=True),
        sa.Column('created_on', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_on', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('csc_id', sa.String(), nullable=True),
        sa.Column('preferred_work', sa.JSON(), nullable=True),
        sa.Column('languages', sa.JSON(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_freelancers_id'), 'freelancers', ['id'], unique=False)
    op.create_index(op.f('ix_freelancers_name'), 'freelancers', ['name'], unique=False)
    op.create_index(op.f('ix_freelancers_email'), 'freelancers', ['email'], unique=True)
    op.create_index(op.f('ix_freelancers_phone'), 'freelancers', ['phone'], unique=True)
    op.create_index(op.f('ix_freelancers_csc_id'), 'freelancers', ['csc_id'], unique=False)

    # Create chat_relations table
    op.create_table('chat_relations',
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('chat_id', sa.String(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('user_id', 'chat_id')
    )


def downgrade() -> None:
    op.drop_table('chat_relations')
    op.drop_index(op.f('ix_freelancers_csc_id'), table_name='freelancers')
    op.drop_index(op.f('ix_freelancers_phone'), table_name='freelancers')
    op.drop_index(op.f('ix_freelancers_email'), table_name='freelancers')
    op.drop_index(op.f('ix_freelancers_name'), table_name='freelancers')
    op.drop_index(op.f('ix_freelancers_id'), table_name='freelancers')
    op.drop_table('freelancers')
    op.drop_index(op.f('ix_users_phone'), table_name='users')
    op.drop_index(op.f('ix_users_name'), table_name='users')
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_table('users')