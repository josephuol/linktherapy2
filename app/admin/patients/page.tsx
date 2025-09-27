"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabaseBrowser } from "@/lib/supabase-browser"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type Patient = {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  last_session_at: string | null
}

export default function AdminPatientsPage() {
  const supabase = supabaseBrowser()
  const router = useRouter()
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace("/admin/login")
        return
      }
      const { data: prof } = await supabase.from("profiles").select("role").eq("user_id", user.id).single()
      if (prof?.role !== "admin") {
        router.replace("/admin/login")
        return
      }
      const { data: sessions } = await supabase
        .from("sessions")
        .select("id, client_name, client_email, client_phone, session_date")
        .order("session_date", { ascending: false })

      // Build unique patients list, deduplicated by email (case-insensitive)
      const byEmail = new Map<string, Patient>()
      const noEmailPatients: Patient[] = []
      for (const s of (sessions as any[]) || []) {
        const emailKey = (s.client_email || "").trim().toLowerCase()
        const p: Patient = {
          id: emailKey ? emailKey : s.id,
          full_name: s.client_name || "Unknown",
          email: s.client_email || null,
          phone: s.client_phone || null,
          last_session_at: s.session_date || null,
        }
        if (emailKey) {
          if (!byEmail.has(emailKey)) {
            byEmail.set(emailKey, p)
          }
        } else {
          noEmailPatients.push(p)
        }
      }
      const aggregated = [...byEmail.values(), ...noEmailPatients]
      setPatients(aggregated)
      setLoading(false)
    }
    init()
  }, [])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return patients
    return patients.filter(p =>
      p.full_name.toLowerCase().includes(term) ||
      (p.email || "").toLowerCase().includes(term) ||
      (p.phone || "").toLowerCase().includes(term)
    )
  }, [q, patients])

  if (loading) return <div className="min-h-screen flex items-center justify-center text-[#056DBA]">Loading…</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50/30 to-blue-100/20 py-10">
      <div className="container mx-auto px-4 max-w-7xl space-y-6">
        <h1 className="text-3xl md:text-4xl font-bold text-[#056DBA]">Patients</h1>
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xl font-bold text-gray-900">Directory</div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Input className="flex-1" placeholder="Search name, email, phone" value={q} onChange={e => setQ(e.target.value)} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-gray-200 overflow-x-auto bg-white -mx-4 sm:mx-0 px-4 sm:px-0">
              <div className="min-w-[760px]">
              <Table className="text-xs sm:text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Name</TableHead>
                    <TableHead className="hidden sm:table-cell whitespace-nowrap">Email</TableHead>
                    <TableHead className="hidden sm:table-cell whitespace-nowrap">Phone</TableHead>
                    <TableHead className="hidden md:table-cell whitespace-nowrap">Last session</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium whitespace-nowrap">{p.full_name}</TableCell>
                      <TableCell className="hidden sm:table-cell">{p.email || "—"}</TableCell>
                      <TableCell className="hidden sm:table-cell">{p.phone || "—"}</TableCell>
                      <TableCell className="hidden md:table-cell">{p.last_session_at ? new Date(p.last_session_at).toLocaleString() : "—"}</TableCell>
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


