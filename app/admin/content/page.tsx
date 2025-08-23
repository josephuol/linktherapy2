"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabaseBrowser } from "@/lib/supabase-browser"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"

type Content = { key: string; title: string | null; content: any }

const DEFAULT_KEYS = [
  { key: "home.hero", title: "Homepage Hero" },
  { key: "directory.intro", title: "Therapist Directory Intro" },
  { key: "blog.settings", title: "Blog Settings" },
]

export default function AdminContentPage() {
  const supabase = supabaseBrowser()
  const router = useRouter()
  const [items, setItems] = useState<Record<string, Content>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace("/admin/login"); return }
      const { data: prof } = await supabase.from("profiles").select("role").eq("user_id", user.id).single()
      if (prof?.role !== "admin") { router.replace("/admin/login"); return }
      const { data } = await supabase.from("site_content").select("key, title, content")
      const map: Record<string, Content> = {}
      ;(data || []).forEach((row: any) => { map[row.key] = row })
      DEFAULT_KEYS.forEach(d => { if (!map[d.key]) map[d.key] = { key: d.key, title: d.title, content: {} } })
      setItems(map)
      setLoading(false)
    }
    init()
  }, [])

  const save = async (k: string) => {
    const it = items[k]
    await supabase.from("site_content").upsert({ key: it.key, title: it.title, content: it.content, updated_at: new Date().toISOString() })
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-[#056DBA]">Loading…</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50/30 to-blue-100/20 py-10">
      <div className="container mx-auto px-4 max-w-4xl space-y-6">
        <h1 className="text-3xl md:text-4xl font-bold text-[#056DBA]">Content</h1>
        {DEFAULT_KEYS.map(d => (
          <Card key={d.key}>
            <CardHeader>
              <div className="text-xl font-bold text-gray-900">{items[d.key]?.title || d.title}</div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input value={items[d.key]?.title || ""} onChange={e => setItems(prev => ({ ...prev, [d.key]: { ...prev[d.key], title: e.target.value } }))} placeholder="Section title" />
              <Textarea rows={8} value={JSON.stringify(items[d.key]?.content || {}, null, 2)} onChange={e => setItems(prev => ({ ...prev, [d.key]: { ...prev[d.key], content: safeParseJson(e.target.value) } }))} />
              <div className="flex justify-end">
                <Button className="bg-[#056DBA] hover:bg-[#045A99]" onClick={() => save(d.key)}>Save</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function safeParseJson(str: string) {
  try { return JSON.parse(str) } catch { return {} }
}


