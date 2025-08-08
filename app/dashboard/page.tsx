"use client"

import { useEffect, useState } from "react"
import { supabaseBrowser } from "@/lib/supabase-browser"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useRouter } from "next/navigation"

export default function TherapistDashboardPage() {
  const supabase = supabaseBrowser()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [requests, setRequests] = useState<any[]>([])

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace("/login")
        return
      }
      // Load profile
      const { data: prof } = await supabase.from("profiles").select("*").eq("user_id", session.user.id).single()
      setProfile(prof)

      // Load contact requests scoped by RLS
      const { data: cr } = await supabase.from("contact_requests").select("*").order("created_at", { ascending: false })
      setRequests(cr ?? [])
      setLoading(false)
    }
    init()
  }, [])

  if (loading) return <div className="min-h-screen flex items-center justify-center text-[#056DBA]">Loading…</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50/30 to-blue-100/20 py-10">
      <div className="container mx-auto px-4 max-w-6xl">
        <h1 className="text-3xl md:text-4xl font-bold mb-6 text-[#056DBA]">Therapist Dashboard</h1>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-1">
            <CardHeader>
              <div className="text-xl font-bold text-gray-900">My Profile</div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-700">
                <div><span className="font-semibold">Name:</span> {profile?.full_name || ""}</div>
                <div><span className="font-semibold">Role:</span> {profile?.role}</div>
              </div>
              <Button className="mt-4 bg-[#056DBA] hover:bg-[#045A99] text-white" onClick={() => router.push("/dashboard/profile")}>Edit Profile</Button>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <div className="text-xl font-bold text-gray-900">New Contact Requests</div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(requests || []).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.client_name}</TableCell>
                        <TableCell>{r.client_email}</TableCell>
                        <TableCell>{r.client_phone || "—"}</TableCell>
                        <TableCell className="max-w-md truncate" title={r.message || ""}>{r.message || "—"}</TableCell>
                        <TableCell>
                          <span className="px-2 py-1 rounded-md text-xs bg-blue-50 text-[#056DBA] border border-blue-100">{r.status}</span>
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
    </div>
  )
}


