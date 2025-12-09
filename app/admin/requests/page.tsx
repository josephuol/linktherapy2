"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabaseBrowser } from "@/lib/supabase-browser"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type Request = {
  id: string
  therapist_id: string | null
  client_name: string
  client_email: string
  client_phone: string | null
  message: string | null
  status: string
  assigned_therapist_id: string | null
  assigned_at: string | null
  created_at: string
}

type Therapist = { user_id: string; full_name: string }

export default function AdminRequestsPage() {
  const supabase = supabaseBrowser()
  const router = useRouter()
  const [requests, setRequests] = useState<Request[]>([])
  const [therapists, setTherapists] = useState<Therapist[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace("/admin/login"); return }
      const { data: prof } = await supabase.from("profiles").select("role").eq("user_id", user.id).single()
      if (prof?.role !== "admin") { router.replace("/admin/login"); return }
      const [{ data: reqs }, { data: t }] = await Promise.all([
        supabase.from("contact_requests").select("id, therapist_id, client_name, client_email, client_phone, message, status, assigned_therapist_id, assigned_at, created_at").order("created_at", { ascending: false }),
        supabase.from("therapists").select("user_id, full_name").order("full_name")
      ])
      setRequests((reqs as Request[]) || [])
      setTherapists((t as Therapist[]) || [])
      setLoading(false)
    }
    init()
  }, [])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return requests
    return requests.filter(r => r.client_name.toLowerCase().includes(term) || r.client_email.toLowerCase().includes(term) || (r.client_phone || "").toLowerCase().includes(term))
  }, [q, requests])

  const assign = async (id: string, therapist_id: string) => {
    await supabase.from("contact_requests").update({ assigned_therapist_id: therapist_id, assigned_at: new Date().toISOString(), status: "assigned" }).eq("id", id)
    setRequests(prev => prev.map(r => r.id === id ? { ...r, assigned_therapist_id: therapist_id, assigned_at: new Date().toISOString(), status: "assigned" } : r))
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-[#056DBA]">Loading…</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50/30 to-blue-100/20 py-10">
      <div className="container mx-auto px-4 max-w-7xl space-y-6">
        <h1 className="text-3xl md:text-4xl font-bold text-[#056DBA]">Contact Requests</h1>
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xl font-bold text-gray-900">Inbox</div>
              <Input className="w-full sm:w-auto" placeholder="Search name, email, phone" value={q} onChange={e => setQ(e.target.value)} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-gray-200 overflow-x-auto bg-white -mx-4 sm:mx-0 px-4 sm:px-0">
              <div className="min-w-[900px]">
                <Table className="text-xs sm:text-sm">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Client</TableHead>
                      <TableHead className="hidden sm:table-cell whitespace-nowrap">Contact</TableHead>
                      <TableHead className="hidden md:table-cell whitespace-nowrap">Message</TableHead>
                      <TableHead className="whitespace-nowrap">Status</TableHead>
                      <TableHead className="hidden sm:table-cell whitespace-nowrap">Assigned</TableHead>
                      <TableHead className="whitespace-nowrap">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium whitespace-nowrap">{r.client_name}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div>{r.client_email}</div>
                          <div className="text-gray-500 text-xs">{r.client_phone || "—"}</div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell max-w-[320px] truncate">{r.message || "—"}</TableCell>
                        <TableCell className="whitespace-nowrap"><span className="px-2 py-1 rounded-md text-xs bg-blue-50 text-[#056DBA] border border-blue-100">{r.status}</span></TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {r.assigned_therapist_id ? therapists.find(t => t.user_id === r.assigned_therapist_id)?.full_name || "—" : "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <select className="border rounded-md h-9 px-2" defaultValue={r.assigned_therapist_id || ""} onChange={(e) => assign(r.id, e.target.value)}>
                            <option value="">Assign…</option>
                            {therapists.map(t => <option key={t.user_id} value={t.user_id}>{t.full_name}</option>)}
                          </select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


