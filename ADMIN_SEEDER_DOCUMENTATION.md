# Admin Seeder Documentation

## Overview

The Admin Seeder is a database seeding tool that creates and manages admin users in the Sufism Backend system. This eliminates the need for environment-based admin authentication and provides a more reliable way to manage admin access.

## Prerequisites

- Database connection configured in `.env` file
- Prisma client generated (`bun run db:generate`)
- Database migrations applied (`bun run db:migrate`)

## Usage

### 1. Build the Project

First, build the TypeScript files:

```bash
bun run build
```

### 2. Run Admin Seeder Commands

#### Create Default Admin User

```bash
bun run seed:admin create
```

Creates an admin user with:

- **Email**: `admin@sufism.com`
- **Password**: `admin123`
- **Name**: `System Administrator`

#### Create Custom Admin User

```bash
bun run seed:admin create your-email@example.com yourpassword123
```

Creates an admin user with custom credentials.

#### Create Multiple Admin Users

```bash
bun run seed:admin create-multiple
```

Creates multiple default admin users:

- `admin@sufism.com` / `admin123`
- `superadmin@sufism.com` / `superadmin123`

#### List All Admin Users

```bash
bun run seed:admin list
```

Shows all admin users in the database.

#### Delete Admin User

```bash
bun run seed:admin delete admin@example.com
```

Deletes an admin user by email address.

#### Reset Admin Password

```bash
bun run seed:admin reset-password admin@example.com newpassword123
```

Resets an admin user's password.

#### Show Help

```bash
bun run seed:admin
```

Shows all available commands and usage examples.

## Default Admin Credentials

After running the seeder, you can login with:

**Primary Admin:**

- **Email**: `admin@sufism.com`
- **Password**: `admin123`

**Super Admin** (if using create-multiple):

- **Email**: `superadmin@sufism.com`
- **Password**: `superadmin123`

## Login Process

### 1. Get JWT Token

```bash
curl -X POST http://localhost:8001/v1/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin@sufism.com",
    "password": "admin123"
  }'
```

### 2. Use JWT Token

```bash
curl -X GET http://localhost:8001/v1/admin/users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Admin User Properties

Each admin user created by the seeder has:

- **Role**: `admin`
- **isVerified**: `true` (automatically verified)
- **isCompleted**: `true` (profile completed)
- **Password**: Hashed with bcrypt (12 salt rounds)
- **Avatar**: Default placeholder image
- **Contact Info**: Optional phone, address, city, state, zipCode, country

## Security Features

- **Password Hashing**: Uses bcrypt with 12 salt rounds
- **Email Uniqueness**: Prevents duplicate admin accounts
- **Role Validation**: Only creates users with `role: "admin"`
- **Automatic Verification**: Admin users are pre-verified
- **Audit Trail**: All operations are logged

## Troubleshooting

### Common Issues

#### "Admin user already exists"

The seeder checks for existing admins and won't create duplicates. Use `bun run seed:admin list` to see existing admins.

#### "Database connection failed"

Ensure your `.env` file has the correct `DATABASE_URL`:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/sufism_db"
```

#### "Prisma client not generated"

Run:

```bash
bun run db:generate
```

#### "Build failed"

Ensure TypeScript compilation succeeds:

```bash
bun run build
```

### Verification Steps

1. **Check if admin was created:**

   ```bash
   bun run seed:admin list
   ```

2. **Test login:**

   ```bash
   curl -X POST http://localhost:8001/v1/admin/login \
     -H "Content-Type: application/json" \
     -d '{"username": "admin@sufism.com", "password": "admin123"}'
   ```

3. **Verify JWT token:**
   ```bash
   curl -X GET http://localhost:8001/v1/admin/users \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

## Integration with Existing System

The seeder integrates seamlessly with your existing admin authentication system:

1. **Database Storage**: Admin users are stored in the `users` table with `role: "admin"`
2. **JWT Authentication**: Uses the same JWT system as environment-based auth
3. **Admin Middleware**: Works with existing `adminAuth` middleware
4. **API Endpoints**: Compatible with all existing admin API endpoints

## Migration from Environment-based Auth

If you're currently using environment-based admin authentication, you can:

1. **Keep Both Systems**: The seeder works alongside environment-based auth
2. **Gradual Migration**: Create admin users via seeder and gradually phase out environment-based auth
3. **Full Migration**: Replace environment-based auth entirely with database-based admin users

## Production Considerations

### Security Best Practices

1. **Change Default Passwords**: Reset passwords for production:

   ```bash
   bun run seed:admin reset-password admin@sufism.com secure-production-password
   ```

2. **Use Strong Passwords**: Minimum 12 characters with mixed case, numbers, and symbols

3. **Regular Password Rotation**: Periodically reset admin passwords

4. **Monitor Admin Access**: Use the admin management APIs to track admin activity

### Deployment

1. **Build Project**: `bun run build`
2. **Run Migrations**: `bun run db:migrate`
3. **Create Admin**: `bun run seed:admin create production-admin@yourcompany.com securepassword123`
4. **Start Server**: `bun run start:prod`

## API Integration

The seeder creates admin users that work with all existing admin APIs:

- **User Management**: `/v1/admin/users`
- **Vendor Management**: `/v1/admin/vendors`
- **Analytics**: `/v1/admin/analytics/*`
- **Notifications**: `/v1/admin/notifications/*`
- **Admin Management**: `/v1/admin/admins/*`

## Example Workflow

```bash
# 1. Build the project
bun run build

# 2. Create default admin
bun run seed:admin create

# 3. Verify admin was created
bun run seed:admin list

# 4. Test login
curl -X POST http://localhost:8001/v1/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin@sufism.com", "password": "admin123"}'

# 5. Use the returned JWT token for API calls
curl -X GET http://localhost:8001/v1/admin/users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Support

If you encounter issues with the admin seeder:

1. Check the troubleshooting section above
2. Verify database connection
3. Ensure all dependencies are installed
4. Check the console output for specific error messages
5. Review the seeder logs for detailed information
