# 🔍 Shipping Zone Matching Troubleshooting Guide

## 🚨 Common Issues & Solutions

### Issue 1: "No matching shipping zone found for destination"

This error occurs when the system cannot find a shipping zone that matches the customer's destination. Here are the most common causes:

---

## 📋 Step-by-Step Diagnosis

### 1. **Check Destination Being Sent**

**What to verify:**

```json
{
  "destination": {
    "country": "US", // ✅ Required
    "state": "CA", // ✅ Optional (but helps with accuracy)
    "zipCode": "90210" // ✅ Required
  }
}
```

**Common Issues:**

- ❌ Wrong country code format (should be uppercase, e.g., "US" not "us")
- ❌ Wrong state format (should be uppercase, e.g., "CA" not "ca")
- ❌ Zip code format mismatch

**Note:** `state` is **optional** - zones will match even without it, but including it helps ensure more accurate zone matching.

---

### 2. **Check Vendor's Zone Configuration**

Based on your vendor config, zones must match:

- **Country** (exact match, case-insensitive)
- **State** (if zone has state, destination must also have state and match)
- **Zip Code Range** (if zone has zip ranges, destination zip must be within range)

**Example Zone Requirements:**

```json
{
  "country": "US",
  "state": "CA",
  "zipCodeRanges": [{ "from": "90000", "to": "96162" }]
}
```

**For this zone to match:**

- ✅ Destination can have: `country: "US"`, `state: "CA"` (optional), `zipCode: "90210"` (within 90000-96162)
- ✅ Will match even if: `state` is missing (state is optional)
- ✅ Will match if: `state: "CA"` matches
- ❌ Will NOT match: `state: "NY"` (different state)
- ❌ Will NOT match: `zipCode: "10001"` (outside range)

---

### 3. **Empty Zip Code Ranges Issue**

**Problem:** Some zones have empty zip ranges:

```json
{
  "zipCodeRanges": [
    { "from": "90001", "to": "96162" }, // ✅ Valid
    { "from": "", "to": "" } // ❌ Empty (will be filtered out)
  ]
}
```

**Solution:** The system now automatically filters out empty ranges. Zones with all empty ranges will skip zip code checking (allow any zip).

---

### 4. **State Matching (OPTIONAL)**

**Current Behavior:** State is **optional** - zones will match even if destination doesn't provide state.

**Example:**

- Zone has: `state: "CA"`
- Destination has: `state: null` or missing
- **Result:** ✅ Zone WILL match (state is optional)
- **If destination has state:** Must match zone's state or will reject

**Behavior:**

- ✅ Zone with state + Destination without state → **MATCHES**
- ✅ Zone with state + Destination with matching state → **MATCHES**
- ❌ Zone with state + Destination with different state → **REJECTS**

---

### 5. **Zip Code Comparison Issue**

**Problem:** Zip codes with different formats might not match correctly.

**Before Fix:**

- "90210" vs "90000" → String comparison might fail
- "090210" vs "90000" → Wrong comparison

**After Fix:** System now:

1. Normalizes zip codes (removes non-numeric, pads to 5 digits)
2. Compares normalized values
3. Handles US zip codes properly

---

## 🔧 What Was Fixed

### ✅ Improved Zone Matching Logic

1. **Zone Priority Sorting**

   - Zones are now sorted by specificity (most specific first)
   - Priority: `has state + has zip ranges` > `has state` > `has zip ranges` > `country only`
   - Ensures most specific matching zone is used

2. **Better Zip Code Comparison**

   - Normalizes zip codes before comparison
   - Handles different formats (removes non-numeric, pads zeros)
   - More accurate range checking

3. **Enhanced Logging**

   - Logs why each zone doesn't match
   - Shows normalized values for debugging
   - Detailed zone information when no match found

4. **Empty Range Handling**
   - Automatically filters out empty zip ranges
   - Zones with all empty ranges skip zip checking
   - Prevents false negatives

---

## 🧪 Testing Your Configuration

### Test Case 1: Basic Match

**Destination:**

```json
{
  "country": "US",
  "state": "CA",
  "zipCode": "90210"
}
```

**Zone Required:**

```json
{
  "country": "US",
  "state": "CA",
  "zipCodeRanges": [{ "from": "90000", "to": "96162" }]
}
```

**Expected:** ✅ Should match

---

### Test Case 2: Missing State (OPTIONAL)

**Destination:**

```json
{
  "country": "US",
  "zipCode": "90210"
  // ✅ State is optional - not required
}
```

**Zone:**

```json
{
  "country": "US",
  "state": "CA",
  "zipCodeRanges": [{ "from": "90000", "to": "96162" }]
}
```

**Expected:** ✅ **WILL MATCH** (state is optional, zone can match without destination state)

---

### Test Case 3: Zip Code Outside Range

**Destination:**

```json
{
  "country": "US",
  "state": "CA",
  "zipCode": "10001" // ❌ Outside range
}
```

**Zone:**

```json
{
  "country": "US",
  "state": "CA",
  "zipCodeRanges": [{ "from": "90000", "to": "96162" }]
}
```

**Expected:** ❌ Will NOT match (zip not in range)

**Solution:** Add a zone covering zip code 10001, or create a broader zone.

---

## 📊 Check Your Vendor's Zones

Based on your vendor configuration, you have zones like:

- **Zone 1-11:** All for US, CA with various zip ranges
- Some zones have overlapping ranges
- Some zones have empty zip ranges (now filtered automatically)

### Recommended Zone Structure:

**For broad coverage:**

```json
{
  "country": "US",
  "state": null, // No state requirement
  "zipCodeRanges": null // No zip requirement
}
```

**For specific coverage:**

```json
{
  "country": "US",
  "state": "CA",
  "zipCodeRanges": [{ "from": "90000", "to": "96162" }]
}
```

---

## 🔍 Debugging Steps

### 1. Check Logs

When zone matching fails, check server logs for:

```
Finding zone - normalized destination: { ... }
Checking zone X (ZoneName): { ... }
Zone X rejected: [reason]
```

### 2. Verify Destination Format

Ensure frontend sends:

```typescript
{
  country: string;    // Required, uppercase (e.g., "US")
  state?: string;     // Optional, uppercase (e.g., "CA")
  zipCode: string;    // Required, numeric string (e.g., "90210")
}
```

### 3. Verify Zone Configuration

Check vendor's zones via API:

```
GET /v1/vendor/shipping/config
```

Verify:

- ✅ At least one zone exists
- ✅ Zones are active (`isActive: true`)
- ✅ Zones have shipping methods
- ✅ Country/State/Zip ranges match expected destinations

---

## 💡 Quick Fixes

### Fix 1: Destination Missing State

**If zones require state but destination doesn't provide:**

1. Update frontend to always send state when available
2. Or create a fallback zone without state requirement

### Fix 2: No Zones Match

**If no zones match the destination:**

1. Check if zones are active (`isActive: true`)
2. Verify country code matches (case-insensitive)
3. Verify state matches if zone requires it
4. Verify zip code is within ranges
5. Check logs for specific rejection reasons

### Fix 3: Empty Zip Ranges

**If zones have empty zip ranges:**

- System now automatically filters them out
- Zones with all empty ranges will allow any zip code
- Consider cleaning up empty ranges from database

---

## 📝 Example Request/Response

### ✅ Successful Request

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

**Response:**

```json
{
  "success": true,
  "data": {
    "deliveryOptions": [
      {
        "type": "STANDARD",
        "shippingCost": 72.49,
        "estimatedDeliveryDays": 4
      }
    ]
  }
}
```

### ❌ Failed Request

**Request:**

```json
POST /v1/vendor/shipping/calculate
{
  "destination": {
    "country": "US",
    "zipCode": "90210"
    // ❌ Missing state
  }
}
```

**Response:**

```json
{
  "success": false,
  "message": "Cannot calculate shipping: Some vendors have not configured shipping",
  "data": {
    "errors": [
      {
        "vendorId": "...",
        "vendorName": "...",
        "error": "No matching shipping zone found for destination"
      }
    ]
  }
}
```

**Note:** State is optional. If destination doesn't include state, zones with state will still match (as long as country and zip match).

---

## 🎯 Summary

**Most Common Issues:**

1. ⚠️ Missing `state` in destination when zones require it
2. ⚠️ Zip code outside configured ranges
3. ⚠️ Country code mismatch
4. ⚠️ Zones not active or have no shipping methods

**Quick Checks:**

- ✅ Ensure destination includes all fields zones require
- ✅ Verify zones are active and have shipping methods
- ✅ Check logs for specific rejection reasons
- ✅ Test with different destinations to isolate issue

---

**Last Updated:** 2025-11-01
