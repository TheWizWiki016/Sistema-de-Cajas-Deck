import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

export async function GET() {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    return NextResponse.json({
      user: {
        id: session.userId,
        email: session.email,
        role: session.role,
      },
    })
  } catch (error) {
    console.error("[v0] Get session error:", error)
    return NextResponse.json({ error: "Failed to get session" }, { status: 500 })
  }
}
