# 🔍 COMPREHENSIVE API ANALYSIS: ADMIN vs CLIENT-SIDE APIs

## 📊 **API CATEGORIZATION SUMMARY**

Based on thorough analysis of the codebase, here's the complete categorization of all APIs:

---

## 🔐 **ADMIN APIs** (Require Admin Authentication)

### **1. Admin Authentication (JWT-based)**

- `POST /v1/user/admin/login` - Admin login with username/password
- `GET /v1/user/admin/verify` - Verify admin JWT token

### **2. Content Management (Admin Auth Required)**

- `GET /v1/content/:section` - Get content sections (academy, explorer, etc.)
- `GET /v1/content/:section/:slug` - Get specific content item
- `GET /v1/content/:section/:slug/versions` - Get content versions
- `GET /v1/content/:section/:slug/version/:version` - Get specific version
- `PUT /v1/content/:section/:slug` - Update content items ⚠️ **Admin Auth Required**
- `POST /v1/content/validate` - Validate content items ⚠️ **Admin Auth Required**
- `POST /v1/content/bulk` - Bulk save content items ⚠️ **Admin Auth Required**

---

## 👥 **CLIENT-SIDE APIs** (Require User Authentication)

### **1. User Authentication & Registration**

- `POST /v1/user/register` - User registration
- `POST /v1/user/login` - User login
- `POST /v1/user/verify-account` - Verify account with OTP
- `GET /v1/user/refresh-access-token` - Refresh access token
- `POST /v1/user/resend-OTP` - Resend OTP
- `POST /v1/user/google-auth` - Google authentication
- `POST /v1/user/forgot-password` - Forgot password request
- `POST /v1/user/new-password` - Reset password

### **2. User Profile Management**

- `GET /v1/user/profile` - View user profile
- `PATCH /v1/user/profile` - Update user profile

### **3. Vendor Management (Admin/User Functions)**

- `GET /v1/user/vendors-list` - Get vendors list
- `PATCH /v1/user/verify-vendor/:id` - Verify vendor
- `DELETE /v1/user/delete-vendor/:id` - Delete vendor

### **4. Membership Management**

- `POST /v1/user/membership` - Create membership
- `GET /v1/user/membership` - View membership
- `PATCH /v1/user/membership` - Update membership
- `DELETE /v1/user/membership` - Delete membership

### **5. Donation Management**

- `POST /v1/user/donation` - Create donation
- `GET /v1/user/donation` - View donations
- `PATCH /v1/user/donation` - Update donation
- `DELETE /v1/user/donation` - Delete donation

### **6. Shopping Cart Management**

- `POST /v1/user/cart` - Add to cart
- `GET /v1/user/cart` - View cart
- `PATCH /v1/user/cart` - Update cart item
- `DELETE /v1/user/cart/:id` - Delete cart item
- `DELETE /v1/user/cart` - Clear cart

### **7. Wishlist Management**

- `POST /v1/user/wishlist` - Add to wishlist
- `GET /v1/user/wishlist` - View wishlist
- `DELETE /v1/user/wishlist/:id` - Delete wishlist item
- `DELETE /v1/user/wishlist` - Clear wishlist

### **8. Service Booking**

- `POST /v1/user/book-service` - Book service
- `GET /v1/user/book-service` - View service bookings

### **9. Interview Booking**

- `POST /v1/user/book-interview` - Book interview
- `GET /v1/user/book-interview` - View interview bookings
- `DELETE /v1/user/book-interview/:id` - Cancel interview

### **10. Contact & Communication**

- `POST /v1/user/contact-us` - Contact us form

### **11. Conference Management**

- `POST /v1/user/conference` - Book conference
- `GET /v1/user/conference` - View conference bookings
- `POST /v1/user/conference/:id` - Update conference status

### **12. Sufi Checklist**

- `POST /v1/user/sufi-checklist` - Create checklist
- `GET /v1/user/sufi-checklist` - Get checklist

---

## 🛍️ **PRODUCT MANAGEMENT APIs** (Vendor/User Authentication)

### **1. Product CRUD Operations (All Categories)**

- **Decoration Products:**

  - `POST /v1/decoration` - Create decoration product
  - `GET /v1/decoration` - Get all decorations
  - `GET /v1/decoration/:id` - Get decoration by ID
  - `PATCH /v1/decoration/:id` - Update decoration
  - `DELETE /v1/decoration/:id` - Delete decoration

- **Fashion Products:**

  - `POST /v1/fashion` - Create fashion product
  - `GET /v1/fashion` - Get all fashion items
  - `GET /v1/fashion/:id` - Get fashion by ID
  - `PATCH /v1/fashion/:id` - Update fashion
  - `DELETE /v1/fashion/:id` - Delete fashion

- **Meditation Products:**

  - `POST /v1/meditation` - Create meditation product
  - `GET /v1/meditation` - Get all meditation items
  - `GET /v1/meditation/:id` - Get meditation by ID
  - `PATCH /v1/meditation/:id` - Update meditation
  - `DELETE /v1/meditation/:id` - Delete meditation

- **Accessories:**

  - `POST /v1/accessories` - Create accessory
  - `GET /v1/accessories` - Get all accessories
  - `GET /v1/accessories/:id` - Get accessory by ID
  - `PATCH /v1/accessories/:id` - Update accessory
  - `DELETE /v1/accessories/:id` - Delete accessory

- **Digital Books:**

  - `POST /v1/digital-books` - Create digital book
  - `GET /v1/digital-books` - Get all digital books
  - `GET /v1/digital-books/:id` - Get digital book by ID
  - `PATCH /v1/digital-books/:id` - Update digital book
  - `DELETE /v1/digital-books/:id` - Delete digital book

- **Home & Living:**

  - `POST /v1/living` - Create home & living product
  - `GET /v1/living` - Get all home & living items
  - `GET /v1/living/:id` - Get home & living by ID
  - `PATCH /v1/living/:id` - Update home & living
  - `DELETE /v1/living/:id` - Delete home & living

- **Audio Products:**
  - `POST /v1/audio` - Create audio product
  - `GET /v1/audio` - Get all audio items
  - `GET /v1/audio/:id` - Get audio by ID
  - `PATCH /v1/audio/:id` - Update audio
  - `DELETE /v1/audio/:id` - Delete audio

### **2. Product Reviews**

- `POST /v1/review-{category}/:id` - Add review for specific category
- `GET /v1/review-{category}/:id` - Get reviews for specific category

### **3. Public Product Access (No Authentication)**

- `GET /v1/products/:category` - Get products by category (public)
- `GET /v1/products/:category/:id` - Get product details (public)

---

## 🏪 **VENDOR-SPECIFIC APIs** (Vendor Authentication)

### **1. Vendor Authentication**

- `POST /v1/vendor-register/:id?` - Vendor registration
- `POST /v1/vendor-login` - Vendor login
- `POST /v1/vendor/:id` - Get vendor by ID

### **2. Vendor Profile Management**

- `GET /v1/vendor/company-profile` - Get company profile
- `PUT /v1/vendor/company-profile` - Update company profile

### **3. Vendor Orders Management**

- `GET /v1/vendor/orders` - Get all vendor orders

---

## 📊 **ANALYTICS APIs** (User Authentication Required)

### **1. Sales Analytics**

- `GET /v1/analytics/sales` - Get sales analytics
- `GET /v1/analytics/inventory` - Get inventory analytics
- `GET /v1/analytics/customers` - Get customer analytics
- `GET /v1/analytics/vendors` - Get vendor analytics
- `GET /v1/analytics/overview` - Get analytics overview
- `GET /v1/analytics/kpis` - Get KPI metrics

### **2. Reports Management**

- `POST /v1/analytics/reports` - Create report
- `GET /v1/analytics/reports` - Get user reports
- `GET /v1/analytics/reports/:reportId` - Get report by ID
- `GET /v1/analytics/reports/:reportId/download` - Download report

### **3. Dashboard Management**

- `POST /v1/analytics/dashboards` - Create dashboard
- `GET /v1/analytics/dashboards` - Get user dashboards
- `GET /v1/analytics/dashboards/:dashboardId` - Get dashboard by ID
- `PUT /v1/analytics/dashboards/:dashboardId` - Update dashboard
- `DELETE /v1/analytics/dashboards/:dashboardId` - Delete dashboard

### **4. Event Tracking**

- `POST /v1/analytics/events` - Track event

---

## 📧 **NOTIFICATION APIs** (User Authentication Required)

### **1. User Notifications**

- `POST /v1/notifications` - Create notification
- `GET /v1/notifications` - Get user notifications
- `PUT /v1/notifications/:notificationId/read` - Mark as read
- `PUT /v1/notifications/read-all` - Mark all as read
- `DELETE /v1/notifications/:notificationId` - Delete notification
- `GET /v1/notifications/analytics` - Get notification analytics

### **2. Notification Preferences**

- `GET /v1/notifications/preferences` - Get preferences
- `PUT /v1/notifications/preferences` - Update preferences

### **3. Admin Notification Functions** (Require User with Admin Role)

- `POST /v1/notifications/templates` - Create notification template
- `GET /v1/notifications/templates` - Get notification templates
- `POST /v1/notifications/broadcast` - Broadcast system notification
- `GET /v1/notifications/connection-status` - Get connection status
- `POST /v1/notifications/cleanup` - Clean up expired notifications
- `POST /v1/notifications/retry` - Retry failed notifications

---

## 🛒 **ORDER MANAGEMENT APIs** (User Authentication Required)

### **1. Order Creation**

- `POST /v1/user/order` - Create order
- `POST /v1/user/billing-details` - Add billing details

### **2. Order Management** (Vendor/Admin Access)

- `GET /v1/user/orders/vendor/orders` - Get vendor orders
- `GET /v1/user/orders/vendor/analytics` - Get vendor analytics
- `GET /v1/user/orders/analytics/summary` - Get order analytics summary
- `POST /v1/user/orders/bulk-update` - Bulk update order status
- `GET /v1/user/orders` - Search orders
- `GET /v1/user/orders/:orderId` - Get order by ID
- `PUT /v1/user/orders/:orderId/status` - Update order status
- `POST /v1/user/orders/:orderId/cancel` - Cancel order
- `POST /v1/user/orders/:orderId/notes` - Add order note
- `GET /v1/user/orders/:orderId/tracking` - Get order tracking

---

## 📦 **INVENTORY MANAGEMENT APIs** (Vendor Authentication Required)

### **1. Inventory Overview**

- `GET /v1/inventory/summary` - Get inventory summary
- `GET /v1/inventory/dashboard` - Get inventory dashboard

### **2. Product Stock Management**

- `GET /v1/inventory/product/:productId/:category/stock` - Get product stock
- `GET /v1/inventory/product/:productId/:category/logs` - Get product inventory logs

### **3. Stock Adjustments**

- `POST /v1/inventory/adjust` - Adjust stock
- `GET /v1/inventory/adjustments` - Get stock adjustments

### **4. Low Stock Alerts**

- `GET /v1/inventory/alerts` - Get low stock alerts

### **5. Stock Validation**

- `POST /v1/inventory/validate` - Validate stock

---

## 🚚 **SHIPPING & FULFILLMENT APIs** (User Authentication Required)

### **1. Shipping Management**

- `GET /v1/shipping/orders/:orderId/rates` - Calculate shipping rates
- `POST /v1/shipping/orders/:orderId/shipments` - Create shipment
- `PUT /v1/shipping/shipments/:trackingNumber/status` - Update shipment status
- `GET /v1/shipping/shipments/:trackingNumber/tracking` - Get shipment tracking

### **2. USPS Integration**

- `POST /v1/shipping/orders/:orderId/usps/label` - Generate USPS label
- `POST /v1/shipping/usps/validate-address` - Validate USPS address
- `GET /v1/shipping/usps/track/:trackingNumber` - Track USPS package

### **3. Returns Management**

- `POST /v1/shipping/orders/:orderId/returns` - Request return
- `PUT /v1/shipping/returns/:returnId/process` - Process return request
- `POST /v1/shipping/returns/:returnId/process-items` - Process returned items
- `GET /v1/shipping/returns/analytics` - Get return analytics
- `GET /v1/shipping/returns/vendor/analytics` - Get vendor return analytics
- `GET /v1/shipping/returns/user` - Get user returns
- `GET /v1/shipping/returns/all` - Get all returns (Admin/Vendor access)

---

## 🔄 **RETURNS & REFUNDS APIs** (User Authentication Required)

### **1. Return Management**

- `POST /v1/returns/orders/:orderId/returns` - Create return request
- `GET /v1/returns/returns/:returnId` - Get return by ID
- `PUT /v1/returns/returns/:returnId/process` - Process return request
- `POST /v1/returns/returns/:returnId/process-items` - Process returned items
- `POST /v1/returns/returns/:returnId/refund` - Process refund
- `GET /v1/returns/returns` - Search returns
- `GET /v1/returns/returns/analytics` - Get return analytics
- `GET /v1/returns/returns/vendor/analytics` - Get vendor return analytics
- `GET /v1/returns/returns/admin/all` - Get all returns (Admin/Vendor access)
- `POST /v1/returns/returns/bulk-process` - Bulk process returns

### **2. Store Credit Management**

- `POST /v1/returns/store-credits` - Create store credit
- `GET /v1/returns/store-credits` - Get user store credits
- `POST /v1/returns/store-credits/use` - Use store credit

---

## 💳 **STRIPE PAYMENT APIs** (User Authentication Required)

### **1. Payment Method Management**

- `GET /v1/stripe/setup-intent` - Create setup intent
- `POST /v1/stripe/donation-intent` - Create donation intent
- `GET /v1/stripe/update-payment-method` - Create edit intent
- `DELETE /v1/stripe/delete-payment-method` - Delete payment method
- `GET /v1/stripe/payment-methods` - Get payment methods
- `POST /v1/stripe/set-default-payment-method` - Set default payment method

---

## 📤 **BULK UPLOAD APIs** (User Authentication Required)

### **1. Bulk Product Upload**

- `POST /v1/bulk-uploader/upload-bulk` - Upload bulk products (CSV)
- `POST /v1/bulk-uploader/upload-image-by-sku` - Upload image by SKU

---

## 🎫 **COUPON MANAGEMENT APIs** (User Authentication Required)

### **1. Coupon Operations**

- `POST /v1/coupons` - Create coupon
- `GET /v1/coupons` - Get coupons
- `GET /v1/coupons/:id` - Get coupon by ID
- `PUT /v1/coupons/:id` - Update coupon
- `DELETE /v1/coupons/:id` - Delete coupon
- `POST /v1/coupons/:id/apply` - Apply coupon

---

## 📋 **SUMMARY BY AUTHENTICATION TYPE**

### **🔐 Admin JWT Authentication Required:**

- Admin login/verify
- Content management (create/update/validate/bulk)

### **👤 User Authentication Required:**

- All user profile management
- All shopping functionality (cart, wishlist, orders)
- All product management (CRUD operations)
- All analytics and reporting
- All notifications
- All inventory management
- All shipping and fulfillment
- All returns and refunds
- All payment processing
- All bulk uploads
- All coupon management

### **🏪 Vendor Authentication Required:**

- Vendor registration/login
- Vendor profile management
- Vendor order management

### **🌐 Public APIs (No Authentication):**

- Product browsing (`/products/:category`)
- Product details (`/products/:category/:id`)

### **⚠️ Special Cases:**

- **Admin Role APIs:** Some APIs require users with `role: "admin"` in database (not admin JWT)
- **Vendor Role APIs:** Some APIs allow both admin and vendor roles
- **Mixed Access:** Some APIs have different access levels based on user role

---

## 🎯 **KEY FINDINGS:**

1. **Limited Admin System:** Only content management uses admin JWT authentication
2. **Role-Based Access:** Most system management requires users with admin role in database
3. **Comprehensive User System:** Extensive user functionality for e-commerce operations
4. **Vendor Integration:** Dedicated vendor management system
5. **Public Access:** Limited public access for product browsing only

This analysis provides a complete overview of all APIs and their authentication requirements in the Sufism backend system.
