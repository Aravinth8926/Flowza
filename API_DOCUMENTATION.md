# Vendor AI - API Documentation

## Base URL
```
http://localhost:8000/api
```

## Authentication
Most endpoints require authentication using JWT Bearer tokens.

### Getting a Token
```http
POST /auth/login
Content-Type: application/x-www-form-urlencoded

username=your_username&password=your_password
```

Response:
```json
{
  "access_token": "eyJhbGc...",
  "token_type": "bearer"
}
```

### Using the Token
Include the token in the Authorization header:
```
Authorization: Bearer eyJhbGc...
```

---

## Authentication Endpoints

### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "secure_password",
  "role": "vendor"
}
```

**Roles**: `admin`, `official`, `vendor`

### Login
```http
POST /auth/login
Content-Type: application/x-www-form-urlencoded

username=john_doe&password=secure_password
```

### Get Current User
```http
GET /auth/me
Authorization: Bearer {token}
```

---

## Vendor Endpoints

### Create Vendor
```http
POST /vendors
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Green Mart",
  "owner_name": "John Doe",
  "phone": "9876543210",
  "category": "Vegetable",
  "location": "123 Market Street, Delhi",
  "sales": "0",
  "status": "Active",
  "location_lat": 28.6139,
  "location_lng": 77.2090
}
```

### Get All Vendors
```http
GET /vendors?skip=0&limit=100
Authorization: Bearer {token}
```

### Get Vendor by ID
```http
GET /vendors/{vendor_id}
Authorization: Bearer {token}
```

### Update Vendor
```http
PUT /vendors/{vendor_id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "Inactive",
  "sales": "50000"
}
```

### Delete Vendor
```http
DELETE /vendors/{vendor_id}
Authorization: Bearer {token}
```

---

## Inventory Endpoints

### Create Inventory Item
```http
POST /inventory
Authorization: Bearer {token}
Content-Type: application/json

{
  "vendor_id": 1,
  "name": "Tomatoes",
  "quantity": 50.5,
  "unit": "kg",
  "price": 40.0,
  "expiry_date": "2024-12-31T00:00:00"
}
```

### Get All Inventory
```http
GET /inventory?vendor_id=1&skip=0&limit=100
Authorization: Bearer {token}
```

### Get Inventory Item
```http
GET /inventory/{item_id}
Authorization: Bearer {token}
```

### Update Inventory Item
```http
PUT /inventory/{item_id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "quantity": 30.0,
  "price": 45.0
}
```

### Delete Inventory Item
```http
DELETE /inventory/{item_id}
Authorization: Bearer {token}
```

---

## Sales Endpoints

### Record Sale
```http
POST /sales
Authorization: Bearer {token}
Content-Type: application/json

{
  "vendor_id": 1,
  "total_amount": 1500.50,
  "items_summary": "[{\"name\":\"Tomatoes\",\"quantity\":10,\"price\":40}]"
}
```

### Get All Sales
```http
GET /sales?vendor_id=1&skip=0&limit=100
Authorization: Bearer {token}
```

---

## Stock Request Endpoints

### Create Stock Request
```http
POST /stock-requests
Authorization: Bearer {token}
Content-Type: application/json

{
  "vendor_id": 1,
  "product_name": "Tomatoes",
  "quantity": 100.0,
  "unit": "kg",
  "current_stock": 10.0,
  "preferred_delivery": "2024-01-15 10:00 AM"
}
```

### Get All Stock Requests
```http
GET /stock-requests?vendor_id=1&status_filter=Requested
Authorization: Bearer {token}
```

**Status values**: `Requested`, `Approved`, `In Transit`, `Delivered`

### Get Stock Request
```http
GET /stock-requests/{request_id}
Authorization: Bearer {token}
```

### Update Stock Request
```http
PUT /stock-requests/{request_id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "Approved",
  "handled_by": "Admin John",
  "modified_quantity": 80.0,
  "assigned_supplier": "Fresh Farms Ltd"
}
```

---

## Analytics & AI Endpoints

### Get Analytics Summary
```http
GET /analytics/summary
Authorization: Bearer {token}
```

Response:
```json
{
  "total_revenue": 125000.50,
  "total_vendors": 45,
  "active_vendors": 42,
  "low_stock_alerts": 8,
  "pending_requests": 12,
  "average_order_value": 2500.75
}
```

### Get Demand Prediction
```http
GET /analytics/demand-prediction?vendor_id=1&days_ahead=7
Authorization: Bearer {token}
```

Response:
```json
{
  "vendor_id": 1,
  "predictions": [
    {
      "date": "2024-01-16T00:00:00",
      "predicted_demand": 2500.50,
      "confidence": 0.85
    }
  ],
  "model_trained": true
}
```

### Get AI Recommendations
```http
GET /analytics/recommendations?vendor_id=1
Authorization: Bearer {token}
```

Response:
```json
{
  "vendor_id": 1,
  "recommendations": [
    {
      "type": "low_stock",
      "priority": "high",
      "product": "Tomatoes",
      "message": "Low stock alert: Tomatoes has only 5 units left",
      "action": "Reorder 50 units"
    }
  ],
  "count": 5
}
```

---

## Notification Endpoints

### Create Notification
```http
POST /notifications
Authorization: Bearer {token}
Content-Type: application/json

{
  "user_id": 1,
  "vendor_id": null,
  "title": "Low Stock Alert",
  "message": "Tomatoes running low",
  "type": "low_stock"
}
```

### Get Notifications
```http
GET /notifications?user_id=1&unread_only=true
Authorization: Bearer {token}
```

### Mark Notification as Read
```http
PUT /notifications/{notification_id}/read
Authorization: Bearer {token}
```

---

## PDF Report Endpoints

### Generate Inventory Report
```http
GET /reports/inventory/{vendor_id}
Authorization: Bearer {token}
```

Returns PDF file.

### Generate Sales Report
```http
GET /reports/sales/{vendor_id}?start_date=2024-01-01&end_date=2024-01-31
Authorization: Bearer {token}
```

Returns PDF file.

### Generate Analytics Report
```http
GET /reports/analytics
Authorization: Bearer {token}
```

Returns PDF file with comprehensive analytics.

---

## WebSocket Connection

### Connect to WebSocket
```javascript
const ws = new WebSocket('ws://localhost:8000/ws/{user_id}');

ws.onopen = () => {
  console.log('Connected to WebSocket');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};

// Send heartbeat
setInterval(() => {
  ws.send('ping');
}, 30000);
```

### WebSocket Message Types

**Low Stock Alert:**
```json
{
  "type": "low_stock",
  "title": "Low Stock Alert",
  "message": "Tomatoes is running low (5 units left)",
  "vendor_id": 1,
  "timestamp": "2024-01-15T10:30:00",
  "priority": "high"
}
```

**Stock Request Update:**
```json
{
  "type": "stock_request_update",
  "title": "Stock Request Update",
  "message": "Stock request #123 is now Approved",
  "request_id": 123,
  "status": "Approved",
  "timestamp": "2024-01-15T10:30:00",
  "priority": "medium"
}
```

**New Stock Request:**
```json
{
  "type": "new_stock_request",
  "title": "New Stock Request",
  "message": "New stock request from Green Mart",
  "request_id": 124,
  "timestamp": "2024-01-15T10:30:00",
  "priority": "medium"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "detail": "Email already registered"
}
```

### 401 Unauthorized
```json
{
  "detail": "Could not validate credentials"
}
```

### 403 Forbidden
```json
{
  "detail": "Not enough permissions"
}
```

### 404 Not Found
```json
{
  "detail": "Vendor not found"
}
```

### 422 Validation Error
```json
{
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "value is not a valid email address",
      "type": "value_error.email"
    }
  ]
}
```

---

## Rate Limiting

Currently no rate limiting is implemented. For production, consider adding rate limiting middleware.

---

## Data Models

### User
```typescript
{
  id: number
  username: string
  email: string
  role: "admin" | "official" | "vendor"
  is_active: boolean
  created_at: datetime
}
```

### Vendor
```typescript
{
  id: number
  name: string
  owner_name: string
  phone: string
  category: string
  location: string
  location_lat?: number
  location_lng?: number
  sales: string
  status: "Active" | "Inactive" | "Warning"
  language: string
  is_verified: boolean
  created_at: datetime
}
```

### InventoryItem
```typescript
{
  id: number
  vendor_id: number
  name: string
  quantity: number
  unit: string
  price: number
  expiry_date?: datetime
  last_updated: datetime
}
```

### Sale
```typescript
{
  id: number
  vendor_id: number
  total_amount: number
  items_summary: string  // JSON string
  timestamp: datetime
}
```

### StockRequest
```typescript
{
  id: number
  vendor_id: number
  product_name: string
  quantity: number
  unit: string
  current_stock: number
  preferred_delivery: string
  status: "Requested" | "Approved" | "In Transit" | "Delivered"
  requested_at: datetime
  delivered_at?: datetime
  handled_by?: string
  modified_quantity?: number
  assigned_supplier?: string
}
```

---

## Best Practices

1. **Always include Authorization header** for protected endpoints
2. **Use HTTPS in production** to secure data transmission
3. **Validate input data** on client side before sending to API
4. **Handle errors gracefully** and show user-friendly messages
5. **Implement retry logic** for failed requests
6. **Use pagination** for large data sets (skip & limit parameters)
7. **Cache frequently accessed data** to reduce API calls
8. **Log API errors** for debugging
9. **Set appropriate timeouts** for API requests
10. **Use WebSockets** for real-time updates instead of polling

---

## Testing with cURL

### Login and Get Token
```bash
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=admin123"
```

### Get Vendors with Token
```bash
curl -X GET "http://localhost:8000/api/vendors" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Create Vendor
```bash
curl -X POST "http://localhost:8000/api/vendors" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Mart",
    "owner_name": "Test Owner",
    "phone": "1234567890",
    "category": "Grocery",
    "location": "Test Location",
    "sales": "0",
    "status": "Active"
  }'
```

---

## Postman Collection

A Postman collection with all endpoints is recommended for testing. Import the collection and set up environment variables:

- `base_url`: http://localhost:8000/api
- `token`: Your JWT token after login

---

## Support

For API issues or questions:
- Check interactive docs at http://localhost:8000/docs
- Review error messages in response
- Check server logs for backend errors
- Ensure all required fields are provided
