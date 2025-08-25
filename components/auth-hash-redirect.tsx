"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function AuthHashRedirect() {
  const router = useRouter()

  useEffect(() => {
    if (typeof window === "undefined") return
    const rawHash = window.location.hash
    if (!rawHash || rawHash.length < 2) return

    const params = new URLSearchParams(rawHash.replace(/^#/, ""))
    const hasAccess = params.has("access_token") && params.has("refresh_token")
    if (!hasAccess) return

    const type = params.get("type") || ""
    const next = type === "invite" ? "/onboarding/therapist" : "/dashboard"
    router.replace(`/auth/callback?next=${encodeURIComponent(next)}${rawHash}`)
  }, [router])

  return null
}


