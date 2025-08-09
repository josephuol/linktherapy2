"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Phone, Mail, MessageSquare, CheckCircle, XCircle, Calendar, Clock } from "lucide-react"
import { format } from "date-fns"

interface ContactRequest {
  id: string
  client_name: string
  client_email: string
  client_phone?: string
  message?: string
  status: 'new' | 'contacted' | 'accepted' | 'rejected' | 'scheduled' | 'closed'
  created_at: string
  rejection_reason?: string
  response_time_hours?: number
}

interface ContactRequestsTableProps {
  requests: ContactRequest[]
  onAcceptRequest: (requestId: string) => Promise<void>
  onRejectRequest: (requestId: string, reason: string) => Promise<void>
  onScheduleSession: (requestId: string, sessionIsoDateTime: string) => Promise<void>
  onRescheduleSession: (requestId: string, sessionIsoDateTime: string) => Promise<void>
}

export default function ContactRequestsTable({
  requests,
  onAcceptRequest,
  onRejectRequest,
  onScheduleSession,
  onRescheduleSession
}: ContactRequestsTableProps) {
  const [selectedRequest, setSelectedRequest] = useState<ContactRequest | null>(null)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [sessionDate, setSessionDate] = useState("")
  const [sessionTime, setSessionTime] = useState("")
  const [loading, setLoading] = useState<string | null>(null)

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      new: { label: "New", className: "bg-blue-100 text-blue-800" },
      contacted: { label: "Contacted", className: "bg-yellow-100 text-yellow-800" },
      accepted: { label: "Accepted", className: "bg-green-100 text-green-800" },
      rejected: { label: "Rejected", className: "bg-red-100 text-red-800" },
      scheduled: { label: "Scheduled", className: "bg-purple-100 text-purple-800" },
      closed: { label: "Closed", className: "bg-gray-100 text-gray-800" }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.new
    return (
      <Badge variant="secondary" className={config.className}>
        {config.label}
      </Badge>
    )
  }

  const handleAccept = async (request: ContactRequest) => {
    setLoading(request.id)
    try {
      await onAcceptRequest(request.id)
    } finally {
      setLoading(null)
    }
  }

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason.trim()) return
    
    setLoading(selectedRequest.id)
    try {
      await onRejectRequest(selectedRequest.id, rejectionReason)
      setRejectDialogOpen(false)
      setRejectionReason("")
      setSelectedRequest(null)
    } finally {
      setLoading(null)
    }
  }

  const handleSchedule = async () => {
    if (!selectedRequest) return
    
    setLoading(selectedRequest.id)
    try {
      const isoDateTime = new Date(`${sessionDate}T${sessionTime}:00`).toISOString()
      await onScheduleSession(selectedRequest.id, isoDateTime)
      setScheduleDialogOpen(false)
      setSessionDate("")
      setSessionTime("")
      setSelectedRequest(null)
    } finally {
      setLoading(null)
    }
  }

  const handleOpenReschedule = (request: ContactRequest) => {
    setSelectedRequest(request)
    setSessionDate("")
    setSessionTime("")
    setRescheduleDialogOpen(true)
  }

  const handleConfirmReschedule = async () => {
    if (!selectedRequest) return
    setLoading(selectedRequest.id)
    try {
      const isoDateTime = new Date(`${sessionDate}T${sessionTime}:00`).toISOString()
      await onRescheduleSession(selectedRequest.id, isoDateTime)
      setRescheduleDialogOpen(false)
      setSessionDate("")
      setSessionTime("")
      setSelectedRequest(null)
    } finally {
      setLoading(null)
    }
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Contact Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No contact requests yet</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Contact Requests ({requests.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {requests.map((request) => (
              <div key={request.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-gray-900">{request.client_name}</h4>
                      {getStatusBadge(request.status)}
                    </div>
                    
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {request.client_email}
                      </div>
                      {request.client_phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          {request.client_phone}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {format(new Date(request.created_at), "MMM dd, yyyy 'at' h:mm a")}
                      </div>
                    </div>

                    {request.message && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-gray-700">{request.message}</p>
                      </div>
                    )}

                    {request.rejection_reason && (
                      <div className="mt-3 p-3 bg-red-50 rounded-lg">
                        <p className="text-sm text-red-700">
                          <strong>Rejection reason:</strong> {request.rejection_reason}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  {request.status === "new" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleAccept(request)}
                        disabled={loading === request.id}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedRequest(request)
                          setRejectDialogOpen(true)
                        }}
                        disabled={loading === request.id}
                        className="border-red-300 text-red-700 hover:bg-red-50"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </>
                  )}

                  {(request.status === "accepted" || request.status === "contacted") && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedRequest(request)
                        setScheduleDialogOpen(true)
                      }}
                      disabled={loading === request.id}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Calendar className="h-4 w-4 mr-1" />
                      Schedule Session
                    </Button>
                  )}

                  {request.status === "scheduled" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenReschedule(request)}
                      disabled={loading === request.id}
                    >
                      <Calendar className="h-4 w-4 mr-1" />
                      Reschedule
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Contact Request</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="reason">Reason for rejection</Label>
            <Textarea
              id="reason"
              placeholder="Please provide a reason for rejecting this request..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false)
                setRejectionReason("")
                setSelectedRequest(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={!rejectionReason.trim() || loading === selectedRequest?.id}
              className="bg-red-600 hover:bg-red-700"
            >
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Session</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="date">Session Date</Label>
              <Input
                id="date"
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="mt-2"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <Label htmlFor="time">Session Time</Label>
              <Input
                id="time"
                type="time"
                value={sessionTime}
                onChange={(e) => setSessionTime(e.target.value)}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setScheduleDialogOpen(false)
                setSessionDate("")
                setSessionTime("")
                setSelectedRequest(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSchedule}
              disabled={!sessionDate || !sessionTime || loading === selectedRequest?.id}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Schedule Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleDialogOpen} onOpenChange={setRescheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Session</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="reschedule-date">New Session Date</Label>
              <Input
                id="reschedule-date"
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="mt-2"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <Label htmlFor="reschedule-time">New Session Time</Label>
              <Input
                id="reschedule-time"
                type="time"
                value={sessionTime}
                onChange={(e) => setSessionTime(e.target.value)}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRescheduleDialogOpen(false)
                setSessionDate("")
                setSessionTime("")
                setSelectedRequest(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmReschedule}
              disabled={!sessionDate || !sessionTime || loading === selectedRequest?.id}
            >
              Confirm Reschedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
