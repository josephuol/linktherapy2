"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabaseBrowser } from "@/lib/supabase-browser"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
  const [interests, setInterests] = useState<string[]>([])
  const [interestsInput, setInterestsInput] = useState<string>("")
  const [gender, setGender] = useState<"male" | "female" | "other" | "">("")
  const [lgbtqFriendly, setLgbtqFriendly] = useState<boolean>(false)
  const [availableCities, setAvailableCities] = useState<string[]>([])
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const [locationInput, setLocationInput] = useState<string>("")
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

  useEffect(() => {
    // Load locations options from site content (match.quiz)
    ;(async () => {
      try {
        const { data } = await supabase
          .from("site_content")
          .select("content")
          .eq("key", "match.quiz")
          .maybeSingle()
        const cities = (data as any)?.content?.options?.locations?.cities
        if (Array.isArray(cities) && cities.length) setAvailableCities(cities)
        else setAvailableCities(["Beirut","Zahle","Jounieh/Kaslik","Antelias","Aley","Tripoli","Jbeil","Dbayeh","Ajaltoun"]) // fallback
      } catch {
        setAvailableCities(["Beirut","Zahle","Jounieh/Kaslik","Antelias","Aley","Tripoli","Jbeil","Dbayeh","Ajaltoun"]) // fallback
      }
    })()
  }, [supabase])

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
    if (!fullName || !title || !bioShort || !bioLong || !religion || !ageRange || yearsOfExperience === "" || price60 === "" || price30 === "" || !gender || selectedLocations.length === 0) {
      setError("Please fill all required fields")
      return
    }
    if (interests.length === 0) {
      setError("Please add at least one interest")
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
          interests,
          session_price_60_min: typeof price60 === "number" ? price60 : Number(price60 || 0),
          session_price_30_min: typeof price30 === "number" ? price30 : Number(price30 || 0),
          profile_image_url: profileImageUrl,
          gender,
          lgbtq_friendly: !!lgbtqFriendly,
          locations: selectedLocations,
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
  }, [fullName, title, bioShort, bioLong, religion, ageRange, yearsOfExperience, languages, price60, price30, profileImageFile, acceptTos, supabase, router, gender, lgbtqFriendly, selectedLocations])

  if (hydrating) return <div className="p-6">Preparing your account...</div>

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Therapist Onboarding</h1>
        <div className="text-sm text-gray-600">Step {step} of 3</div>
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Set your password</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">Set a secure password to protect your account.</p>
            <div>
              <Label htmlFor="password">New password</Label>
              <Input id="password" type="password" placeholder="Min 12 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="password2">Confirm password</Label>
              <Input id="password2" type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} />
            </div>
            <Button onClick={onSetPassword} disabled={savingPwd}>
              {savingPwd ? "Saving..." : "Continue"}
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Professional profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="fullName">Full name</Label>
                <Input id="fullName" placeholder="Your full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="title">Title</Label>
                <Input id="title" placeholder="e.g., Clinical Psychologist" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="bioShort">Short bio</Label>
                <Input id="bioShort" placeholder="One sentence about you" value={bioShort} onChange={(e) => setBioShort(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="bioLong">Long bio</Label>
                <Textarea id="bioLong" rows={5} value={bioLong} onChange={(e) => setBioLong(e.target.value)} />
              </div>
              <div>
                <Label>Religion</Label>
                <Select value={religion} onValueChange={setReligion}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select religion" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Christian">Christian</SelectItem>
                    <SelectItem value="Druze">Druze</SelectItem>
                    <SelectItem value="Sunni">Sunni</SelectItem>
                    <SelectItem value="Shiite">Shiite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Age range</Label>
                <Select value={ageRange} onValueChange={setAgeRange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select age range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="21-28">21-28</SelectItem>
                    <SelectItem value="29-36">29-36</SelectItem>
                    <SelectItem value="37-45">37-45</SelectItem>
                    <SelectItem value="46-55">46-55</SelectItem>
                    <SelectItem value="55+">55+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Gender</Label>
                <Select value={gender} onValueChange={(v) => setGender(v as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other / Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="years">Years of experience</Label>
                <Input id="years" type="number" placeholder="e.g., 5" value={yearsOfExperience} onChange={(e) => setYearsOfExperience(e.target.value === "" ? "" : Number(e.target.value))} />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="languages">Languages</Label>
                <Input id="languages" placeholder="Comma-separated (e.g., Arabic, English)" value={languages} onChange={(e) => setLanguages(e.target.value)} />
              </div>
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price60">60-min Session Price</Label>
                  <Input id="price60" type="number" placeholder="e.g., 100" value={price60} onChange={(e) => setPrice60(e.target.value === "" ? "" : Number(e.target.value))} />
                </div>
                <div>
                  <Label htmlFor="price30">30-min Session Price</Label>
                  <Input id="price30" type="number" placeholder="e.g., 60" value={price30} onChange={(e) => setPrice30(e.target.value === "" ? "" : Number(e.target.value))} />
                </div>
              </div>
              <div className="md:col-span-2">
                <Label>Interests</Label>
                <div className="flex flex-wrap gap-2 mb-2 mt-1">
                  {interests.map((it, idx) => (
                    <span key={`${it}-${idx}`} className="inline-flex items-center gap-2 bg-green-50 text-green-700 border border-green-200 rounded-full px-3 py-1 text-sm">
                      {it}
                      <button type="button" aria-label="Remove interest" onClick={() => setInterests((prev) => prev.filter((_, i) => i !== idx))} className="text-green-700/80 hover:text-green-800">×</button>
                    </span>
                  ))}
                </div>
                <Input
                  placeholder="Type an interest and press Enter"
                  value={interestsInput}
                  onChange={(e) => setInterestsInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault()
                      const val = interestsInput.trim()
                      if (val && !interests.includes(val)) setInterests((prev) => [...prev, val])
                      setInterestsInput("")
                    }
                    if (e.key === 'Backspace' && interestsInput === "" && interests.length > 0) {
                      setInterests((prev) => prev.slice(0, -1))
                    }
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">Required. Examples: Anxiety, CBT, Teens, Trauma</p>
              </div>
              <div className="md:col-span-2">
                <Label>Locations (cities you serve)</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {availableCities.map((city) => (
                    <label key={city} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedLocations.includes(city)}
                        onChange={(e) => {
                          const checked = e.target.checked
                          setSelectedLocations((prev) => checked ? Array.from(new Set([...prev, city])) : prev.filter((c) => c !== city))
                        }}
                      />
                      {city}
                    </label>
                  ))}
                </div>
                <div className="mt-3">
                  <Label htmlFor="locationInput">Add another city</Label>
                  <Input
                    id="locationInput"
                    placeholder="Type a city and press Enter"
                    value={locationInput}
                    onChange={(e) => setLocationInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        const val = locationInput.trim()
                        if (val && !selectedLocations.includes(val)) setSelectedLocations((prev) => [...prev, val])
                        setLocationInput("")
                      }
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Required. Select one or more cities, or add your own.</p>
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={lgbtqFriendly} onChange={(e) => setLgbtqFriendly(e.target.checked)} />
                  I have LGBTQ+ related experience
                </label>
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="avatar">Profile image</Label>
                <Input id="avatar" type="file" accept="image/*" onChange={(e) => setProfileImageFile(e.target.files?.[0] || null)} />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={acceptTos} onChange={(e) => setAcceptTos(e.target.checked)} />
                  I agree to the Terms of Service and Privacy Policy
                </label>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={onSaveProfile} disabled={savingProfile}>
                {savingProfile ? "Saving..." : "Finish onboarding"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardContent className="text-green-700 p-6">All set! Redirecting to your dashboard...</CardContent>
        </Card>
      )}
    </div>
  )
}


