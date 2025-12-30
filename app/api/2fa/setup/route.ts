import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { getSession } from "@/lib/auth"
import { generateSecret, generateTOTPUrl } from "@/lib/totp"
import { ObjectId } from "mongodb"
import type { User } from "@/lib/types"

export async function POST() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = await getDb()
    const usersCollection = db.collection<User>("users")

    const user = await usersCollection.findOne({ _id: new ObjectId(session.userId) })
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Generate new secret
    const secret = generateSecret()
    const otpauthUrl = generateTOTPUrl(user.email, secret)

    // Store secret (not enabled yet)
    await usersCollection.updateOne({ _id: new ObjectId(session.userId) }, { $set: { twoFactorSecret: secret } })

    // Generate QR code URL
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`

    return NextResponse.json({
      secret,
      qrCodeUrl,
    })
  } catch (error) {
    console.error("[v0] 2FA setup error:", error)
    return NextResponse.json({ error: "Failed to setup 2FA" }, { status: 500 })
  }
}
