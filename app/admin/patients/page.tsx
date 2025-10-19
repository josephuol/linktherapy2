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
  last_therapist_id: string | null
  last_therapist_name: string | null
  total_sessions: number
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
        .select("id, client_name, client_email, client_phone, session_date, therapist_id, therapist:therapists!sessions_therapist_id_fkey(user_id, full_name)")
        .order("session_date", { ascending: false })

      // Build unique patients list with session counts, deduplicated by email (case-insensitive)
      const byEmail = new Map<string, { patient: Patient; sessions: any[] }>()
      const noEmailPatients: { patient: Patient; sessions: any[] }[] = []
      
      for (const s of (sessions as any[]) || []) {
        const emailKey = (s.client_email || "").trim().toLowerCase()
        const therapistName = (s.therapist && (s.therapist as any).full_name) || null
        
        if (emailKey) {
          if (!byEmail.has(emailKey)) {
            const p: Patient = {
              id: emailKey,
              full_name: s.client_name || "Unknown",
              email: s.client_email || null,
              phone: s.client_phone || null,
              last_session_at: s.session_date || null,
              last_therapist_id: (s.therapist && (s.therapist as any).user_id) || s.therapist_id || null,
              last_therapist_name: therapistName,
              total_sessions: 0,
            }
            byEmail.set(emailKey, { patient: p, sessions: [s] })
          } else {
            byEmail.get(emailKey)!.sessions.push(s)
          }
        } else {
          const p: Patient = {
            id: s.id,
            full_name: s.client_name || "Unknown",
            email: s.client_email || null,
            phone: s.client_phone || null,
            last_session_at: s.session_date || null,
            last_therapist_id: (s.therapist && (s.therapist as any).user_id) || s.therapist_id || null,
            last_therapist_name: therapistName,
            total_sessions: 1,
          }
          noEmailPatients.push({ patient: p, sessions: [s] })
        }
      }
      
      // Calculate total sessions for each patient
      const aggregated = [...byEmail.values()].map(({ patient, sessions }) => {
        patient.total_sessions = sessions.length
        return patient
      }).concat(noEmailPatients.map(({ patient }) => patient))
      // Enrich with most recent phone from contact_requests (exact email match, prefer latest)
      const emails = aggregated.map(p => p.email).filter((e): e is string => !!e)
      if (emails.length > 0) {
        const { data: crs } = await supabase
          .from("contact_requests")
          .select("client_email, client_phone, created_at")
          .in("client_email", emails)
          .order("created_at", { ascending: false })

        const latestByEmail = new Map<string, string>()
        for (const cr of (crs as any[]) || []) {
          if (!cr.client_phone) continue
          if (!latestByEmail.has(cr.client_email)) {
            latestByEmail.set(cr.client_email, cr.client_phone)
          }
        }

        for (const p of aggregated) {
          if (p.email && latestByEmail.has(p.email)) {
            p.phone = latestByEmail.get(p.email) || p.phone
          }
        }
      }
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
            {/* Mobile Card View */}
            <div className="lg:hidden space-y-3">
              {filtered.map(p => (
                <div key={p.id} className="border border-gray-200 rounded-lg p-4 bg-white space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="font-semibold text-gray-900 text-base">{p.full_name}</div>
                    <div className="text-sm font-medium bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      {p.total_sessions} {p.total_sessions === 1 ? 'session' : 'sessions'}
                    </div>
                  </div>
                  
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 font-medium w-20">Email:</span>
                      <span className="text-gray-700">{p.email || "—"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 font-medium w-20">Phone:</span>
                      <span className="text-gray-700">{p.phone || "—"}</span>
                    </div>
                    {p.last_session_at && (
                      <div className="flex items-start gap-2">
                        <span className="text-gray-500 font-medium w-20">Last Visit:</span>
                        <div className="flex-1">
                          <div className="text-gray-700">{new Date(p.last_session_at).toLocaleDateString()}</div>
                          {p.last_therapist_name && (
                            <button
                              className="text-[#056DBA] hover:underline text-xs"
                              onClick={() => router.push(`/admin/therapists/${p.last_therapist_id}`)}
                            >
                              with {p.last_therapist_name}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block rounded-lg border border-gray-200 overflow-x-auto bg-white">
              <Table className="text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Name</TableHead>
                    <TableHead className="whitespace-nowrap">Email</TableHead>
                    <TableHead className="whitespace-nowrap">Phone</TableHead>
                    <TableHead className="whitespace-nowrap text-center">Total Sessions</TableHead>
                    <TableHead className="whitespace-nowrap">Last Appointment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium whitespace-nowrap">{p.full_name}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{p.email || "—"}</TableCell>
                      <TableCell className="whitespace-nowrap">{p.phone || "—"}</TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center justify-center bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold">
                          {p.total_sessions}
                        </span>
                      </TableCell>
                      <TableCell>
                        {p.last_session_at ? (
                          <div>
                            <div className="text-xs">{new Date(p.last_session_at).toLocaleDateString()}</div>
                            <div className="text-xs">{new Date(p.last_session_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            {p.last_therapist_id && p.last_therapist_name ? (
                              <button
                                className="text-[#056DBA] hover:underline text-xs mt-1"
                                onClick={() => router.push(`/admin/therapists/${p.last_therapist_id}`)}
                              >
                                with {p.last_therapist_name}
                              </button>
                            ) : null}
                          </div>
                        ) : (
                          "—"
                        )}
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


