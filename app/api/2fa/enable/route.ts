import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { getSession } from "@/lib/auth"
import { verifyToken } from "@/lib/totp"
import { ObjectId } from "mongodb"
import type { User } from "@/lib/types"

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { token } = await request.json()
    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 })
    }

    const db = await getDb()
    const usersCollection = db.collection<User>("users")

    const user = await usersCollection.findOne({ _id: new ObjectId(session.userId) })
    if (!user || !user.twoFactorSecret) {
      return NextResponse.json({ error: "User not found or 2FA not setup" }, { status: 404 })
    }

    // Verify the token
    const isValid = verifyToken(token, user.twoFactorSecret)
    if (!isValid) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    // Enable 2FA
    await usersCollection.updateOne({ _id: new ObjectId(session.userId) }, { $set: { twoFactorEnabled: true } })

    return NextResponse.json({
      message: "2FA enabled successfully",
    })
  } catch (error) {
    console.error("[v0] 2FA enable error:", error)
    return NextResponse.json({ error: "Failed to enable 2FA" }, { status: 500 })
  }
}
