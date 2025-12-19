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
import { Plus, Minus, Trophy, Activity, RefreshCw, Mail, Trash2, AlertTriangle, MoreVertical, DollarSign, Globe } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

type Therapist = {
  user_id: string;
  email?: string;
  full_name?: string | null;
  title?: string | null;
  status?: string | null;
  ranking_points?: number | null;
  total_sessions?: number | null;
  last_active?: string | null;
  commission_per_session?: number | null;
  remote_available?: boolean;
}

type PendingInvite = {
  id: string;
  email: string;
  created_at: string;
  email_confirmed_at: string | null;
}

export default function AdminTherapistsPage() {
  const supabase = supabaseBrowser()
  const router = useRouter()
  const [therapists, setTherapists] = useState<Therapist[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [inviting, setInviting] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [adjustPointsDialog, setAdjustPointsDialog] = useState(false)
  const [selectedTherapist, setSelectedTherapist] = useState<Therapist | null>(null)
  const [pointsAdjustment, setPointsAdjustment] = useState("")
  const [adjustmentReason, setAdjustmentReason] = useState("")
  const [adjusting, setAdjusting] = useState(false)
  const [resendingEmail, setResendingEmail] = useState<string | null>(null)
  const [resendEmail, setResendEmail] = useState("")
  const [resendDialog, setResendDialog] = useState(false)
  const [resending, setResending] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState(false)
  const [therapistToDelete, setTherapistToDelete] = useState<Therapist | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [commissionDialog, setCommissionDialog] = useState(false)
  const [commissionTherapist, setCommissionTherapist] = useState<Therapist | null>(null)
  const [commissionRate, setCommissionRate] = useState("")
  const [updatingCommission, setUpdatingCommission] = useState(false)

  const loadTherapists = async () => {
    // Fetch therapists via admin API to bypass RLS
    try {
      const res = await fetch("/api/admin/therapists")

      if (!res.ok) {
        console.error("Error loading therapists:", res.statusText)
        toast.error("Failed to load therapists")
        return
      }

      const data = await res.json()
      const therapistsData = data.therapists || []
      const count = data.count || 0

      console.log(`Loaded ${therapistsData.length} therapists out of ${count} total`)
      setTotalCount(count)

      if (therapistsData.length === 0) {
        setTherapists([])
        return
      }

      setTherapists(therapistsData as Therapist[])
    } catch (error) {
      console.error("Exception loading therapists:", error)
      toast.error("Failed to load therapists")
    }
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
      toast.success("Invitation sent successfully")
      setInviteEmail("")
      await loadTherapists()
    } catch (e: any) {
      console.error(e)
      toast.error(e.message || "Failed to send invitation")
    } finally {
      setInviting(false)
    }
  }

  const resendInvitation = async (email?: string) => {
    const targetEmail = email || resendEmail.trim()
    if (!targetEmail) return

    setResending(true)
    if (email) setResendingEmail(email)

    try {
      const res = await fetch("/api/admin/resend-invitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail })
      })
      const data = await res.json()

      if (!res.ok) {
        if (data.error === "No pending invitation found") {
          toast.error("No pending invitation found for this email. Use 'Invite' to send a new invitation.")
        } else if (data.error === "Invitation expired") {
          toast.error("The invitation has expired. Use 'Invite' to send a new invitation.")
        } else {
          throw new Error(data.error || "Failed to resend invitation")
        }
        return
      }

      toast.success("Invitation resent successfully!")
      setResendDialog(false)
      setResendEmail("")
    } catch (e: any) {
      console.error(e)
      toast.error(e.message || "Failed to resend invitation")
    } finally {
      setResending(false)
      setResendingEmail(null)
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

  const openDeleteDialog = (therapist: Therapist) => {
    setTherapistToDelete(therapist)
    setDeleteDialog(true)
  }

  const handleDeleteTherapist = async () => {
    if (!therapistToDelete) return

    setDeleting(true)
    try {
      const res = await fetch("/api/admin/delete-therapist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: therapistToDelete.user_id })
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete therapist")
      }

      toast.success("Therapist account deleted successfully. You can now invite this email again.")
      setDeleteDialog(false)
      setTherapistToDelete(null)
      await loadTherapists()
    } catch (e: any) {
      console.error(e)
      toast.error(e.message || "Failed to delete therapist")
    } finally {
      setDeleting(false)
    }
  }

  const openCommissionDialog = (therapist: Therapist) => {
    setCommissionTherapist(therapist)
    setCommissionRate(therapist.commission_per_session?.toString() || "")
    setCommissionDialog(true)
  }

  const handleUpdateCommission = async () => {
    if (!commissionTherapist) return

    setUpdatingCommission(true)
    try {
      const commissionValue = commissionRate.trim() === "" ? null : parseFloat(commissionRate)
      if (commissionRate.trim() !== "" && (isNaN(commissionValue as number) || (commissionValue as number) < 0)) {
        throw new Error("Invalid commission value. Must be a positive number or empty.")
      }

      const res = await fetch("/api/admin/therapists/commission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          therapist_id: commissionTherapist.user_id,
          commission_per_session: commissionValue
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to update commission rate")
      }

      toast.success(commissionValue === null
        ? `Commission reset to default ($6) for ${commissionTherapist.full_name}`
        : `Commission rate set to $${commissionValue} for ${commissionTherapist.full_name}`)
      setCommissionDialog(false)
      setCommissionRate("")
      setCommissionTherapist(null)
      await loadTherapists()
    } catch (e: any) {
      console.error(e)
      toast.error(e.message || "Failed to update commission rate")
    } finally {
      setUpdatingCommission(false)
    }
  }

  const toggleOnlineStatus = async (therapist: Therapist) => {
    try {
      const newStatus = !therapist.remote_available

      const res = await fetch("/api/admin/therapists/toggle-online", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          therapist_id: therapist.user_id,
          remote_available: newStatus
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to toggle online status")
      }

      toast.success(`${therapist.full_name} ${newStatus ? "now" : "no longer"} offers online sessions`)
      await loadTherapists()
    } catch (e: any) {
      console.error(e)
      toast.error(e.message || "Failed to toggle online status")
    }
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
                <Button variant="outline" className="whitespace-nowrap border-[#056DBA] text-[#056DBA]" onClick={() => setResendDialog(true)}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Resend
                </Button>
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
                    <TableHead className="hidden lg:table-cell whitespace-nowrap">Email</TableHead>
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
                    <TableHead className="hidden xl:table-cell whitespace-nowrap">Last Active</TableHead>
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
                        <div className="flex items-center gap-2">
                          <button
                            className="text-[#056DBA] hover:underline"
                            onClick={() => router.push(`/admin/therapists/${t.user_id}`)}
                          >
                            {t.full_name || "—"}
                          </button>
                          {t.remote_available && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 text-xs">
                              <Globe className="h-3 w-3 mr-1" />
                              Online
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-xs text-gray-600">{t.email || "—"}</span>
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
                      <TableCell className="hidden xl:table-cell">
                        {t.last_active ? (
                          <div className="text-xs">
                            <div>{new Date(t.last_active).toLocaleDateString()}</div>
                            <div className="text-gray-500">{new Date(t.last_active).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">Never</span>
                        )}
                      </TableCell>
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
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <MoreVertical className="h-4 w-4" />
                              Actions
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem onClick={() => openAdjustDialog(t)}>
                              <Trophy className="h-4 w-4 mr-2" />
                              Adjust Points
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openCommissionDialog(t)}>
                              <DollarSign className="h-4 w-4 mr-2" />
                              Set Commission Rate
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleOnlineStatus(t)}>
                              <Globe className="h-4 w-4 mr-2" />
                              {t.remote_available ? "Disable" : "Enable"} Online Sessions
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => updateStatus(t.user_id, 'active')}>
                              Activate
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateStatus(t.user_id, 'warning')}>
                              Warn
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateStatus(t.user_id, 'suspended')}>
                              Suspend
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => openDeleteDialog(t)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Account
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </div>
            {/* Pagination Info */}
            <div className="mt-4 px-4 sm:px-0 text-sm text-gray-600">
              Showing <span className="font-semibold text-gray-900">{therapists.length}</span> of <span className="font-semibold text-gray-900">{totalCount}</span> therapists
              {totalCount > therapists.length && (
                <span className="ml-2 text-yellow-600 font-medium">
                  (Displaying first {therapists.length} - increase limit to see all)
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={adjustPointsDialog} onOpenChange={setAdjustPointsDialog}>
        <DialogContent onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
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

      {/* Resend Invitation Dialog */}
      <Dialog open={resendDialog} onOpenChange={setResendDialog}>
        <DialogContent onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Resend Invitation</DialogTitle>
            <DialogDescription>
              Resend the invitation email to a therapist who hasn&apos;t completed their registration.
              This will generate a fresh invitation link.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="resend-email">Therapist Email</Label>
              <Input
                id="resend-email"
                type="email"
                placeholder="therapist@example.com"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                className="mt-2"
              />
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <Mail className="h-4 w-4 inline mr-1" />
                The therapist will receive a new invitation email with a fresh link that won&apos;t expire after one click.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setResendDialog(false)
                  setResendEmail("")
                }}
              >
                Cancel
              </Button>
              <Button
                className="bg-[#056DBA] hover:bg-[#045A99]"
                onClick={() => resendInvitation()}
                disabled={!resendEmail.trim() || resending}
              >
                {resending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Resend Invitation
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Therapist Confirmation Dialog */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete Therapist Account
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the therapist account and all associated data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800 font-medium mb-2">
                You are about to delete:
              </p>
              <p className="text-sm text-red-700">
                <strong>{therapistToDelete?.full_name || "Unknown"}</strong>
              </p>
              <p className="text-xs text-red-600 mt-2">
                This will delete all sessions, contact requests, payments, metrics, and remove the user from the system.
              </p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                After deletion, you can invite the same email address again to create a new account.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteDialog(false)
                  setTherapistToDelete(null)
                }}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="bg-red-700 hover:bg-red-800"
                onClick={handleDeleteTherapist}
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Permanently
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Commission Rate Dialog */}
      <Dialog open={commissionDialog} onOpenChange={setCommissionDialog}>
        <DialogContent onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Set Commission Rate</DialogTitle>
            <DialogDescription>
              Set a custom commission rate per session for {commissionTherapist?.full_name}. Leave empty to use the default rate ($6).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="commission">Commission Per Session ($)</Label>
              <Input
                id="commission"
                type="number"
                step="0.01"
                min="0"
                placeholder="6 (default)"
                value={commissionRate}
                onChange={(e) => setCommissionRate(e.target.value)}
                className="mt-2"
              />
              <p className="text-sm text-gray-500 mt-1">
                Current: {commissionTherapist?.commission_per_session !== null && commissionTherapist?.commission_per_session !== undefined
                  ? `$${commissionTherapist.commission_per_session}`
                  : "$6 (default)"}
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <DollarSign className="h-4 w-4 inline mr-1" />
                This rate will be used for all future payment calculations for this therapist. Leave empty to reset to the default global rate.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setCommissionDialog(false)
                  setCommissionRate("")
                  setCommissionTherapist(null)
                }}
                disabled={updatingCommission}
              >
                Cancel
              </Button>
              <Button
                className="bg-[#056DBA] hover:bg-[#045A99]"
                onClick={handleUpdateCommission}
                disabled={updatingCommission}
              >
                {updatingCommission ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <DollarSign className="h-4 w-4 mr-2" />
                    {commissionRate.trim() === "" ? "Reset to Default" : "Update Commission"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

