"use client"

import { useState, useEffect } from "react"
import { MessageCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"

export function WhatsAppButton() {
  const [isVisible, setIsVisible] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true)
      // Show tooltip after 3 seconds
      setTimeout(() => setShowTooltip(true), 3000)
      // Hide tooltip after 8 seconds
      setTimeout(() => setShowTooltip(false), 8000)
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  const handleWhatsAppClick = () => {
    // Replace with your actual WhatsApp number
    const phoneNumber = "1234567890"
    const message = "Hi! I'm interested in learning more about LinkTherapy's services."
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, "_blank")
    setShowTooltip(false)
  }

  const handleCloseTooltip = () => {
    setShowTooltip(false)
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-20 right-0 mb-2 animate-slide-up">
          <div className="relative bg-white rounded-lg shadow-lg p-4 max-w-xs border border-gray-200">
            <button onClick={handleCloseTooltip} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
            <div className="pr-6">
              <p className="text-sm font-semibold text-gray-900 mb-1">Need help?</p>
              <p className="text-xs text-gray-600">Chat with us on WhatsApp for instant support!</p>
            </div>
            <div className="absolute bottom-0 right-6 transform translate-y-1/2 rotate-45 w-2 h-2 bg-white border-r border-b border-gray-200"></div>
          </div>
        </div>
      )}

      {/* WhatsApp Button */}
      <Button
        onClick={handleWhatsAppClick}
        className={`relative h-14 w-14 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg transition-all duration-500 hover:scale-110 animate-pulse-glow ${
          isVisible ? "animate-scale-in" : "opacity-0 scale-0"
        }`}
      >
        <MessageCircle className="h-7 w-7" />
        <span className="sr-only">Contact us on WhatsApp</span>

        {/* Pulse rings */}
        <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-20"></div>
        <div
          className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-20"
          style={{ animationDelay: "0.5s" }}
        ></div>
      </Button>
    </div>
  )
}
