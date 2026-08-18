"""db_architecture_and_er_refactor

Revision ID: a1f8c29e4d71
Revises: e79cefdf04df
Create Date: 2026-08-18 11:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1f8c29e4d71'
down_revision: Union[str, None] = 'e79cefdf04df'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create products table
    op.create_table('products',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('company_id', sa.Uuid(), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('sku', sa.String(length=100), nullable=True),
        sa.Column('category', sa.String(length=100), nullable=True),
        sa.Column('unit', sa.String(length=50), server_default='units', nullable=False),
        sa.Column('price', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('image_url', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('1'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('is_deleted', sa.Boolean(), server_default=sa.text('0'), nullable=False),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], name='fk_products_company_id'),
        sa.PrimaryKeyConstraint('id', name='pk_products'),
        sa.UniqueConstraint('company_id', 'sku', name='uq_products_company_id_sku'),
        sa.CheckConstraint('price >= 0', name='chk_products_price_non_negative')
    )
    op.create_index(op.f('ix_products_id'), 'products', ['id'], unique=False)
    op.create_index(op.f('ix_products_company_id'), 'products', ['company_id'], unique=False)

    # 2. Create inventories table (supplier-only stock, 1:1 with product)
    op.create_table('inventories',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('product_id', sa.Uuid(), nullable=False),
        sa.Column('quantity_on_hand', sa.Integer(), server_default='0', nullable=False),
        sa.Column('quantity_reserved', sa.Integer(), server_default='0', nullable=False),
        sa.Column('reorder_level', sa.Integer(), server_default='0', nullable=False),
        sa.Column('reorder_quantity', sa.Integer(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('is_deleted', sa.Boolean(), server_default=sa.text('0'), nullable=False),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], name='fk_inventories_product_id', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name='pk_inventories'),
        sa.UniqueConstraint('product_id', name='uq_inventory_product_id'),
        sa.CheckConstraint('quantity_on_hand >= 0', name='chk_inventory_qoh_non_negative'),
        sa.CheckConstraint('quantity_reserved >= 0', name='chk_inventory_qr_non_negative'),
        sa.CheckConstraint('reorder_level >= 0', name='chk_inventory_rl_non_negative'),
        sa.CheckConstraint('reorder_quantity >= 0', name='chk_inventory_rq_non_negative'),
        sa.CheckConstraint('quantity_reserved <= quantity_on_hand', name='chk_inventory_reserved_lte_on_hand')
    )
    op.create_index(op.f('ix_inventories_id'), 'inventories', ['id'], unique=False)
    op.create_index(op.f('ix_inventories_product_id'), 'inventories', ['product_id'], unique=True)

    # 3. Create carts table (supplier-specific active carts)
    op.create_table('carts',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('vendor_id', sa.Uuid(), nullable=False),
        sa.Column('vendor_company_id', sa.Uuid(), nullable=False),
        sa.Column('supplier_company_id', sa.Uuid(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('is_deleted', sa.Boolean(), server_default=sa.text('0'), nullable=False),
        sa.ForeignKeyConstraint(['supplier_company_id'], ['companies.id'], name='fk_carts_supplier_company_id'),
        sa.ForeignKeyConstraint(['vendor_company_id'], ['companies.id'], name='fk_carts_vendor_company_id'),
        sa.ForeignKeyConstraint(['vendor_id'], ['users.id'], name='fk_carts_vendor_id'),
        sa.PrimaryKeyConstraint('id', name='pk_carts'),
        sa.UniqueConstraint('vendor_company_id', 'supplier_company_id', name='uq_carts_vendor_supplier')
    )
    op.create_index(op.f('ix_carts_id'), 'carts', ['id'], unique=False)
    op.create_index(op.f('ix_carts_vendor_id'), 'carts', ['vendor_id'], unique=False)
    op.create_index(op.f('ix_carts_vendor_company_id'), 'carts', ['vendor_company_id'], unique=False)
    op.create_index(op.f('ix_carts_supplier_company_id'), 'carts', ['supplier_company_id'], unique=False)

    # 4. Create cart_items table
    op.create_table('cart_items',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('cart_id', sa.Uuid(), nullable=False),
        sa.Column('product_id', sa.Uuid(), nullable=False),
        sa.Column('quantity', sa.Integer(), server_default='1', nullable=False),
        sa.Column('unit_price', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('is_deleted', sa.Boolean(), server_default=sa.text('0'), nullable=False),
        sa.ForeignKeyConstraint(['cart_id'], ['carts.id'], name='fk_cart_items_cart_id', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], name='fk_cart_items_product_id'),
        sa.PrimaryKeyConstraint('id', name='pk_cart_items'),
        sa.UniqueConstraint('cart_id', 'product_id', name='uq_cart_items_cart_product'),
        sa.CheckConstraint('quantity > 0', name='chk_cart_items_quantity_positive'),
        sa.CheckConstraint('unit_price >= 0', name='chk_cart_items_unit_price_non_negative')
    )
    op.create_index(op.f('ix_cart_items_id'), 'cart_items', ['id'], unique=False)
    op.create_index(op.f('ix_cart_items_cart_id'), 'cart_items', ['cart_id'], unique=False)
    op.create_index(op.f('ix_cart_items_product_id'), 'cart_items', ['product_id'], unique=False)

    # 5. Extend order_requests with created_by_user_id
    with op.batch_alter_table('order_requests', schema=None) as batch_op:
        batch_op.add_column(sa.Column('created_by_user_id', sa.Uuid(), nullable=True))
        batch_op.create_foreign_key('fk_order_requests_created_by_user_id', 'users', ['created_by_user_id'], ['id'])

    # 6. Extend order_request_items with product_id, product_name_snapshot, unit_price
    with op.batch_alter_table('order_request_items', schema=None) as batch_op:
        batch_op.add_column(sa.Column('product_id', sa.Uuid(), nullable=True))
        batch_op.add_column(sa.Column('product_name_snapshot', sa.String(length=200), nullable=True))
        batch_op.add_column(sa.Column('unit_price', sa.Numeric(precision=10, scale=2), nullable=True))
        batch_op.create_foreign_key('fk_order_request_items_product_id', 'products', ['product_id'], ['id'])


def downgrade() -> None:
    with op.batch_alter_table('order_request_items', schema=None) as batch_op:
        batch_op.drop_constraint('fk_order_request_items_product_id', type_='foreignkey')
        batch_op.drop_column('unit_price')
        batch_op.drop_column('product_name_snapshot')
        batch_op.drop_column('product_id')

    with op.batch_alter_table('order_requests', schema=None) as batch_op:
        batch_op.drop_constraint('fk_order_requests_created_by_user_id', type_='foreignkey')
        batch_op.drop_column('created_by_user_id')

    op.drop_index(op.f('ix_cart_items_product_id'), table_name='cart_items')
    op.drop_index(op.f('ix_cart_items_cart_id'), table_name='cart_items')
    op.drop_index(op.f('ix_cart_items_id'), table_name='cart_items')
    op.drop_table('cart_items')

    op.drop_index(op.f('ix_carts_supplier_company_id'), table_name='carts')
    op.drop_index(op.f('ix_carts_vendor_company_id'), table_name='carts')
    op.drop_index(op.f('ix_carts_vendor_id'), table_name='carts')
    op.drop_index(op.f('ix_carts_id'), table_name='carts')
    op.drop_table('carts')

    op.drop_index(op.f('ix_inventories_product_id'), table_name='inventories')
    op.drop_index(op.f('ix_inventories_id'), table_name='inventories')
    op.drop_table('inventories')

    op.drop_index(op.f('ix_products_company_id'), table_name='products')
    op.drop_index(op.f('ix_products_id'), table_name='products')
    op.drop_table('products')
