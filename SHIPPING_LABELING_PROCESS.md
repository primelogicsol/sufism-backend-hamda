# Shipping Labeling Process Documentation

## Overview

The shipping labeling system provides end-to-end functionality for generating shipping labels, tracking shipments, and managing the fulfillment process. The system currently integrates with **USPS** (United States Postal Service) and supports multiple carriers through a flexible architecture.

---

## Architecture

### Components

1. **USPS Service** (`src/services/usps.service.ts`)

   - Handles direct USPS API communication
   - Generates labels, calculates rates, validates addresses, tracks packages
   - Supports both production and test modes

2. **Shipping Fulfillment Service** (`src/services/shippingFulfillment.service.ts`)

   - High-level orchestration layer
   - Manages shipment lifecycle
   - Coordinates between orders, vendors, and carriers

3. **Shipping Fulfillment Controller** (`src/controllers/shippingFulfillmentController/shippingFulfillmentController.ts`)

   - HTTP endpoint handlers
   - Request validation and response formatting

4. **Database Models**
   - `Shipment` model: Stores shipment records
   - `Order` model: Links to shipments, tracks shipping status

---

## Complete Shipping Label Flow

### Step 1: Order Placement

When a customer places an order:

- Order status: `PENDING` → `PROCESSING`
- Shipping address is stored in the order
- Vendor information is linked via `vendorId` in order items

### Step 2: Vendor Prepares Shipment

**Endpoint:** `POST /v1/shipping/orders/:orderId/usps/label`

**Authentication:** Required (Vendor token)

**Request Body:**

```json
{
  "weight": 16.5, // Required: Weight in ounces
  "dimensions": {
    // Optional: Package dimensions in inches
    "length": 10,
    "width": 8,
    "height": 6
  },
  "serviceType": "PRIORITY" // Optional: USPS service type (default: PRIORITY)
}
```

**Available USPS Service Types:**

- `PRIORITY` - Priority Mail (1-3 business days)
- `PRIORITY_EXPRESS` - Priority Mail Express (1-2 business days, overnight)
- `FIRST_CLASS` - First-Class Mail (1-3 business days)
- `GROUND_ADVANTAGE` - Ground Advantage (2-5 business days)
- `MEDIA_MAIL` - Media Mail (low-cost for books/media)
- `RETAIL_GROUND` - Retail Ground (economical for heavy packages)

**Process Flow:**

1. **Order Validation**

   - Fetches order with user and items
   - Verifies order exists
   - Checks order status is ready for shipping

2. **Vendor Identification**

   - Extracts `vendorId` from order items
   - Fetches vendor profile with shipping address
   - Validates vendor address is complete (address, city, state, zipCode)

3. **Address Preparation**

   - **From Address** (Vendor):
     ```typescript
     {
       name: vendor.businessName || vendor.fullName,
       address1: vendor.address,
       city: vendor.city,
       state: vendor.state,
       zip: vendor.zipCode
     }
     ```
   - **To Address** (Customer):
     ```typescript
     {
       name: order.fullName,
       address1: order.shippingAddress,
       city: order.user.city || "",
       state: order.user.state || "",
       zip: order.zip
     }
     ```

4. **USPS Label Generation**

   - Calls `USPSService.generateLabel()` with:
     - From/to addresses
     - Weight (in ounces)
     - Dimensions (optional)
     - Service type
   - USPS API returns:
     - Tracking number
     - Label URL (PDF download)
     - Tracking URL
     - Cost
     - Service name

5. **Database Updates**
   - **Creates Shipment Record:**
     ```typescript
     {
       orderId: orderId,
       trackingNumber: uspsLabel.trackingNumber,
       carrier: "USPS",
       shippingMethod: "STANDARD",
       weight: weight,
       dimensions: JSON.stringify(dimensions),
       cost: uspsLabel.cost,
       labelUrl: uspsLabel.labelUrl,
       trackingUrl: uspsLabel.trackingUrl,
       status: "LABEL_CREATED"
     }
     ```
   - **Updates Order:**
     ```typescript
     {
       status: "SHIPPED",
       shippingStatus: "LABEL_CREATED",
       trackingNumber: uspsLabel.trackingNumber,
       carrier: "USPS",
       shippingCost: uspsLabel.cost
     }
     ```
   - **Creates Order History Entry:**
     ```typescript
     {
       orderId: orderId,
       status: "SHIPPED",
       previousStatus: "PROCESSING",
       changedBy: "system",
       reason: "USPS label generated",
       notes: "USPS Priority Mail label generated - {trackingNumber}"
     }
     ```

**Response:**

```json
{
  "success": true,
  "status": 200,
  "message": "USPS label generated successfully",
  "data": {
    "trackingNumber": "9405511899223197428493",
    "labelUrl": "https://tools.usps.com/go/TrackConfirmAction?qtc_tLabels1=...",
    "trackingUrl": "https://tools.usps.com/go/TrackConfirmAction?qtc_tLabels1=...",
    "cost": 8.95,
    "service": "Priority Mail",
    "shipmentId": 123,
    "fromAddress": { ... },
    "toAddress": { ... }
  }
}
```

### Step 3: Label Download & Printing

The vendor can:

- Download the label PDF from `labelUrl`
- Print the label on a thermal printer or standard printer
- Attach the label to the package

### Step 4: Package Pickup/Drop-off

- Vendor schedules pickup with USPS or drops package at a USPS location
- Shipment status updates to `PICKED_UP` (manual or webhook)

### Step 5: Tracking Updates

**Endpoint:** `GET /v1/shipping/usps/track/:trackingNumber`

**Process:**

- Fetches real-time tracking from USPS API
- Returns tracking events, status, location, estimated delivery

**Tracking Status Flow:**

```
PENDING → LABEL_CREATED → PICKED_UP → IN_TRANSIT → OUT_FOR_DELIVERY → DELIVERED
```

---

## Shipment Status Management

### Status Updates via Webhook

**Endpoint:** `PUT /v1/shipping/shipments/:trackingNumber/status`

**Request Body:**

```json
{
  "status": "IN_TRANSIT",
  "actualDelivery": "2025-11-05T10:30:00Z", // Optional
  "location": "Distribution Center", // Optional
  "notes": "Package in transit" // Optional
}
```

**Process:**

1. Finds shipment by tracking number
2. Updates shipment status
3. Updates order status accordingly:
   - `DELIVERED` → Order status: `DELIVERED`
   - `IN_TRANSIT` → Order status: `IN_TRANSIT`
   - `OUT_FOR_DELIVERY` → Order status: `IN_TRANSIT`
4. Creates order history entry

---

## Alternative: Manual Shipment Creation

**Endpoint:** `POST /v1/shipping/orders/:orderId/shipments`

**Use Case:** When vendor uses a different carrier or creates labels outside the system

**Request Body:**

```json
{
  "trackingNumber": "1Z999AA10123456784",
  "carrier": "UPS",
  "shippingMethod": "STANDARD",
  "weight": 16.5,
  "dimensions": { "length": 10, "width": 8, "height": 6 },
  "cost": 12.5,
  "labelUrl": "https://example.com/label.pdf",
  "trackingUrl": "https://www.ups.com/track?tracknum=...",
  "estimatedDelivery": "2025-11-05T10:30:00Z"
}
```

**Process:**

1. Validates order exists and is ready for shipping
2. Creates shipment record
3. Updates order status to `SHIPPED`
4. Creates order history entry

---

## Address Validation

**Endpoint:** `POST /v1/shipping/usps/validate-address`

**Request Body:**

```json
{
  "address": {
    "name": "John Doe",
    "address1": "123 Main St",
    "address2": "Apt 4B",
    "city": "New York",
    "state": "NY",
    "zip": "10001"
  }
}
```

**Response:**

```json
{
  "success": true,
  "status": 200,
  "message": "Address validated successfully",
  "data": {
    "address1": "123 MAIN ST",
    "address2": "APT 4B",
    "city": "NEW YORK",
    "state": "NY",
    "zip": "10001",
    "zipPlus4": "1234"
  }
}
```

**Benefits:**

- Ensures accurate shipping addresses
- Reduces delivery failures
- Adds ZIP+4 for better delivery accuracy

---

## Shipment Tracking

**Endpoint:** `GET /v1/shipping/shipments/:trackingNumber/tracking`

**Response:**

```json
{
  "success": true,
  "status": 200,
  "message": "Tracking information retrieved",
  "data": {
    "trackingNumber": "9405511899223197428493",
    "carrier": "USPS",
    "status": "IN_TRANSIT",
    "shippingMethod": "STANDARD",
    "estimatedDelivery": "2025-11-05T10:30:00Z",
    "actualDelivery": null,
    "weight": 16.5,
    "dimensions": { "length": 10, "width": 8, "height": 6 },
    "cost": 8.95,
    "labelUrl": "https://...",
    "trackingUrl": "https://tools.usps.com/go/TrackConfirmAction?qtc_tLabels1=...",
    "notes": null,
    "order": {
      "id": 123,
      "userId": "...",
      "status": "IN_TRANSIT",
      "items": [ ... ]
    },
    "createdAt": "2025-11-01T10:30:00Z",
    "updatedAt": "2025-11-02T15:45:00Z"
  }
}
```

---

## Environment Configuration

### Required Environment Variables

```bash
# USPS API Configuration
USPS_API_URL=https://secure.shippingapis.com/ShippingAPI.dll
USPS_USER_ID=your_usps_user_id
USPS_PASSWORD=your_usps_password
USPS_TEST_MODE=true  # Set to "false" for production
USPS_ORIGIN_ZIP=10001  # Default origin ZIP code
```

### Test Mode vs Production

**Test Mode (`USPS_TEST_MODE=true`):**

- Returns mock labels with test tracking numbers
- No actual API calls to USPS
- Useful for development and testing

**Production Mode (`USPS_TEST_MODE=false`):**

- Makes real API calls to USPS
- Generates actual shipping labels
- Charges real shipping costs

---

## Database Schema

### Shipment Model

```prisma
model Shipment {
  id                Int            @id @default(autoincrement())
  orderId           Int
  order             Order          @relation(fields: [orderId], references: [id])
  trackingNumber    String
  carrier           Carrier        // USPS, UPS, FEDEX, DHL, etc.
  shippingMethod    ShippingMethod // STANDARD, EXPRESS, OVERNIGHT, etc.
  status            ShippingStatus // PENDING, LABEL_CREATED, PICKED_UP, IN_TRANSIT, OUT_FOR_DELIVERY, DELIVERED
  labelUrl          String?        // PDF download URL
  trackingUrl       String?        // Carrier tracking page URL
  estimatedDelivery DateTime?
  actualDelivery    DateTime?
  weight            Float?         // in ounces
  dimensions        String?        // JSON: {length, width, height}
  cost              Float
  notes             String?
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt
}
```

### Shipping Status Enum

```prisma
enum ShippingStatus {
  PENDING           // Order ready for shipping
  LABEL_CREATED      // Label generated, waiting for pickup
  PICKED_UP         // Package picked up by carrier
  IN_TRANSIT        // Package in transit
  OUT_FOR_DELIVERY  // Package out for delivery
  DELIVERED         // Package delivered
  RETURNED          // Returned to sender
  EXCEPTION         // Delivery exception (failed delivery, etc.)
}
```

---

## Error Handling

### Common Errors

1. **Order Not Found**

   ```json
   {
     "success": false,
     "status": 400,
     "message": "Order not found"
   }
   ```

2. **Vendor Address Incomplete**

   ```json
   {
     "success": false,
     "status": 400,
     "message": "Vendor address is incomplete"
   }
   ```

3. **Order Shipping Address Incomplete**

   ```json
   {
     "success": false,
     "status": 400,
     "message": "Order shipping address is incomplete"
   }
   ```

4. **USPS Label Generation Failed**

   ```json
   {
     "success": false,
     "status": 400,
     "message": "Failed to generate USPS label"
   }
   ```

5. **Order Not Ready for Shipping**
   ```json
   {
     "success": false,
     "status": 400,
     "message": "Order is not ready for shipping"
   }
   ```

---

## Integration Examples

### Frontend Integration Flow

1. **Customer Places Order**

   ```javascript
   // Order created with status: PROCESSING
   POST / v1 / user / orders;
   ```

2. **Vendor Dashboard - Generate Label**

   ```javascript
   // Vendor clicks "Generate Shipping Label"
   POST /v1/shipping/orders/123/usps/label
   {
     "weight": 16.5,
     "dimensions": { "length": 10, "width": 8, "height": 6 },
     "serviceType": "PRIORITY"
   }

   // Response includes labelUrl - vendor downloads and prints
   ```

3. **Customer Tracking**

   ```javascript
   // Customer views order tracking
   GET / v1 / user / orders / 123;
   // Returns order with trackingNumber and trackingUrl
   ```

4. **Webhook Updates** (if implemented)
   ```javascript
   // Carrier sends webhook when status changes
   PUT /v1/shipping/shipments/:trackingNumber/status
   {
     "status": "DELIVERED",
     "actualDelivery": "2025-11-05T10:30:00Z"
   }
   ```

---

## Best Practices

1. **Always Validate Addresses**

   - Use address validation API before generating labels
   - Reduces failed deliveries and returns

2. **Track Package Weight Accurately**

   - Accurate weight ensures correct shipping costs
   - Prevents carrier surcharges

3. **Handle Label URLs Securely**

   - Label URLs contain sensitive shipping information
   - Implement proper access control (vendor can only access their orders)

4. **Monitor Shipment Status**

   - Set up webhooks or polling for status updates
   - Update order status automatically when package is delivered

5. **Error Recovery**

   - Log all label generation failures
   - Provide fallback options (manual label creation)
   - Notify vendors of generation failures

6. **Test Mode During Development**
   - Always use test mode during development
   - Verify address formats and API responses
   - Test error scenarios

---

## Future Enhancements

1. **Multi-Carrier Support**

   - Currently USPS-focused, architecture supports multiple carriers
   - Add UPS, FedEx, DHL integrations

2. **Automated Label Printing**

   - Integrate with thermal printers
   - Bulk label generation

3. **Return Labels**

   - Generate return shipping labels automatically
   - Pre-printed return labels in shipments

4. **Webhook Integration**

   - Real-time status updates from carriers
   - Automatic order status synchronization

5. **Shipping Analytics**
   - Track shipping costs by carrier
   - Delivery time analytics
   - Failed delivery rates

---

## Summary

The shipping labeling process follows this flow:

1. **Order Created** → Status: `PROCESSING`
2. **Vendor Generates Label** → Status: `SHIPPED`, `LABEL_CREATED`
3. **Label Downloaded & Printed** → Vendor attaches to package
4. **Package Picked Up** → Status: `PICKED_UP`
5. **In Transit** → Status: `IN_TRANSIT`
6. **Out for Delivery** → Status: `OUT_FOR_DELIVERY`
7. **Delivered** → Status: `DELIVERED`

All steps are tracked in the database with full audit trail via `OrderHistory` records.
