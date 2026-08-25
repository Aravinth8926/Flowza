import json
from typing import List, Dict, Any, Optional
from app.ai.providers.base import BaseAIProvider


class MockAIProvider(BaseAIProvider):
    """
    Deterministic rule-based Mock AI Provider for automated tests and offline demos.
    Selects tools intelligently based on user message keywords, and synthesizes tool outputs into
    clean business responses.
    """

    async def chat_complete(
        self,
        messages: List[Dict[str, Any]],
        tools: Optional[List[Dict[str, Any]]] = None,
        tool_choice: str = "auto",
        temperature: float = 0.1,
    ) -> Dict[str, Any]:
        # Check if the last message is a tool response
        last_msg = messages[-1] if messages else {}

        # 1. If we just received a tool result, synthesize a final answer
        if last_msg.get("role") == "tool":
            tool_name = last_msg.get("name", "")
            raw_content = last_msg.get("content", "{}")
            try:
                data = json.loads(raw_content)
            except Exception:
                data = {}

            # Generate synthesis based on tool results
            if tool_name == "get_low_stock_products":
                items = data.get("low_stock_products", [])
                if not items:
                    content = "Good news! None of your products are currently below their reorder levels. All inventory is operating at healthy stock levels."
                else:
                    lines = [f"Found **{len(items)} products** needing replenishment:"]
                    for it in items:
                        lines.append(
                            f"- **{it['name']}** ({it.get('sku') or 'No SKU'}): **{it['available_stock']} {it.get('unit', 'units')} available** (On Hand: {it['quantity_on_hand']}, Reserved: {it['quantity_reserved']}, Reorder Level: {it['reorder_level']})"
                        )
                    lines.append("\n**Actionable Suggestion**: Prioritize restocking these items to avoid stock-out risks during peak order fulfillment.")
                    content = "\n".join(lines)

            elif tool_name == "get_supplier_overview":
                kpis = data.get("kpis", {})
                content = (
                    f"### Supplier Business Performance Summary\n\n"
                    f"- **Total Invoiced**: ₹{kpis.get('total_invoiced', '0.00')}\n"
                    f"- **Total Collected**: ₹{kpis.get('total_collected', '0.00')}\n"
                    f"- **Outstanding Receivables**: ₹{kpis.get('outstanding_receivables', '0.00')}\n"
                    f"- **Orders Processed**: {kpis.get('total_orders', 0)} total ({kpis.get('completed_orders', 0)} completed, {kpis.get('active_orders', 0)} active)\n\n"
                    f"**Analysis**: Your operations are running smoothly with {kpis.get('completed_orders', 0)} completed orders. "
                    f"Keep an eye on ₹{kpis.get('outstanding_receivables', '0.00')} in pending receivables."
                )

            elif tool_name == "get_vendor_overview":
                kpis = data.get("kpis", {})
                content = (
                    f"### Vendor Procurement Overview\n\n"
                    f"- **Total Spend**: ₹{kpis.get('total_spend', '0.00')}\n"
                    f"- **Total Paid**: ₹{kpis.get('total_paid', '0.00')}\n"
                    f"- **Outstanding Payables**: ₹{kpis.get('outstanding_payables', '0.00')}\n"
                    f"- **Purchase Orders**: {kpis.get('total_orders', 0)} total ({kpis.get('active_orders', 0)} active, {kpis.get('completed_orders', 0)} completed)\n\n"
                    f"**Next Step**: Review your {kpis.get('active_orders', 0)} active orders to ensure on-time delivery from suppliers."
                )

            elif tool_name == "get_admin_overview":
                kpis = data.get("kpis", {})
                content = (
                    f"### Flowza Platform Operational Overview\n\n"
                    f"- **Total Trade Volume**: ₹{kpis.get('total_order_volume', '0.00')}\n"
                    f"- **Total Invoiced**: ₹{kpis.get('total_invoiced', '0.00')}\n"
                    f"- **Settled Payments**: ₹{kpis.get('total_settled_payments', '0.00')}\n"
                    f"- **Active Companies**: {kpis.get('total_companies', 0)} ({kpis.get('supplier_companies', 0)} suppliers, {kpis.get('vendor_companies', 0)} vendors)\n"
                    f"- **Registered Users**: {kpis.get('total_users', 0)}\n\n"
                    f"**Platform Status**: Platform transaction health is strong with active trade across all registered companies."
                )

            elif tool_name == "get_outstanding_invoices":
                invoices = data.get("invoices", [])
                total_outstanding = data.get("total_outstanding", "0.00")
                if not invoices:
                    content = "There are currently no outstanding invoices. All accounts are settled!"
                else:
                    lines = [f"You have **{len(invoices)} outstanding invoices** totaling **₹{total_outstanding}**:"]
                    for inv in invoices[:5]:
                        lines.append(f"- **{inv['invoice_number']}**: ₹{inv['balance_due']} due (Status: {inv['payment_status']})")
                    lines.append("\n**Recommended Action**: Follow up on these invoices to reconcile account balances.")
                    content = "\n".join(lines)

            elif tool_name == "get_active_orders":
                orders = data.get("orders", [])
                if not orders:
                    content = "You have no active orders in progress right now."
                else:
                    lines = [f"Found **{len(orders)} active orders** currently in progress:"]
                    for o in orders[:5]:
                        lines.append(f"- **{o['order_number']}**: Status `{o['status'].upper()}`, Total ₹{o.get('estimated_price', '0.00')}")
                    content = "\n".join(lines)

            elif tool_name == "get_top_products":
                prods = data.get("top_products", [])
                if not prods:
                    content = "No product sales records found for the selected period."
                else:
                    lines = ["Here are your top-performing products:"]
                    for p in prods[:5]:
                        lines.append(f"- **{p['product_name']}**: {p['units_sold']} units sold (Total Value: ₹{p['total_revenue']})")
                    content = "\n".join(lines)

            elif tool_name == "get_top_suppliers":
                suppliers = data.get("top_suppliers", [])
                if not suppliers:
                    content = "No supplier procurement history found for the selected period."
                else:
                    lines = ["Here are your top suppliers by procurement volume:"]
                    for s in suppliers[:5]:
                        lines.append(f"- **{s['supplier_name']}**: {s['order_count']} orders (Total Spend: ₹{s['total_spend']})")
                    content = "\n".join(lines)

            else:
                content = f"Analysis complete. Retrieved {len(data)} items from {tool_name}."

            return {
                "role": "assistant",
                "content": content,
                "tool_calls": [],
            }

        # 2. Otherwise, check user prompt for tool intent
        user_text = ""
        for m in reversed(messages):
            if m.get("role") == "user":
                user_text = str(m.get("content", "")).lower()
                break

        # Check available tool names
        avail_tools = [t["function"]["name"] for t in (tools or [])]

        tool_calls = []

        # Decision heuristics for tool selection
        if any(k in user_text for k in ["low stock", "replenish", "run out", "inventory", "stock level", "reorder"]):
            if "get_low_stock_products" in avail_tools:
                tool_calls.append({"id": "call_mock_low_stock", "name": "get_low_stock_products", "arguments": {}})
            elif "get_inventory_summary" in avail_tools:
                tool_calls.append({"id": "call_mock_inv_sum", "name": "get_inventory_summary", "arguments": {}})

        elif any(k in user_text for k in ["invoice", "outstanding", "unpaid", "payment", "owe", "due"]):
            if "get_outstanding_invoices" in avail_tools:
                tool_calls.append({"id": "call_mock_invoices", "name": "get_outstanding_invoices", "arguments": {}})

        elif any(k in user_text for k in ["active order", "orders in progress", "delayed", "need attention", "pending order"]):
            if "get_active_orders" in avail_tools:
                tool_calls.append({"id": "call_mock_orders", "name": "get_active_orders", "arguments": {}})

        elif any(k in user_text for k in ["top product", "best seller", "top seller", "most popular"]):
            if "get_top_products" in avail_tools:
                tool_calls.append({"id": "call_mock_top_prod", "name": "get_top_products", "arguments": {"limit": 5}})

        elif any(k in user_text for k in ["top supplier", "buy from most", "frequent supplier"]):
            if "get_top_suppliers" in avail_tools:
                tool_calls.append({"id": "call_mock_top_supp", "name": "get_top_suppliers", "arguments": {"limit": 5}})

        elif any(k in user_text for k in ["sales", "performance", "overview", "spend", "revenue", "how are my"]):
            if "get_supplier_overview" in avail_tools:
                tool_calls.append({"id": "call_mock_supp_ov", "name": "get_supplier_overview", "arguments": {"date_range": "30d"}})
            elif "get_vendor_overview" in avail_tools:
                tool_calls.append({"id": "call_mock_vend_ov", "name": "get_vendor_overview", "arguments": {"date_range": "30d"}})
            elif "get_admin_overview" in avail_tools:
                tool_calls.append({"id": "call_mock_adm_ov", "name": "get_admin_overview", "arguments": {"date_range": "30d"}})

        # If tools were selected, return tool call request
        if tool_calls:
            return {
                "role": "assistant",
                "content": "",
                "tool_calls": tool_calls,
            }

        # Fallback direct conversational response
        return {
            "role": "assistant",
            "content": (
                "Hello! I am Flowza AI, your intelligent business assistant. "
                "You can ask me questions about your **inventory status**, **sales and spend analytics**, "
                "**active purchase orders**, or **outstanding invoices**."
            ),
            "tool_calls": [],
        }
