"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabaseBrowser } from "@/lib/supabase-browser"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { CheckCircle } from "lucide-react"

type ContactRequestRow = {
  id: string
  client_name: string
  client_email: string
  client_phone: string | null
  message: string | null
  status: 'new' | 'contacted' | 'accepted' | 'rejected' | 'scheduled' | 'closed'
  rejection_reason: string | null
  response_time_hours: number | null
  responded_at: string | null
  session_id: string | null
  created_at: string
  therapist: {
    user_id: string
    full_name: string
  } | null
}

export default function AdminPatientsPage() {
  const supabase = supabaseBrowser()
  const router = useRouter()
  const [allRequests, setAllRequests] = useState<ContactRequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")
  const [activeTab, setActiveTab] = useState("all")

  useEffect(() => {
    const init = async () => {
      try {
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

        // Fetch contact requests and therapists separately, then join client-side
        const [
          { data: requests, error: requestsError },
          { data: therapists, error: therapistsError }
        ] = await Promise.all([
          supabase
            .from("contact_requests")
            .select("id, client_name, client_email, client_phone, message, status, rejection_reason, response_time_hours, responded_at, session_id, created_at, therapist_id")
            .order("created_at", { ascending: false }),
          supabase
            .from("therapists")
            .select("user_id, full_name")
        ])

        if (requestsError) {
          console.error("Error fetching contact requests:", requestsError)
        }
        if (therapistsError) {
          console.error("Error fetching therapists:", therapistsError)
        }

        // Create a map of therapist_id -> therapist for efficient lookup
        const therapistMap = new Map<string, { user_id: string; full_name: string }>()
        for (const t of (therapists as any[]) || []) {
          therapistMap.set(t.user_id, t)
        }

        // Join contact requests with therapists
        const requestsWithTherapist = ((requests as any[]) || []).map(req => ({
          ...req,
          therapist: req.therapist_id ? therapistMap.get(req.therapist_id) || null : null
        }))

        setAllRequests(requestsWithTherapist)
      } catch (error) {
        console.error("Error loading patients page:", error)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const pendingRequests = useMemo(() =>
    allRequests.filter(r => r.status === 'new' || r.status === 'contacted'),
    [allRequests]
  )

  const filteredRequests = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return allRequests
    return allRequests.filter(r =>
      r.client_name.toLowerCase().includes(term) ||
      r.client_email.toLowerCase().includes(term) ||
      (r.client_phone || "").toLowerCase().includes(term) ||
      (r.therapist?.full_name || "").toLowerCase().includes(term)
    )
  }, [q, allRequests])

  const filteredPendingRequests = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return pendingRequests
    return pendingRequests.filter(r =>
      r.client_name.toLowerCase().includes(term) ||
      r.client_email.toLowerCase().includes(term) ||
      (r.client_phone || "").toLowerCase().includes(term) ||
      (r.therapist?.full_name || "").toLowerCase().includes(term)
    )
  }, [q, pendingRequests])

  if (loading) return <div className="min-h-screen flex items-center justify-center text-[#056DBA]">Loading…</div>

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      new: {
        label: "New",
        className: "bg-blue-100 text-blue-800 border-blue-200"
      },
      contacted: {
        label: "Contacted",
        className: "bg-yellow-100 text-yellow-800 border-yellow-200"
      },
      accepted: {
        label: "Accepted",
        className: "bg-green-100 text-green-800 border-green-200"
      },
      rejected: {
        label: "Rejected",
        className: "bg-red-100 text-red-800 border-red-200"
      },
      scheduled: {
        label: "Scheduled",
        className: "bg-purple-100 text-purple-800 border-purple-200"
      },
      closed: {
        label: "Closed",
        className: "bg-gray-100 text-gray-800 border-gray-200"
      }
    }

    const config = statusConfig[status] || statusConfig.new
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
                  placeholder={activeTab === "all" ? "Search requests..." : "Search pending requests..."}
                  value={q}
                  onChange={e => setQ(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
                <TabsTrigger value="all" className="text-sm">
                  All Requests <span className="ml-1.5 text-xs">({allRequests.length})</span>
                </TabsTrigger>
                <TabsTrigger value="pending" className="text-sm">
                  Pending Requests <span className="ml-1.5 text-xs">({pendingRequests.length})</span>
                </TabsTrigger>
              </TabsList>

              {/* All Requests Tab */}
              <TabsContent value="all" className="space-y-4">
                {/* Mobile Card View */}
                <div className="lg:hidden space-y-3">
                  {filteredRequests.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No requests found</div>
                  ) : (
                    filteredRequests.map(req => (
                      <div key={req.id} className="border border-gray-200 rounded-lg p-4 bg-white space-y-2 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="font-semibold text-gray-900 text-base">{req.client_name}</div>
                          {getStatusBadge(req.status)}
                        </div>

                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 font-medium w-20">Email:</span>
                            <span className="text-gray-700">{req.client_email}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 font-medium w-20">Phone:</span>
                            <span className="text-gray-700">{req.client_phone || "—"}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-gray-500 font-medium w-20">Therapist:</span>
                            <div className="flex-1">
                              {req.therapist ? (
                                <button
                                  className="text-[#056DBA] hover:underline text-xs"
                                  onClick={() => router.push(`/admin/therapists/${req.therapist!.user_id}`)}
                                >
                                  {req.therapist.full_name}
                                </button>
                              ) : (
                                <span className="text-gray-700">—</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 font-medium w-20">Submitted:</span>
                            <span className="text-gray-700 text-xs">{new Date(req.created_at).toLocaleDateString()}</span>
                          </div>
                          {req.session_id && (
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="text-gray-700 text-xs">Session created</span>
                            </div>
                          )}
                          {req.message && (
                            <div className="pt-2 mt-2 border-t border-gray-100">
                              <span className="text-gray-500 font-medium text-xs">Message:</span>
                              <p className="text-gray-700 text-xs mt-1 line-clamp-2">{req.message}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block rounded-lg border border-gray-200 overflow-hidden bg-white shadow-sm">
                  {filteredRequests.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">No requests found</div>
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
                          <TableHead className="whitespace-nowrap text-center font-semibold">Session</TableHead>
                          <TableHead className="whitespace-nowrap font-semibold">Message</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRequests.map(req => (
                          <TableRow key={req.id} className="hover:bg-gray-50/50 transition-colors">
                            <TableCell>{getStatusBadge(req.status)}</TableCell>
                            <TableCell className="font-medium whitespace-nowrap">{req.client_name}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{req.client_email}</TableCell>
                            <TableCell className="whitespace-nowrap">{req.client_phone || "—"}</TableCell>
                            <TableCell>
                              {req.therapist ? (
                                <button
                                  className="text-[#056DBA] hover:underline text-xs"
                                  onClick={() => router.push(`/admin/therapists/${req.therapist!.user_id}`)}
                                >
                                  {req.therapist.full_name}
                                </button>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="text-xs">{new Date(req.created_at).toLocaleDateString()}</div>
                              <div className="text-xs text-gray-500">{new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            </TableCell>
                            <TableCell className="text-center">
                              {req.session_id ? (
                                <span title="Session created" className="inline-block">
                                  <CheckCircle className="h-4 w-4 text-green-600 mx-auto" />
                                </span>
                              ) : (
                                <span className="text-gray-400 text-xs">—</span>
                              )}
                            </TableCell>
                            <TableCell className="max-w-[250px]">
                              {req.message ? (
                                <div className="text-xs text-gray-700 line-clamp-2" title={req.message}>
                                  {req.message}
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
                    filteredPendingRequests.map(req => (
                      <div key={req.id} className="border border-gray-200 rounded-lg p-4 bg-white space-y-2 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="font-semibold text-gray-900 text-base">{req.client_name}</div>
                          {getStatusBadge(req.status)}
                        </div>

                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 font-medium w-20">Email:</span>
                            <span className="text-gray-700">{req.client_email}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 font-medium w-20">Phone:</span>
                            <span className="text-gray-700">{req.client_phone || "—"}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-gray-500 font-medium w-20">Therapist:</span>
                            <div className="flex-1">
                              {req.therapist ? (
                                <button
                                  className="text-[#056DBA] hover:underline text-xs"
                                  onClick={() => router.push(`/admin/therapists/${req.therapist!.user_id}`)}
                                >
                                  {req.therapist.full_name}
                                </button>
                              ) : (
                                <span className="text-gray-700">—</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 font-medium w-20">Submitted:</span>
                            <span className="text-gray-700 text-xs">{new Date(req.created_at).toLocaleDateString()}</span>
                          </div>
                          {req.session_id && (
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="text-gray-700 text-xs">Session created</span>
                            </div>
                          )}
                          {req.message && (
                            <div className="pt-2 mt-2 border-t border-gray-100">
                              <span className="text-gray-500 font-medium text-xs">Message:</span>
                              <p className="text-gray-700 text-xs mt-1 line-clamp-2">{req.message}</p>
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
                          <TableHead className="whitespace-nowrap text-center font-semibold">Session</TableHead>
                          <TableHead className="whitespace-nowrap font-semibold">Message</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPendingRequests.map(req => (
                          <TableRow key={req.id} className="hover:bg-gray-50/50 transition-colors">
                            <TableCell>{getStatusBadge(req.status)}</TableCell>
                            <TableCell className="font-medium whitespace-nowrap">{req.client_name}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{req.client_email}</TableCell>
                            <TableCell className="whitespace-nowrap">{req.client_phone || "—"}</TableCell>
                            <TableCell>
                              {req.therapist ? (
                                <button
                                  className="text-[#056DBA] hover:underline text-xs"
                                  onClick={() => router.push(`/admin/therapists/${req.therapist!.user_id}`)}
                                >
                                  {req.therapist.full_name}
                                </button>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="text-xs">{new Date(req.created_at).toLocaleDateString()}</div>
                              <div className="text-xs text-gray-500">{new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            </TableCell>
                            <TableCell className="text-center">
                              {req.session_id ? (
                                <span title="Session created" className="inline-block">
                                  <CheckCircle className="h-4 w-4 text-green-600 mx-auto" />
                                </span>
                              ) : (
                                <span className="text-gray-400 text-xs">—</span>
                              )}
                            </TableCell>
                            <TableCell className="max-w-[250px]">
                              {req.message ? (
                                <div className="text-xs text-gray-700 line-clamp-2" title={req.message}>
                                  {req.message}
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
