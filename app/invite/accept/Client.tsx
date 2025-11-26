"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabaseBrowser } from "@/lib/supabase-browser"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

// Password strength checker using HaveIBeenPwned API
async function sha1Hex(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const digest = await crypto.subtle.digest("SHA-1", data)
  const hashArray = Array.from(new Uint8Array(digest))
  const hex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
  return hex.toUpperCase()
}

async function isPwnedPassword(password: string): Promise<boolean> {
  try {
    const sha1 = await sha1Hex(password)
    const prefix = sha1.slice(0, 5)
    const suffix = sha1.slice(5)
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`)
    if (!res.ok) return false
    const text = await res.text()
    const lines = text.split("\n")
    return lines.some((line) => line.startsWith(suffix))
  } catch {
    return false
  }
}

export default function AcceptInviteClient() {
  const router = useRouter()
  const params = useSearchParams()
  const supabase = supabaseBrowser()

  const token = params.get("token")

  const [validating, setValidating] = useState(true)
  const [inviteValid, setInviteValid] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteError, setInviteError] = useState<string | null>(null)

  const [password, setPassword] = useState("")
  const [password2, setPassword2] = useState("")
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Validate invite token on mount
  useEffect(() => {
    if (!token) {
      setInviteError("No invitation token provided")
      setValidating(false)
      return
    }

    const validateToken = async () => {
      try {
        const res = await fetch("/api/invite/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token })
        })

        const data = await res.json()

        if (!res.ok || !data.valid) {
          setInviteError(data.error || "Invalid invitation")
          setInviteValid(false)
        } else {
          setInviteValid(true)
          setInviteEmail(data.email)
        }
      } catch (e) {
        setInviteError("Failed to validate invitation")
        setInviteValid(false)
      } finally {
        setValidating(false)
      }
    }

    validateToken()
  }, [token])

  const handleAccept = useCallback(async () => {
    setError(null)

    // Validation
    if (password.length < 12) {
      setError("Password must be at least 12 characters")
      return
    }

    if (password !== password2) {
      setError("Passwords do not match")
      return
    }

    setAccepting(true)

    try {
      // Check against HaveIBeenPwned
      const pwned = await isPwnedPassword(password)
      if (pwned) {
        setError("This password appears in breach datasets. Please choose a stronger password.")
        setAccepting(false)
        return
      }

      // Accept the invitation
      const res = await fetch("/api/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password })
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setError(data.error || "Failed to accept invitation")
        setAccepting(false)
        return
      }

      // Login with the password they just set
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: inviteEmail,
        password: password
      })

      if (signInError) {
        console.error("[Invite] Auto-login failed:", signInError.message)
        // Redirect to login page if auto-login fails
        router.replace("/login?message=Account created! Please log in.")
        return
      }

      // Redirect to onboarding
      router.replace(data.redirect || "/onboarding/therapist")
    } catch (e: any) {
      setError(e?.message || "An unexpected error occurred")
      setAccepting(false)
    }
  }, [token, password, password2, supabase, router])

  // Loading state
  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Validating invitation...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Invalid invite
  if (!inviteValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Invalid Invitation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 mb-4">{inviteError || "This invitation link is invalid or has expired."}</p>
            <p className="text-sm text-gray-600">
              Please contact your administrator to request a new invitation.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push("/")}
            >
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Valid invite - show password form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome to LinkTherapy!</CardTitle>
          <CardDescription>
            You've been invited to join as a therapist. Set your password to get started.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={inviteEmail}
              disabled
              className="bg-gray-100"
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Minimum 12 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={accepting}
            />
            <p className="text-xs text-gray-500 mt-1">
              Choose a strong password with at least 12 characters
            </p>
          </div>

          <div>
            <Label htmlFor="password2">Confirm Password</Label>
            <Input
              id="password2"
              type="password"
              placeholder="Re-enter your password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              disabled={accepting}
              onKeyDown={(e) => {
                if (e.key === "Enter" && password && password2) {
                  handleAccept()
                }
              }}
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
              {error}
            </div>
          )}

          <Button
            onClick={handleAccept}
            disabled={accepting || !password || !password2}
            className="w-full"
          >
            {accepting ? "Creating your account..." : "Accept Invitation & Continue"}
          </Button>

          <p className="text-xs text-gray-500 text-center mt-4">
            By accepting this invitation, you agree to our Terms of Service and Privacy Policy.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
