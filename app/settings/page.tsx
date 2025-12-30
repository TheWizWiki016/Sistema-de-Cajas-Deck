"use client"

import { AuthGuard } from "@/components/auth-guard"
import { DashboardLayout } from "@/components/dashboard-layout"
import { TwoFactorSettings } from "@/components/two-factor-settings"

export default function SettingsPage() {
  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground">Manage your account settings</p>
          </div>
          <TwoFactorSettings />
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}
