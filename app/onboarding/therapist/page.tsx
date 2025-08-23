"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabaseBrowser } from "@/lib/supabase-browser"

function sha1(input: string): string {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const buffer = (window.crypto || (window as any).msCrypto).subtle
  // Web Crypto API returns a promise
  // We'll wrap in a sync-like helper by throwing to caller (we'll await where used)
  throw new Error("sha1 must be awaited")
}

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

export default function TherapistOnboardingPage() {
  const supabase = supabaseBrowser()
  const params = useSearchParams()
  const router = useRouter()

  const [hydrating, setHydrating] = useState(true)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [error, setError] = useState<string | null>(null)

  // Step 1: password
  const [password, setPassword] = useState("")
  const [password2, setPassword2] = useState("")
  const passwordsMatch = useMemo(() => password.length > 0 && password === password2, [password, password2])
  const [savingPwd, setSavingPwd] = useState(false)

  // Step 2: profile fields
  const [fullName, setFullName] = useState("")
  const [title, setTitle] = useState("")
  const [bioShort, setBioShort] = useState("")
  const [bioLong, setBioLong] = useState("")
  const [religion, setReligion] = useState<string>("")
  const [ageRange, setAgeRange] = useState<string>("")
  const [yearsOfExperience, setYearsOfExperience] = useState<number | "">("")
  const [languages, setLanguages] = useState<string>("")
  const [price60, setPrice60] = useState<number | "">("")
  const [price30, setPrice30] = useState<number | "">("")
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null)
  const [acceptTos, setAcceptTos] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)

  useEffect(() => {
    const type = params.get("type")
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
    setSavingPwd(true)
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
      setStep(2)
    } finally {
      setSavingPwd(false)
    }
  }, [password, passwordsMatch, supabase])

  const onSaveProfile = useCallback(async () => {
    setError(null)
    if (!fullName || !title || !bioShort || !bioLong || !religion || !ageRange || yearsOfExperience === "" || price60 === "" || price30 === "") {
      setError("Please fill all required fields")
      return
    }
    if (!acceptTos) {
      setError("You must accept the Terms and Privacy Policy")
      return
    }
    setSavingProfile(true)
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      const user = (await supabase.auth.getUser()).data.user
      let profileImageUrl: string | undefined
      if (profileImageFile && user?.id) {
        const ext = profileImageFile.name.split(".").pop() || "jpg"
        const path = `${user.id}/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from("therapist-avatars").upload(path, profileImageFile, { upsert: true })
        if (upErr) {
          setError(upErr.message)
          return
        }
        const { data: pub } = supabase.storage.from("therapist-avatars").getPublicUrl(path)
        profileImageUrl = pub.publicUrl
      }
      const res = await fetch("/api/onboarding/therapist/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          full_name: fullName,
          title,
          bio_short: bioShort,
          bio_long: bioLong,
          religion,
          age_range: ageRange,
          years_of_experience: typeof yearsOfExperience === "number" ? yearsOfExperience : Number(yearsOfExperience || 0),
          languages: languages.split(",").map((s) => s.trim()).filter(Boolean),
          session_price_60_min: typeof price60 === "number" ? price60 : Number(price60 || 0),
          session_price_30_min: typeof price30 === "number" ? price30 : Number(price30 || 0),
          profile_image_url: profileImageUrl,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data?.error || "Failed to save profile")
        return
      }
      setStep(3)
      setTimeout(() => router.replace("/dashboard"), 800)
    } finally {
      setSavingProfile(false)
    }
  }, [fullName, title, bioShort, bioLong, religion, ageRange, yearsOfExperience, languages, price60, price30, profileImageFile, acceptTos, supabase, router])

  if (hydrating) return <div className="p-6">Preparing your account...</div>

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Therapist Onboarding</h1>
      {error && <div className="text-sm text-red-600">{error}</div>}

      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Set a secure password to protect your account.</p>
          <input
            type="password"
            className="w-full border rounded-md px-3 py-2"
            placeholder="New password (min 12 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            type="password"
            className="w-full border rounded-md px-3 py-2"
            placeholder="Confirm password"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
          />
          <button
            onClick={onSetPassword}
            disabled={savingPwd}
            className="bg-blue-600 text-white rounded-md px-4 py-2 disabled:opacity-50"
          >
            {savingPwd ? "Saving..." : "Continue"}
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Complete your professional profile.</p>
          <input className="w-full border rounded-md px-3 py-2" placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <input className="w-full border rounded-md px-3 py-2" placeholder="Title (e.g., Clinical Psychologist)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input className="w-full border rounded-md px-3 py-2" placeholder="Short bio" value={bioShort} onChange={(e) => setBioShort(e.target.value)} />
          <textarea className="w-full border rounded-md px-3 py-2" placeholder="Long bio" value={bioLong} onChange={(e) => setBioLong(e.target.value)} />
          <select className="w-full border rounded-md px-3 py-2" value={religion} onChange={(e) => setReligion(e.target.value)}>
            <option value="">Select religion</option>
            <option>Christian</option>
            <option>Druze</option>
            <option>Sunni</option>
            <option>Shiite</option>
          </select>
          <select className="w-full border rounded-md px-3 py-2" value={ageRange} onChange={(e) => setAgeRange(e.target.value)}>
            <option value="">Select age range</option>
            <option>21-28</option>
            <option>29-36</option>
            <option>37-45</option>
            <option>46-55</option>
            <option>55+</option>
          </select>
          <input className="w-full border rounded-md px-3 py-2" placeholder="Years of experience" type="number" value={yearsOfExperience} onChange={(e) => setYearsOfExperience(e.target.value === "" ? "" : Number(e.target.value))} />
          <input className="w-full border rounded-md px-3 py-2" placeholder="Languages (comma-separated)" value={languages} onChange={(e) => setLanguages(e.target.value)} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input className="w-full border rounded-md px-3 py-2" placeholder="60-min Session Price" type="number" value={price60} onChange={(e) => setPrice60(e.target.value === "" ? "" : Number(e.target.value))} />
            <input className="w-full border rounded-md px-3 py-2" placeholder="30-min Session Price" type="number" value={price30} onChange={(e) => setPrice30(e.target.value === "" ? "" : Number(e.target.value))} />
          </div>
          <input type="file" accept="image/*" onChange={(e) => setProfileImageFile(e.target.files?.[0] || null)} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={acceptTos} onChange={(e) => setAcceptTos(e.target.checked)} />
            I agree to the Terms of Service and Privacy Policy
          </label>
          <button
            onClick={onSaveProfile}
            disabled={savingProfile}
            className="bg-blue-600 text-white rounded-md px-4 py-2 disabled:opacity-50"
          >
            {savingProfile ? "Saving..." : "Finish onboarding"}
          </button>
        </div>
      )}

      {step === 3 && <div className="text-green-700">All set! Redirecting to your dashboard...</div>}
    </div>
  )
}


