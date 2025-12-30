import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { getSession } from "@/lib/auth"
import { ObjectId } from "mongodb"
import type { ConfigurableButton } from "@/lib/types"

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = await getDb()
    const buttonsCollection = db.collection<ConfigurableButton>("buttons")

    const buttons = await buttonsCollection.find({}).toArray()

    return NextResponse.json({ buttons })
  } catch (error) {
    console.error("[v0] Get buttons error:", error)
    return NextResponse.json({ error: "Failed to get buttons" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
    }

    const { name, actionType, parameters } = await request.json()

    if (!name || !actionType || !parameters) {
      return NextResponse.json({ error: "Name, actionType, and parameters are required" }, { status: 400 })
    }

    if (!["http_request", "webhook", "script"].includes(actionType)) {
      return NextResponse.json({ error: "Invalid actionType" }, { status: 400 })
    }

    const db = await getDb()
    const buttonsCollection = db.collection<ConfigurableButton>("buttons")

    const button: ConfigurableButton = {
      name,
      actionType,
      parameters,
      createdBy: new ObjectId(session.userId),
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await buttonsCollection.insertOne(button)

    return NextResponse.json({
      message: "Button created successfully",
      buttonId: result.insertedId.toString(),
    })
  } catch (error) {
    console.error("[v0] Create button error:", error)
    return NextResponse.json({ error: "Failed to create button" }, { status: 500 })
  }
}
