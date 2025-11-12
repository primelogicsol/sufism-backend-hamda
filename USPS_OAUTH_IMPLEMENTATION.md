# USPS OAuth 2.0 Implementation Guide

## ✅ What Has Been Implemented

### 1. **OAuth 2.0 Token Generation**

- ✅ Client credentials grant flow
- ✅ Automatic token caching with expiration tracking
- ✅ Token refresh logic (1-minute buffer before expiration)
- ✅ Error handling and logging

### 2. **International Labels API v3 Support**

- ✅ Automatic detection of international addresses
- ✅ Separate method for international label generation
- ✅ OAuth 2.0 authentication for international API calls
- ✅ Integration with existing label generation flow

### 3. **Dual API Support**

- ✅ **LabelV4 API** (Domestic US) - Uses USER_ID/PASSWORD
- ✅ **International Labels API v3** (International) - Uses OAuth 2.0
- ✅ Automatic API selection based on address country

## 📋 What You Need to Do Next

### Step 1: Create USPS Business Account

1. Go to [USPS Business Customer Gateway (BCG)](https://gateway.usps.com/eAdmin/view/signin)
2. Sign up for a USPS Business Account
3. Complete the registration process

### Step 2: Register Your Application

1. Log in to [USPS Developer Portal](https://developers.usps.com/)
2. Navigate to **"Apps"** section
3. Click **"Add App"**
4. Fill in the required details:
   - **App Name**: Your application name (e.g., "Sufism Ecommerce")
   - **Callback URL**: Optional (leave blank if not needed)
   - **Description**: Brief description of your application
   - **API Product**: Select **"International Labels API v3"**
5. Accept Terms and Conditions
6. Click **"Add App"**

### Step 3: Get OAuth Credentials

1. After registering, select your application
2. Go to **"Credentials"** section
3. Note down:
   - **Consumer Key** (this is your `client_id`)
   - **Consumer Secret** (this is your `client_secret`)

### Step 4: Set Up eVS Account (Required for International Labels)

1. **eVS (Electronic Verification System)** account is required for international shipping
2. Contact USPS to set up your eVS account
3. This may require:
   - Minimum mailing volume
   - Payment via ACH debit
   - Additional verification

### Step 5: Configure Environment Variables

Add these to your `.env` file:

```env
# USPS OAuth 2.0 Credentials (for International Labels API v3)
USPS_OAUTH_CLIENT_ID=your-consumer-key-here
USPS_OAUTH_CLIENT_SECRET=your-consumer-secret-here

# Optional: Override API base URL (defaults to apis.usps.com or apis-tem.usps.com for testing)
# USPS_INTERNATIONAL_API_BASE=https://apis.usps.com
```

### Step 6: Test in TEM (Testing Environment)

1. Set `USPS_TEST_MODE=true` in your `.env`
2. The system will automatically use `https://apis-tem.usps.com` for testing
3. Test international label generation
4. Verify OAuth token generation works

### Step 7: Test OAuth Token Generation

You can test the OAuth token generation by making a request to generate an international label. The system will:

1. Automatically detect international addresses
2. Generate OAuth token if needed
3. Cache the token for reuse
4. Refresh token automatically when it expires

## 🔧 How It Works

### OAuth Token Flow

```
1. Check if cached token exists and is valid
   ↓
2. If not, request new token from USPS OAuth endpoint
   POST https://apis.usps.com/oauth2/v3/token
   Body: grant_type=client_credentials&client_id=...&client_secret=...
   ↓
3. Cache token with expiration time
   ↓
4. Use token in Authorization header for API requests
   Authorization: Bearer <access_token>
```

### Label Generation Flow

```
1. Check if address is international (non-US country)
   ↓
2. If DOMESTIC (US):
   → Use LabelV4 API (USER_ID/PASSWORD)
   ↓
3. If INTERNATIONAL:
   → Get OAuth token
   → Use International Labels API v3 (OAuth 2.0)
```

## 📝 API Endpoints

### OAuth Token Endpoint

- **Production**: `https://apis.usps.com/oauth2/v3/token`
- **Testing (TEM)**: `https://apis-tem.usps.com/oauth2/v3/token`

### International Labels API

- **Production**: `https://apis.usps.com/labels/v3/label`
- **Testing (TEM)**: `https://apis-tem.usps.com/labels/v3/label`

## ⚠️ Important Notes

1. **Token Expiration**: OAuth tokens expire after a certain time (usually 1 hour). The system automatically refreshes them.

2. **Token Caching**: Tokens are cached in memory. If your server restarts, a new token will be requested.

3. **Testing Mode**: When `USPS_TEST_MODE=true`, the system uses TEM (Testing Environment for Mailers) endpoints.

4. **eVS Account**: International Labels API v3 requires an eVS account. Contact USPS to set this up.

5. **API Documentation**: The actual request/response format for International Labels API v3 may differ. You may need to adjust the `generateInternationalLabel` method based on the official API documentation.

## 🔍 Troubleshooting

### Error: "USPS OAuth 2.0 credentials not configured"

- **Solution**: Make sure `USPS_OAUTH_CLIENT_ID` and `USPS_OAUTH_CLIENT_SECRET` are set in your `.env` file

### Error: "USPS OAuth token generation failed"

- **Solution**:
  - Verify your Consumer Key and Secret are correct
  - Check if your app is approved for International Labels API v3
  - Ensure you have an eVS account set up

### Error: "Invalid international label response"

- **Solution**:
  - Check the actual API response format
  - Update the `generateInternationalLabel` method to match the actual API structure
  - Review USPS International Labels API v3 documentation

## 📚 References

- [USPS OAuth Documentation](https://developers.usps.com/Oauth)
- [USPS International Labels API v3](https://developers.usps.com/internationallabelsv3)
- [USPS Developer Portal](https://developers.usps.com/)
- [USPS Business Customer Gateway](https://gateway.usps.com)

## ✅ Next Steps Summary

1. ✅ OAuth implementation is complete
2. ⏳ Get USPS Business Account
3. ⏳ Register app in Developer Portal
4. ⏳ Get Consumer Key and Secret
5. ⏳ Set up eVS account
6. ⏳ Add credentials to `.env`
7. ⏳ Test in TEM environment
8. ⏳ Adjust API request format if needed (based on actual API docs)
