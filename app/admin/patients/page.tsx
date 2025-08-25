"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabaseBrowser } from "@/lib/supabase-browser"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type Patient = {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  timezone: string | null
  is_active: boolean
  created_at: string
}

export default function AdminPatientsPage() {
  const supabase = supabaseBrowser()
  const router = useRouter()
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")
  const [creating, setCreating] = useState(false)
  const [newPatient, setNewPatient] = useState({ full_name: "", email: "", phone: "", timezone: Intl.DateTimeFormat().resolvedOptions().timeZone })

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
      const { data } = await supabase.from("patients").select("id, full_name, email, phone, timezone, is_active, created_at").order("created_at", { ascending: false })
      setPatients((data as Patient[]) ?? [])
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

  const createPatient = async () => {
    if (!newPatient.full_name.trim()) return
    setCreating(true)
    try {
      const { data, error } = await supabase.from("patients").insert({
        full_name: newPatient.full_name.trim(),
        email: newPatient.email || null,
        phone: newPatient.phone || null,
        timezone: newPatient.timezone || null,
      }).select("id, full_name, email, phone, timezone, is_active, created_at").single()
      if (error) throw error
      setPatients(prev => [data as Patient, ...prev])
      setNewPatient({ full_name: "", email: "", phone: "", timezone: Intl.DateTimeFormat().resolvedOptions().timeZone })
    } finally {
      setCreating(false)
    }
  }

  const toggleActive = async (id: string, is_active: boolean) => {
    await supabase.from("patients").update({ is_active: !is_active }).eq("id", id)
    setPatients(prev => prev.map(p => p.id === id ? { ...p, is_active: !is_active } : p))
  }

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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <Input placeholder="Full name" value={newPatient.full_name} onChange={e => setNewPatient(p => ({ ...p, full_name: e.target.value }))} />
              <Input placeholder="Email" value={newPatient.email} onChange={e => setNewPatient(p => ({ ...p, email: e.target.value }))} />
              <Input placeholder="Phone" value={newPatient.phone} onChange={e => setNewPatient(p => ({ ...p, phone: e.target.value }))} />
              <div className="flex gap-2">
                <Input placeholder="Timezone" value={newPatient.timezone} onChange={e => setNewPatient(p => ({ ...p, timezone: e.target.value }))} />
                <Button disabled={creating} className="bg-[#056DBA] hover:bg-[#045A99]" onClick={createPatient}>{creating ? "Adding…" : "Add"}</Button>
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 overflow-x-auto bg-white -mx-4 sm:mx-0 px-4 sm:px-0">
              <div className="min-w-[760px]">
              <Table className="text-xs sm:text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Name</TableHead>
                    <TableHead className="hidden sm:table-cell whitespace-nowrap">Email</TableHead>
                    <TableHead className="hidden sm:table-cell whitespace-nowrap">Phone</TableHead>
                    <TableHead className="hidden md:table-cell whitespace-nowrap">Timezone</TableHead>
                    <TableHead className="whitespace-nowrap">Status</TableHead>
                    <TableHead className="whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium whitespace-nowrap">{p.full_name}</TableCell>
                      <TableCell className="hidden sm:table-cell">{p.email || "—"}</TableCell>
                      <TableCell className="hidden sm:table-cell">{p.phone || "—"}</TableCell>
                      <TableCell className="hidden md:table-cell">{p.timezone || "—"}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span className="px-2 py-1 rounded-md text-xs bg-blue-50 text-[#056DBA] border border-blue-100">{p.is_active ? "active" : "inactive"}</span>
                      </TableCell>
                      <TableCell className="space-x-2 whitespace-nowrap">
                        <Button size="sm" variant="outline" onClick={() => toggleActive(p.id, p.is_active)}>{p.is_active ? "Deactivate" : "Activate"}</Button>
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


