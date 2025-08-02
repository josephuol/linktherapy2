"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { MapPin, Star, Send, Shield, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

interface Therapist {
  id: number
  name: string
  image: string
  specialty: string
  location: string
  experience: number
  price: number
  rating: number
  reviews: number
  bio: string
  credentials: string
  verified?: boolean
  responseTime?: string
  languages?: string[]
}

interface ContactModalProps {
  therapist: Therapist | null
  isOpen: boolean
  onClose: () => void
}

export function ContactModal({ therapist, isOpen, onClose }: ContactModalProps) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    reason: "",
    consent: false,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setIsVisible(true), 100)
    } else {
      setIsVisible(false)
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.consent) {
      alert("Please provide consent to proceed")
      return
    }

    setIsSubmitting(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Track the contact attempt
    const contactData = {
      ...formData,
      therapistId: therapist?.id,
      therapistName: therapist?.name,
      timestamp: new Date().toISOString(),
    }

    console.log("Contact submission:", contactData)

    // Show success message
    alert("Your contact request has been sent! The therapist will reach out to you soon.")

    // Reset form and close modal
    setFormData({
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      reason: "",
      consent: false,
    })
    setIsSubmitting(false)
    onClose()
  }

  if (!therapist) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto border-0 shadow-2xl bg-white">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#176c9c] to-[#8bb6ce]" />

        <DialogHeader className="relative">
          <DialogTitle className="text-3xl font-bold text-[#176c9c] pr-12">Connect with {therapist.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-8">
          {/* Enhanced Therapist Info */}
          <div className={`transition-all duration-700 ${isVisible ? "animate-slide-up" : "opacity-0"}`}>
            <div className="flex gap-6 p-6 bg-gradient-to-r from-[#176c9c]/8 to-[#8bb6ce]/8 rounded-2xl border border-[#176c9c]/15">
              <div className="relative">
                <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-white shadow-lg">
                  <img
                    src={therapist.image || "/placeholder.svg"}
                    alt={therapist.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                {therapist.verified && (
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <Shield className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{therapist.name}</h3>
                    <p className="text-gray-600 font-medium">{therapist.credentials}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-yellow-500 mb-1">
                      <Star className="h-5 w-5 fill-current" />
                      <span className="font-bold text-gray-900">{therapist.rating}</span>
                      <span className="text-gray-500">({therapist.reviews})</span>
                    </div>
                    <div className="text-2xl font-bold text-[#176c9c]">${therapist.price}/session</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge className="bg-[#176c9c]/10 text-[#176c9c] hover:bg-[#176c9c]/20">{therapist.specialty}</Badge>
                  {therapist.languages?.map((lang) => (
                    <Badge key={lang} variant="outline" className="border-[#176c9c]/30 text-[#176c9c]">
                      {lang}
                    </Badge>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[#176c9c]" />
                    {therapist.location}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-[#176c9c]" />
                    {therapist.responseTime}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Contact Form */}
          <div className={`transition-all duration-700 delay-200 ${isVisible ? "animate-slide-up" : "opacity-0"}`}>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="group">
                  <label className="text-sm font-semibold mb-2 block text-gray-700 group-hover:text-[#176c9c] transition-colors">
                    First Name *
                  </label>
                  <Input
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
                    placeholder="Enter your first name"
                    className="border-gray-200 focus:border-[#176c9c] focus:ring-[#176c9c]/20 transition-all duration-300"
                  />
                </div>
                <div className="group">
                  <label className="text-sm font-semibold mb-2 block text-gray-700 group-hover:text-[#176c9c] transition-colors">
                    Last Name *
                  </label>
                  <Input
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Enter your last name"
                    className="border-gray-200 focus:border-[#176c9c] focus:ring-[#176c9c]/20 transition-all duration-300"
                  />
                </div>
              </div>

              <div className="group">
                <label className="text-sm font-semibold mb-2 block text-gray-700 group-hover:text-[#176c9c] transition-colors">
                  Phone Number *
                </label>
                <Input
                  required
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter your phone number"
                  className="border-gray-200 focus:border-[#176c9c] focus:ring-[#176c9c]/20 transition-all duration-300"
                />
              </div>

              <div className="group">
                <label className="text-sm font-semibold mb-2 block text-gray-700 group-hover:text-[#176c9c] transition-colors">
                  Email Address *
                </label>
                <Input
                  required
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter your email address"
                  className="border-gray-200 focus:border-[#176c9c] focus:ring-[#176c9c]/20 transition-all duration-300"
                />
              </div>

              <div className="group">
                <label className="text-sm font-semibold mb-2 block text-gray-700 group-hover:text-[#176c9c] transition-colors">
                  What brings you here today? *
                </label>
                <Textarea
                  required
                  value={formData.reason}
                  onChange={(e) => setFormData((prev) => ({ ...prev, reason: e.target.value }))}
                  placeholder="Please share what you're hoping to work on or any specific concerns..."
                  rows={4}
                  className="border-gray-200 focus:border-[#176c9c] focus:ring-[#176c9c]/20 transition-all duration-300 resize-none"
                />
              </div>

              <div className="p-6 bg-gradient-to-r from-blue-50/80 to-green-50/80 rounded-2xl border border-blue-200/50">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="consent"
                    checked={formData.consent}
                    onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, consent: checked as boolean }))}
                    className="mt-1 border-[#176c9c] data-[state=checked]:bg-[#176c9c]"
                  />
                  <label htmlFor="consent" className="text-sm text-gray-700 leading-relaxed flex-1">
                    <Shield className="inline h-4 w-4 mr-1 text-[#176c9c]" />I consent to sharing my information with
                    LinkTherapy to book with my therapist and be asked for feedback on the service. Your privacy is
                    protected and information is only shared with your chosen therapist. *
                  </label>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 border-gray-300 hover:bg-gray-50 transition-all duration-300 bg-transparent"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-[#176c9c] to-[#8bb6ce] hover:from-[#145a7d] hover:to-[#176c9c] text-white font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!formData.consent || isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending...
                    </div>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Message
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
