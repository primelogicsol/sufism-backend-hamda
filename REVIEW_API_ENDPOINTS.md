# 📝 Review API Endpoints & Current Status

## 🔗 Available Endpoints

| Category          | Endpoint                       | Method | Status                    |
| ----------------- | ------------------------------ | ------ | ------------------------- |
| **Fashion**       | `/v1/review-fashion/:id`       | POST   | ❌ No purchase validation |
| **Decoration**    | `/v1/review-decoration/:id`    | POST   | ❌ No purchase validation |
| **Meditation**    | `/v1/review-meditation/:id`    | POST   | ❌ No purchase validation |
| **Accessories**   | `/v1/review-accessories/:id`   | POST   | ❌ No purchase validation |
| **Digital Books** | `/v1/review-digital-books/:id` | POST   | ❌ No purchase validation |
| **Living**        | `/v1/review-living/:id`        | POST   | ❌ No purchase validation |
| **Audio/Music**   | `/v1/review-audio/:id`         | POST   | ❌ No purchase validation |

## ⚠️ Current Issues

### ❌ Missing Validations:

1. **No Purchase Check**: Anyone can review without buying
2. **No Delivery Status Check**: No verification that order is DELIVERED
3. **No Product Ownership Verification**: Doesn't verify user actually received the product

## ✅ Required Fixes

### Validation Needed:

```typescript
// 1. Check if user has DELIVERED order containing this product
const deliveredOrder = await db.order.findFirst({
  where: {
    userId: user.id,
    status: "DELIVERED"
  },
  include: {
    items: {
      where: {
        category: "FASHION", // or appropriate category
        productId: productId
      }
    }
  }
});

if (!deliveredOrder || deliveredOrder.items.length === 0) {
  return error("You can only review products you have purchased and received");
}
```

## 📋 Request/Response Format

### Current Request:

```json
POST /v1/review-fashion/:id
Authorization: Bearer <token>
{
  "rating": 5,
  "content": "Great product!"
}
```

### Current Response:

```json
{
  "success": true,
  "status": 201,
  "message": "Review added successfully",
  "data": {
    "id": 1,
    "rating": 5,
    "content": "Great product!",
    "userId": "user_123",
    "fashionId": 123,
    "user": {
      "id": "user_123",
      "fullName": "John Doe",
      "email": "john@example.com"
    }
  }
}
```
