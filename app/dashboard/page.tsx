"use client"

import { AuthGuard } from "@/components/auth-guard"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ButtonList } from "@/components/button-list"

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">View and execute configurable buttons</p>
          </div>
          <ButtonList />
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}
