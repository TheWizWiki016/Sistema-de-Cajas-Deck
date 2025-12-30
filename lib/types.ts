import type { ObjectId } from "mongodb"

export interface User {
  _id?: ObjectId
  email: string
  password: string
  role: "admin" | "user"
  twoFactorSecret?: string
  twoFactorEnabled: boolean
  createdAt: Date
}

export interface ConfigurableButton {
  _id?: ObjectId
  name: string
  actionType: "http_request" | "webhook" | "script"
  parameters: Record<string, any>
  createdBy: ObjectId
  createdAt: Date
  updatedAt: Date
}

export interface ButtonExecution {
  _id?: ObjectId
  buttonId: ObjectId
  executedBy: ObjectId
  status: "success" | "error"
  result?: any
  error?: string
  executedAt: Date
}
