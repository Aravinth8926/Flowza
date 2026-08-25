"""add_order_status_history_is_deleted_and_analytics_indexes

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-08-25 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e5f6a7b8c9d0'
down_revision: Union[str, None] = 'd4e5f6a7b8c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    
    # 1. is_deleted on tables if missing
    for tbl in ['order_status_history', 'invoice_items', 'payment_records']:
        cols = [c['name'] for c in insp.get_columns(tbl)]
        if 'is_deleted' not in cols:
            op.add_column(
                tbl,
                sa.Column('is_deleted', sa.Boolean(), server_default=sa.text('0'), nullable=False)
            )
        if 'updated_at' not in cols:
            op.add_column(
                tbl,
                sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False)
            )


def downgrade() -> None:
    # Batch drop for sqlite compatibility if needed
    with op.batch_alter_table('order_status_history') as batch_op:
        batch_op.drop_column('is_deleted')
