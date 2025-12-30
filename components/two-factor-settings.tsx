"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ShieldCheck } from "lucide-react"

export function TwoFactorSettings() {
  const [isEnabling, setIsEnabling] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState("")
  const [secret, setSecret] = useState("")
  const [token, setToken] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  async function handleSetup() {
    setError("")
    setMessage("")

    try {
      const response = await fetch("/api/2fa/setup", { method: "POST" })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error)
        return
      }

      setQrCodeUrl(data.qrCodeUrl)
      setSecret(data.secret)
      setIsEnabling(true)
    } catch (err) {
      setError("Failed to setup 2FA")
    }
  }

  async function handleEnable() {
    setError("")
    setMessage("")

    try {
      const response = await fetch("/api/2fa/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error)
        return
      }

      setMessage("2FA enabled successfully")
      setIsEnabling(false)
      setQrCodeUrl("")
      setSecret("")
      setToken("")
    } catch (err) {
      setError("Failed to enable 2FA")
    }
  }

  async function handleDisable() {
    setError("")
    setMessage("")

    try {
      const response = await fetch("/api/2fa/disable", { method: "POST" })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error)
        return
      }

      setMessage("2FA disabled successfully")
    } catch (err) {
      setError("Failed to disable 2FA")
    }
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <CardTitle>Two-Factor Authentication</CardTitle>
        </div>
        <CardDescription>Add an extra layer of security to your account with TOTP-based 2FA</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {message && (
          <Alert>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!isEnabling ? (
          <div className="space-y-4">
            <Button onClick={handleSetup}>Setup 2FA</Button>
            <Button onClick={handleDisable} variant="destructive">
              Disable 2FA
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Scan QR Code</Label>
              <div className="flex justify-center p-4 bg-muted rounded-lg">
                <img src={qrCodeUrl || "/placeholder.svg"} alt="QR Code" className="w-48 h-48" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Or enter this secret manually</Label>
              <Input value={secret} readOnly className="font-mono text-sm" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="token">Enter verification code</Label>
              <Input
                id="token"
                type="text"
                placeholder="000000"
                maxLength={6}
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleEnable} disabled={token.length !== 6}>
                Enable 2FA
              </Button>
              <Button
                onClick={() => {
                  setIsEnabling(false)
                  setQrCodeUrl("")
                  setSecret("")
                  setToken("")
                }}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
