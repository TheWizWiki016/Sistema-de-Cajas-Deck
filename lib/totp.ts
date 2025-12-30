import { authenticator } from "otplib"

authenticator.options = {
  window: 1, // Allow 1 step before and after current time
}

export function generateSecret(): string {
  return authenticator.generateSecret()
}

export function generateTOTPUrl(email: string, secret: string): string {
  return authenticator.keyuri(email, "Button Dashboard", secret)
}

export function verifyToken(token: string, secret: string): boolean {
  try {
    return authenticator.verify({ token, secret })
  } catch {
    return false
  }
}
