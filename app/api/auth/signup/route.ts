import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { hashPassword } from "@/lib/auth"
import type { User } from "@/lib/types"

export async function POST(request: Request) {
  try {
    const { email, password, role = "user" } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
    }

    const db = await getDb()
    const usersCollection = db.collection<User>("users")

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email })
    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 409 })
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(password)
    const user: User = {
      email,
      password: hashedPassword,
      role: role === "admin" ? "admin" : "user",
      twoFactorEnabled: false,
      createdAt: new Date(),
    }

    const result = await usersCollection.insertOne(user)

    return NextResponse.json({
      message: "User created successfully",
      userId: result.insertedId.toString(),
    })
  } catch (error) {
    console.error("[v0] Signup error:", error)
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }
}
