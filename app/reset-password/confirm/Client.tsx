"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabaseBrowser } from "@/lib/supabase-browser"
import Button from "@/components/ui/button-admin"
import InputField from "@/components/ui/input-field"
import Label from "@/components/ui/label"

async function sha1Hex(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const digest = await crypto.subtle.digest("SHA-1", data)
  const hashArray = Array.from(new Uint8Array(digest))
  const hex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
  return hex.toUpperCase()
}

async function isPwnedPassword(password: string): Promise<boolean> {
  const sha1 = await sha1Hex(password)
  const prefix = sha1.slice(0, 5)
  const suffix = sha1.slice(5)
  const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`)
  if (!res.ok) return false
  const text = await res.text()
  const lines = text.split("\n")
  return lines.some((line) => line.startsWith(suffix))
}

export default function ResetPasswordConfirmClient() {
  const supabase = supabaseBrowser()
  const params = useSearchParams()
  const router = useRouter()

  const [hydrating, setHydrating] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [password, setPassword] = useState("")
  const [password2, setPassword2] = useState("")
  const [saving, setSaving] = useState(false)
  const passwordsMatch = useMemo(() => password.length > 0 && password === password2, [password, password2])

  useEffect(() => {
    const code = params.get("code")
    const access_token = params.get("access_token")
    const refresh_token = params.get("refresh_token")

    const fromHash = () => {
      if (typeof window === "undefined") return null
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""))
      const t = hash.get("access_token")
      const r = hash.get("refresh_token")
      const ty = hash.get("type")
      if (t && r) return { access_token: t, refresh_token: r, type: ty }
      return null
    }

    const hydrate = async () => {
      try {
        if (code) {
          // If Supabase redirected with ?code, exchange it for a session
          await supabase.auth.exchangeCodeForSession(code)
        } else {
          let at = access_token
          let rt = refresh_token
          if (!at || !rt) {
            const h = fromHash()
            if (h) {
              at = h.access_token
              rt = h.refresh_token
            }
          }
          if (at && rt) {
            await supabase.auth.setSession({ access_token: at, refresh_token: rt })
          }
        }
      } finally {
        setHydrating(false)
      }
    }

    hydrate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onSetPassword = useCallback(async () => {
    setError(null)
    if (!passwordsMatch) {
      setError("Passwords do not match")
      return
    }
    if (password.length < 12) {
      setError("Password must be at least 12 characters")
      return
    }
    setSaving(true)
    try {
      const pwned = await isPwnedPassword(password)
      if (pwned) {
        setError("This password appears in breach datasets. Please choose a stronger password.")
        return
      }
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        setError(error.message)
        return
      }
      router.replace("/login")
    } finally {
      setSaving(false)
    }
  }, [password, passwordsMatch, supabase, router])

  if (hydrating) return <div className="p-6">Loading secure session...</div>

  return (
    <div className="relative p-6 bg-white z-1 dark:bg-gray-900 sm:p-0 mt-16">
      <div className="relative flex w-full min-h-[calc(100vh-64px)] justify-center flex-col dark:bg-gray-900 sm:p-0">
        <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
          <div>
            <div className="mb-5 sm:mb-8">
              <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
                Choose a new password
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Enter and confirm your new password.
              </p>
            </div>
            <div className="space-y-6">
              <div>
                <Label>
                  New password <span className="text-error-500">*</span>
                </Label>
                <InputField
                  type="password"
                  placeholder="At least 12 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={!!error}
                />
              </div>
              <div>
                <Label>
                  Confirm password <span className="text-error-500">*</span>
                </Label>
                <InputField
                  type="password"
                  placeholder="Re-enter password"
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  error={!!error}
                />
              </div>
              {error && <p className="text-sm text-error-500">{error}</p>}
              <div>
                <Button className="w-full" size="sm" onClick={onSetPassword} disabled={saving}>
                  {saving ? "Saving..." : "Save new password"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


