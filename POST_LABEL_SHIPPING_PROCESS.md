# Complete Post-Label Shipping Process Guide

## Overview

After a shipping label is generated, there are several steps in the fulfillment process. This guide covers all the steps from label generation to delivery completion.

---

## 📋 Complete Shipping Flow After Label Generation

### Current Status: `LABEL_CREATED`

After generating the label, the system automatically:

- ✅ Creates a `Shipment` record with status: `LABEL_CREATED`
- ✅ Updates `Order` status to `SHIPPED` with `shippingStatus: LABEL_CREATED`
- ✅ Stores tracking number in both `Shipment` and `Order`
- ✅ Creates an `OrderHistory` entry for audit trail
- ✅ Returns label URL and tracking information

---

## 🔄 Step-by-Step Post-Label Process

### Step 1: Download & Print Label

**Action:** Vendor downloads and prints the shipping label

**What You Get:**

- `labelUrl`: Direct PDF download link for the shipping label
- `trackingNumber`: USPS tracking number for tracking the package
- `trackingUrl`: Direct link to USPS tracking page

**Manual Steps:**

1. Download the PDF from `labelUrl` in the label generation response
2. Print the label on a thermal printer or standard printer
3. Attach the label to the package securely

---

### Step 2: Package Preparation

**Vendor Actions:**

- ✅ Package items securely
- ✅ Attach shipping label to package
- ✅ Ensure package meets carrier requirements (size, weight)
- ✅ Include any required documentation (invoices, etc.)

**Status:** Still `LABEL_CREATED` (no API call needed)

---

### Step 3: Package Pickup/Drop-off

**Option A: Schedule USPS Pickup**

- Vendor schedules pickup through USPS website or phone
- USPS collects package from vendor's address

**Option B: Drop-off at USPS Location**

- Vendor takes package to nearest USPS post office or drop box
- Package is scanned and accepted by USPS

**Status Update:**

**Manual Update (when vendor drops off):**

```bash
PUT /v1/shipping/shipments/:trackingNumber/status
Authorization: Bearer VENDOR_TOKEN
Content-Type: application/json

{
  "status": "PICKED_UP",
  "location": "USPS Post Office - Main Branch",
  "notes": "Package dropped off at post office"
}
```

**What Happens:**

- Shipment status updates to `PICKED_UP`
- Order status remains `SHIPPED`
- Order history entry created

---

### Step 4: Package In Transit

**Automatic (via Carrier Webhook):**
When USPS scans the package at distribution centers, webhooks can automatically update status:

**Webhook Payload Example:**

```json
{
  "trackingNumber": "9405511899223197428493",
  "status": "IN_TRANSIT",
  "location": "New York Distribution Center",
  "timestamp": "2025-11-04T10:30:00Z"
}
```

**Manual Update (if webhook not configured):**

```bash
PUT /v1/shipping/shipments/:trackingNumber/status
Authorization: Bearer VENDOR_TOKEN
Content-Type: application/json

{
  "status": "IN_TRANSIT",
  "location": "Distribution Center - New York",
  "notes": "Package in transit to destination"
}
```

**What Happens:**

- Shipment status updates to `IN_TRANSIT`
- Order status updates to `IN_TRANSIT`
- Order history entry created
- Customer can track package using tracking number

---

### Step 5: Track Package Status

**Get Real-time Tracking:**

```bash
GET /v1/shipping/usps/track/:trackingNumber
Authorization: Bearer VENDOR_TOKEN
```

**Response:**

```json
{
  "success": true,
  "status": 200,
  "message": "Tracking information retrieved successfully",
  "data": {
    "trackingNumber": "9405511899223197428493",
    "status": "In Transit",
    "location": "Distribution Center",
    "estimatedDelivery": "2025-11-05T10:30:00Z",
    "events": [
      {
        "status": "Accepted",
        "location": "Origin Facility",
        "timestamp": "2025-11-04T08:00:00Z",
        "description": "Package accepted at origin facility"
      },
      {
        "status": "In Transit",
        "location": "Distribution Center",
        "timestamp": "2025-11-04T14:30:00Z",
        "description": "Package in transit to destination"
      }
    ]
  }
}
```

**Alternative: Get Shipment Tracking (from database):**

```bash
GET /v1/shipping/shipments/:trackingNumber/tracking
Authorization: Bearer VENDOR_TOKEN
```

---

### Step 6: Out for Delivery

**Status Update:**

```bash
PUT /v1/shipping/shipments/:trackingNumber/status
Authorization: Bearer VENDOR_TOKEN
Content-Type: application/json

{
  "status": "OUT_FOR_DELIVERY",
  "location": "Local Post Office",
  "notes": "Package out for delivery today"
}
```

**What Happens:**

- Shipment status updates to `OUT_FOR_DELIVERY`
- Order status remains `IN_TRANSIT`
- Customer receives notification (if configured)
- Order history entry created

---

### Step 7: Package Delivered ✅

**Status Update (when delivered):**

```bash
PUT /v1/shipping/shipments/:trackingNumber/status
Authorization: Bearer VENDOR_TOKEN
Content-Type: application/json

{
  "status": "DELIVERED",
  "actualDelivery": "2025-11-05T14:30:00Z",
  "location": "Customer Address",
  "notes": "Package delivered successfully"
}
```

**What Happens:**

- ✅ Shipment status updates to `DELIVERED`
- ✅ Order status updates to `DELIVERED`
- ✅ `actualDelivery` timestamp recorded
- ✅ Order history entry created
- ✅ Customer receives delivery confirmation (if configured)
- ✅ Return window starts (15 days from order creation)
- ✅ Order becomes eligible for completion/review

**Final Order Status:**

```json
{
  "id": 123,
  "status": "DELIVERED",
  "shippingStatus": "DELIVERED",
  "trackingNumber": "9405511899223197428493",
  "carrier": "USPS",
  "actualDelivery": "2025-11-05T14:30:00Z",
  "estimatedDelivery": "2025-11-05T10:30:00Z"
}
```

---

## 📊 Complete Status Flow

```
LABEL_CREATED
    ↓
[Vendor prints & attaches label]
    ↓
PICKED_UP
    ↓
[USPS scans package]
    ↓
IN_TRANSIT
    ↓
[Package moves through distribution centers]
    ↓
OUT_FOR_DELIVERY
    ↓
[Delivery driver picks up package]
    ↓
DELIVERED ✅
```

---

## 🔍 Monitoring & Tracking

### Get All Shipments for an Order

**Endpoint:** `GET /v1/shipping/orders/:orderId/shipments`

**Response:**

```json
{
  "success": true,
  "status": 200,
  "data": [
    {
      "id": 123,
      "orderId": 456,
      "trackingNumber": "9405511899223197428493",
      "carrier": "USPS",
      "status": "IN_TRANSIT",
      "labelUrl": "https://...",
      "trackingUrl": "https://tools.usps.com/go/TrackConfirmAction?qtc_tLabels1=...",
      "estimatedDelivery": "2025-11-05T10:30:00Z",
      "cost": 8.95,
      "createdAt": "2025-11-04T08:00:00Z",
      "updatedAt": "2025-11-04T14:30:00Z"
    }
  ]
}
```

### Get Order with Shipping Details

**Endpoint:** `GET /v1/user/orders/:orderId`

**Response Includes:**

- Order status
- Shipping status
- Tracking number
- Carrier information
- Estimated/actual delivery dates
- Shipment history

---

## 🚨 Exception Handling

### Failed Delivery

**Status Update:**

```bash
PUT /v1/shipping/shipments/:trackingNumber/status
{
  "status": "EXCEPTION",
  "notes": "Delivery failed - customer not available. Package returned to post office."
}
```

**What Happens:**

- Shipment status: `EXCEPTION`
- Vendor/customer notified
- Re-delivery can be scheduled

### Returned to Sender

**Status Update:**

```bash
PUT /v1/shipping/shipments/:trackingNumber/status
{
  "status": "RETURNED",
  "notes": "Package returned to sender - address incorrect"
}
```

**What Happens:**

- Shipment status: `RETURNED`
- Order status may update accordingly
- Refund process may be initiated

---

## 📱 Customer Experience

### Customer Tracking Flow

1. **Order Confirmed** → Customer receives order confirmation email with tracking number
2. **Label Created** → Customer can see "Preparing for Shipment" status
3. **Picked Up** → Customer sees "Shipped" status
4. **In Transit** → Customer can track package location
5. **Out for Delivery** → Customer receives "Out for Delivery" notification
6. **Delivered** → Customer receives delivery confirmation

### Customer Actions After Delivery

- ✅ Mark order as completed
- ✅ Leave product review
- ✅ Request return (within 15 days)
- ✅ Request cancellation (if eligible)

---

## 🔄 Automated Status Updates (Webhooks)

### Setting Up Carrier Webhooks

**USPS Webhook Endpoint:**

```
POST /v1/shipping/webhooks/usps
```

**Webhook Payload:**

```json
{
  "trackingNumber": "9405511899223197428493",
  "status": "DELIVERED",
  "location": "Customer Address",
  "timestamp": "2025-11-05T14:30:00Z",
  "events": [
    {
      "status": "Accepted",
      "location": "Origin Facility",
      "timestamp": "2025-11-04T08:00:00Z"
    },
    {
      "status": "In Transit",
      "location": "Distribution Center",
      "timestamp": "2025-11-04T14:30:00Z"
    },
    {
      "status": "Delivered",
      "location": "Customer Address",
      "timestamp": "2025-11-05T14:30:00Z"
    }
  ]
}
```

**System Response:**

- Automatically updates shipment status
- Updates order status
- Creates order history entries
- Sends notifications to customer and vendor

---

## 📝 Order History Timeline

After label generation, each status update creates an order history entry:

```json
[
  {
    "id": 1,
    "orderId": 123,
    "status": "SHIPPED",
    "previousStatus": "PROCESSING",
    "changedBy": "system",
    "reason": "USPS label generated",
    "notes": "USPS Priority Mail label generated - 9405511899223197428493",
    "createdAt": "2025-11-04T08:00:00Z"
  },
  {
    "id": 2,
    "orderId": 123,
    "status": "SHIPPED",
    "previousStatus": "SHIPPED",
    "changedBy": "system",
    "reason": "Shipment status updated",
    "notes": "Shipment status updated to PICKED_UP at USPS Post Office",
    "createdAt": "2025-11-04T09:30:00Z"
  },
  {
    "id": 3,
    "orderId": 123,
    "status": "IN_TRANSIT",
    "previousStatus": "SHIPPED",
    "changedBy": "system",
    "reason": "Shipment status updated",
    "notes": "Shipment status updated to IN_TRANSIT at Distribution Center",
    "createdAt": "2025-11-04T14:30:00Z"
  },
  {
    "id": 4,
    "orderId": 123,
    "status": "DELIVERED",
    "previousStatus": "IN_TRANSIT",
    "changedBy": "system",
    "reason": "Shipment status updated",
    "notes": "Shipment status updated to DELIVERED at Customer Address",
    "createdAt": "2025-11-05T14:30:00Z"
  }
]
```

---

## 🎯 Vendor Checklist

### After Label Generation:

- [ ] Download label PDF from `labelUrl`
- [ ] Print label
- [ ] Attach label to package
- [ ] Package items securely
- [ ] Schedule pickup or drop off at USPS location
- [ ] Update status to `PICKED_UP` (if manual)
- [ ] Monitor tracking updates
- [ ] Verify delivery completion
- [ ] Respond to customer inquiries

---

## 🔗 API Endpoints Summary

| Action                | Endpoint                                          | Method | Auth Required      |
| --------------------- | ------------------------------------------------- | ------ | ------------------ |
| Generate Label        | `/v1/shipping/orders/:orderId/usps/label`         | POST   | ✅ Vendor          |
| Update Status         | `/v1/shipping/shipments/:trackingNumber/status`   | PUT    | ✅ Vendor/Admin    |
| Track Package (USPS)  | `/v1/shipping/usps/track/:trackingNumber`         | GET    | ✅ Vendor/Customer |
| Get Shipment Tracking | `/v1/shipping/shipments/:trackingNumber/tracking` | GET    | ✅ Vendor/Customer |
| Get Order Shipments   | `/v1/shipping/orders/:orderId/shipments`          | GET    | ✅ Vendor/Customer |

---

## ⚡ Quick Reference

### Status Update Payloads

**Picked Up:**

```json
{
  "status": "PICKED_UP",
  "location": "USPS Post Office",
  "notes": "Package dropped off"
}
```

**In Transit:**

```json
{
  "status": "IN_TRANSIT",
  "location": "Distribution Center",
  "notes": "Package in transit"
}
```

**Out for Delivery:**

```json
{
  "status": "OUT_FOR_DELIVERY",
  "location": "Local Post Office",
  "notes": "Out for delivery today"
}
```

**Delivered:**

```json
{
  "status": "DELIVERED",
  "actualDelivery": "2025-11-05T14:30:00Z",
  "location": "Customer Address",
  "notes": "Delivered successfully"
}
```

---

## 📞 Support & Troubleshooting

### Common Issues

1. **Label Generated but Package Not Picked Up**
   - Check if label was printed correctly
   - Verify package was dropped off at USPS location
   - Contact USPS if tracking doesn't update within 24 hours

2. **Status Not Updating**
   - Check if webhook is configured correctly
   - Manually update status using API endpoint
   - Verify tracking number is correct

3. **Delivery Failed**
   - Update status to `EXCEPTION`
   - Contact customer to verify address
   - Schedule re-delivery

---

## Summary

**After Label Generation:**

1. ✅ **Download & Print** → Get label PDF and print it
2. ✅ **Package & Attach** → Secure package and attach label
3. ✅ **Pickup/Drop-off** → Give package to USPS
4. ✅ **Status Updates** → Monitor via tracking API or webhooks
5. ✅ **Delivery** → Confirm delivery completion
6. ✅ **Completion** → Order moves to `DELIVERED` status

The system automatically tracks all status changes and maintains a complete audit trail through `OrderHistory` records.
