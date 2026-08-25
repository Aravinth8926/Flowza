"""add_notifications_and_preferences

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-08-25 09:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, None] = 'c3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create notifications table
    op.create_table(
        'notifications',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('recipient_user_id', sa.Uuid(), nullable=False),
        sa.Column('recipient_company_id', sa.Uuid(), nullable=True),
        sa.Column('type', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('entity_type', sa.String(length=50), nullable=True),
        sa.Column('entity_id', sa.Uuid(), nullable=True),
        sa.Column('is_read', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('priority', sa.String(length=20), server_default='NORMAL', nullable=False),
        sa.Column('extra_metadata', sa.JSON(), nullable=True),
        sa.Column('event_key', sa.String(length=255), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['recipient_company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['recipient_user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_notifications_recipient_user_id', 'notifications', ['recipient_user_id'], unique=False)
    op.create_index('ix_notifications_recipient_company_id', 'notifications', ['recipient_company_id'], unique=False)
    op.create_index('ix_notifications_type', 'notifications', ['type'], unique=False)
    op.create_index('ix_notifications_is_read', 'notifications', ['is_read'], unique=False)
    op.create_index('ix_notifications_is_deleted', 'notifications', ['is_deleted'], unique=False)
    op.create_index('ix_notifications_created_at', 'notifications', ['created_at'], unique=False)
    op.create_index('ix_notifications_event_key', 'notifications', ['event_key'], unique=False)
    op.create_index('ix_notifications_user_read_created', 'notifications', ['recipient_user_id', 'is_read', 'created_at'], unique=False)

    # 2. Create notification_preferences table
    op.create_table(
        'notification_preferences',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('order_notifications_enabled', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('invoice_notifications_enabled', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('payment_notifications_enabled', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('inventory_notifications_enabled', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('system_notifications_enabled', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('is_deleted', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )
    op.create_index('ix_notification_preferences_user_id', 'notification_preferences', ['user_id'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_notification_preferences_user_id', table_name='notification_preferences')
    op.drop_table('notification_preferences')

    op.drop_index('ix_notifications_user_read_created', table_name='notifications')
    op.drop_index('ix_notifications_event_key', table_name='notifications')
    op.drop_index('ix_notifications_created_at', table_name='notifications')
    op.drop_index('ix_notifications_is_deleted', table_name='notifications')
    op.drop_index('ix_notifications_is_read', table_name='notifications')
    op.drop_index('ix_notifications_type', table_name='notifications')
    op.drop_index('ix_notifications_recipient_company_id', table_name='notifications')
    op.drop_index('ix_notifications_recipient_user_id', table_name='notifications')
    op.drop_table('notifications')
