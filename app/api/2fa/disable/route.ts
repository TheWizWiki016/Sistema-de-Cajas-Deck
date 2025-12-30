import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { getSession } from "@/lib/auth"
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

    await usersCollection.updateOne(
      { _id: new ObjectId(session.userId) },
      {
        $set: { twoFactorEnabled: false },
        $unset: { twoFactorSecret: "" },
      },
    )

    return NextResponse.json({
      message: "2FA disabled successfully",
    })
  } catch (error) {
    console.error("[v0] 2FA disable error:", error)
    return NextResponse.json({ error: "Failed to disable 2FA" }, { status: 500 })
  }
}
