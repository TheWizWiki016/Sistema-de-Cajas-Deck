import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { verifyPassword, generateAccessToken, generateRefreshToken, setAuthCookies } from "@/lib/auth"
import type { User } from "@/lib/types"

export async function POST(request: Request) {
  try {
    const { email, password, totpToken } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    const db = await getDb()
    const usersCollection = db.collection<User>("users")

    const user = await usersCollection.findOne({ email })
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const isValidPassword = await verifyPassword(password, user.password)
    if (!isValidPassword) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      if (!totpToken) {
        return NextResponse.json({ requires2FA: true }, { status: 200 })
      }

      // Verify TOTP token
      const { verifyToken } = await import("@/lib/totp")
      const isValidToken = verifyToken(totpToken, user.twoFactorSecret!)
      if (!isValidToken) {
        return NextResponse.json({ error: "Invalid 2FA token" }, { status: 401 })
      }
    }

    // Generate tokens
    const payload = {
      userId: user._id!.toString(),
      email: user.email,
      role: user.role,
    }

    const accessToken = await generateAccessToken(payload)
    const refreshToken = await generateRefreshToken(payload)

    await setAuthCookies(accessToken, refreshToken)

    return NextResponse.json({
      message: "Login successful",
      user: {
        id: user._id!.toString(),
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    console.error("[v0] Login error:", error)
    return NextResponse.json({ error: "Failed to login" }, { status: 500 })
  }
}
