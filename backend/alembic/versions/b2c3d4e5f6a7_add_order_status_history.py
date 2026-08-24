"""add_order_status_history

Revision ID: b2c3d4e5f6a7
Revises: a1f8c29e4d71
Create Date: 2026-08-24 21:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = '550a5de68d31'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'order_status_history',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('order_request_id', sa.Uuid(), nullable=False),
        sa.Column('from_status', sa.String(length=30), nullable=True),
        sa.Column('to_status', sa.String(length=30), nullable=False),
        sa.Column('changed_by_user_id', sa.Uuid(), nullable=False),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['changed_by_user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['order_request_id'], ['order_requests.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_order_status_history_order_request_id'), 'order_status_history', ['order_request_id'], unique=False)
    op.create_index(op.f('ix_order_status_history_changed_by_user_id'), 'order_status_history', ['changed_by_user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_order_status_history_changed_by_user_id'), table_name='order_status_history')
    op.drop_index(op.f('ix_order_status_history_order_request_id'), table_name='order_status_history')
    op.drop_table('order_status_history')
