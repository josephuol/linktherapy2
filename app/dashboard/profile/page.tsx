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
  session_price_60_min: number | null
  session_price_30_min: number | null
  languages: string[] | null
}

export default function TherapistProfilePage() {
  const router = useRouter()
  const supabase = supabaseBrowser()
  const PROFILE_BUCKET = process.env.NEXT_PUBLIC_PROFILE_BUCKET || "profile-images"

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

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
    session_price_60_min: 0,
    session_price_30_min: 0,
    languages: [],
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
        .single()

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", session.user.id)
        .single()

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
          session_price_60_min: therapist.session_price_60_min ?? 0,
          session_price_30_min: therapist.session_price_30_min ?? 0,
          languages: therapist.languages ?? [],
        })
      }

      setLoading(false)
    }

    init()
  }, [])

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
        session_price_60_min: form.session_price_60_min ?? null,
        session_price_30_min: form.session_price_30_min ?? null,
        languages: form.languages && form.languages.length > 0 ? form.languages : [],
        updated_at: new Date().toISOString(),
      }

      const { error: terrErr } = await supabase
        .from("therapists")
        .update(updatePayload)
        .eq("user_id", userId)

      if (terrErr) throw terrErr

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
              <div>
                <Label htmlFor="religion">Religion</Label>
                <Input id="religion" value={form.religion ?? ""} onChange={handleChange} />
              </div>
              <div>
                <Label htmlFor="age_range">Age Range</Label>
                <Input id="age_range" value={form.age_range ?? ""} onChange={handleChange} placeholder="e.g. 25-40" />
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

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="session_price_60_min">60-min Session Price</Label>
                <Input id="session_price_60_min" type="number" value={form.session_price_60_min ?? 0} onChange={handleChange} />
              </div>
              <div>
                <Label htmlFor="session_price_30_min">30-min Session Price</Label>
                <Input id="session_price_30_min" type="number" value={form.session_price_30_min ?? 0} onChange={handleChange} />
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


