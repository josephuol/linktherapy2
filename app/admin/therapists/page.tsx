"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabaseBrowser } from "@/lib/supabase-browser"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Minus, Trophy, Activity } from "lucide-react"
import { Badge } from "@/components/ui/badge"

type Therapist = { 
  user_id: string; 
  email?: string; 
  full_name?: string | null; 
  title?: string | null; 
  status?: string | null;
  ranking_points?: number | null;
  total_sessions?: number | null;
}

export default function AdminTherapistsPage() {
  const supabase = supabaseBrowser()
  const router = useRouter()
  const [therapists, setTherapists] = useState<Therapist[]>([])
  const [loading, setLoading] = useState(true)
  const [inviting, setInviting] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [adjustPointsDialog, setAdjustPointsDialog] = useState(false)
  const [selectedTherapist, setSelectedTherapist] = useState<Therapist | null>(null)
  const [pointsAdjustment, setPointsAdjustment] = useState("")
  const [adjustmentReason, setAdjustmentReason] = useState("")
  const [adjusting, setAdjusting] = useState(false)

  const loadTherapists = async () => {
    const { data } = await supabase
      .from("therapists")
      .select("user_id, full_name, title, status, ranking_points, total_sessions")
      .order("ranking_points", { ascending: false })
    setTherapists((data as Therapist[]) || [])
  }

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace("/admin/login"); return }
      const { data: prof } = await supabase.from("profiles").select("role").eq("user_id", user.id).single()
      if (prof?.role !== "admin") { router.replace("/admin/login"); return }
      await loadTherapists()
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
      await loadTherapists()
    } catch (e) {
      console.error(e)
    } finally {
      setInviting(false)
    }
  }

  const updateStatus = async (user_id: string, status: string) => {
    await supabase.from("therapists").update({ status }).eq("user_id", user_id)
    
    // If suspending, apply -35% penalty
    if (status === 'suspended') {
      const { error } = await supabase.rpc('process_payment_status', {
        p_payment_id: null,
        p_status: 'suspended',
        p_therapist_id: user_id
      })
      if (error) {
        console.error('Error applying suspension penalty:', error)
        alert('Failed to apply suspension penalty')
      }
    }
    
    await loadTherapists()
  }

  const handleAdjustPoints = async () => {
    if (!selectedTherapist || !pointsAdjustment || !adjustmentReason.trim()) return
    
    setAdjusting(true)
    try {
      const points = parseInt(pointsAdjustment)
      if (isNaN(points)) throw new Error("Invalid points value")
      
      // Call the database function to adjust points
      const { error } = await supabase.rpc('adjust_therapist_points', {
        p_therapist_id: selectedTherapist.user_id,
        p_points: points,
        p_reason: adjustmentReason.trim()
      })
      
      if (error) throw error
      
      await loadTherapists()
      setAdjustPointsDialog(false)
      setPointsAdjustment("")
      setAdjustmentReason("")
      setSelectedTherapist(null)
    } catch (error) {
      console.error("Error adjusting points:", error)
      alert("Failed to adjust points")
    } finally {
      setAdjusting(false)
    }
  }

  const openAdjustDialog = (therapist: Therapist) => {
    setSelectedTherapist(therapist)
    setAdjustPointsDialog(true)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-[#056DBA]">Loading…</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50/30 to-blue-100/20 py-10">
      <div className="container mx-auto px-4 max-w-7xl space-y-6">
        <h1 className="text-3xl md:text-4xl font-bold text-[#056DBA]">Therapists</h1>
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xl font-bold text-gray-900">Manage Therapists</div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Input className="flex-1" placeholder="Therapist email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
                <Button disabled={inviting} className="bg-[#056DBA] hover:bg-[#045A99] whitespace-nowrap" onClick={inviteTherapist}>{inviting ? "Inviting…" : "Invite"}</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-gray-200 overflow-x-auto bg-white -mx-4 sm:mx-0 px-4 sm:px-0">
              <div className="min-w-[900px]">
              <Table className="text-xs sm:text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Rank</TableHead>
                    <TableHead className="whitespace-nowrap">Name</TableHead>
                    <TableHead className="hidden md:table-cell whitespace-nowrap">Title</TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1">
                        <Trophy className="h-4 w-4" />
                        Points
                      </div>
                    </TableHead>
                    <TableHead className="hidden sm:table-cell">
                      <div className="flex items-center gap-1">
                        <Activity className="h-4 w-4" />
                        Sessions
                      </div>
                    </TableHead>
                    <TableHead className="hidden sm:table-cell">Status</TableHead>
                    <TableHead className="whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {therapists.map((t, index) => (
                    <TableRow key={t.user_id}>
                      <TableCell className="font-medium">
                        {index + 1}
                        {index < 3 && (
                          <Badge className="ml-2" variant={index === 0 ? "default" : "secondary"}>
                            {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap">
                        <button
                          className="text-[#056DBA] hover:underline"
                          onClick={() => router.push(`/admin/therapists/${t.user_id}`)}
                        >
                          {t.full_name || "—"}
                        </button>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{t.title || "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{t.ranking_points || 0}</span>
                          {(t.ranking_points || 0) >= 5000 && (
                            <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white border-0">
                              Top
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{t.total_sessions || 0}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className={`px-2 py-1 rounded-md text-xs border ${
                          t.status === 'active' 
                            ? 'bg-green-50 text-green-700 border-green-200' 
                            : t.status === 'suspended'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                        }`}>
                          {t.status || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="space-x-2 whitespace-nowrap">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => openAdjustDialog(t)}
                          className="border-[#056DBA] text-[#056DBA] hover:bg-[#056DBA] hover:text-white"
                        >
                          Adjust Points
                        </Button>
                        <Button size="sm" className="bg-[#056DBA] hover:bg-[#045A99]" onClick={() => updateStatus(t.user_id, 'active')}>Activate</Button>
                        <Button size="sm" variant="outline" onClick={() => updateStatus(t.user_id, 'warning')}>Warn</Button>
                        <Button size="sm" variant="destructive" onClick={() => updateStatus(t.user_id, 'suspended')}>Suspend</Button>
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

      <Dialog open={adjustPointsDialog} onOpenChange={setAdjustPointsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Ranking Points</DialogTitle>
            <DialogDescription>
              Adjust points for {selectedTherapist?.full_name}. Current points: {selectedTherapist?.ranking_points || 0}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="points">Points Adjustment</Label>
              <div className="flex gap-2 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setPointsAdjustment("-100")}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  id="points"
                  type="number"
                  placeholder="Enter points (positive or negative)"
                  value={pointsAdjustment}
                  onChange={(e) => setPointsAdjustment(e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setPointsAdjustment("100")}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                New total: {Math.min(Math.max((selectedTherapist?.ranking_points || 0) + parseInt(pointsAdjustment || "0"), 0), 10000)} points
              </p>
            </div>
            <div>
              <Label htmlFor="reason">Reason for Adjustment</Label>
              <Textarea
                id="reason"
                placeholder="Enter reason for this adjustment..."
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                className="mt-2"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setAdjustPointsDialog(false)
                  setPointsAdjustment("")
                  setAdjustmentReason("")
                }}
              >
                Cancel
              </Button>
              <Button
                className="bg-[#056DBA] hover:bg-[#045A99]"
                onClick={handleAdjustPoints}
                disabled={!pointsAdjustment || !adjustmentReason.trim() || adjusting}
              >
                {adjusting ? "Adjusting..." : "Apply Adjustment"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

