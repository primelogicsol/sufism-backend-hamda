# 🚚 Multi-Vendor Shipping Rate Calculation Guide

## 📋 Overview

This document explains **how shipping rates are calculated** when a customer has products from **multiple vendors** in their cart, especially when vendors have **zone-wise shipping configurations**.

---

## 🔍 How It Currently Works

### Step 1: Cart Structure

When a customer adds products to cart, the system **automatically identifies the vendor** for each product:

```typescript
Cart Item:
  - Product: Fashion Item #123
  - Quantity: 2
  - Product Owner (vendor): "vendor_id_1"  // 👈 Extracted from product.userId

Cart Item:
  - Product: Decoration Item #456
  - Quantity: 1
  - Product Owner (vendor): "vendor_id_2"  // 👈 Different vendor
```

**Key Point:** Customers **don't need to know** which vendor owns which product. The system handles this automatically.

---

### Step 2: Shipping Calculation Request

When customer calculates shipping, they provide:

- **Destination** (country, state, zipCode)
- System automatically fetches **all cart items**

**Request:**

```json
POST /v1/vendor/shipping/calculate
{
  "destination": {
    "country": "US",
    "state": "CA",
    "zipCode": "90210"
  }
}
```

---

### Step 3: Internal Calculation Flow

#### 3.1 Group Items by Vendor

```typescript
Cart Items:
  - Fashion Item #123 (vendor_1) → qty: 2, weight: 0.5kg
  - Decoration Item #456 (vendor_2) → qty: 1, weight: 1.0kg

Grouped by Vendor:
  vendor_1: [
    { productId: 123, category: "FASHION", quantity: 2, weight: 0.5 }
  ]
  vendor_2: [
    { productId: 456, category: "DECORATION", quantity: 1, weight: 1.0 }
  ]
```

#### 3.2 Calculate Shipping Per Vendor

**For Vendor 1:**

1. **Load Vendor 1's Shipping Config:**

   ```json
   {
     "vendorId": "vendor_1",
     "zones": [
       {
         "id": 9,
         "country": "US",
         "state": "CA",
         "zipCodeRanges": [{ "from": "90000", "to": "96162" }],
         "shippingMethods": [
           {
             "rateType": "HYBRID",
             "baseRate": 8.99,
             "perKgRate": 2.5,
             "perItemRate": 1,
             "method": "STANDARD",
             "estimatedDays": 3
           }
         ]
       }
     ]
   }
   ```

2. **Find Matching Zone:**

   - Destination: US, CA, 90210
   - Zone matches: ✅ (country=US, state=CA, zipCode 90210 is in range 90000-96162)

3. **Calculate Rate:**

   ```typescript
   totalWeight = 0.5kg × 2 = 1.0kg
   totalItems = 1 item

   cost = baseRate + (totalWeight × perKgRate) + (totalItems × perItemRate)
   cost = 8.99 + (1.0 × 2.5) + (1 × 1)
   cost = 8.99 + 2.50 + 1.00
   cost = $12.49
   ```

**For Vendor 2:**

1. **Load Vendor 2's Shipping Config:**

   ```json
   {
     "vendorId": "vendor_2",
     "zones": [
       {
         "id": 11,
         "country": "US",
         "state": "CA",
         "zipCodeRanges": [{ "from": "90001", "to": "96162" }],
         "shippingMethods": [
           {
             "rateType": "FIXED",
             "baseRate": 10,
             "perKgRate": 20,
             "perItemRate": 30,
             "method": "STANDARD",
             "estimatedDays": 4,
             "freeShippingThreshold": 500
           }
         ]
       }
     ]
   }
   ```

2. **Find Matching Zone:**

   - Destination: US, CA, 90210
   - Zone matches: ✅ (country=US, state=CA, zipCode 90210 is in range 90001-96162)

3. **Calculate Rate:**

   ```typescript
   totalWeight = 1.0kg × 1 = 1.0kg

   // FIXED rate calculation:
   cost = baseRate + (totalWeight × perKgRate) + (totalItems × perItemRate)
   cost = 10 + (1.0 × 20) + (1 × 30)
   cost = 10 + 20 + 30
   cost = $60.00

   // Check free shipping threshold (order value would need to be > $500)
   // Since not applicable, cost = $60.00
   ```

#### 3.3 Aggregate Results

```typescript
Vendor 1 STANDARD: $12.49 (3 days)
Vendor 2 STANDARD: $60.00 (4 days)

Aggregated:
  STANDARD Total = $12.49 + $60.00 = $72.49
  Max Days = max(3, 4) = 4 days
```

#### 3.4 Return Response

```json
{
  "success": true,
  "data": {
    "deliveryOptions": [
      {
        "type": "STANDARD",
        "name": "Standard Delivery",
        "shippingCost": 72.49,
        "selectedShippingService": "STANDARD",
        "estimatedDeliveryDays": 4,
        "description": "Standard delivery in 4 business days"
      }
    ],
    "totalVendors": 2
  }
}
```

---

## 📊 Rate Type Calculations Explained

### 1. **FIXED Rate**

```typescript
cost = baseRate + (totalWeight × perKgRate) + (totalItems × perItemRate)

Example:
  baseRate = 10
  perKgRate = 20
  perItemRate = 30
  totalWeight = 1.0kg
  totalItems = 1

  cost = 10 + (1.0 × 20) + (1 × 30) = 10 + 20 + 30 = $60.00
```

### 2. **WEIGHT_BASED Rate**

```typescript
cost = baseRate + (totalWeight × perKgRate)

Example:
  baseRate = 5
  perKgRate = 1.5
  totalWeight = 2.0kg

  cost = 5 + (2.0 × 1.5) = 5 + 3.0 = $8.00
```

### 3. **HYBRID Rate**

```typescript
cost = baseRate + (totalWeight × perKgRate) + (totalItems × perItemRate)

Example:
  baseRate = 8.99
  perKgRate = 2.5
  perItemRate = 1
  totalWeight = 1.0kg
  totalItems = 2

  cost = 8.99 + (1.0 × 2.5) + (2 × 1) = 8.99 + 2.50 + 2.00 = $13.49
```

### 4. **ORDER_VALUE_BASED Rate** (Future)

```typescript
cost = baseRate + (orderValue × perItemRate / 100)  // perItemRate as percentage

Example:
  baseRate = 5
  perItemRate = 10  // means 10%
  orderValue = $100

  cost = 5 + (100 × 10 / 100) = 5 + 10 = $15.00
```

---

## 🎯 Real-World Scenario Examples

### Scenario 1: Same Zone, Different Vendors

**Cart:**

- Product A (Vendor 1): 2 items, 0.5kg each
- Product B (Vendor 2): 1 item, 1.0kg

**Vendor 1 Config (Zone: CA):**

- STANDARD: HYBRID rate
  - baseRate: $8.99
  - perKgRate: $2.5
  - perItemRate: $1
- Calculation: $8.99 + (1.0kg × $2.5) + (1 item × $1) = **$12.49**

**Vendor 2 Config (Zone: CA):**

- STANDARD: FIXED rate
  - baseRate: $10
  - perKgRate: $20
  - perItemRate: $30
- Calculation: $10 + (1.0kg × $20) + (1 item × $30) = **$60.00**

**Result:**

- Total STANDARD Shipping: $12.49 + $60.00 = **$72.49**

---

### Scenario 2: Multiple Zones, Overlapping

**Cart:**

- Product A (Vendor 1): 1 item, 2.0kg

**Vendor 1 Config:**

- Zone 1: CA, zip 90000-96162
  - STANDARD: $8.99 + (weight × $2.5) = $13.99
- Zone 2: CA, zip 1222-5671
  - STANDARD: $900 + (weight × $56) + (items × $122) = $1,144.00

**Destination: CA, zip 90210**

**Matching:** Zone 1 matches (zip 90210 is in 90000-96162)

**Result:** Uses Zone 1 rate = **$13.99**

**⚠️ Note:** If multiple zones match, system uses **first matching zone** (order matters!)

---

### Scenario 3: No Matching Zone

**Cart:**

- Product A (Vendor 1): 1 item

**Vendor 1 Config:**

- Zones configured only for CA

**Destination:** NY, zip 10001

**Result:**

```json
{
  "success": false,
  "message": "Cannot calculate shipping: Some vendors have not configured shipping",
  "data": {
    "errors": [
      {
        "vendorId": "vendor_1",
        "vendorName": "Vendor One",
        "error": "No matching shipping zone found for destination"
      }
    ]
  }
}
```

**Customer Action Required:** Remove products from vendors without shipping to that destination.

---

## ✅ Current Implementation Strengths

1. **✅ Automatic Vendor Detection**

   - System automatically groups products by vendor
   - Customer doesn't need to know vendor information

2. **✅ Per-Vendor Zone Matching**

   - Each vendor's zones are checked independently
   - Supports different zone configurations per vendor

3. **✅ Rate Aggregation**

   - Sums up shipping costs from all vendors
   - Takes maximum estimated delivery days

4. **✅ Error Handling**

   - Clear errors if vendor lacks configuration
   - Identifies which vendors have issues

5. **✅ Multiple Rate Types**
   - Supports FIXED, WEIGHT_BASED, HYBRID
   - Handles free shipping thresholds
   - Respects weight limits

---

## ⚠️ Current Limitations & Recommendations

### 1. **Zone Priority Issue** ⚠️

**Problem:** If multiple zones match, system uses **first one found** (may not be most specific).

**Example:**

```json
Zone 1: { country: "US", state: null, zipCode: null }  // Broad zone
Zone 2: { country: "US", state: "CA", zipCode: "90210" } // Specific zone

Destination: US, CA, 90210
Result: Might use Zone 1 instead of Zone 2
```

**Recommendation:**

```typescript
// Sort zones by specificity (most specific first)
zones.sort((a, b) => {
  // Prefer zones with state > zones without
  // Prefer zones with zipCode ranges > zones without
  const aScore = (a.state ? 2 : 0) + (a.zipCodeRanges?.length ? 1 : 0);
  const bScore = (b.state ? 2 : 0) + (b.zipCodeRanges?.length ? 1 : 0);
  return bScore - aScore;
});
```

---

### 2. **Free Shipping Threshold Logic** ⚠️

**Current Issue:**

```typescript
// Line 395 in shippingCalculationService.ts
if (rate.freeShippingThreshold && totalWeight <= rate.freeShippingThreshold) {
  cost = 0;
}
```

**Problem:** Uses `totalWeight` for threshold check, but threshold might be for **order value**, not weight.

**Recommendation:**

```typescript
// Check if threshold is for weight or order value
if (rate.freeShippingThreshold) {
  if (rate.rateType === "ORDER_VALUE_BASED") {
    const orderValue = calculateOrderValue(items);
    if (orderValue >= rate.freeShippingThreshold) {
      cost = 0;
    }
  } else {
    // Weight-based threshold
    if (totalWeight >= rate.freeShippingThreshold) {
      cost = 0;
    }
  }
}
```

---

### 3. **Missing Order Value in Calculation** ⚠️

**Current Issue:** `ORDER_VALUE_BASED` rate type exists but items may not have `price` field populated.

**Recommendation:**

```typescript
// Fetch product prices when calculating ORDER_VALUE_BASED rates
if (rate.rateType === "ORDER_VALUE_BASED") {
  const orderValue = await calculateOrderValue(items); // Fetch from DB
  cost += orderValue * (rate.perItemRate / 100);
}
```

---

### 4. **Customer Transparency** 💡

**Recommendation:** Show vendor breakdown in shipping response:

```json
{
  "deliveryOptions": [
    {
      "type": "STANDARD",
      "shippingCost": 72.49,
      "estimatedDeliveryDays": 4,
      "vendorBreakdown": [
        {
          "vendorId": "vendor_1",
          "vendorName": "Vendor One",
          "cost": 12.49,
          "items": ["Fashion Item #123"]
        },
        {
          "vendorId": "vendor_2",
          "vendorName": "Vendor Two",
          "cost": 60.0,
          "items": ["Decoration Item #456"]
        }
      ]
    }
  ]
}
```

---

### 5. **Zone Overlap Validation** 💡

**Recommendation:** Warn vendors when zones overlap:

```typescript
// During zone creation/update, check for overlaps
const overlappingZones = zones.filter((zone) => {
  // Check if new zone overlaps with existing zones
  return zonesMatch(zone, newZone) && zone.id !== newZone.id;
});

if (overlappingZones.length > 0) {
  logger.warn(`Zone overlaps with ${overlappingZones.length} existing zones`);
}
```

---

## 🔧 Implementation Recommendations Priority

### High Priority 🔴

1. **Fix Zone Matching Priority**

   - Sort zones by specificity (most specific first)
   - Prevents broad zones from matching before specific ones

2. **Fix Free Shipping Threshold Logic**

   - Distinguish between weight-based and value-based thresholds
   - Implement proper ORDER_VALUE_BASED calculation

3. **Add Product Price to Calculation**
   - Fetch product prices when calculating ORDER_VALUE_BASED rates
   - Ensure items include price in calculation request

### Medium Priority 🟡

4. **Add Vendor Breakdown to Response**

   - Show per-vendor shipping costs
   - Help customers understand shipping breakdown

5. **Validate Zone Overlaps**
   - Warn vendors about overlapping zones
   - Suggest merging or removing duplicate zones

### Low Priority 🟢

6. **Cache Shipping Calculations**

   - Cache zone matches for same destination
   - Improve performance for repeat calculations

7. **Add Shipping Method Selection Per Vendor**
   - Allow customers to select different methods per vendor
   - Currently aggregates to STANDARD/BASIC only

---

## 📝 Summary

### How It Works Now:

1. **Customer adds products** → System identifies vendors automatically
2. **Customer requests shipping** → System groups items by vendor
3. **For each vendor:**
   - Load vendor's shipping zones
   - Find matching zone for destination
   - Calculate rate based on rate type (FIXED/WEIGHT_BASED/HYBRID)
4. **Aggregate results:**
   - Sum STANDARD rates from all vendors
   - Sum BASIC/EXPRESS rates from all vendors
   - Take maximum estimated days
5. **Return 2 options** → Customer selects one

### Key Features:

✅ Automatic vendor detection  
✅ Zone-based matching  
✅ Multiple rate types supported  
✅ Error handling for missing configs  
✅ Aggregated shipping options

### Areas for Improvement:

⚠️ Zone priority sorting  
⚠️ Free shipping threshold logic  
⚠️ Order value calculation  
💡 Customer transparency (vendor breakdown)  
💡 Zone overlap validation

---

## 🔗 Related Files

- **Shipping Calculation Service:** `src/services/shippingCalculationService.ts`
- **Shipping Controller:** `src/controllers/vendorController/vendorShippingController.ts`
- **Documentation:** `COMPLETE_SHIPPING_FLOW.md`

---

## ❓ FAQ

**Q: Can customers see which vendor owns which product?**  
A: Currently not in shipping calculation response. Products are grouped by vendor internally.

**Q: What if a vendor has no shipping config?**  
A: System returns error with list of vendors missing shipping configuration.

**Q: What if multiple zones match?**  
A: Currently uses first matching zone. Recommended: Use most specific zone.

**Q: How are rates aggregated?**  
A: Sums up cheapest STANDARD rate from each vendor, and cheapest BASIC/EXPRESS rate from each vendor.

**Q: Can vendors have different shipping methods?**  
A: Yes, but customer only sees aggregated STANDARD and BASIC options.

---

**Last Updated:** 2025-11-01
