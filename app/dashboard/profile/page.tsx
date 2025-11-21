"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { supabaseBrowser } from "@/lib/supabase-browser"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Therapist = {
  user_id: string
  full_name: string | null
  title: string | null
  profile_image_url: string | null
  bio_short: string | null
  bio_long: string | null
  religion: string | null
  age_range: string | null
  years_of_experience: number | null
  lgbtq_friendly: boolean | null
  session_price_45_min: number | null
  languages: string[] | null
  interests?: string[] | null
}

export default function TherapistProfilePage() {
  const router = useRouter()
  const supabase = supabaseBrowser()
  const PROFILE_BUCKET = process.env.NEXT_PUBLIC_PROFILE_BUCKET || "profile-images"

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [availableCities, setAvailableCities] = useState<string[]>([])
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const [locationInput, setLocationInput] = useState<string>("")
  const [interestsInput, setInterestsInput] = useState<string>("")

  const [form, setForm] = useState<Therapist>({
    user_id: "",
    full_name: "",
    title: "",
    profile_image_url: "",
    bio_short: "",
    bio_long: "",
    religion: "",
    age_range: "",
    years_of_experience: 0,
    lgbtq_friendly: false,
    session_price_45_min: 0,
    languages: [],
    interests: [],
  })

  const languagesText = useMemo(
    () => (form.languages && form.languages.length > 0 ? form.languages.join(", ") : ""),
    [form.languages]
  )

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace("/login")
        return
      }
      setUserId(session.user.id)

      // Load therapist profile
      const { data: therapist } = await supabase
        .from("therapists")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle()

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", session.user.id)
        .maybeSingle()

      if (therapist) {
        setForm({
          user_id: therapist.user_id,
          full_name: therapist.full_name ?? profile?.full_name ?? "",
          title: therapist.title ?? "",
          profile_image_url: therapist.profile_image_url ?? "",
          bio_short: therapist.bio_short ?? "",
          bio_long: therapist.bio_long ?? "",
          religion: therapist.religion ?? "",
          age_range: therapist.age_range ?? "",
          years_of_experience: therapist.years_of_experience ?? 0,
          lgbtq_friendly: therapist.lgbtq_friendly ?? false,
          session_price_45_min: (therapist as any).session_price_45_min ?? 0,
          languages: therapist.languages ?? [],
          interests: therapist.interests ?? [],
        })

        // Load existing locations for therapist
        const { data: links } = await supabase
          .from("therapist_locations")
          .select("location_id")
          .eq("therapist_id", session.user.id)
        const locationIds = (links || []).map((r: any) => r.location_id).filter(Boolean)
        if (locationIds.length > 0) {
          const { data: locs } = await supabase
            .from("locations")
            .select("id,name")
            .in("id", locationIds)
          setSelectedLocations((locs || []).map((l: any) => l.name).filter(Boolean))
        } else {
          setSelectedLocations([])
        }
      }

      setLoading(false)
    }

    init()
  }, [])

  // Load available cities for selection (with fallback)
  useEffect(() => {
    ;(async () => {
      try {
        const { data } = await supabase
          .from("site_content")
          .select("content")
          .eq("key", "match.quiz")
          .maybeSingle()
        const cities = (data as any)?.content?.options?.locations?.cities
        if (Array.isArray(cities) && cities.length) setAvailableCities(cities)
        else setAvailableCities(["Beirut","Zahle","Jounieh/Kaslik","Antelias","Aley","Tripoli","Jbeil","Dbayeh","Ajaltoun"])
      } catch {
        setAvailableCities(["Beirut","Zahle","Jounieh/Kaslik","Antelias","Aley","Tripoli","Jbeil","Dbayeh","Ajaltoun"])
      }
    })()
  }, [supabase])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { id, value, type, checked } = e.target as HTMLInputElement
    setForm((prev) => ({
      ...prev,
      [id]: type === "checkbox" ? checked : value,
    }))
  }

  const handleLanguagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const arr = value
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
    setForm((prev) => ({ ...prev, languages: arr }))
  }

  const handleUpload = async (file: File) => {
    if (!userId) return
    setUploading(true)
    try {
      const fileExt = file.name.split(".").pop()
      const path = `${userId}/${Date.now()}.${fileExt}`
      const { error: upErr } = await supabase.storage
        .from(PROFILE_BUCKET)
        .upload(path, file, {
          cacheControl: "3600",
          upsert: true,
        })
      if (upErr) throw upErr

      const { data } = supabase.storage.from(PROFILE_BUCKET).getPublicUrl(path)
      if (data?.publicUrl) {
        setForm((prev) => ({ ...prev, profile_image_url: data.publicUrl }))
        toast({ title: "Uploaded", description: "Profile image updated" })
      }
    } catch (err: any) {
      toast({ title: "Upload failed", description: (err?.message || "Could not upload image") + ` (bucket: ${PROFILE_BUCKET})`, variant: "destructive" })
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    if (!userId) return
    setSaving(true)
    try {
      // Enforce age_range selection
      if (!form.age_range) {
        toast({ title: "Age range required", description: "Please select your age range.", variant: "destructive" })
        setSaving(false)
        return
      }
      // Enforce at most 2 locations selected
      if (selectedLocations.length > 2) {
        toast({ title: "Too many locations", description: "You can select up to 2 locations.", variant: "destructive" })
        setSaving(false)
        return
      }
      const updatePayload = {
        full_name: form.full_name || null,
        title: form.title || null,
        profile_image_url: form.profile_image_url || null,
        bio_short: form.bio_short || null,
        bio_long: form.bio_long || null,
        religion: form.religion || null,
        age_range: form.age_range || null,
        years_of_experience: form.years_of_experience ?? null,
        lgbtq_friendly: !!form.lgbtq_friendly,
        session_price_45_min: (form as any).session_price_45_min ?? null,
        languages: form.languages && form.languages.length > 0 ? form.languages : [],
        interests: form.interests && form.interests.length > 0 ? form.interests : [],
        updated_at: new Date().toISOString(),
      }

      const { error: terrErr } = await supabase
        .from("therapists")
        .update(updatePayload)
        .eq("user_id", userId)

      if (terrErr) throw terrErr

      // Update therapist_locations links based on selectedLocations
      await supabase
        .from("therapist_locations")
        .delete()
        .eq("therapist_id", userId)

      const locationIds: string[] = []
      for (const locNameRaw of selectedLocations) {
        const name = (locNameRaw || "").trim()
        if (!name) continue
        const { data: existing, error: findErr } = await supabase
          .from("locations")
          .select("id")
          .eq("name", name)
          .maybeSingle()
        if (findErr) throw findErr
        if (existing?.id) {
          locationIds.push(existing.id)
        } else {
          const { data: inserted, error: insErr } = await supabase
            .from("locations")
            .insert({ name })
            .select("id")
            .single()
          if (insErr) throw insErr
          if (inserted?.id) locationIds.push(inserted.id)
        }
      }

      if (locationIds.length > 0) {
        const rows = locationIds.map((location_id) => ({ therapist_id: userId, location_id }))
        const { error: linkErr } = await supabase.from("therapist_locations").insert(rows)
        if (linkErr) throw linkErr
      }

      // Keep profiles.full_name in sync for header/welcome text
      if (form.full_name) {
        await supabase
          .from("profiles")
          .update({ full_name: form.full_name })
          .eq("user_id", userId)
      }

      toast({ title: "Saved", description: "Your profile has been updated." })
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message || "Could not save profile", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-[#056DBA]">Loading…</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">My Profile</h1>
        <p className="text-gray-500 mt-1">Update your information, rates, and profile picture.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Avatar & Basic */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Profile Picture</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4">
              <div className="w-28 h-28 rounded-full overflow-hidden bg-gray-100">
                {form.profile_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.profile_image_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No image</div>
                )}
              </div>
              <div className="md:col-span-2">
                <Label>Locations (cities you serve)</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {availableCities.map((city) => (
                    <label key={city} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedLocations.includes(city)}
                        disabled={!selectedLocations.includes(city) && selectedLocations.length >= 2}
                        onChange={(e) => {
                          const checked = e.target.checked
                          setSelectedLocations((prev) => checked ? Array.from(new Set([...prev, city])).slice(0, 2) : prev.filter((c) => c !== city))
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
                    disabled={selectedLocations.length >= 2}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        const val = (locationInput || '').trim()
                        if (val && !selectedLocations.includes(val) && selectedLocations.length < 2) setSelectedLocations((prev) => [...prev, val])
                        setLocationInput("")
                      }
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">You can select up to 2 locations.</p>
                {selectedLocations.length >= 2 && (
                  <p className="text-xs text-amber-600 mt-1">You can select up to 2 locations.</p>
                )}
              </div>

              <div className="w-full space-y-3">
                <div>
                  <Label htmlFor="profile_image_url">Image URL</Label>
                  <Input id="profile_image_url" value={form.profile_image_url ?? ""} onChange={handleChange} placeholder="https://…" />
                </div>
                <div>
                  <Label>Upload File</Label>
                  <Input
                    id="file"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleUpload(file)
                    }}
                    disabled={uploading}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right: Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Therapist Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="full_name">Full Name</Label>
                <Input id="full_name" value={form.full_name ?? ""} onChange={handleChange} />
              </div>
              <div>
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={form.title ?? ""} onChange={handleChange} placeholder="e.g. Clinical Psychologist" />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="bio_short">Short Bio</Label>
                <Input id="bio_short" value={form.bio_short ?? ""} onChange={handleChange} placeholder="One sentence about you" />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="bio_long">Long Bio</Label>
                <Textarea id="bio_long" value={form.bio_long ?? ""} onChange={handleChange} rows={5} />
              </div>
              <div className="md:col-span-2">
                <Label className="mb-1 block">Interests</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(form.interests || []).map((it, idx) => (
                    <span key={`${it}-${idx}`} className="inline-flex items-center gap-2 bg-green-50 text-green-700 border border-green-200 rounded-full px-3 py-1 text-sm">
                      {it}
                      <button type="button" aria-label="Remove interest" onClick={() => setForm((prev) => ({ ...prev, interests: (prev.interests || []).filter((_, i) => i !== idx) }))} className="text-green-700/80 hover:text-green-800">×</button>
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Type an interest and press Enter"
                    value={interestsInput}
                    onChange={(e) => setInterestsInput(e.target.value)}
                    onKeyDown={(e: any) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        const val = interestsInput.trim()
                        const exists = (form.interests || []).some((i) => i.toLowerCase() === val.toLowerCase())
                        if (val && !exists) {
                          setForm((prev) => ({ ...prev, interests: [...(prev.interests || []), val] }))
                        }
                        setInterestsInput('')
                      }
                      if (e.key === 'Backspace' && interestsInput === '' && (form.interests || []).length > 0) {
                        setForm((prev) => ({ ...prev, interests: (prev.interests || []).slice(0, -1) }))
                      }
                    }}
                  />
                  <Button
                    type="button"
                    aria-label="Add interest"
                    onClick={() => {
                      const val = interestsInput.trim()
                      const exists = (form.interests || []).some((i) => i.toLowerCase() === val.toLowerCase())
                      if (val && !exists) setForm((prev) => ({ ...prev, interests: [...(prev.interests || []), val] }))
                      setInterestsInput('')
                    }}
                  >
                    +
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Enter interests from most to least important. The first 3 will appear on your profile card. Examples: Anxiety, CBT, Teens, Trauma</p>
              </div>
              <div>
                <Label htmlFor="religion">Religion</Label>
                <Select
                  value={form.religion ?? ""}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, religion: value || null }))}
                >
                  <SelectTrigger id="religion">
                    <SelectValue placeholder="Select religion" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Christian">Christian</SelectItem>
                    <SelectItem value="Druze">Druze</SelectItem>
                    <SelectItem value="Sunni">Sunni</SelectItem>
                    <SelectItem value="Shiite">Shiite</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="age_range">Age Range</Label>
                <Select
                  value={form.age_range ?? ""}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, age_range: value }))}
                >
                  <SelectTrigger id="age_range">
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
                <Label htmlFor="years_of_experience">Years of Experience</Label>
                <Input id="years_of_experience" type="number" value={form.years_of_experience ?? 0} onChange={handleChange} />
              </div>
              <div>
                <Label htmlFor="languages">Languages (comma separated)</Label>
                <Input id="languages" value={languagesText} onChange={handleLanguagesChange} placeholder="Arabic, English" />
              </div>
            </div>

            {/*
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="session_price_60_min">60-min Session Price</Label>
                <Input id="session_price_60_min" type="number" />
              </div>
              <div>
                <Label htmlFor="session_price_30_min">30-min Session Price</Label>
                <Input id="session_price_30_min" type="number" />
              </div>
            </div>
            */}
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="session_price_45_min">45-min Session Price</Label>
                <Input id="session_price_45_min" type="number" value={(form as any).session_price_45_min ?? 0} onChange={handleChange} />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={handleSave} disabled={saving} className="bg-[#056DBA] hover:bg-[#045A99] text-white">
                {saving ? "Saving…" : "Save Profile"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


