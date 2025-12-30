import { config } from "dotenv"
import { resolve } from "path"

config({ path: resolve(process.cwd(), ".env.local") })

// Now import other modules after dotenv is configured
import { getDb } from "../lib/mongodb"
import bcrypt from "bcryptjs"

async function setupDatabase() {
  console.log("🔧 Setting up database...")

  if (!process.env.MONGODB_URI) {
    console.error("❌ MONGODB_URI is not set in .env.local")
    console.error("Please create a .env.local file with:")
    console.error("MONGODB_URI=your_mongodb_connection_string")
    process.exit(1)
  }

  try {
    const db = await getDb()

    // Create users collection with indexes
    await db.collection("users").createIndex({ email: 1 }, { unique: true })
    await db.collection("users").createIndex({ username: 1 }, { unique: true })
    console.log("✅ Created users collection with indexes")

    // Create buttons collection with indexes
    await db.collection("buttons").createIndex({ name: 1 })
    await db.collection("buttons").createIndex({ createdBy: 1 })
    console.log("✅ Created buttons collection with indexes")

    // Create executions collection with indexes
    await db.collection("executions").createIndex({ buttonId: 1 })
    await db.collection("executions").createIndex({ executedBy: 1 })
    await db.collection("executions").createIndex({ executedAt: -1 })
    console.log("✅ Created executions collection with indexes")

    const existingAdmin = await db.collection("users").findOne({ email: "admin@example.com" })

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash("admin123", 10)
      await db.collection("users").insertOne({
        email: "admin@example.com",
        username: "admin",
        password: hashedPassword,
        role: "admin",
        twoFactorEnabled: false,
        createdAt: new Date(),
      })
      console.log("✅ Created default admin user (email: admin@example.com, password: admin123)")
      console.log("⚠️  IMPORTANT: Change this password after first login!")
    } else {
      console.log("ℹ️  Admin user already exists")
    }

    console.log("\n✨ Database setup completed successfully!")
    process.exit(0)
  } catch (error) {
    console.error("❌ Error setting up database:", error)
    process.exit(1)
  }
}

setupDatabase()
