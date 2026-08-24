"""add_product_inventory_cart_models

Revision ID: a8c9f153a882
Revises: a1f8c29e4d71
Create Date: 2026-08-24 11:09:25.641174

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a8c9f153a882'
down_revision: Union[str, None] = 'a1f8c29e4d71'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. cart_items
    with op.batch_alter_table('cart_items', schema=None) as batch_op:
        batch_op.drop_index('ix_cart_items_cart_id')
        batch_op.drop_index('ix_cart_items_product_id')
        batch_op.drop_constraint('uq_cart_items_cart_product', type_='unique')
        batch_op.create_unique_constraint('uq_cart_product', ['cart_id', 'product_id'])
        batch_op.drop_constraint('fk_cart_items_cart_id', type_='foreignkey')
        batch_op.create_foreign_key('fk_cart_items_cart_id', 'carts', ['cart_id'], ['id'])

    # 2. carts
    with op.batch_alter_table('carts', schema=None) as batch_op:
        batch_op.drop_index('ix_carts_supplier_company_id')
        batch_op.drop_index('ix_carts_vendor_company_id')
        batch_op.drop_index('ix_carts_vendor_id')
        batch_op.drop_constraint('uq_carts_vendor_supplier', type_='unique')
        batch_op.create_unique_constraint('uq_vendor_supplier_cart', ['vendor_company_id', 'supplier_company_id'])

    # 3. inventories
    with op.batch_alter_table('inventories', schema=None) as batch_op:
        batch_op.drop_index('ix_inventories_product_id')
        batch_op.drop_constraint('uq_inventory_product_id', type_='unique')
        batch_op.drop_constraint('fk_inventories_product_id', type_='foreignkey')
        batch_op.create_foreign_key('fk_inventories_product_id', 'products', ['product_id'], ['id'])

    # 4. order_requests
    with op.batch_alter_table('order_requests', schema=None) as batch_op:
        batch_op.alter_column('created_by_user_id',
               existing_type=sa.CHAR(length=32),
               nullable=False)

    # 5. products
    with op.batch_alter_table('products', schema=None) as batch_op:
        batch_op.alter_column('unit',
               existing_type=sa.VARCHAR(length=50),
               type_=sa.String(length=20),
               existing_nullable=False,
               existing_server_default=sa.text("'units'"))
        batch_op.drop_index('ix_products_company_id')
        batch_op.drop_constraint('uq_products_company_id_sku', type_='unique')
        batch_op.create_unique_constraint('uq_company_sku', ['company_id', 'sku'])


def downgrade() -> None:
    # 5. products
    with op.batch_alter_table('products', schema=None) as batch_op:
        batch_op.drop_constraint('uq_company_sku', type_='unique')
        batch_op.create_unique_constraint('uq_products_company_id_sku', ['company_id', 'sku'])
        batch_op.create_index('ix_products_company_id', ['company_id'], unique=False)
        batch_op.alter_column('unit',
               existing_type=sa.String(length=20),
               type_=sa.VARCHAR(length=50),
               existing_nullable=False,
               existing_server_default=sa.text("'units'"))

    # 4. order_requests
    with op.batch_alter_table('order_requests', schema=None) as batch_op:
        batch_op.alter_column('created_by_user_id',
               existing_type=sa.CHAR(length=32),
               nullable=True)

    # 3. inventories
    with op.batch_alter_table('inventories', schema=None) as batch_op:
        batch_op.drop_constraint('fk_inventories_product_id', type_='foreignkey')
        batch_op.create_foreign_key('fk_inventories_product_id', 'products', ['product_id'], ['id'], ondelete='CASCADE')
        batch_op.create_unique_constraint('uq_inventory_product_id', ['product_id'])
        batch_op.create_index('ix_inventories_product_id', ['product_id'], unique=True)

    # 2. carts
    with op.batch_alter_table('carts', schema=None) as batch_op:
        batch_op.drop_constraint('uq_vendor_supplier_cart', type_='unique')
        batch_op.create_unique_constraint('uq_carts_vendor_supplier', ['vendor_company_id', 'supplier_company_id'])
        batch_op.create_index('ix_carts_vendor_id', ['vendor_id'], unique=False)
        batch_op.create_index('ix_carts_vendor_company_id', ['vendor_company_id'], unique=False)
        batch_op.create_index('ix_carts_supplier_company_id', ['supplier_company_id'], unique=False)

    # 1. cart_items
    with op.batch_alter_table('cart_items', schema=None) as batch_op:
        batch_op.drop_constraint('fk_cart_items_cart_id', type_='foreignkey')
        batch_op.create_foreign_key('fk_cart_items_cart_id', 'carts', ['cart_id'], ['id'], ondelete='CASCADE')
        batch_op.drop_constraint('uq_cart_product', type_='unique')
        batch_op.create_unique_constraint('uq_cart_items_cart_product', ['cart_id', 'product_id'])
        batch_op.create_index('ix_cart_items_product_id', ['product_id'], unique=False)
        batch_op.create_index('ix_cart_items_cart_id', ['cart_id'], unique=False)
