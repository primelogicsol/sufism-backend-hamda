# 🚀 Sufism Backend - Setup & Run Guide

## 📋 Prerequisites

Before setting up the project, ensure you have the following installed:

### Required Software

- **Bun** (JavaScript runtime) - [Download here](https://bun.sh/)
- **PostgreSQL** (Database) - [Download here](https://www.postgresql.org/download/)
- **Node.js** (Fallback) - [Download here](https://nodejs.org/) (Optional, if Bun doesn't work)

### Required Accounts & Services

- **Stripe Account** (Payment processing)
- **Cloudinary Account** (Image storage)
- **AWS S3 Account** (File storage)
- **SMTP Email Service** (Email notifications)

---

## 🛠️ Installation Steps

### 1. **Clone the Repository**

```bash
git clone <repository-url>
cd sufism-backend-hamda
```

### 2. **Install Dependencies**

```bash
# Using Bun (Recommended)
bun install

# Or using npm (Alternative)
npm install
```

### 3. **Environment Configuration**

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
PORT=8001
NODE_ENV=development
BASE_URL=http://localhost:8001

# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/sufism_db"

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here

# Admin Configuration
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_HOST_EMAIL=your-email@gmail.com
SMTP_SECRET=your-app-password

# Frontend URL
FRONTEND_APP_URL=http://localhost:3000

# Cloudinary Configuration
CLOUDINARY_NAME=your-cloudinary-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

# Stripe Configuration
STRIPE_SK=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# AWS S3 Configuration (Optional)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_BUCKET_NAME=your-s3-bucket-name
```

### 4. **Database Setup**

#### **Create PostgreSQL Database**

```sql
-- Connect to PostgreSQL
psql -U postgres

-- Create database
CREATE DATABASE sufism_db;

-- Create user (optional)
CREATE USER sufism_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE sufism_db TO sufism_user;
```

#### **Run Database Migrations**

```bash
# Generate Prisma client
bun run db:generate

# Run database migrations
bun run db:migrate

# Or push schema directly (for development)
bun run db:push
```

### 5. **Verify Installation**

```bash
# Check if everything is working
bun run type-check
bun run lint
```

---

## 🏃‍♂️ Running the Project

### **Development Mode**

```bash
# Start development server with hot reload
bun run dev
```

This will:

- Build the TypeScript code
- Start the server with file watching
- Enable hot reload for development

### **Production Mode**

```bash
# Build and start production server
bun run start
```

### **Database Management**

```bash
# Open Prisma Studio (Database GUI)
bun run db:studio

# Generate Prisma client
bun run db:generate

# Run migrations
bun run db:migrate

# Push schema changes
bun run db:push
```

---

## 🔧 Development Commands

### **Code Quality**

```bash
# Run linting
bun run lint

# Fix linting issues
bun run lint:fix

# Format code
bun run fmt

# Type checking
bun run type-check
```

### **Build & Deploy**

```bash
# Build project
bun run build

# Deploy project (build + database + start)
bun run project:deploy
```

### **Git Hooks**

```bash
# Setup git hooks
bun run prepare

# Commit linting
bun run commit-lint
```

---

## 🌐 API Endpoints

Once the server is running, you can access:

### **Base URL**

```
http://localhost:8001
```

### **API Endpoints**

```
# Authentication
POST /v1/user/register
POST /v1/user/login
POST /v1/user/verify-otp

# Products
GET /v1/products/{category}
POST /v1/products/{category}

# Orders
POST /v1/user/order
GET /v1/user/orders

# Payments
POST /v1/stripe/create-payment-intent
POST /v1/stripe/webhook

# Health Check
GET /
```

---

## 🗄️ Database Schema

The project uses PostgreSQL with Prisma ORM. Key models include:

- **User** - User accounts and profiles
- **Product Models** - Music, DigitalBook, Fashion, etc.
- **Order** - Order management
- **Cart/Wishlist** - Shopping functionality
- **Review** - Product reviews
- **Coupon** - Discount system

---

## 🔐 Security Configuration

### **Environment Variables Security**

- Never commit `.env` files to version control
- Use strong, unique JWT secrets
- Keep API keys secure
- Use environment-specific configurations

### **Database Security**

- Use strong database passwords
- Limit database user permissions
- Enable SSL connections in production

---

## 🚨 Troubleshooting

### **Common Issues**

#### **1. Database Connection Error**

```bash
# Check if PostgreSQL is running
sudo service postgresql status

# Check database URL in .env
echo $DATABASE_URL
```

#### **2. Port Already in Use**

```bash
# Kill process on port 8001
lsof -ti:8001 | xargs kill -9

# Or change PORT in .env
PORT=8002
```

#### **3. Bun Installation Issues**

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Or use npm instead
npm install
npm run dev
```

#### **4. Prisma Issues**

```bash
# Reset Prisma client
rm -rf node_modules/.prisma
bun run db:generate

# Reset database
bun run db:push --force-reset
```

#### **5. TypeScript Compilation Errors**

```bash
# Check TypeScript configuration
bun run type-check

# Clean and rebuild
rm -rf dist
bun run build
```

---

## 📱 Testing the API

### **Using curl**

```bash
# Health check
curl http://localhost:8001/

# Register user
curl -X POST http://localhost:8001/v1/user/register \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test User","email":"test@example.com","password":"password123"}'
```

### **Using Postman**

1. Import the API collection
2. Set base URL to `http://localhost:8001`
3. Test endpoints

---

## 🚀 Deployment

### **Production Deployment**

```bash
# Set production environment
NODE_ENV=production

# Build and deploy
bun run project:deploy
```

### **Docker Deployment** (Optional)

```dockerfile
# Create Dockerfile
FROM oven/bun:1 as base
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install
COPY . .
RUN bun run build
EXPOSE 8001
CMD ["bun", "run", "start"]
```

---

## 📊 Monitoring

### **Logs**

- Application logs are stored in `logs/` directory
- Winston logger is configured for structured logging
- Daily log rotation is enabled

### **Health Checks**

```bash
# Check server status
curl http://localhost:8001/

# Check database connection
bun run db:studio
```

---

## 🔄 Updates & Maintenance

### **Updating Dependencies**

```bash
# Update all dependencies
bun update

# Update specific package
bun add package-name@latest
```

### **Database Migrations**

```bash
# Create new migration
bun run db:migrate dev --name migration-name

# Apply migrations
bun run db:migrate
```

---

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review the logs in `logs/` directory
3. Verify environment variables
4. Check database connectivity
5. Ensure all services are running

---

**Happy Coding! 🎉**

---

**Document Version:** 1.0  
**Last Updated:** December 2024  
**Maintained By:** Development Team
