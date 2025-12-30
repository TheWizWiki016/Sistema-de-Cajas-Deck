"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Play, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ButtonData {
  _id: string
  name: string
  actionType: string
  parameters: Record<string, any>
}

export function ButtonList() {
  const [buttons, setButtons] = useState<ButtonData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [executingId, setExecutingId] = useState<string | null>(null)
  const [result, setResult] = useState<{ status: string; message: string } | null>(null)

  useEffect(() => {
    async function fetchButtons() {
      try {
        const response = await fetch("/api/buttons")
        if (response.ok) {
          const data = await response.json()
          setButtons(data.buttons)
        }
      } catch (error) {
        console.error("[v0] Failed to fetch buttons:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchButtons()
  }, [])

  async function executeButton(id: string) {
    setExecutingId(id)
    setResult(null)

    try {
      const response = await fetch(`/api/buttons/${id}/execute`, {
        method: "POST",
      })

      const data = await response.json()
      setResult({
        status: data.status,
        message: data.error || "Button executed successfully",
      })
    } catch (error) {
      setResult({
        status: "error",
        message: "Failed to execute button",
      })
    } finally {
      setExecutingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (buttons.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No buttons configured yet</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {result && (
        <Alert variant={result.status === "error" ? "destructive" : "default"}>
          <AlertDescription>{result.message}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {buttons.map((button) => (
          <Card key={button._id} className="border-border">
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{button.name}</CardTitle>
                <Badge variant="secondary" className="capitalize">
                  {button.actionType.replace("_", " ")}
                </Badge>
              </div>
              <CardDescription className="line-clamp-2">
                {button.actionType === "http_request" && `URL: ${button.parameters.url}`}
                {button.actionType === "webhook" && `Webhook: ${button.parameters.webhookUrl}`}
                {button.actionType === "script" && "Custom script execution"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => executeButton(button._id)}
                disabled={executingId === button._id}
                className="w-full gap-2"
              >
                {executingId === button._id ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Executing...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Execute
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
