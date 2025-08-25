"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabaseBrowser } from "@/lib/supabase-browser"

export default function AuthCallbackPage() {
  const router = useRouter()
  const params = useSearchParams()
  const supabase = supabaseBrowser()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const code = params.get("code")
    const next = params.get("next") || "/dashboard"
    const error_description = params.get("error_description")
    if (error_description) setError(error_description)

    const exchange = async () => {
      try {
        if (code) {
          // Exchange PKCE code for a session (handles recovery links that land with ?code)
          await supabase.auth.exchangeCodeForSession(code)
        } else if (typeof window !== "undefined") {
          // Fallback: hydrate from hash tokens if present
          const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""))
          const at = hash.get("access_token")
          const rt = hash.get("refresh_token")
          if (at && rt) await supabase.auth.setSession({ access_token: at, refresh_token: rt })
        }
      } finally {
        // Forward tokens to the next URL so it can hydrate if storage gets cleared
        if (typeof window !== "undefined") {
          const url = new URL(next, window.location.origin)

          // If the current URL has hash tokens (implicit flow), forward them as-is
          const rawHash = window.location.hash || ""
          const hashParams = new URLSearchParams(rawHash.replace(/^#/, ""))
          const hashAt = hashParams.get("access_token")
          const hashRt = hashParams.get("refresh_token")
          if (hashAt && hashRt) {
            router.replace(url.toString() + rawHash)
            return
          }

          // Otherwise, append tokens from the current session as query params
          const sessionRes = await supabase.auth.getSession()
          const at = sessionRes.data.session?.access_token
          const rt = sessionRes.data.session?.refresh_token
          if (at && rt) {
            if (!url.searchParams.get("access_token")) url.searchParams.set("access_token", at)
            if (!url.searchParams.get("refresh_token")) url.searchParams.set("refresh_token", rt)
            if (!url.searchParams.get("type")) url.searchParams.set("type", "recovery")
          }
          router.replace(url.toString())
        } else {
          router.replace(next)
        }
      }
    }

    exchange()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="p-6">
      {error ? <div className="text-error-500 text-sm">{error}</div> : "Completing sign-in..."}
    </div>
  )
}


