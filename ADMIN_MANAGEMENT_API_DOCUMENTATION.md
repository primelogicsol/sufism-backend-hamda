# Admin Management API Documentation

## Overview

This document describes the Admin Management API endpoints for creating, retrieving, updating, and deleting admin users in the Sufism Backend system.

## Base URL

```
http://localhost:8001/v1/admin
```

## Authentication

All endpoints require Admin JWT authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

---

## Admin Management Endpoints

### 1. Create New Admin User

**Endpoint:** `POST /admins`

**Description:** Creates a new admin user in the database.

**Request Body:**

```json
{
  "fullName": "John Doe",
  "email": "john.doe@example.com",
  "password": "securePassword123",
  "phone": "+1234567890",
  "address": "123 Main St",
  "city": "New York",
  "state": "NY",
  "zipCode": "10001",
  "country": "USA"
}
```

**Required Fields:**

- `fullName` (string): Full name of the admin
- `email` (string): Email address (must be unique)
- `password` (string): Password (minimum 8 characters)

**Optional Fields:**

- `phone` (string): Phone number
- `address` (string): Street address
- `city` (string): City
- `state` (string): State/Province
- `zipCode` (string): ZIP/Postal code
- `country` (string): Country

**Response (201 Created):**

```json
{
  "status": 201,
  "message": "Admin user created successfully",
  "data": {
    "id": "clx1234567890",
    "fullName": "John Doe",
    "email": "john.doe@example.com",
    "phone": "+1234567890",
    "role": "admin",
    "isVerified": true,
    "isCompleted": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "address": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA"
  }
}
```

**Error Responses:**

- `400 Bad Request`: Missing required fields, invalid email format, or weak password
- `400 Bad Request`: User already exists with this email
- `401 Unauthorized`: Invalid or missing JWT token
- `500 Internal Server Error`: Server error

---

### 2. Get All Admin Users

**Endpoint:** `GET /admins`

**Description:** Retrieves a paginated list of all admin users with optional filtering.

**Query Parameters:**

- `page` (string, optional): Page number (default: "1")
- `limit` (string, optional): Items per page (default: "10")
- `search` (string, optional): Search by email, fullName, or phone
- `isVerified` (string, optional): Filter by verification status ("true" or "false")
- `isCompleted` (string, optional): Filter by completion status ("true" or "false")

**Example Request:**

```
GET /admins?page=1&limit=10&search=john&isVerified=true
```

**Response (200 OK):**

```json
{
  "status": 200,
  "message": "Admin users retrieved successfully",
  "data": {
    "admins": [
      {
        "id": "clx1234567890",
        "fullName": "John Doe",
        "email": "john.doe@example.com",
        "phone": "+1234567890",
        "role": "admin",
        "isVerified": true,
        "isCompleted": true,
        "createdAt": "2024-01-15T10:30:00.000Z",
        "avatar": "https://via.placeholder.com/70x70",
        "address": "123 Main St",
        "city": "New York",
        "state": "NY",
        "zipCode": "10001",
        "country": "USA"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  }
}
```

---

### 3. Get Admin User by ID

**Endpoint:** `GET /admins/:id`

**Description:** Retrieves a specific admin user by their ID.

**Path Parameters:**

- `id` (string): Admin user ID

**Response (200 OK):**

```json
{
  "status": 200,
  "message": "Admin user retrieved successfully",
  "data": {
    "id": "clx1234567890",
    "fullName": "John Doe",
    "email": "john.doe@example.com",
    "phone": "+1234567890",
    "role": "admin",
    "isVerified": true,
    "isCompleted": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "avatar": "https://via.placeholder.com/70x70",
    "address": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA"
  }
}
```

**Error Responses:**

- `404 Not Found`: Admin user not found
- `401 Unauthorized`: Invalid or missing JWT token

---

### 4. Update Admin User

**Endpoint:** `PUT /admins/:id`

**Description:** Updates an existing admin user's information.

**Path Parameters:**

- `id` (string): Admin user ID

**Request Body:**

```json
{
  "fullName": "John Smith",
  "phone": "+1987654321",
  "address": "456 Oak Ave",
  "city": "Los Angeles",
  "state": "CA",
  "zipCode": "90210",
  "country": "USA"
}
```

**All fields are optional for updates.**

**Response (200 OK):**

```json
{
  "status": 200,
  "message": "Admin user updated successfully",
  "data": {
    "id": "clx1234567890",
    "fullName": "John Smith",
    "email": "john.doe@example.com",
    "phone": "+1987654321",
    "role": "admin",
    "isVerified": true,
    "isCompleted": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "address": "456 Oak Ave",
    "city": "Los Angeles",
    "state": "CA",
    "zipCode": "90210",
    "country": "USA"
  }
}
```

---

### 5. Delete Admin User

**Endpoint:** `DELETE /admins/:id`

**Description:** Permanently deletes an admin user from the database.

**Path Parameters:**

- `id` (string): Admin user ID

**Response (200 OK):**

```json
{
  "status": 200,
  "message": "Admin user deleted successfully"
}
```

**Error Responses:**

- `404 Not Found`: Admin user not found
- `401 Unauthorized`: Invalid or missing JWT token

---

### 6. Get Admin Statistics

**Endpoint:** `GET /admins/stats`

**Description:** Retrieves statistics about admin users.

**Response (200 OK):**

```json
{
  "status": 200,
  "message": "Admin statistics retrieved successfully",
  "data": {
    "totalAdmins": 5,
    "verifiedAdmins": 4,
    "recentAdmins": 2,
    "verificationRate": 80
  }
}
```

**Statistics Included:**

- `totalAdmins`: Total number of admin users
- `verifiedAdmins`: Number of verified admin users
- `recentAdmins`: Number of admin users created in the last 30 days
- `verificationRate`: Percentage of verified admin users

---

## Error Responses

### Common Error Codes

- **400 Bad Request**: Invalid request data or validation errors
- **401 Unauthorized**: Missing or invalid JWT token
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Server error

### Error Response Format

```json
{
  "status": 400,
  "message": "Error description"
}
```

---

## Security Notes

1. **Password Security**: Passwords are hashed using bcrypt with salt rounds of 12
2. **Email Uniqueness**: Email addresses must be unique across all users
3. **Admin Verification**: New admin users are automatically verified and completed
4. **JWT Authentication**: All endpoints require valid admin JWT tokens
5. **Input Validation**: All inputs are validated for format and security

---

## Usage Examples

### Create Admin User (cURL)

```bash
curl -X POST http://localhost:8001/v1/admin/admins \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "fullName": "Jane Smith",
    "email": "jane.smith@example.com",
    "password": "securePassword123",
    "phone": "+1234567890"
  }'
```

### Get Admin List (cURL)

```bash
curl -X GET "http://localhost:8001/v1/admin/admins?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Update Admin User (cURL)

```bash
curl -X PUT http://localhost:8001/v1/admin/admins/clx1234567890 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "fullName": "Jane Doe",
    "phone": "+1987654321"
  }'
```

---

## Database Schema

Admin users are stored in the `users` table with the following key fields:

- `id`: Unique identifier (CUID)
- `fullName`: Full name of the admin
- `email`: Email address (unique)
- `password`: Hashed password
- `role`: Set to "admin"
- `isVerified`: Always true for admin users
- `isCompleted`: Always true for admin users
- `createdAt`: Timestamp of creation
- Additional optional fields for contact information

---

## Notes

- Admin users are automatically verified and completed upon creation
- Email addresses must be unique across the entire user system
- Passwords must be at least 8 characters long
- All admin operations are logged for audit purposes
- The system supports both environment-based and database-based admin authentication
