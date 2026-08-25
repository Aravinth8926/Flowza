from typing import Dict, Any, List, Callable, Optional
from app.models.user import User
from app.ai.tools.analytics_tools import (
    get_supplier_overview,
    get_vendor_overview,
    get_admin_overview,
    get_top_products,
    get_top_suppliers,
)
from app.ai.tools.inventory_tools import (
    get_low_stock_products,
    get_out_of_stock_products,
    get_inventory_summary,
)
from app.ai.tools.order_tools import (
    get_active_orders,
    get_recent_orders,
    get_orders_by_status,
)
from app.ai.tools.invoice_tools import (
    get_outstanding_invoices,
    get_recent_invoices,
    get_payment_summary,
)
from app.ai.tools.product_tools import (
    search_products,
)


class ToolDefinition:
    def __init__(
        self,
        name: str,
        description: str,
        category: str,
        allowed_roles: List[str],
        parameters: Dict[str, Any],
        handler: Callable,
    ):
        self.name = name
        self.description = description
        self.category = category
        self.allowed_roles = allowed_roles
        self.parameters = parameters
        self.handler = handler

    def to_openai_schema(self) -> Dict[str, Any]:
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters,
            },
        }


# Complete Tool Registry
ALL_TOOLS: List[ToolDefinition] = [
    # ── Analytics Tools ────────────────────────────────────────────────────────
    ToolDefinition(
        name="get_supplier_overview",
        description="Retrieve sales, invoice receivables, and order fulfillment KPIs for the authenticated supplier.",
        category="Analytics",
        allowed_roles=["supplier"],
        parameters={
            "type": "object",
            "properties": {
                "date_range": {
                    "type": "string",
                    "enum": ["7d", "30d", "month", "last_month", "quarter", "year", "all"],
                    "description": "Date preset for analytics filtering",
                    "default": "30d",
                }
            },
        },
        handler=get_supplier_overview,
    ),
    ToolDefinition(
        name="get_vendor_overview",
        description="Retrieve procurement spend, supplier count, and purchase order KPIs for the authenticated vendor.",
        category="Analytics",
        allowed_roles=["vendor"],
        parameters={
            "type": "object",
            "properties": {
                "date_range": {
                    "type": "string",
                    "enum": ["7d", "30d", "month", "last_month", "quarter", "year", "all"],
                    "description": "Date preset for analytics filtering",
                    "default": "30d",
                }
            },
        },
        handler=get_vendor_overview,
    ),
    ToolDefinition(
        name="get_admin_overview",
        description="Retrieve platform-wide trade volume, user growth, company counts, and overall system health metrics.",
        category="Analytics",
        allowed_roles=["admin"],
        parameters={
            "type": "object",
            "properties": {
                "date_range": {
                    "type": "string",
                    "enum": ["7d", "30d", "month", "last_month", "quarter", "year", "all"],
                    "description": "Date preset for platform analytics",
                    "default": "30d",
                }
            },
        },
        handler=get_admin_overview,
    ),
    ToolDefinition(
        name="get_top_products",
        description="Retrieve top-selling products by quantity and revenue for the authenticated supplier.",
        category="Analytics",
        allowed_roles=["supplier"],
        parameters={
            "type": "object",
            "properties": {
                "limit": {"type": "integer", "default": 5, "description": "Number of top products to retrieve (1-20)"},
                "date_range": {"type": "string", "enum": ["7d", "30d", "month", "year", "all"], "default": "30d"},
            },
        },
        handler=get_top_products,
    ),
    ToolDefinition(
        name="get_top_suppliers",
        description="Retrieve top suppliers ranked by total procurement spend for the authenticated vendor.",
        category="Analytics",
        allowed_roles=["vendor"],
        parameters={
            "type": "object",
            "properties": {
                "limit": {"type": "integer", "default": 5, "description": "Number of top suppliers to retrieve (1-20)"},
                "date_range": {"type": "string", "enum": ["7d", "30d", "month", "year", "all"], "default": "30d"},
            },
        },
        handler=get_top_suppliers,
    ),

    # ── Inventory Tools ────────────────────────────────────────────────────────
    ToolDefinition(
        name="get_low_stock_products",
        description="Identify products where available stock (on_hand - reserved) is at or below the reorder level.",
        category="Inventory",
        allowed_roles=["supplier", "admin"],
        parameters={"type": "object", "properties": {}},
        handler=get_low_stock_products,
    ),
    ToolDefinition(
        name="get_out_of_stock_products",
        description="Identify products where available stock (on_hand - reserved) is zero or negative.",
        category="Inventory",
        allowed_roles=["supplier", "admin"],
        parameters={"type": "object", "properties": {}},
        handler=get_out_of_stock_products,
    ),
    ToolDefinition(
        name="get_inventory_summary",
        description="Get aggregated warehouse inventory health metrics (total SKUs, total on-hand, reserved, available, alert counts).",
        category="Inventory",
        allowed_roles=["supplier", "admin"],
        parameters={"type": "object", "properties": {}},
        handler=get_inventory_summary,
    ),

    # ── Order Tools ────────────────────────────────────────────────────────────
    ToolDefinition(
        name="get_active_orders",
        description="Retrieve orders that are currently in progress (pending, accepted, processing, packed, shipped).",
        category="Orders",
        allowed_roles=["supplier", "vendor", "admin"],
        parameters={"type": "object", "properties": {}},
        handler=get_active_orders,
    ),
    ToolDefinition(
        name="get_recent_orders",
        description="Retrieve recent purchase orders with item details and current status.",
        category="Orders",
        allowed_roles=["supplier", "vendor", "admin"],
        parameters={
            "type": "object",
            "properties": {
                "limit": {"type": "integer", "default": 10, "description": "Maximum orders to retrieve (1-25)"}
            },
        },
        handler=get_recent_orders,
    ),
    ToolDefinition(
        name="get_orders_by_status",
        description="Filter orders by specific lifecycle status (e.g. pending, accepted, processing, packed, shipped, delivered, completed, rejected, cancelled).",
        category="Orders",
        allowed_roles=["supplier", "vendor", "admin"],
        parameters={
            "type": "object",
            "required": ["status"],
            "properties": {
                "status": {
                    "type": "string",
                    "enum": ["pending", "accepted", "processing", "packed", "shipped", "delivered", "completed", "rejected", "cancelled"],
                    "description": "Canonical Flowza order status",
                }
            },
        },
        handler=get_orders_by_status,
    ),

    # ── Invoice & Financial Tools ──────────────────────────────────────────────
    ToolDefinition(
        name="get_outstanding_invoices",
        description="Retrieve unpaid, partially paid, or overdue invoices with balance amounts. Strictly read-only.",
        category="Invoices",
        allowed_roles=["supplier", "vendor", "admin"],
        parameters={"type": "object", "properties": {}},
        handler=get_outstanding_invoices,
    ),
    ToolDefinition(
        name="get_recent_invoices",
        description="Retrieve recent billing invoices with status and payment totals.",
        category="Invoices",
        allowed_roles=["supplier", "vendor", "admin"],
        parameters={
            "type": "object",
            "properties": {
                "limit": {"type": "integer", "default": 10, "description": "Maximum invoices to retrieve"}
            },
        },
        handler=get_recent_invoices,
    ),
    ToolDefinition(
        name="get_payment_summary",
        description="Retrieve financial totals (total invoiced, total paid, and total outstanding balance). Strictly read-only.",
        category="Invoices",
        allowed_roles=["supplier", "vendor", "admin"],
        parameters={"type": "object", "properties": {}},
        handler=get_payment_summary,
    ),

    # ── Product Tools ──────────────────────────────────────────────────────────
    ToolDefinition(
        name="search_products",
        description="Search authorized product catalog by keyword, SKU, or category.",
        category="Products",
        allowed_roles=["supplier", "vendor", "admin"],
        parameters={
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Product name or SKU substring to search"},
                "category": {"type": "string", "description": "Product category filter"},
                "limit": {"type": "integer", "default": 10},
            },
        },
        handler=search_products,
    ),
]


def get_authorized_tools(current_user: User) -> List[ToolDefinition]:
    """Filter all tools according to current user's authenticated role."""
    user_role = current_user.role.name.lower()
    return [t for t in ALL_TOOLS if user_role in t.allowed_roles]


def get_tool_by_name(tool_name: str, current_user: User) -> Optional[ToolDefinition]:
    """Retrieve tool by name if authorized for current user."""
    user_role = current_user.role.name.lower()
    for t in ALL_TOOLS:
        if t.name == tool_name:
            if user_role in t.allowed_roles:
                return t
            return None
    return None
