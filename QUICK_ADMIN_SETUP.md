# Quick Admin Setup Guide

## 🚀 Create Admin User with Database Seeder

### Step 1: Build the Project

```bash
bun run build
```

### Step 2: Create Admin User

```bash
bun run seed:admin create
```

This creates an admin user with:

- **Email**: `admin@sufism.com`
- **Password**: `admin123`

### Step 3: Test Login

```bash
curl -X POST http://localhost:8001/v1/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin@sufism.com",
    "password": "admin123"
  }'
```

### Step 4: Use JWT Token

Copy the token from the response and use it in API calls:

```bash
curl -X GET http://localhost:8001/v1/admin/users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🔧 Other Useful Commands

### List All Admins

```bash
bun run seed:admin list
```

### Create Custom Admin

```bash
bun run seed:admin create your-email@example.com yourpassword123
```

### Reset Admin Password

```bash
bun run seed:admin reset-password admin@sufism.com newpassword123
```

### Show All Commands

```bash
bun run seed:admin
```

## ✅ Benefits

- ✅ No more environment variable issues
- ✅ Admin users stored in database
- ✅ Works for all team members
- ✅ Easy to manage multiple admins
- ✅ Secure password hashing
- ✅ Full integration with existing APIs

## 🎯 Default Credentials

After running the seeder:

- **Email**: `admin@sufism.com`
- **Password**: `admin123`

## 📝 Notes

- Admin users are automatically verified and completed
- Passwords are hashed with bcrypt (12 salt rounds)
- The seeder prevents duplicate admin creation
- All admin operations are logged for audit purposes
