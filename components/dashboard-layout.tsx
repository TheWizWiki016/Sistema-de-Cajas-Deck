"use client"

import type React from "react"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Lock, LayoutDashboard, Settings, ShieldCheck } from "lucide-react"

interface User {
  id: string
  email: string
  role: "admin" | "user"
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    async function getUser() {
      const response = await fetch("/api/auth/me")
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      }
    }
    getUser()
  }, [])

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b border-border bg-card">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Lock className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">Button Dashboard</span>
            </div>
            <nav className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => router.push("/dashboard")} className="gap-2">
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Button>
              {user?.role === "admin" && (
                <Button variant="ghost" onClick={() => router.push("/admin")} className="gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Admin
                </Button>
              )}
              <Button variant="ghost" onClick={() => router.push("/settings")} className="gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </Button>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <div className="font-medium">{user?.email}</div>
              <div className="text-muted-foreground text-xs capitalize">{user?.role}</div>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
