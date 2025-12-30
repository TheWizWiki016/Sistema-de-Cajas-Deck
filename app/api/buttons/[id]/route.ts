import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { getSession } from "@/lib/auth"
import { ObjectId } from "mongodb"
import type { ConfigurableButton } from "@/lib/types"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
    }

    const { id } = await params
    const { name, actionType, parameters } = await request.json()

    const db = await getDb()
    const buttonsCollection = db.collection<ConfigurableButton>("buttons")

    const result = await buttonsCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          name,
          actionType,
          parameters,
          updatedAt: new Date(),
        },
      },
    )

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Button not found" }, { status: 404 })
    }

    return NextResponse.json({
      message: "Button updated successfully",
    })
  } catch (error) {
    console.error("[v0] Update button error:", error)
    return NextResponse.json({ error: "Failed to update button" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
    }

    const { id } = await params

    const db = await getDb()
    const buttonsCollection = db.collection<ConfigurableButton>("buttons")

    const result = await buttonsCollection.deleteOne({ _id: new ObjectId(id) })

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Button not found" }, { status: 404 })
    }

    return NextResponse.json({
      message: "Button deleted successfully",
    })
  } catch (error) {
    console.error("[v0] Delete button error:", error)
    return NextResponse.json({ error: "Failed to delete button" }, { status: 500 })
  }
}
