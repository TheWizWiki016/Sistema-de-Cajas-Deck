import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { getSession } from "@/lib/auth"
import { ObjectId } from "mongodb"
import type { ConfigurableButton, ButtonExecution } from "@/lib/types"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const db = await getDb()
    const buttonsCollection = db.collection<ConfigurableButton>("buttons")
    const executionsCollection = db.collection<ButtonExecution>("executions")

    const button = await buttonsCollection.findOne({ _id: new ObjectId(id) })
    if (!button) {
      return NextResponse.json({ error: "Button not found" }, { status: 404 })
    }

    let result: any
    let status: "success" | "error" = "success"
    let error: string | undefined

    try {
      // Execute based on action type
      switch (button.actionType) {
        case "http_request":
          const response = await fetch(button.parameters.url, {
            method: button.parameters.method || "GET",
            headers: button.parameters.headers || {},
            body: button.parameters.body ? JSON.stringify(button.parameters.body) : undefined,
          })
          result = await response.json()
          break

        case "webhook":
          const webhookResponse = await fetch(button.parameters.webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(button.parameters.payload || {}),
          })
          result = await webhookResponse.json()
          break

        case "script":
          result = { message: "Script execution not implemented in this demo" }
          break
      }
    } catch (err: any) {
      status = "error"
      error = err.message
    }

    // Record execution
    const execution: ButtonExecution = {
      buttonId: new ObjectId(id),
      executedBy: new ObjectId(session.userId),
      status,
      result: status === "success" ? result : undefined,
      error,
      executedAt: new Date(),
    }

    await executionsCollection.insertOne(execution)

    return NextResponse.json({
      status,
      result,
      error,
    })
  } catch (error) {
    console.error("[v0] Execute button error:", error)
    return NextResponse.json({ error: "Failed to execute button" }, { status: 500 })
  }
}
