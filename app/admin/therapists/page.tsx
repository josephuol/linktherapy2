"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabaseBrowser } from "@/lib/supabase-browser"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type Therapist = { user_id: string; email?: string; full_name?: string | null; title?: string | null; status?: string | null }

export default function AdminTherapistsPage() {
  const supabase = supabaseBrowser()
  const router = useRouter()
  const [therapists, setTherapists] = useState<Therapist[]>([])
  const [loading, setLoading] = useState(true)
  const [inviting, setInviting] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace("/admin/login"); return }
      const { data: prof } = await supabase.from("profiles").select("role").eq("user_id", user.id).single()
      if (prof?.role !== "admin") { router.replace("/admin/login"); return }
      const { data } = await supabase.from("therapists").select("user_id, full_name, title, status").order("full_name")
      setTherapists((data as Therapist[]) || [])
      setLoading(false)
    }
    init()
  }, [])

  const inviteTherapist = async () => {
    if (!inviteEmail.trim()) return
    setInviting(true)
    try {
      const res = await fetch("/api/admin/invite-therapist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim() })
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || "Failed to send invite")
      }
      setInviteEmail("")
      const { data } = await supabase.from("therapists").select("user_id, full_name, title, status").order("full_name")
      setTherapists((data as Therapist[]) || [])
    } catch (e) {
      console.error(e)
    } finally {
      setInviting(false)
    }
  }

  const updateStatus = async (user_id: string, status: string) => {
    await supabase.from("therapists").update({ status }).eq("user_id", user_id)
    setTherapists(prev => prev.map(t => t.user_id === user_id ? { ...t, status } : t))
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-[#056DBA]">Loading…</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50/30 to-blue-100/20 py-10">
      <div className="container mx-auto px-4 max-w-7xl space-y-6">
        <h1 className="text-3xl md:text-4xl font-bold text-[#056DBA]">Therapists</h1>
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xl font-bold text-gray-900">Manage</div>
              <div className="flex gap-2">
                <Input placeholder="Therapist email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
                <Button disabled={inviting} className="bg-[#056DBA] hover:bg-[#045A99]" onClick={inviteTherapist}>{inviting ? "Inviting…" : "Invite"}</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {therapists.map((t) => (
                    <TableRow key={t.user_id}>
                      <TableCell className="font-medium">{t.full_name || "—"}</TableCell>
                      <TableCell>{t.title || "—"}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded-md text-xs bg-blue-50 text-[#056DBA] border border-blue-100">{t.status || "—"}</span>
                      </TableCell>
                      <TableCell className="space-x-2">
                        <Button size="sm" className="bg-[#056DBA] hover:bg-[#045A99]" onClick={() => updateStatus(t.user_id, 'active')}>Activate</Button>
                        <Button size="sm" variant="outline" onClick={() => updateStatus(t.user_id, 'warning')}>Warn</Button>
                        <Button size="sm" variant="destructive" onClick={() => updateStatus(t.user_id, 'suspended')}>Suspend</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


