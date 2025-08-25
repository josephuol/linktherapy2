"use client"

import { useState } from "react"
import { Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { supabaseBrowser } from "@/lib/supabase-browser"

type ReviewModalProps = {
  isOpen: boolean
  onClose: () => void
  therapistId: string
  therapistName: string
  clientEmail: string
  sessionCount: number
}

export function ReviewModal({ 
  isOpen, 
  onClose, 
  therapistId, 
  therapistName, 
  clientEmail,
  sessionCount 
}: ReviewModalProps) {
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [comment, setComment] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const supabase = supabaseBrowser()

  const handleSubmit = async () => {
    if (rating === 0) {
      setError("Please select a rating")
      return
    }

    if (sessionCount < 8) {
      setError("You need at least 8 completed sessions to leave a review")
      return
    }

    setSubmitting(true)
    setError("")

    try {
      const { error: submitError } = await supabase
        .from("reviews")
        .insert({
          therapist_id: therapistId,
          client_email: clientEmail,
          rating: rating,
          comment: comment.trim() || null
        })

      if (submitError) {
        if (submitError.message.includes("8 completed sessions")) {
          setError("You need at least 8 completed sessions with this therapist to leave a review")
        } else {
          setError("Failed to submit review. Please try again.")
        }
        return
      }

      // Success - reset and close
      setRating(0)
      setComment("")
      onClose()
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setRating(0)
    setHoveredRating(0)
    setComment("")
    setError("")
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rate Your Experience</DialogTitle>
          <DialogDescription>
            Share your feedback about your sessions with {therapistName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {sessionCount < 8 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                You need at least 8 completed sessions with this therapist before you can leave a review. 
                You currently have {sessionCount} completed sessions.
              </p>
            </div>
          )}

          <div>
            <Label>Rating</Label>
            <div className="flex items-center gap-1 mt-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="focus:outline-none transition-transform hover:scale-110"
                  disabled={sessionCount < 8}
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      star <= (hoveredRating || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    } ${sessionCount < 8 ? "opacity-50" : ""}`}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm text-gray-600">
                {rating > 0 && `${rating} out of 5`}
              </span>
            </div>
          </div>

          <div>
            <Label htmlFor="comment">Your Review (Optional)</Label>
            <Textarea
              id="comment"
              placeholder="Share your experience..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="mt-2"
              rows={4}
              disabled={sessionCount < 8}
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button
              className="bg-[#056DBA] hover:bg-[#045A99]"
              onClick={handleSubmit}
              disabled={submitting || rating === 0 || sessionCount < 8}
            >
              {submitting ? "Submitting..." : "Submit Review"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
