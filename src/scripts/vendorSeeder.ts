import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

interface VendorUser {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
}

const defaultVendors: VendorUser[] = [
  {
    fullName: "Test Vendor",
    email: "vendor@example.com",
    password: "Vendor123",
    phone: "+1234567890",
    address: "123 Vendor Street"
  },
  {
    fullName: "Asad Vendor",
    email: "asad@gmail.com",
    password: "123456789",
    phone: "+1234567890",
    address: "123 Asad Street"
  }
];

async function createVendor(vendorData: VendorUser) {
  try {
    // Check if vendor already exists
    const existingVendor = await prisma.user.findFirst({
      where: { email: vendorData.email }
    });

    if (existingVendor) {
      console.log("✅ Vendor user already exists:");
      console.log(`   Email: ${existingVendor.email}`);
      console.log(`   Name: ${existingVendor.fullName}`);
      console.log(`   Role: ${existingVendor.role}`);
      return existingVendor;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(vendorData.password, 12);

    // Create vendor user
    const vendor = await prisma.user.create({
      data: {
        fullName: vendorData.fullName,
        email: vendorData.email,
        password: hashedPassword,
        phone: vendorData.phone || null,
        address: vendorData.address || null,
        role: "vendor",
        isVerified: true,
        isCompleted: true
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        isVerified: true,
        isCompleted: true,
        createdAt: true
      }
    });

    console.log("🎉 Vendor user created successfully:");
    console.log(`   ID: ${vendor.id}`);
    console.log(`   Email: ${vendor.email}`);
    console.log(`   Name: ${vendor.fullName}`);
    console.log(`   Role: ${vendor.role}`);
    console.log(`   Created: ${vendor.createdAt.toISOString()}`);

    return vendor;
  } catch (error) {
    console.error("❌ Error creating vendor user:", error);
    throw error;
  }
}

async function listAllVendors() {
  try {
    const vendors = await prisma.user.findMany({
      where: { role: "vendor" },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        isVerified: true,
        isCompleted: true,
        createdAt: true
      },
      orderBy: { createdAt: "desc" }
    });

    console.log("📋 All Vendor Users:");
    console.log("=====================================");

    if (vendors.length === 0) {
      console.log("No vendor users found.");
    } else {
      vendors.forEach((vendor, index) => {
        console.log(`${index + 1}. ${vendor.fullName}`);
        console.log(`   Email: ${vendor.email}`);
        console.log(`   Phone: ${vendor.phone || "Not set"}`);
        console.log(`   Verified: ${vendor.isVerified ? "Yes" : "No"}`);
        console.log(`   Completed: ${vendor.isCompleted ? "Yes" : "No"}`);
        console.log(`   Created: ${vendor.createdAt.toISOString()}`);
        console.log("");
      });
    }

    return vendors;
  } catch (error) {
    console.error("❌ Error listing vendor users:", error);
    throw error;
  }
}

async function main() {
  const command = process.argv[2];

  try {
    console.log("🔌 Connecting to database...");
    await prisma.$connect();
    console.log("✅ Connected to database");

    switch (command) {
      case "create":
        // Create all default vendors
        console.log("🚀 Creating vendor users...");
        for (const vendorData of defaultVendors) {
          await createVendor(vendorData);
          console.log("");
        }
        break;

      case "list":
        await listAllVendors();
        break;

      default:
        console.log("🌱 Vendor Seeder Commands:");
        console.log("=====================================");
        console.log("bun run seed:vendor create  # Create default vendors");
        console.log("bun run seed:vendor list    # List all vendors");
        console.log("");
        console.log("📝 Default Vendor Credentials:");
        console.log("   Email: asad@gmail.com");
        console.log("   Password: 123456789");
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
