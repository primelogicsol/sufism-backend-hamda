# Frontend API Integration Guide

## Overview

This guide provides comprehensive API documentation for frontend developers to integrate with the Sufism E-commerce Backend. The platform includes complete order management, inventory tracking, shipping, returns, notifications, and analytics systems.

## Base Configuration

### Base URL

```
Development: http://localhost:3000/api
Production: https://your-domain.com/api
```

### Authentication

All protected endpoints require JWT authentication via Authorization header:

```
Authorization: Bearer <jwt_token>
```

### Content Type

```
Content-Type: application/json
```

---

## 🔐 Authentication APIs

### 1. User Registration

**Endpoint:** `POST /api/user/register`

**Payload:**

```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "role": "customer"
}
```

**Response:**

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": "user_id",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "customer",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 2. User Login

**Endpoint:** `POST /api/user/login`

**Payload:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "jwt_token_here",
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "customer"
    }
  }
}
```

---

## 🛒 Order Management APIs

### 1. Create Order

**Endpoint:** `POST /api/user/orders`

**Payload:**

```json
{
  "items": [
    {
      "productId": 1,
      "category": "MUSIC",
      "quantity": 2,
      "price": 29.99
    }
  ],
  "shippingAddress": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA"
  },
  "billingAddress": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA"
  },
  "paymentMethod": "card",
  "notes": "Please handle with care"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "id": 1,
    "orderNumber": "ORD-2024-001",
    "status": "PENDING",
    "paymentStatus": "PENDING",
    "amount": 59.98,
    "items": [...],
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 2. Get User Orders

**Endpoint:** `GET /api/user/orders`

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by order status
- `dateFrom` (optional): Start date filter
- `dateTo` (optional): End date filter

**Response:**

```json
{
  "success": true,
  "message": "Orders retrieved successfully",
  "data": {
    "orders": [
      {
        "id": 1,
        "orderNumber": "ORD-2024-001",
        "status": "CONFIRMED",
        "paymentStatus": "PAID",
        "amount": 59.98,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

### 3. Get Order Details

**Endpoint:** `GET /api/user/orders/:orderId`

**Response:**

```json
{
  "success": true,
  "message": "Order retrieved successfully",
  "data": {
    "id": 1,
    "orderNumber": "ORD-2024-001",
    "status": "CONFIRMED",
    "paymentStatus": "PAID",
    "amount": 59.98,
    "items": [
      {
        "id": 1,
        "productId": 1,
        "category": "MUSIC",
        "quantity": 2,
        "price": 29.99,
        "total": 59.98
      }
    ],
    "shippingAddress": {...},
    "billingAddress": {...},
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 4. Update Order Status

**Endpoint:** `PUT /api/user/order-management/:orderId/status`

**Payload:**

```json
{
  "status": "PROCESSING",
  "notes": "Order is being prepared"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Order status updated successfully",
  "data": {
    "id": 1,
    "status": "PROCESSING",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## 📦 Inventory Management APIs

### 1. Get Product Stock

**Endpoint:** `GET /api/inventory/stock/:productId`

**Response:**

```json
{
  "success": true,
  "message": "Stock information retrieved successfully",
  "data": {
    "productId": 1,
    "currentStock": 50,
    "reservedStock": 5,
    "availableStock": 45,
    "lowStockThreshold": 10,
    "isLowStock": false,
    "lastUpdated": "2024-01-01T00:00:00.000Z"
  }
}
```

### 2. Get Inventory Logs

**Endpoint:** `GET /api/inventory/logs`

**Query Parameters:**

- `productId` (optional): Filter by product
- `changeType` (optional): Filter by change type
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response:**

```json
{
  "success": true,
  "message": "Inventory logs retrieved successfully",
  "data": {
    "logs": [
      {
        "id": 1,
        "productId": 1,
        "changeType": "SALE",
        "quantityChange": -2,
        "previousStock": 52,
        "newStock": 50,
        "reason": "Order fulfillment",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10
  }
}
```

### 3. Adjust Stock

**Endpoint:** `POST /api/inventory/adjust`

**Payload:**

```json
{
  "productId": 1,
  "adjustmentType": "MANUAL_ADJUSTMENT",
  "quantityChange": 10,
  "reason": "Stock count correction",
  "notes": "Physical count adjustment"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Stock adjusted successfully",
  "data": {
    "id": 1,
    "productId": 1,
    "adjustmentType": "MANUAL_ADJUSTMENT",
    "quantityChange": 10,
    "previousStock": 50,
    "newStock": 60,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## 🚚 Shipping & Fulfillment APIs

### 1. Create Shipment

**Endpoint:** `POST /api/shipping/shipments`

**Payload:**

```json
{
  "orderId": 1,
  "shippingMethod": "STANDARD",
  "carrier": "FEDEX",
  "trackingNumber": "FX123456789",
  "shippingAddress": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA"
  },
  "estimatedDelivery": "2024-01-05T00:00:00.000Z",
  "notes": "Handle with care"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Shipment created successfully",
  "data": {
    "id": 1,
    "orderId": 1,
    "trackingNumber": "FX123456789",
    "status": "PENDING",
    "shippingMethod": "STANDARD",
    "carrier": "FEDEX",
    "estimatedDelivery": "2024-01-05T00:00:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 2. Update Shipment Status

**Endpoint:** `PUT /api/shipping/shipments/:shipmentId/status`

**Payload:**

```json
{
  "status": "IN_TRANSIT",
  "location": "New York Distribution Center",
  "notes": "Package is in transit"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Shipment status updated successfully",
  "data": {
    "id": 1,
    "status": "IN_TRANSIT",
    "location": "New York Distribution Center",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 3. Get Shipment Tracking

**Endpoint:** `GET /api/shipping/shipments/:shipmentId/tracking`

**Response:**

```json
{
  "success": true,
  "message": "Tracking information retrieved successfully",
  "data": {
    "id": 1,
    "trackingNumber": "FX123456789",
    "status": "IN_TRANSIT",
    "currentLocation": "New York Distribution Center",
    "estimatedDelivery": "2024-01-05T00:00:00.000Z",
    "trackingHistory": [
      {
        "status": "PENDING",
        "location": "Warehouse",
        "timestamp": "2024-01-01T00:00:00.000Z",
        "description": "Package prepared for shipment"
      },
      {
        "status": "IN_TRANSIT",
        "location": "New York Distribution Center",
        "timestamp": "2024-01-02T00:00:00.000Z",
        "description": "Package is in transit"
      }
    ]
  }
}
```

---

## 🔄 Returns & Refunds APIs

### 1. Create Return Request

**Endpoint:** `POST /api/returns/requests`

**Payload:**

```json
{
  "orderId": 1,
  "reason": "DEFECTIVE_PRODUCT",
  "description": "Product arrived damaged",
  "items": [
    {
      "orderItemId": 1,
      "quantity": 1,
      "reason": "DEFECTIVE_PRODUCT"
    }
  ],
  "preferredResolution": "REFUND",
  "notes": "Please process refund as soon as possible"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Return request created successfully",
  "data": {
    "id": 1,
    "returnNumber": "RET-2024-001",
    "orderId": 1,
    "status": "REQUESTED",
    "reason": "DEFECTIVE_PRODUCT",
    "preferredResolution": "REFUND",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 2. Get Return Requests

**Endpoint:** `GET /api/returns/requests`

**Query Parameters:**

- `status` (optional): Filter by return status
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response:**

```json
{
  "success": true,
  "message": "Return requests retrieved successfully",
  "data": {
    "returns": [
      {
        "id": 1,
        "returnNumber": "RET-2024-001",
        "orderId": 1,
        "status": "APPROVED",
        "reason": "DEFECTIVE_PRODUCT",
        "refundAmount": 29.99,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10
  }
}
```

### 3. Process Refund

**Endpoint:** `POST /api/returns/refunds`

**Payload:**

```json
{
  "returnId": 1,
  "refundAmount": 29.99,
  "refundMethod": "ORIGINAL_PAYMENT",
  "refundType": "FULL_REFUND",
  "notes": "Processing full refund for defective product"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Refund processed successfully",
  "data": {
    "id": 1,
    "returnId": 1,
    "amount": 29.99,
    "refundMethod": "ORIGINAL_PAYMENT",
    "refundType": "FULL_REFUND",
    "status": "PROCESSING",
    "externalRefundId": "stripe_refund_123",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## 🔔 Real-time Notifications APIs

### 1. Get User Notifications

**Endpoint:** `GET /api/notifications`

**Query Parameters:**

- `type` (optional): Filter by notification type
- `status` (optional): Filter by notification status
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response:**

```json
{
  "success": true,
  "message": "Notifications retrieved successfully",
  "data": {
    "notifications": [
      {
        "id": 1,
        "type": "ORDER_CREATED",
        "title": "Order Confirmed",
        "message": "Your order ORD-2024-001 has been confirmed",
        "priority": "NORMAL",
        "status": "SENT",
        "isRead": false,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10
  }
}
```

### 2. Mark Notification as Read

**Endpoint:** `PUT /api/notifications/:notificationId/read`

**Response:**

```json
{
  "success": true,
  "message": "Notification marked as read",
  "data": {
    "id": 1,
    "isRead": true,
    "readAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 3. Get Notification Preferences

**Endpoint:** `GET /api/notifications/preferences`

**Response:**

```json
{
  "success": true,
  "message": "Notification preferences retrieved successfully",
  "data": [
    {
      "id": 1,
      "type": "ORDER_CREATED",
      "emailEnabled": true,
      "pushEnabled": true,
      "smsEnabled": false,
      "webSocketEnabled": true
    }
  ]
}
```

### 4. Update Notification Preferences

**Endpoint:** `PUT /api/notifications/preferences`

**Payload:**

```json
{
  "preferences": [
    {
      "type": "ORDER_CREATED",
      "emailEnabled": true,
      "pushEnabled": true,
      "smsEnabled": false,
      "webSocketEnabled": true
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "message": "Notification preferences updated successfully",
  "data": {
    "updated": 1,
    "preferences": [...]
  }
}
```

---

## 📊 Analytics & Reporting APIs

### 1. Get Sales Analytics

**Endpoint:** `GET /api/analytics/sales`

**Query Parameters:**

- `vendorId` (optional): Filter by vendor
- `period` (optional): Time period (7d, 30d, 90d, 1y)
- `groupBy` (optional): Group by (day, week, month)

**Response:**

```json
{
  "success": true,
  "message": "Sales analytics retrieved successfully",
  "data": {
    "summary": {
      "totalRevenue": 15000.00,
      "totalOrders": 150,
      "averageOrderValue": 100.00,
      "period": "30d",
      "dateFrom": "2024-01-01T00:00:00.000Z",
      "dateTo": "2024-01-31T00:00:00.000Z"
    },
    "ordersByStatus": [
      {
        "status": "COMPLETED",
        "count": 120,
        "revenue": 12000.00
      }
    ],
    "revenueByPeriod": [...],
    "topProducts": [...],
    "customerMetrics": {...}
  }
}
```

### 2. Get Inventory Analytics

**Endpoint:** `GET /api/analytics/inventory`

**Query Parameters:**

- `vendorId` (optional): Filter by vendor
- `period` (optional): Time period (7d, 30d, 90d, 1y)

**Response:**

```json
{
  "success": true,
  "message": "Inventory analytics retrieved successfully",
  "data": {
    "summary": {
      "totalStockMovements": 500,
      "lowStockAlerts": 5,
      "inventoryValue": 25000.00,
      "period": "30d"
    },
    "stockMovementsByType": [
      {
        "changeType": "SALE",
        "count": 300,
        "totalQuantity": -300
      }
    ],
    "topMovingProducts": [...]
  }
}
```

### 3. Create Custom Report

**Endpoint:** `POST /api/analytics/reports`

**Payload:**

```json
{
  "name": "Monthly Sales Report",
  "type": "SALES_REPORT",
  "format": "PDF",
  "parameters": {
    "dateFrom": "2024-01-01T00:00:00.000Z",
    "dateTo": "2024-01-31T00:00:00.000Z",
    "groupBy": "day",
    "metrics": ["revenue", "orders", "customers"]
  }
}
```

**Response:**

```json
{
  "success": true,
  "message": "Report created successfully",
  "data": {
    "id": 1,
    "name": "Monthly Sales Report",
    "type": "SALES_REPORT",
    "format": "PDF",
    "status": "PENDING",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 4. Get KPI Metrics

**Endpoint:** `GET /api/analytics/kpis`

**Response:**

```json
{
  "success": true,
  "message": "KPI metrics retrieved successfully",
  "data": [
    {
      "id": 1,
      "name": "total_revenue",
      "description": "Total Revenue",
      "category": "sales",
      "target": 100000.0,
      "currentValue": 75000.0,
      "unit": "$",
      "targetAchieved": 75.0
    }
  ]
}
```

### 5. Create Dashboard

**Endpoint:** `POST /api/analytics/dashboards`

**Payload:**

```json
{
  "name": "Sales Dashboard",
  "description": "Main sales performance dashboard",
  "widgets": [
    {
      "type": "SALES_CHART",
      "title": "Sales Trend",
      "description": "Daily sales trend",
      "position": 1,
      "size": "large",
      "configuration": {
        "chartType": "line",
        "period": "30d"
      },
      "refreshInterval": 300
    },
    {
      "type": "REVENUE_METRIC",
      "title": "Total Revenue",
      "position": 2,
      "size": "medium",
      "refreshInterval": 60
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "message": "Dashboard created successfully",
  "data": {
    "id": 1,
    "name": "Sales Dashboard",
    "description": "Main sales performance dashboard",
    "isDefault": false,
    "isPublic": false,
    "widgets": [...],
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## 💳 Payment Integration APIs

### 1. Create Payment Intent

**Endpoint:** `POST /api/stripe/create-payment-intent`

**Payload:**

```json
{
  "amount": 5999,
  "currency": "usd",
  "orderId": 1,
  "customerEmail": "user@example.com"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Payment intent created successfully",
  "data": {
    "clientSecret": "pi_1234567890_secret_abcdef",
    "paymentIntentId": "pi_1234567890"
  }
}
```

### 2. Confirm Payment

**Endpoint:** `POST /api/stripe/confirm-payment`

**Payload:**

```json
{
  "paymentIntentId": "pi_1234567890",
  "orderId": 1
}
```

**Response:**

```json
{
  "success": true,
  "message": "Payment confirmed successfully",
  "data": {
    "paymentIntentId": "pi_1234567890",
    "status": "succeeded",
    "amount": 5999,
    "currency": "usd"
  }
}
```

---

## 🔌 WebSocket Integration

### Real-time Notifications

Connect to WebSocket for real-time notifications:

```javascript
// WebSocket connection
const socket = io("http://localhost:3000", {
  auth: {
    token: "your_jwt_token"
  }
});

// Listen for notifications
socket.on("notification", (notification) => {
  console.log("New notification:", notification);
  // Update UI with new notification
});

// Listen for order updates
socket.on("order_update", (orderUpdate) => {
  console.log("Order updated:", orderUpdate);
  // Update order status in UI
});

// Listen for inventory alerts
socket.on("inventory_alert", (alert) => {
  console.log("Inventory alert:", alert);
  // Show low stock alert
});
```

---

## 📱 Frontend Integration Flow

### 1. Authentication Flow

```javascript
// 1. User Registration/Login
const loginResponse = await fetch("/api/user/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password })
});

const { data } = await loginResponse.json();
const token = data.token;

// 2. Store token and set up authenticated requests
localStorage.setItem("authToken", token);

// 3. Use token in subsequent requests
const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json"
};
```

### 2. Order Management Flow

```javascript
// 1. Create Order
const orderResponse = await fetch("/api/user/orders", {
  method: "POST",
  headers,
  body: JSON.stringify(orderData)
});

// 2. Track Order Status
const orderId = orderData.id;
const orderStatus = await fetch(`/api/user/orders/${orderId}`, {
  headers
});

// 3. Listen for Real-time Updates
socket.on("order_update", (update) => {
  if (update.orderId === orderId) {
    updateOrderStatus(update.status);
  }
});
```

### 3. Inventory Management Flow

```javascript
// 1. Check Product Availability
const stockResponse = await fetch(`/api/inventory/stock/${productId}`, {
  headers
});

const { availableStock } = await stockResponse.json();

// 2. Show Stock Status
if (availableStock < 5) {
  showLowStockWarning();
}

// 3. Listen for Stock Updates
socket.on("inventory_update", (update) => {
  if (update.productId === productId) {
    updateStockDisplay(update.newStock);
  }
});
```

### 4. Analytics Dashboard Flow

```javascript
// 1. Get Analytics Data
const analyticsResponse = await fetch("/api/analytics/overview?period=30d", {
  headers
});

const analyticsData = await analyticsResponse.json();

// 2. Create Dashboard
const dashboardResponse = await fetch("/api/analytics/dashboards", {
  method: "POST",
  headers,
  body: JSON.stringify(dashboardConfig)
});

// 3. Render Charts
renderSalesChart(analyticsData.sales);
renderInventoryChart(analyticsData.inventory);
```

---

## 🚨 Error Handling

### Standard Error Response Format

```json
{
  "success": false,
  "message": "Error description",
  "error": {
    "code": "ERROR_CODE",
    "details": "Additional error details"
  }
}
```

### Common Error Codes

- `UNAUTHORIZED` (401): Invalid or missing authentication
- `FORBIDDEN` (403): Insufficient permissions
- `NOT_FOUND` (404): Resource not found
- `VALIDATION_ERROR` (400): Invalid request data
- `INTERNAL_ERROR` (500): Server error

### Error Handling Example

```javascript
try {
  const response = await fetch("/api/user/orders", { headers });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message);
  }

  return data;
} catch (error) {
  console.error("API Error:", error.message);
  showErrorMessage(error.message);
}
```

---

## 🔧 Development Tips

### 1. API Testing

Use tools like Postman or Insomnia to test API endpoints before frontend integration.

### 2. Rate Limiting

The API implements rate limiting. Handle 429 responses gracefully:

```javascript
if (response.status === 429) {
  const retryAfter = response.headers.get("Retry-After");
  setTimeout(() => retryRequest(), retryAfter * 1000);
}
```

### 3. Caching Strategy

Implement client-side caching for frequently accessed data:

```javascript
const cache = new Map();

async function getCachedData(endpoint, headers) {
  if (cache.has(endpoint)) {
    return cache.get(endpoint);
  }

  const response = await fetch(endpoint, { headers });
  const data = await response.json();

  cache.set(endpoint, data);
  return data;
}
```

### 4. Real-time Updates

Always implement WebSocket connections for real-time features:

```javascript
// Reconnect on connection loss
socket.on("disconnect", () => {
  console.log("Disconnected from server");
  setTimeout(() => {
    socket.connect();
  }, 5000);
});
```

---

## 📋 Checklist for Frontend Integration

### ✅ Authentication

- [ ] Implement login/register forms
- [ ] Store JWT token securely
- [ ] Add token to all API requests
- [ ] Handle token expiration

### ✅ Order Management

- [ ] Create order form with validation
- [ ] Display order history
- [ ] Show order status updates
- [ ] Implement order tracking

### ✅ Inventory Management

- [ ] Show product stock levels
- [ ] Display low stock warnings
- [ ] Update stock in real-time
- [ ] Handle stock adjustments

### ✅ Shipping & Fulfillment

- [ ] Create shipment forms
- [ ] Display tracking information
- [ ] Show delivery status
- [ ] Handle shipping updates

### ✅ Returns & Refunds

- [ ] Create return request forms
- [ ] Display return status
- [ ] Show refund information
- [ ] Handle return processing

### ✅ Notifications

- [ ] Implement notification center
- [ ] Show real-time notifications
- [ ] Handle notification preferences
- [ ] Mark notifications as read

### ✅ Analytics & Reporting

- [ ] Create analytics dashboard
- [ ] Display charts and metrics
- [ ] Generate custom reports
- [ ] Show KPI metrics

### ✅ Real-time Features

- [ ] Implement WebSocket connection
- [ ] Handle real-time updates
- [ ] Show live notifications
- [ ] Update UI dynamically

---

## 🎯 Next Steps

1. **Set up development environment** with proper API base URL
2. **Implement authentication** with JWT token management
3. **Create core UI components** for orders, inventory, and analytics
4. **Integrate WebSocket** for real-time features
5. **Test all API endpoints** with proper error handling
6. **Implement caching strategy** for better performance
7. **Add loading states** and user feedback
8. **Test real-time features** thoroughly

This comprehensive API guide provides everything needed for frontend developers to integrate with the complete e-commerce platform. The system is production-ready with enterprise-grade features including real-time notifications, advanced analytics, and comprehensive order management.
