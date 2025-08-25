"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import timeGridPlugin from "@fullcalendar/timegrid"
import interactionPlugin from "@fullcalendar/interaction"
import { DateSelectArg, EventClickArg, EventInput } from "@fullcalendar/core"
import { supabaseBrowser } from "@/lib/supabase-browser"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Therapist = { user_id: string; full_name: string }
type Patient = { id: string; full_name: string; email: string | null; phone: string | null }

export default function AdminCalendarPage() {
  const supabase = supabaseBrowser()
  const router = useRouter()
  const [therapists, setTherapists] = useState<Therapist[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [selectedTherapistId, setSelectedTherapistId] = useState<string>("all")
  const [events, setEvents] = useState<EventInput[]>([])
  const calendarRef = useRef<FullCalendar>(null)
  const [loading, setLoading] = useState(true)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [form, setForm] = useState({
    therapist_id: "",
    patient_id: "",
    client_name: "",
    client_email: "",
    client_phone: "",
    session_date: "",
    duration_minutes: 60,
    price: 100,
  })

  const loadBootstrap = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace("/admin/login"); return }
    const { data: prof } = await supabase.from("profiles").select("role").eq("user_id", user.id).single()
    if (prof?.role !== "admin") { router.replace("/admin/login"); return }

    const [{ data: t }, { data: p }] = await Promise.all([
      supabase.from("therapists").select("user_id, full_name").order("full_name"),
      supabase.from("patients").select("id, full_name, email, phone").order("full_name")
    ])
    setTherapists((t as Therapist[]) || [])
    setPatients((p as Patient[]) || [])
    setLoading(false)
  }

  const loadEvents = async (therapistId?: string) => {
    const query = supabase.from("sessions").select("id, therapist_id, patient_id, client_name, client_email, client_phone, session_date, duration_minutes")
      .order("session_date", { ascending: true })
    const effectiveId = therapistId && therapistId !== 'all' ? therapistId : undefined
    const { data, error } = effectiveId ? await query.eq("therapist_id", effectiveId) : await query
    if (error) return
    const thresholdMs = 48 * 60 * 60 * 1000
    const pairToSessions = new Map<string, { id: string; date: number }[]>()
    ;(data || []).forEach((s: any) => {
      const therapistKey = String(s.therapist_id || '')
      const pairKey = `${therapistKey}|${s.patient_id ? `p:${s.patient_id}` : `e:${s.client_email || ''}`}`
      const arr = pairToSessions.get(pairKey) || []
      arr.push({ id: s.id, date: new Date(s.session_date).getTime() })
      pairToSessions.set(pairKey, arr)
    })
    const tooCloseIds = new Set<string>()
    pairToSessions.forEach((arr) => {
      arr.sort((a, b) => a.date - b.date)
      for (let i = 1; i < arr.length; i++) {
        const diff = arr[i].date - arr[i - 1].date
        if (diff < thresholdMs) {
          tooCloseIds.add(arr[i - 1].id)
          tooCloseIds.add(arr[i].id)
        }
      }
    })
    const mapped = (data || []).map((s: any) => ({
      id: s.id,
      title: s.client_name || "Session",
      start: s.session_date,
      end: new Date(new Date(s.session_date).getTime() + (s.duration_minutes || 60) * 60000).toISOString(),
      extendedProps: { isTooClose: tooCloseIds.has(s.id) }
    }))
    setEvents(mapped)
  }

  useEffect(() => { loadBootstrap().then(() => loadEvents()) }, [])
  useEffect(() => { loadEvents(selectedTherapistId !== 'all' ? selectedTherapistId : undefined) }, [selectedTherapistId])

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    setEditingEventId(null)
    setForm(f => ({
      ...f,
      therapist_id: (selectedTherapistId && selectedTherapistId !== 'all' ? selectedTherapistId : therapists[0]?.user_id || ""),
      patient_id: "",
      client_name: "",
      client_email: "",
      client_phone: "",
      session_date: new Date(selectInfo.start).toISOString().slice(0,16),
    }))
    setDialogOpen(true)
  }

  const handleEventClick = async (clickInfo: EventClickArg) => {
    const id = String(clickInfo.event.id)
    const { data } = await supabase.from("sessions").select("id, therapist_id, patient_id, client_name, client_email, client_phone, session_date, duration_minutes, price").eq("id", id).single()
    if (!data) return
    setEditingEventId(id)
    setForm({
      therapist_id: data.therapist_id,
      patient_id: data.patient_id || "",
      client_name: data.client_name || "",
      client_email: data.client_email || "",
      client_phone: data.client_phone || "",
      session_date: new Date(data.session_date).toISOString().slice(0,16),
      duration_minutes: data.duration_minutes || 60,
      price: data.price || 100,
    })
    setDialogOpen(true)
  }

  const upsertSession = async () => {
    const payload: any = {
      therapist_id: form.therapist_id || null,
      patient_id: form.patient_id || null,
      client_name: form.client_name || null,
      client_email: form.client_email || null,
      client_phone: form.client_phone || null,
      session_date: new Date(form.session_date).toISOString(),
      duration_minutes: form.duration_minutes,
      price: form.price,
      status: "scheduled",
    }
    if (editingEventId) {
      await supabase.from("sessions").update(payload).eq("id", editingEventId)
    } else {
      await supabase.from("sessions").insert(payload)
    }
    setDialogOpen(false)
    await loadEvents(selectedTherapistId !== 'all' ? selectedTherapistId : undefined)
  }

  const deleteSession = async () => {
    if (!editingEventId) return
    await supabase.from("sessions").delete().eq("id", editingEventId)
    setDialogOpen(false)
    await loadEvents(selectedTherapistId !== 'all' ? selectedTherapistId : undefined)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-[#056DBA]">Loading…</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50/30 to-blue-100/20 py-10">
      <div className="container mx-auto px-4 max-w-7xl space-y-6">
        <h1 className="text-3xl md:text-4xl font-bold text-[#056DBA]">Admin Calendar</h1>
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xl font-bold text-gray-900">Schedule sessions</div>
              <div className="flex gap-2 items-center w-full sm:w-auto">
                <Select value={selectedTherapistId} onValueChange={setSelectedTherapistId}>
                  <SelectTrigger className="w-full sm:w-[260px]"><SelectValue placeholder="Filter by therapist (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All therapists</SelectItem>
                    {therapists.map(t => (<SelectItem key={t.user_id} value={t.user_id}>{t.full_name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-gray-200 overflow-x-auto bg-white">
              <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="timeGridWeek"
                headerToolbar={{ left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay" }}
                events={events}
                eventClassNames={(arg) => (arg.event.extendedProps as any)?.isTooClose ? ["bg-orange-100", "border-orange-500", "text-orange-900"] : []}
                eventDidMount={(info) => {
                  if ((info.event.extendedProps as any)?.isTooClose) {
                    info.el.style.backgroundColor = '#FFEDD5'
                    info.el.style.borderColor = '#F97316'
                    info.el.style.color = '#7C2D12'
                    info.el.setAttribute('title', 'Sessions for this client are < 48h apart')
                  }
                }}
                selectable
                selectMirror
                editable
                select={handleDateSelect}
                eventClick={handleEventClick}
                eventDrop={async (info) => {
                  const id = String(info.event.id)
                  const start = info.event.start ? info.event.start.toISOString() : null
                  if (!start) return
                  await supabase.from("sessions").update({ session_date: start }).eq("id", id)
                  await loadEvents(selectedTherapistId !== 'all' ? selectedTherapistId : undefined)
                }}
              />
            </div>
          </CardContent>
        </Card>
        {dialogOpen && (
          <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-lg space-y-4">
              <div className="text-lg font-semibold">{editingEventId ? "Edit session" : "Create session"}</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-gray-600 mb-1">Therapist</div>
                  <select className="w-full border rounded-md h-10 px-3" value={form.therapist_id} onChange={e => setForm(f => ({ ...f, therapist_id: e.target.value }))}>
                    <option value="">Select therapist</option>
                    {therapists.map(t => <option key={t.user_id} value={t.user_id}>{t.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <div className="text-xs text-gray-600 mb-1">Patient</div>
                  <select className="w-full border rounded-md h-10 px-3" value={form.patient_id} onChange={e => setForm(f => ({ ...f, patient_id: e.target.value }))}>
                    <option value="">Select patient (optional)</option>
                    {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <div className="text-xs text-gray-600 mb-1">Client name</div>
                  <Input value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} placeholder="Name shown on calendar" />
                </div>
                <div>
                  <div className="text-xs text-gray-600 mb-1">Client email</div>
                  <Input value={form.client_email} onChange={e => setForm(f => ({ ...f, client_email: e.target.value }))} placeholder="Email (used if phone missing)" />
                </div>
                <div>
                  <div className="text-xs text-gray-600 mb-1">Client phone</div>
                  <Input value={form.client_phone} onChange={e => setForm(f => ({ ...f, client_phone: e.target.value }))} placeholder="Phone (preferred)" />
                </div>
                <div>
                  <div className="text-xs text-gray-600 mb-1">Start time</div>
                  <Input type="datetime-local" value={form.session_date} onChange={e => setForm(f => ({ ...f, session_date: e.target.value }))} />
                </div>
                <div>
                  <div className="text-xs text-gray-600 mb-1">Duration (min)</div>
                  <Input type="number" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: Number(e.target.value || 60) }))} />
                </div>
                <div>
                  <div className="text-xs text-gray-600 mb-1">Price</div>
                  <Input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value || 0) }))} />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                {editingEventId && <Button variant="destructive" onClick={deleteSession}>Delete</Button>}
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button className="bg-[#056DBA] hover:bg-[#045A99]" onClick={upsertSession}>{editingEventId ? "Save" : "Create"}</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


