# 🚚 Complete Shipping & Order Flow

## 📋 Overview

This document explains the complete flow from adding products to cart, calculating shipping, to creating an order.

---

## 🔄 Complete Flow Diagram

```
1. Customer adds products to cart
   ↓
2. Cart contains products from multiple vendors
   ↓
3. Customer enters shipping address (country, zipCode, state?)
   ↓
4. System calculates shipping rates per vendor
   ↓
5. System aggregates STANDARD and BASIC options
   ↓
6. Customer selects delivery option (STANDARD or BASIC)
   ↓
7. Customer creates order with selected shipping
   ↓
8. Order is placed with vendor-specific items
```

---

## 📦 Step 1: Add Products to Cart

### Endpoint

```
POST /v1/user/cart
Authorization: Bearer <customer_token>
```

### Request Body

```json
{
  "category": "fashion",
  "productId": 123,
  "qty": 2
}
```

### What Happens:

1. System finds product by category and productId
2. Product has `userId` field = **vendor ID**
3. Cart item is created with product reference
4. Cart can contain products from **multiple vendors**

### Response

```json
{
  "success": true,
  "status": 200,
  "message": "Item added to cart",
  "data": {
    "id": 1,
    "userId": "customer_123",
    "fashionId": 123,
    "qty": 2
  }
}
```

---

## 🛒 Step 2: View Cart

### Endpoint

```
GET /v1/user/cart
Authorization: Bearer <customer_token>
```

### Response

```json
{
  "success": true,
  "data": {
    "cartItems": [
      {
        "id": 1,
        "fashionId": 123,
        "qty": 2,
        "fashion": {
          "id": 123,
          "title": "Sample Tee",
          "price": 19.99,
          "weight": 0.5,
          "userId": "vendor_1" // 👈 Vendor ID
        }
      },
      {
        "id": 2,
        "decorationId": 456,
        "qty": 1,
        "decoration": {
          "id": 456,
          "title": "Decorative Item",
          "price": 29.99,
          "weight": 1.0,
          "userId": "vendor_2" // 👈 Different vendor
        }
      }
    ]
  }
}
```

**Note:** Cart contains products from **vendor_1** and **vendor_2**

---

## 🚚 Step 3: Calculate Shipping Rates

### Endpoint

```
POST /v1/vendor/shipping/calculate
Authorization: Bearer <customer_token>
```

### Request Body

```json
{
  "destination": {
    "country": "US",
    "zipCode": "90210",
    "state": "CA" // Optional
  }
}
```

### What Happens Internally:

#### 3.1 Fetch Cart Items with Vendor Info

```typescript
const cartItems = await db.cart.findMany({
  where: { userId: customerId },
  include: {
    fashion: { include: { user: true } }, // Get vendor info
    decoration: { include: { user: true } }
    // ... other categories
  }
});
```

#### 3.2 Group Products by Vendor

```
Cart Items:
  - Product 1 (vendor_1) → weight: 0.5, qty: 2
  - Product 2 (vendor_2) → weight: 1.0, qty: 1

Grouped:
  vendor_1: [Product 1]
  vendor_2: [Product 2]
```

#### 3.3 Calculate Rates Per Vendor

**For vendor_1:**

- Check vendor_1's shipping config
- Find matching zone for destination (US, CA, 90210)
- Calculate rates for vendor_1's products
- Filter to only STANDARD and EXPRESS methods
- Get cheapest STANDARD rate: $8.99
- Get cheapest EXPRESS rate: $12.99

**For vendor_2:**

- Check vendor_2's shipping config
- Find matching zone for destination
- Calculate rates for vendor_2's products
- Filter to only STANDARD and EXPRESS methods
- Get cheapest STANDARD rate: $7.00
- Get cheapest EXPRESS rate: $10.00

#### 3.4 Aggregate Totals

```
STANDARD Total = $8.99 (vendor_1) + $7.00 (vendor_2) = $15.99
BASIC Total = $12.99 (vendor_1) + $10.00 (vendor_2) = $22.99
Max Days (STANDARD) = max(5, 3) = 5 days
Max Days (BASIC) = max(2, 2) = 2 days
```

#### 3.5 Return Simple Response

```json
{
  "success": true,
  "status": 200,
  "message": "Shipping rates calculated successfully",
  "data": {
    "deliveryOptions": [
      {
        "type": "STANDARD",
        "name": "Standard Delivery",
        "shippingCost": 15.99,
        "selectedShippingService": "STANDARD",
        "estimatedDeliveryDays": 5,
        "description": "Standard delivery in 5 business days"
      },
      {
        "type": "BASIC",
        "name": "Basic Delivery",
        "shippingCost": 22.99,
        "selectedShippingService": "BASIC",
        "estimatedDeliveryDays": 2,
        "description": "Basic delivery in 2 business days"
      }
    ],
    "totalVendors": 2
  }
}
```

### Error Cases:

**If any vendor lacks shipping:**

```json
{
  "success": false,
  "status": 400,
  "message": "Cannot calculate shipping: Some vendors have not configured shipping",
  "data": {
    "errors": [
      {
        "vendorId": "vendor_3",
        "vendorName": "Vendor Three",
        "error": "No shipping configuration found"
      }
    ],
    "message": "Please remove products from vendors without shipping configuration or contact support"
  }
}
```

---

## ✅ Step 4: Customer Selects Delivery Option

**Frontend shows:**

- Option 1: STANDARD Delivery - $15.99 (5 days)
- Option 2: BASIC Delivery - $22.99 (2 days)

**Customer selects:** STANDARD

**Selected data:**

```json
{
  "type": "STANDARD",
  "shippingCost": 15.99,
  "selectedShippingService": "STANDARD",
  "estimatedDeliveryDays": 5
}
```

---

## 💳 Step 5: Create Order

### Endpoint

```
POST /v1/user/order
Authorization: Bearer <customer_token>
```

### Request Body

```json
{
  "fullName": "John Doe",
  "shippingAddress": "123 Main St",
  "zip": "90210",
  "country": "US",
  "phone": "+1234567890",

  // 👇 Selected shipping option
  "shippingCost": 15.99,
  "selectedShippingService": "STANDARD",
  "estimatedDeliveryDays": 5
}
```

### What Happens Internally:

#### 5.1 Validate Cart

- Fetch cart items with products
- Check stock availability
- Validate all items

#### 5.2 Calculate Order Items

```typescript
// Extract vendor info from each product
Order Items:
  - Item 1: category="FASHION", productId=123, vendorId="vendor_1", price=19.99, qty=2
  - Item 2: category="DECORATION", productId=456, vendorId="vendor_2", price=29.99, qty=1
```

#### 5.3 Calculate Totals

```
Subtotal = (19.99 × 2) + (29.99 × 1) = 69.97
Shipping = 15.99
Total = 69.97 + 15.99 = 85.96
```

#### 5.4 Create Payment Intent (Stripe)

```typescript
const paymentIntent = await stripe.paymentIntents.create({
  amount: 8596, // $85.96 in cents
  currency: "usd",
  metadata: {
    shippingCost: 15.99,
    selectedShippingService: "STANDARD",
    estimatedDeliveryDays: 5
  }
});
```

#### 5.5 Create Order in Database

```typescript
const order = await db.order.create({
  data: {
    userId: "customer_123",
    amount: 85.96,
    shippingCost: 15.99,
    selectedShippingService: "STANDARD",
    estimatedDeliveryDays: 5,
    shippingAddress: "123 Main St",
    zip: "90210",
    country: "US",
    items: {
      create: [
        {
          category: "FASHION",
          productId: 123,
          vendorId: "vendor_1", // 👈 Vendor ID stored
          quantity: 2,
          price: 19.99
        },
        {
          category: "DECORATION",
          productId: 456,
          vendorId: "vendor_2", // 👈 Vendor ID stored
          quantity: 1,
          price: 29.99
        }
      ]
    }
  }
});
```

#### 5.6 Clear Cart

```typescript
await db.cart.deleteMany({ where: { userId: "customer_123" } });
```

### Response

```json
{
  "success": true,
  "status": 200,
  "message": "Order created. Complete payment if required.",
  "data": {
    "clientSecret": "pi_xxx_secret_xxx",
    "paymentIntentStatus": "succeeded"
  }
}
```

---

## 📊 Data Flow Summary

### Cart Structure

```
Cart (customer_123)
  ├── Item 1: fashionId=123 → Product (vendor_1)
  └── Item 2: decorationId=456 → Product (vendor_2)
```

### Shipping Calculation

```
vendor_1 Products → Calculate Rates → STANDARD: $8.99, BASIC: $12.99
vendor_2 Products → Calculate Rates → STANDARD: $7.00, BASIC: $10.00
                                    ↓
                    Aggregate: STANDARD: $15.99, BASIC: $22.99
```

### Order Structure

```
Order (customer_123)
  ├── shippingCost: 15.99
  ├── selectedShippingService: "STANDARD"
  ├── estimatedDeliveryDays: 5
  └── Items:
      ├── Item 1: vendor_1 (FASHION)
      └── Item 2: vendor_2 (DECORATION)
```

---

## 🔍 Key Points

### ✅ What Works Now:

1. **Multi-Vendor Support**: Cart can have products from multiple vendors
2. **Per-Vendor Calculation**: Each vendor's shipping is calculated separately
3. **Aggregated Options**: Customer sees only 2 options (STANDARD & BASIC)
4. **Error Handling**: Clear errors if vendor lacks shipping config
5. **Vendor Tracking**: Each order item stores its vendor ID

### 📝 Important Fields:

**In Shipping Response:**

- `shippingCost`: Total cost for selected option
- `selectedShippingService`: "STANDARD" or "BASIC"
- `estimatedDeliveryDays`: Max days across all vendors

**In Order Creation:**

- `shippingCost`: From selected option
- `selectedShippingService`: From selected option
- `estimatedDeliveryDays`: From selected option
- Each `OrderItem` has `vendorId`: Tracks which vendor owns each product

---

## 🎯 Example Scenario

### Cart Contents:

- 2x Fashion Item from Vendor A ($19.99 each)
- 1x Decoration Item from Vendor B ($29.99)

### Shipping Calculation:

- Vendor A STANDARD: $8.99
- Vendor A BASIC: $12.99
- Vendor B STANDARD: $7.00
- Vendor B BASIC: $10.00

**Result:**

- STANDARD: $8.99 + $7.00 = **$15.99**
- BASIC: $12.99 + $10.00 = **$22.99**

### Customer Selects STANDARD ($15.99)

### Order Created:

```
Subtotal: $69.97 (2 × $19.99 + $29.99)
Shipping: $15.99
Total: $85.96

Order Items:
  - Fashion Item (vendor A)
  - Decoration Item (vendor B)
```

---

## ⚠️ Error Scenarios

### 1. Vendor Without Shipping Config

**Error:** Cannot calculate shipping
**Action:** Remove products from that vendor or contact support

### 2. No Matching Zone

**Error:** No matching shipping zone found for destination
**Action:** Vendor needs to configure zones for that destination

### 3. Empty Cart

**Error:** Cart is empty
**Action:** Add products first

### 4. Invalid Destination

**Error:** Destination is required (country, zipCode)
**Action:** Provide valid destination

---

## 🔄 Next Steps (Pending)

1. **Checkout Validation**: Block checkout if any vendor lacks shipping (HIGH PRIORITY)
2. **Product Filtering**: Hide products from vendors without shipping (MEDIUM)
3. **Vendor Info Display**: Show vendor names in product listings (LOW)

---

## 📝 API Endpoints Summary

| Step | Endpoint                        | Method | Auth     | Purpose                            |
| ---- | ------------------------------- | ------ | -------- | ---------------------------------- |
| 1    | `/v1/user/cart`                 | POST   | Customer | Add to cart                        |
| 2    | `/v1/user/cart`                 | GET    | Customer | View cart                          |
| 3    | `/v1/vendor/shipping/calculate` | POST   | Customer | Calculate shipping                 |
| 4    | -                               | -      | -        | Customer selects option (Frontend) |
| 5    | `/v1/user/order`                | POST   | Customer | Create order                       |

---

## ✅ Testing Checklist

- [ ] Add product from vendor_1 to cart
- [ ] Add product from vendor_2 to cart
- [ ] Calculate shipping with valid destination
- [ ] Verify only STANDARD and BASIC options shown
- [ ] Verify costs are aggregated correctly
- [ ] Select STANDARD option
- [ ] Create order with selected shipping
- [ ] Verify order items have correct vendor IDs
- [ ] Test with vendor without shipping (should error)
- [ ] Test with invalid destination (should error)
- [ ] Test with empty cart (should error)
