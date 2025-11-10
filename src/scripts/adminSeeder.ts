import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

interface AdminUser {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

const defaultAdmin: AdminUser = {
  fullName: "System Administrator",
  email: "admin@sufism.com",
  password: "admin123",
  phone: "+1234567890",
  address: "123 Admin Street",
  city: "Admin City",
  state: "AC",
  zipCode: "12345",
  country: "Admin Country"
};

async function createAdminUser(adminData: AdminUser) {
  try {
    // Check if admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: {
        OR: [{ email: adminData.email }, { role: "admin" }]
      }
    });

    if (existingAdmin) {
      console.log("✅ Admin user already exists:");
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Name: ${existingAdmin.fullName}`);
      console.log(`   Role: ${existingAdmin.role}`);
      return existingAdmin;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(adminData.password, 12);

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        fullName: adminData.fullName,
        email: adminData.email,
        password: hashedPassword,
        role: "admin",
        phone: adminData.phone || null,
        address: adminData.address || null,
        city: adminData.city || null,
        state: adminData.state || null,
        zipCode: adminData.zipCode || null,
        country: adminData.country || null,
        isVerified: true,
        isCompleted: true,
        avatar: "https://via.placeholder.com/70x70"
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        isVerified: true,
        isCompleted: true,
        createdAt: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        country: true
      }
    });

    console.log("🎉 Admin user created successfully:");
    console.log(`   ID: ${admin.id}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Name: ${admin.fullName}`);
    console.log(`   Role: ${admin.role}`);
    console.log(`   Created: ${admin.createdAt.toISOString()}`);

    return admin;
  } catch (error) {
    console.error("❌ Error creating admin user:", error);
    throw error;
  }
}

async function createMultipleAdmins() {
  const admins: AdminUser[] = [
    {
      fullName: "System Administrator",
      email: "admin@sufism.com",
      password: "admin123",
      phone: "+1234567890",
      address: "123 Admin Street",
      city: "Admin City",
      state: "AC",
      zipCode: "12345",
      country: "Admin Country"
    },
    {
      fullName: "Super Admin",
      email: "superadmin@sufism.com",
      password: "superadmin123",
      phone: "+1987654321",
      address: "456 Super Admin Ave",
      city: "Super City",
      state: "SA",
      zipCode: "54321",
      country: "Super Country"
    }
  ];

  console.log("🚀 Creating admin users...");
  console.log("=====================================");

  for (const adminData of admins) {
    await createAdminUser(adminData);
    console.log(""); // Empty line for readability
  }
}

async function listAllAdmins() {
  try {
    const admins = await prisma.user.findMany({
      where: { role: "admin" },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        isVerified: true,
        isCompleted: true,
        createdAt: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        country: true
      },
      orderBy: { createdAt: "desc" }
    });

    console.log("📋 All Admin Users:");
    console.log("=====================================");

    if (admins.length === 0) {
      console.log("No admin users found.");
    } else {
      admins.forEach((admin, index) => {
        console.log(`${index + 1}. ${admin.fullName}`);
        console.log(`   Email: ${admin.email}`);
        console.log(`   Phone: ${admin.phone || "Not set"}`);
        console.log(`   Location: ${admin.city || "N/A"}, ${admin.state || "N/A"}, ${admin.country || "N/A"}`);
        console.log(`   Verified: ${admin.isVerified ? "Yes" : "No"}`);
        console.log(`   Completed: ${admin.isCompleted ? "Yes" : "No"}`);
        console.log(`   Created: ${admin.createdAt.toISOString()}`);
        console.log("");
      });
    }

    return admins;
  } catch (error) {
    console.error("❌ Error listing admin users:", error);
    throw error;
  }
}

async function deleteAdminByEmail(email: string) {
  try {
    const admin = await prisma.user.findFirst({
      where: {
        email: email,
        role: "admin"
      }
    });

    if (!admin) {
      console.log(`❌ Admin with email ${email} not found`);
      return null;
    }

    await prisma.user.delete({
      where: { id: admin.id }
    });

    console.log(`✅ Admin user deleted: ${admin.fullName} (${admin.email})`);
    return admin;
  } catch (error) {
    console.error("❌ Error deleting admin user:", error);
    throw error;
  }
}

async function resetAdminPassword(email: string, newPassword: string) {
  try {
    const admin = await prisma.user.findFirst({
      where: {
        email: email,
        role: "admin"
      }
    });

    if (!admin) {
      console.log(`❌ Admin with email ${email} not found`);
      return null;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    const updatedAdmin = await prisma.user.update({
      where: { id: admin.id },
      data: { password: hashedPassword },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        createdAt: true
      }
    });

    console.log(`✅ Admin password reset successfully:`);
    console.log(`   Name: ${updatedAdmin.fullName}`);
    console.log(`   Email: ${updatedAdmin.email}`);
    console.log(`   New password: ${newPassword}`);
    console.log(`   Created: ${updatedAdmin.createdAt.toISOString()}`);

    return updatedAdmin;
  } catch (error) {
    console.error("❌ Error resetting admin password:", error);
    throw error;
  }
}

// Main seeder function
async function main() {
  const command = process.argv[2];
  const email = process.argv[3];
  const password = process.argv[4];

  try {
    console.log("🔌 Connecting to database...");
    await prisma.$connect();
    console.log("✅ Connected to database");

    switch (command) {
      case "create":
        if (email && password) {
          // Create custom admin
          const customAdmin: AdminUser = {
            fullName: "Custom Admin",
            email: email,
            password: password,
            phone: "+1234567890"
          };
          await createAdminUser(customAdmin);
        } else {
          // Create default admin
          await createAdminUser(defaultAdmin);
        }
        break;

      case "create-multiple":
        await createMultipleAdmins();
        break;

      case "list":
        await listAllAdmins();
        break;

      case "delete":
        if (!email) {
          console.log("❌ Please provide email: bun run seed:admin delete admin@example.com");
          process.exit(1);
        }
        await deleteAdminByEmail(email);
        break;

      case "reset-password":
        if (!email || !password) {
          console.log("❌ Please provide email and new password: bun run seed:admin reset-password admin@example.com newpassword123");
          process.exit(1);
        }
        await resetAdminPassword(email, password);
        break;

      default:
        console.log("🌱 Admin Seeder Commands:");
        console.log("=====================================");
        console.log("bun run seed:admin create                    # Create default admin (admin@sufism.com / admin123)");
        console.log("bun run seed:admin create email@example.com password123  # Create custom admin");
        console.log("bun run seed:admin create-multiple          # Create multiple default admins");
        console.log("bun run seed:admin list                      # List all admin users");
        console.log("bun run seed:admin delete email@example.com  # Delete admin by email");
        console.log("bun run seed:admin reset-password email@example.com newpassword123  # Reset admin password");
        console.log("");
        console.log("📝 Default Admin Credentials:");
        console.log("   Email: admin@sufism.com");
        console.log("   Password: admin123");
        break;
    }
  } catch (error) {
    console.error("❌ Seeder failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log("🔌 Disconnected from database");
  }
}

// Run the seeder
void main();
