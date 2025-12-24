"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabaseBrowser } from "@/lib/supabase-browser"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

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

type PendingRequest = {
  id: string
  client_name: string
  client_email: string
  client_phone: string | null
  status: string
  created_at: string
  therapist_id: string | null
  therapist_name: string | null
  message: string | null
}

export default function AdminPatientsPage() {
  const supabase = supabaseBrowser()
  const router = useRouter()
  const [patients, setPatients] = useState<Patient[]>([])
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")
  const [activeTab, setActiveTab] = useState("active")

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

      // Fetch sessions for Active Patients
      const { data: sessions } = await supabase
        .from("sessions")
        .select("id, client_name, client_email, client_phone, session_date, therapist_id, therapist:therapists!sessions_therapist_id_fkey(user_id, full_name)")
        .order("session_date", { ascending: false })

      // Fetch contact_requests for Pending Requests
      const { data: contactRequests } = await supabase
        .from("contact_requests")
        .select("id, client_name, client_email, client_phone, status, created_at, therapist_id, message, therapist:therapists!contact_requests_therapist_id_fkey(user_id, full_name)")
        .in("status", ["new", "contacted"])
        .order("created_at", { ascending: false })

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

      // Process pending contact requests
      const pending = (contactRequests as any[] || []).map((cr: any) => ({
        id: cr.id,
        client_name: cr.client_name || "Unknown",
        client_email: cr.client_email || "",
        client_phone: cr.client_phone || null,
        status: cr.status || "new",
        created_at: cr.created_at || "",
        therapist_id: (cr.therapist && cr.therapist.user_id) || cr.therapist_id || null,
        therapist_name: (cr.therapist && cr.therapist.full_name) || null,
        message: cr.message || null,
      }))
      setPendingRequests(pending)

      setLoading(false)
    }
    init()
  }, [])

  const filteredPatients = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return patients
    return patients.filter(p =>
      p.full_name.toLowerCase().includes(term) ||
      (p.email || "").toLowerCase().includes(term) ||
      (p.phone || "").toLowerCase().includes(term)
    )
  }, [q, patients])

  const filteredPendingRequests = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return pendingRequests
    return pendingRequests.filter(pr =>
      pr.client_name.toLowerCase().includes(term) ||
      pr.client_email.toLowerCase().includes(term) ||
      (pr.client_phone || "").toLowerCase().includes(term) ||
      (pr.therapist_name || "").toLowerCase().includes(term)
    )
  }, [q, pendingRequests])

  if (loading) return <div className="min-h-screen flex items-center justify-center text-[#056DBA]">Loading…</div>

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      new: { label: "New", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
      contacted: { label: "Contacted", className: "bg-amber-100 text-amber-700 border-amber-200" },
    }
    const config = statusConfig[status] || { label: status, className: "bg-gray-100 text-gray-700 border-gray-200" }
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.className}`}>
        {config.label}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50/30 to-blue-100/20 py-10">
      <div className="container mx-auto px-4 max-w-7xl space-y-6">
        <h1 className="text-3xl md:text-4xl font-bold text-[#056DBA]">Patients</h1>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xl font-bold text-gray-900">Patient Management</div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Input
                  className="flex-1"
                  placeholder={activeTab === "active" ? "Search patients..." : "Search pending requests..."}
                  value={q}
                  onChange={e => setQ(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
                <TabsTrigger value="active" className="text-sm">
                  Active Patients <span className="ml-1.5 text-xs">({patients.length})</span>
                </TabsTrigger>
                <TabsTrigger value="pending" className="text-sm">
                  Pending Requests <span className="ml-1.5 text-xs">({pendingRequests.length})</span>
                </TabsTrigger>
              </TabsList>

              {/* Active Patients Tab */}
              <TabsContent value="active" className="space-y-4">
                {/* Mobile Card View */}
                <div className="lg:hidden space-y-3">
                  {filteredPatients.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No active patients found</div>
                  ) : (
                    filteredPatients.map(p => (
                      <div key={p.id} className="border border-gray-200 rounded-lg p-4 bg-white space-y-2 shadow-sm hover:shadow-md transition-shadow">
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
                    ))
                  )}
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block rounded-lg border border-gray-200 overflow-hidden bg-white shadow-sm">
                  {filteredPatients.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">No active patients found</div>
                  ) : (
                    <Table className="text-sm">
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="whitespace-nowrap font-semibold">Name</TableHead>
                          <TableHead className="whitespace-nowrap font-semibold">Email</TableHead>
                          <TableHead className="whitespace-nowrap font-semibold">Phone</TableHead>
                          <TableHead className="whitespace-nowrap text-center font-semibold">Total Sessions</TableHead>
                          <TableHead className="whitespace-nowrap font-semibold">Last Appointment</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPatients.map(p => (
                          <TableRow key={p.id} className="hover:bg-gray-50/50 transition-colors">
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
                                  <div className="text-xs text-gray-500">{new Date(p.last_session_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
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
                  )}
                </div>
              </TabsContent>

              {/* Pending Requests Tab */}
              <TabsContent value="pending" className="space-y-4">
                {/* Mobile Card View */}
                <div className="lg:hidden space-y-3">
                  {filteredPendingRequests.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No pending requests found</div>
                  ) : (
                    filteredPendingRequests.map(pr => (
                      <div key={pr.id} className="border border-gray-200 rounded-lg p-4 bg-white space-y-2 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="font-semibold text-gray-900 text-base">{pr.client_name}</div>
                          {getStatusBadge(pr.status)}
                        </div>

                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 font-medium w-20">Email:</span>
                            <span className="text-gray-700">{pr.client_email}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 font-medium w-20">Phone:</span>
                            <span className="text-gray-700">{pr.client_phone || "—"}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-gray-500 font-medium w-20">Therapist:</span>
                            <div className="flex-1">
                              {pr.therapist_id && pr.therapist_name ? (
                                <button
                                  className="text-[#056DBA] hover:underline text-xs"
                                  onClick={() => router.push(`/admin/therapists/${pr.therapist_id}`)}
                                >
                                  {pr.therapist_name}
                                </button>
                              ) : (
                                <span className="text-gray-700">—</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-gray-500 font-medium w-20">Submitted:</span>
                            <span className="text-gray-700 text-xs">{new Date(pr.created_at).toLocaleDateString()}</span>
                          </div>
                          {pr.message && (
                            <div className="pt-2 mt-2 border-t border-gray-100">
                              <span className="text-gray-500 font-medium text-xs">Message:</span>
                              <p className="text-gray-700 text-xs mt-1 line-clamp-2">{pr.message}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block rounded-lg border border-gray-200 overflow-hidden bg-white shadow-sm">
                  {filteredPendingRequests.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">No pending requests found</div>
                  ) : (
                    <Table className="text-sm">
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="whitespace-nowrap font-semibold">Status</TableHead>
                          <TableHead className="whitespace-nowrap font-semibold">Client Name</TableHead>
                          <TableHead className="whitespace-nowrap font-semibold">Email</TableHead>
                          <TableHead className="whitespace-nowrap font-semibold">Phone</TableHead>
                          <TableHead className="whitespace-nowrap font-semibold">Therapist</TableHead>
                          <TableHead className="whitespace-nowrap font-semibold">Submitted</TableHead>
                          <TableHead className="whitespace-nowrap font-semibold">Message</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPendingRequests.map(pr => (
                          <TableRow key={pr.id} className="hover:bg-gray-50/50 transition-colors">
                            <TableCell>{getStatusBadge(pr.status)}</TableCell>
                            <TableCell className="font-medium whitespace-nowrap">{pr.client_name}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{pr.client_email}</TableCell>
                            <TableCell className="whitespace-nowrap">{pr.client_phone || "—"}</TableCell>
                            <TableCell>
                              {pr.therapist_id && pr.therapist_name ? (
                                <button
                                  className="text-[#056DBA] hover:underline text-xs"
                                  onClick={() => router.push(`/admin/therapists/${pr.therapist_id}`)}
                                >
                                  {pr.therapist_name}
                                </button>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="text-xs">{new Date(pr.created_at).toLocaleDateString()}</div>
                              <div className="text-xs text-gray-500">{new Date(pr.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            </TableCell>
                            <TableCell className="max-w-[250px]">
                              {pr.message ? (
                                <div className="text-xs text-gray-700 line-clamp-2" title={pr.message}>
                                  {pr.message}
                                </div>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


