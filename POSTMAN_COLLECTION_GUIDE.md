# 📦 Complete E-commerce Flow - Postman Collection Guide

## 🚀 Quick Start

1. **Import Collection**: Import `Complete_Ecommerce_Flow.postman_collection.json` into Postman
2. **Set Base URL**: The collection uses `http://localhost:6015/v1` by default
3. **Follow the Flow**: Execute requests in order (numbered folders)

## 📋 Complete Flow Overview

### 1️⃣ Authentication

- **Vendor Login**: Get vendor access token (auto-saved)
- **Customer Login**: Get customer access token (auto-saved)

### 2️⃣ Vendor - Product Management

- **Create Fashion Product**: Create a product with images
- **Get Product**: View created product details

### 3️⃣ Vendor - Shipping Configuration

- **Create Shipping Config**: Enable shipping and set defaults
- **Create Zone with Rates**: One API call to create zone + rates
- **Validate Shipping**: Verify configuration is complete

### 4️⃣ Customer - Cart Management

- **Add to Cart**: Add product to cart
- **View Cart**: See all cart items
- **Update Cart**: Change quantities
- **Calculate Shipping**: Get shipping rates for destination

### 5️⃣ Customer - Order Management

- **Create Order**: Create order from cart with shipping
- **Get Order**: View order details

### 6️⃣ Customer - Product Review

- **Write Review**: Review product (requires DELIVERED order)
- **Get Reviews**: View all reviews for a product

### 7️⃣ Vendor - Order Management

- **Get Orders**: View all vendor orders
- **Update Status to DELIVERED**: Mark order as delivered (required for reviews)

---

## 🔑 Important Notes

### Variable Management

The collection automatically saves:

- `vendorToken` - From vendor login
- `customerToken` - From customer login
- `productId` - From product creation
- `zoneId` - From zone creation
- `orderId` - From order creation

### Authentication

All protected endpoints require Bearer token:

```
Authorization: Bearer {{vendorToken}}  // For vendor endpoints
Authorization: Bearer {{customerToken}} // For customer endpoints
```

### Shipping Setup Flow

1. **Create Shipping Config** - Enable shipping
2. **Create Zone with Rates** - Set up delivery zones and rates
3. **Validate** - Check if configuration is complete

### Review Flow Requirements

⚠️ **Important**: To write a review, you must:

1. ✅ Product must be purchased (order created)
2. ✅ Order status must be `DELIVERED`
3. Use vendor endpoint to update order status first

---

## 📝 Request Examples

### Create Product (Fashion)

```json
POST /v1/fashion
Headers: Authorization: Bearer {{vendorToken}}
Body (form-data):
  - title: "Premium Cotton T-Shirt"
  - description: "High quality cotton t-shirt"
  - price: "29.99"
  - stock: "100"
  - sku: "FASH-TEE-001"
  - weight: "0.5"
  - images: [file uploads]
```

### Create Zone with Rates

```json
POST /v1/vendor/shipping/zones-with-rates
Headers: Authorization: Bearer {{vendorToken}}
Body:
{
  "zoneName": "California Zone",
  "country": "US",
  "state": "CA",
  "zipCodes": ["90210", "94016"],
  "isActive": true,
  "rates": [
    {
      "carrier": "FEDEX",
      "method": "STANDARD",
      "rateType": "FIXED",
      "fixedCost": 15.99,
      "estimatedDays": 5
    }
  ]
}
```

### Add to Cart

```json
POST /v1/cart
Headers: Authorization: Bearer {{customerToken}}
Body:
{
  "productId": 123,
  "category": "fashion",
  "qty": 1
}
```

### Calculate Shipping

```json
POST /v1/vendor/shipping/calculate
Headers: Authorization: Bearer {{customerToken}}
Body:
{
  "destination": {
    "country": "US",
    "state": "CA",
    "zipCode": "90210"
  }
}
```

### Create Order

```json
POST /v1/order
Headers: Authorization: Bearer {{customerToken}}
Body:
{
  "fullName": "John Doe",
  "shippingAddress": "123 Main Street",
  "zip": "90210",
  "country": "US",
  "phone": "+1234567890",
  "shippingCost": 15.99,
  "selectedShippingService": "STANDARD",
  "estimatedDeliveryDays": 5
}
```

### Write Review

```json
POST /v1/review
Headers: Authorization: Bearer {{customerToken}}
Body:
{
  "category": "fashion",
  "productId": 123,
  "rating": 5,
  "content": "Excellent product! Great quality and fast shipping."
}
```

---

## ✅ Testing Checklist

- [ ] Vendor login successful
- [ ] Customer login successful
- [ ] Product created successfully
- [ ] Shipping config created
- [ ] Zone with rates created
- [ ] Product added to cart
- [ ] Shipping rates calculated
- [ ] Order created successfully
- [ ] Order status updated to DELIVERED
- [ ] Review written successfully

---

## 🔧 Troubleshooting

### Token Expired

- Re-run the login endpoints to get fresh tokens

### Product Not Found

- Make sure `productId` variable is set correctly

### Shipping Rates Not Available

- Verify shipping configuration is complete
- Check zone matches destination (country/state/zip)
- Ensure rates are active

### Cannot Write Review

- Verify order status is `DELIVERED`
- Check if product was actually purchased
- Make sure you're using the correct productId

---

## 📚 Additional Resources

- Base URL: `http://localhost:6015/v1`
- All endpoints require `/v1` prefix
- File uploads use `multipart/form-data`
- JSON requests use `application/json`

---

**Happy Testing! 🎉**
