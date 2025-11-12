# USPS OAuth Scope Troubleshooting Guide

## Error: "Insufficient OAuth scope" (401)

### Problem

You're getting a 401 error with message: `"Insufficient OAuth scope. The OAuth scope is invalid, missing or insufficient to access resource."`

### Root Causes

#### 1. **App Not Configured with Correct API Products**

Your app in the USPS Developer Portal might not have the Labels API v3 products assigned.

**Solution:**

1. Go to https://developers.usps.com/
2. Log in and navigate to your app
3. Check the **"API Products"** section
4. Ensure you have:
   - **Domestic Labels API v3** (for domestic labels)
   - **International Labels API v3** (for international labels)
   - Or a combined product that includes both

#### 2. **Wrong Scope Format**

The scope you're requesting might not match what your app is configured for.

**Common Scope Formats:**

- `labels/v3` - For both domestic and international
- `labels/v3/domestic` - For domestic only
- `labels/v3/international` - For international only
- `domestic-labels/v3` - Alternative format
- `international-labels/v3` - Alternative format

**Solution:**

1. Check your app's API products in the Developer Portal
2. Look at the scope name associated with each API product
3. Update your `.env` file with the exact scope name:
   ```env
   USPS_OAUTH_SCOPE=labels/v3
   ```

#### 3. **Scope Not Included in Token Request**

The scope might not be properly sent in the OAuth token request.

**Check:**

- Verify `USPS_OAUTH_SCOPE` is set in your `.env` file
- Check the logs to see what scope is being requested
- Ensure the scope is not empty or undefined

#### 4. **Token Response Doesn't Include Scope**

The OAuth token response might not include the scope, meaning the token was granted but without the required permissions.

**Solution:**

- This usually means your app doesn't have the API products assigned
- Contact USPS API Support if your app should have access

## Step-by-Step Fix

### Step 1: Verify App Configuration

1. Go to https://developers.usps.com/
2. Log in with your USPS Business Account
3. Navigate to **Apps** → Select your app
4. Check **"API Products"** section:
   - ✅ Should show "Domestic Labels API v3"
   - ✅ Should show "International Labels API v3" (if needed)
   - ❌ If missing, you need to add them

### Step 2: Check Scope Name

1. In your app details, look at the API Products
2. Each product should show its associated scope
3. Note the exact scope name (e.g., `labels/v3`, `domestic-labels/v3`)

### Step 3: Update Environment Variables

Update your `.env` file with the correct scope:

```env
# Use the exact scope from your app's API products
USPS_OAUTH_SCOPE=labels/v3

# Or if your app uses different scopes:
# USPS_OAUTH_SCOPE=domestic-labels/v3
# USPS_OAUTH_SCOPE=international-labels/v3
```

### Step 4: Clear Token Cache

Restart your server to clear the cached token and request a new one with the correct scope.

### Step 5: Check Logs

After restarting, check the logs for:

```
Requesting OAuth token with scope: "labels/v3"
OAuth token granted. Requested scope: "labels/v3", Granted scope: "..."
```

If the granted scope is empty or doesn't match, your app configuration is incorrect.

## Common Issues

### Issue 1: App Has No API Products

**Symptom:** Token generated but scope is empty
**Fix:** Add API products to your app in the Developer Portal

### Issue 2: Wrong Scope Format

**Symptom:** Token generated but scope doesn't match API requirements
**Fix:** Use the exact scope name from your app's API products

### Issue 3: App Not Approved

**Symptom:** Token generated but 401 errors persist
**Fix:** Some API products require approval. Check your app's approval status

### Issue 4: Testing vs Production

**Symptom:** Works in TEM but not in production (or vice versa)
**Fix:** Ensure your app has API products enabled for both environments

## Verification Checklist

- [ ] App has "Domestic Labels API v3" product assigned
- [ ] App has "International Labels API v3" product assigned (if needed)
- [ ] Scope in `.env` matches the scope from API products
- [ ] `USPS_OAUTH_SCOPE` is set in `.env` file
- [ ] Server restarted after updating `.env`
- [ ] Logs show scope being requested and granted
- [ ] Token is being used with correct Authorization header

## Contact USPS Support

If you've verified all the above and still get scope errors:

1. Go to https://developers.usps.com/
2. Click "Contact USPS API Support"
3. Provide:
   - Your app name/ID
   - The error message
   - The scope you're requesting
   - Screenshot of your app's API products

## Debugging Commands

Check what scope is being requested:

```bash
# In your logs, look for:
# "Requesting OAuth token with scope: ..."
# "OAuth token granted. Requested scope: ..., Granted scope: ..."
```

Test OAuth token manually:

```bash
curl -X POST https://apis-tem.usps.com/oauth2/v3/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET&scope=labels/v3"
```

Check the response for the `scope` field in the token.
