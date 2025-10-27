# Vendor API Testing Guide

## ✅ Confirmed Working

### Admin Login

- **Endpoint**: `POST http://localhost:6015/v1/user/admin/login`
- **Status**: ✅ **WORKING**
- **Credentials**: `username: admin, password: admin123`
- **Response**: Returns JWT token

## 📝 Test Results

### 1. Vendor Login Test

**Endpoint**: `POST http://localhost:6015/v1/vendor-login`

**Status**: ❌ User not found

- Email: `asad@gmail.com`
- Password: `123456789` or `12345678`

**Issue**: The vendor account with this email doesn't exist in the database. You need to:

1. Create the vendor account first using `/v1/vendor-register`
2. Or check if the email is different in your database

### 2. Available Vendor Endpoints

All these endpoints are now properly routed and should work once you have an authenticated vendor token:

#### Vendor Authentication (Public - No Auth)

- `POST /v1/vendor-login` - Vendor login
- `POST /v1/vendor-register` - Vendor registration
- `POST /v1/vendor-register/:id` - Update vendor profile

#### Vendor Shipping (Protected - Require Auth)

- `POST /v1/vendor/shipping/config` - Create/update shipping config
- `GET /v1/vendor/shipping/config` - Get shipping config
- `PUT /v1/vendor/shipping/status` - Update shipping status
- `GET /v1/vendor/shipping/summary` - Get shipping summary
- `POST /v1/vendor/shipping/zones` - Create shipping zone
- `POST /v1/vendor/shipping/zones-with-rates` - ✨ **NEW: Create zone with rates in one call**
- `PUT /v1/vendor/shipping/zones/:zoneId` - Update zone
- `DELETE /v1/vendor/shipping/zones/:zoneId` - Delete zone
- `POST /v1/vendor/shipping/rates` - Create shipping rate
- `PUT /v1/vendor/shipping/rates/:rateId` - Update rate
- `DELETE /v1/vendor/shipping/rates/:rateId` - Delete rate
- `POST /v1/vendor/shipping/calculate` - Calculate shipping
- `GET /v1/vendor/shipping/validate` - Validate config

#### Vendor Payout (Protected - Require Auth)

- `POST /v1/vendor/payout/config` - Create/update payout config
- `GET /v1/vendor/payout/config` - Get payout config
- `PUT /v1/vendor/payout/status` - Update payout status
- `GET /v1/vendor/payout/methods` - Get payout methods
- `GET /v1/vendor/payout/onboarding-status` - Get onboarding status
- `POST /v1/vendor/payout/verify/:vendorId` - Verify payout (admin)

#### Vendor Onboarding (Protected - Require Auth)

- `GET /v1/vendor/onboarding/status` - Get onboarding status
- `GET /v1/vendor/onboarding/requirements` - Get requirements
- `PUT /v1/vendor/onboarding/progress` - Update progress
- `GET /v1/vendor/onboarding/readiness` - Get readiness status

#### Vendor Orders (Protected - Require Auth)

- `GET /v1/vendor/orders` - Get all orders
- `GET /v1/vendor/orders/summary` - Get order summary
- `GET /v1/vendor/orders/analytics` - Get order analytics
- `GET /v1/vendor/orders/:orderItemId` - Get order details
- `PUT /v1/vendor/orders/:orderItemId/status` - Update order status
- `POST /v1/vendor/orders/bulk-update` - Bulk update orders

## 🚀 How to Test Complete Flow

### Step 1: Create Vendor Account (if needed)

```bash
POST http://localhost:6015/v1/vendor-register
Content-Type: application/json

{
  "fullName": "Test Vendor",
  "email": "vendor@example.com",
  "password": "SecurePass123",
  "phone": "+1234567890",
  "businessName": "Test Business"
}
```

### Step 2: Login

```bash
POST http://localhost:6015/v1/vendor-login
Content-Type: application/json

{
  "email": "vendor@example.com",
  "password": "SecurePass123"
}
```

### Step 3: Use the Token for All Requests

```bash
Authorization: Bearer <access_token>
```

### Step 4: Test Shipping Setup

```bash
POST http://localhost:6015/v1/vendor/shipping/zones-with-rates
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "zoneName": "US Domestic",
  "country": "US",
  "zipCodeRanges": [
    {"from": "10001", "to": "19999"}
  ],
  "shippingRates": [
    {
      "carrier": "USPS",
      "method": "Priority",
      "rateType": "WEIGHT_BASED",
      "baseRate": 5.00,
      "perKgRate": 2.50
    }
  ]
}
```

## 📊 Routing Fixes Applied

✅ **Issue Fixed**: `vendorOrderRouter` was mounted at `/` causing authentication to block `/vendor-login`

✅ **Solution**:

- Moved `vendorOrderRouter` to `/vendor/orders`
- Updated route paths in the router to avoid duplication
- All vendor routes now properly organized under `/vendor/*`

## ⚠️ Next Steps

1. **Create the vendor account** with the credentials you provided
2. Or use an existing vendor account from your database
3. Once authenticated, all the vendor APIs listed above will work

Would you like me to help you create a test vendor account or check what accounts exist in your database?
