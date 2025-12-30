"use client"

import { AuthGuard } from "@/components/auth-guard"
import { DashboardLayout } from "@/components/dashboard-layout"
import { AdminButtonManager } from "@/components/admin-button-manager"

export default function AdminPage() {
  return (
    <AuthGuard requireAdmin>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage configurable buttons</p>
          </div>
          <AdminButtonManager />
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}
