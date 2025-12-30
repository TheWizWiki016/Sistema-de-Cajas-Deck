"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface ButtonData {
  _id: string
  name: string
  actionType: string
  parameters: Record<string, any>
}

export function AdminButtonManager() {
  const [buttons, setButtons] = useState<ButtonData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [error, setError] = useState("")

  const [formData, setFormData] = useState({
    name: "",
    actionType: "http_request",
    url: "",
    method: "GET",
    webhookUrl: "",
  })

  useEffect(() => {
    fetchButtons()
  }, [])

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

  async function handleCreate() {
    setError("")
    setIsCreating(true)

    const parameters =
      formData.actionType === "http_request"
        ? { url: formData.url, method: formData.method }
        : formData.actionType === "webhook"
          ? { webhookUrl: formData.webhookUrl, payload: {} }
          : {}

    try {
      const response = await fetch("/api/buttons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          actionType: formData.actionType,
          parameters,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error)
        return
      }

      setFormData({
        name: "",
        actionType: "http_request",
        url: "",
        method: "GET",
        webhookUrl: "",
      })
      setShowDialog(false)
      fetchButtons()
    } catch (err) {
      setError("Failed to create button")
    } finally {
      setIsCreating(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/buttons/${id}`, { method: "DELETE" })
      fetchButtons()
    } catch (error) {
      console.error("[v0] Failed to delete button:", error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Button
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Button</DialogTitle>
              <DialogDescription>Configure a new executable button with custom parameters</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Button Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="My API Call"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="actionType">Action Type</Label>
                <Select
                  value={formData.actionType}
                  onValueChange={(value) => setFormData({ ...formData, actionType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="http_request">HTTP Request</SelectItem>
                    <SelectItem value="webhook">Webhook</SelectItem>
                    <SelectItem value="script">Script</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.actionType === "http_request" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="url">URL</Label>
                    <Input
                      id="url"
                      value={formData.url}
                      onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                      placeholder="https://api.example.com/endpoint"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="method">Method</Label>
                    <Select
                      value={formData.method}
                      onValueChange={(value) => setFormData({ ...formData, method: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GET">GET</SelectItem>
                        <SelectItem value="POST">POST</SelectItem>
                        <SelectItem value="PUT">PUT</SelectItem>
                        <SelectItem value="DELETE">DELETE</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {formData.actionType === "webhook" && (
                <div className="space-y-2">
                  <Label htmlFor="webhookUrl">Webhook URL</Label>
                  <Input
                    id="webhookUrl"
                    value={formData.webhookUrl}
                    onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                    placeholder="https://hooks.example.com/webhook"
                  />
                </div>
              )}

              <Button onClick={handleCreate} disabled={isCreating} className="w-full">
                {isCreating ? "Creating..." : "Create Button"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {buttons.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No buttons created yet</p>
          </CardContent>
        </Card>
      ) : (
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
                  {button.actionType === "http_request" && `${button.parameters.method} ${button.parameters.url}`}
                  {button.actionType === "webhook" && button.parameters.webhookUrl}
                  {button.actionType === "script" && "Custom script execution"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => handleDelete(button._id)} variant="destructive" className="w-full gap-2">
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
