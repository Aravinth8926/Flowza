import asyncio
import os
import json
import httpx
import websockets

PORT = os.environ.get("PORT", "8001")
BASE_URL = os.environ.get("BASE_URL", f"http://127.0.0.1:{PORT}")
WS_URL = os.environ.get("WS_URL", f"ws://127.0.0.1:{PORT}")

async def test_end_to_end():
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=25.0) as client:
        print("[TEST] 1. Logging in as Supplier (abc@distributors.com)...")
        sup_login_res = await client.post("/api/v1/auth/login", json={
            "email": "abc@distributors.com",
            "password": "Password123!"
        })
        assert sup_login_res.status_code == 200, f"Supplier login failed: {sup_login_res.text}"
        sup_token = sup_login_res.json()["data"]["access_token"]
        sup_id = sup_login_res.json()["data"]["user"]["id"]
        print(f"[TEST] Supplier token obtained (user_id={sup_id})")

        print("[TEST] 2. Logging in as Vendor (vendor@supermarket.com)...")
        ven_login_res = await client.post("/api/v1/auth/login", json={
            "email": "vendor@supermarket.com",
            "password": "Password123!"
        })
        assert ven_login_res.status_code == 200, f"Vendor login failed: {ven_login_res.text}"
        ven_token = ven_login_res.json()["data"]["access_token"]
        ven_id = ven_login_res.json()["data"]["user"]["id"]
        print(f"[TEST] Vendor token obtained (user_id={ven_id})")

        print("[TEST] 3. Connecting Supplier to WebSocket...")
        sup_ws_uri = f"{WS_URL}/ws/{sup_token}"
        async with websockets.connect(sup_ws_uri) as sup_ws:
            print("[TEST] Supplier WebSocket connected!")

            print("[TEST] 4. Vendor creating new purchase order request...")
            create_payload = {
                "supplier_id": sup_id,
                "title": "E2E Test Vegetable Supply — August",
                "description": "Need high grade hybrid tomatoes and fresh onions.",
                "priority": "high",
                "delivery_date": "2026-08-15",
                "delivery_address": "45, MG Road, Coimbatore, Tamil Nadu - 641001",
                "items": [
                    {"product_name": "Hybrid Tomatoes", "quantity": 50, "unit": "kg", "estimated_price": 40.0},
                    {"product_name": "Red Onions", "quantity": 30, "unit": "kg", "estimated_price": 35.0},
                    {"product_name": "Potatoes", "quantity": 25, "unit": "kg", "estimated_price": 30.0},
                ]
            }
            create_res = await client.post("/api/v1/orders", json=create_payload, headers={"Authorization": f"Bearer {ven_token}"})
            assert create_res.status_code == 200, f"Create order failed: {create_res.text}"
            order_data = create_res.json()["data"]
            order_id = order_data["raw_id"]
            print(f"[TEST] Order created successfully! ID={order_id}, Total={order_data.get('estimated_value')}")

            print("[TEST] 5. Waiting for Supplier WebSocket real-time event...")
            ws_msg = await asyncio.wait_for(sup_ws.recv(), timeout=5.0)
            ws_data = json.loads(ws_msg)
            print(f"[TEST] Supplier received WS event: {ws_data['type']}")
            assert ws_data["type"] == "new_order_request"
            assert ws_data["data"]["id"] == order_id
            print(f"[TEST] Event payload: {json.dumps(ws_data['data'], indent=2)}")

            print("[TEST] 6. Supplier fetching incoming orders list...")
            inc_res = await client.get("/api/v1/orders/incoming", headers={"Authorization": f"Bearer {sup_token}"})
            assert inc_res.status_code == 200, f"Incoming orders failed: {inc_res.status_code} - {inc_res.text}"
            inc_orders = inc_res.json()["data"]["orders"]
            found_order = next((o for o in inc_orders if o["raw_id"] == order_id), None)
            assert found_order is not None, f"Created order {order_id} not found in incoming list {inc_orders}"
            assert found_order["status"] == "pending"
            print(f"[TEST] Verified order in incoming list: status={found_order['status']}, items={found_order['item_count']}")

            print("[TEST] 7. Supplier fetching stats bar...")
            stats_res = await client.get("/api/v1/orders/stats", headers={"Authorization": f"Bearer {sup_token}"})
            assert stats_res.status_code == 200
            stats_data = stats_res.json()["data"]
            print(f"[TEST] Supplier stats: total={stats_data['total_orders']}, pending={stats_data['pending_orders']}, accepted={stats_data['accepted_orders']}")

            print("[TEST] 8. Supplier responding to order (Accept)...")
            respond_res = await client.patch(f"/api/v1/orders/{order_id}/respond", json={
                "action": "accept",
                "response_note": "Confirmed. Will dispatch by 14th morning."
            }, headers={"Authorization": f"Bearer {sup_token}"})
            assert respond_res.status_code == 200, f"Respond to order failed: {respond_res.status_code} - {respond_res.text}"
            print(f"[TEST] Order accepted: {respond_res.json()['message']}")

            print("[TEST] 9. Checking order details endpoint...")
            detail_res = await client.get(f"/api/v1/orders/{order_id}", headers={"Authorization": f"Bearer {sup_token}"})
            assert detail_res.status_code == 200
            detail = detail_res.json()["data"]
            assert detail["status"] == "accepted"
            assert detail["supplier_response"] == "Confirmed. Will dispatch by 14th morning."
            print(f"[TEST] Verified order detail: status={detail['status']}, response='{detail['supplier_response']}'")

    print("\n[SUCCESS] ALL END-TO-END TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    asyncio.run(test_end_to_end())
