"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabaseBrowser } from "@/lib/supabase-browser"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export default function TherapistProfilePage() {
  const supabase = supabaseBrowser()
  const router = useRouter()
  const [form, setForm] = useState<any>({})
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.replace("/login")
      setUserId(session.user.id)
      const { data } = await supabase.from("therapists").select("*").eq("user_id", session.user.id).single()
      setForm(data || {})
    })()
  }, [])

  const save = async () => {
    if (!userId) return
    const payload = { ...form, user_id: userId }
    const { error } = await supabase.from("therapists").upsert(payload, { onConflict: "user_id" })
    if (!error) router.push("/dashboard")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50/30 to-blue-100/20 py-10">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-bold mb-6 text-[#056DBA]">Edit My Profile</h1>
        <Card>
          <CardHeader>
            <div className="text-xl font-bold text-gray-900">Public Profile</div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Full Name</label>
                <Input value={form.full_name || ""} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium">Short Bio</label>
                <Textarea rows={3} value={form.bio_short || ""} onChange={(e) => setForm({ ...form, bio_short: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium">Long Bio</label>
                <Textarea rows={6} value={form.bio_long || ""} onChange={(e) => setForm({ ...form, bio_long: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Years of Experience</label>
                <Input type="number" value={form.years_of_experience || 0} onChange={(e) => setForm({ ...form, years_of_experience: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-sm font-medium">60-min Price</label>
                <Input type="number" value={form.session_price_60_min || 0} onChange={(e) => setForm({ ...form, session_price_60_min: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-sm font-medium">30-min Price</label>
                <Input type="number" value={form.session_price_30_min || 0} onChange={(e) => setForm({ ...form, session_price_30_min: Number(e.target.value) })} />
              </div>
            </div>
            <Button className="mt-6 bg-[#056DBA] hover:bg-[#045A99] text-white" onClick={save}>Save</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


