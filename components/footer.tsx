"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Heart, Mail, Phone, MapPin, Instagram } from "lucide-react"

export function Footer() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 },
    )

    const element = document.getElementById("footer")
    if (element) observer.observe(element)

    return () => observer.disconnect()
  }, [])

  return (
    <footer
      id="footer"
      className="bg-gradient-to-br from-gray-900 via-[#056DBA] to-gray-900 text-white py-16 relative overflow-hidden"
    >
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div
          className="absolute top-10 left-10 w-32 h-32 bg-white/5 rounded-full animate-float"
          style={{ animationDelay: "0s" }}
        />
        <div
          className="absolute top-32 right-20 w-24 h-24 bg-white/5 rounded-full animate-float"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="absolute bottom-20 left-1/4 w-20 h-20 bg-white/5 rounded-full animate-float"
          style={{ animationDelay: "1s" }}
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className={`grid grid-cols-1 md:grid-cols-4 gap-8 stagger-animation ${isVisible ? "" : "opacity-0"}`}>
          {/* Company Info */}
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-3 text-2xl font-bold mb-6 group">
              <div className="relative">
                <Heart className="h-8 w-8 text-pink-300 group-hover:scale-110 transition-transform duration-300" />
                <div className="absolute inset-0 bg-pink-300 rounded-full blur-lg opacity-20 group-hover:opacity-40 transition-opacity duration-300" />
              </div>
              <span className="bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">LinkTherapy</span>
            </Link>
            <p className="text-blue-100 mb-6 leading-relaxed max-w-md">
              Connecting you with qualified mental health professionals to support your journey to wellness. Your mental
              health matters, and we're here to help you find the right support.
            </p>
            <div className="space-y-3 text-sm text-blue-100">
              
              <div className="flex items-center gap-3 group hover:text-white transition-colors">
                <div className="p-2 bg-white/10 rounded-full group-hover:bg-white/20 transition-colors">
                  <Phone className="h-4 w-4" />
                </div>
                <span>+961 79 107 042</span>
              </div>
              <div className="flex items-center gap-3 group hover:text-white transition-colors">
                <div className="p-2 bg-white/10 rounded-full group-hover:bg-white/20 transition-colors">
                  <MapPin className="h-4 w-4" />
                </div>
                <span>Available Nationwide</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-bold mb-6 text-lg">Quick Links</h3>
            <div className="space-y-3">
              <Link
                href="/"
                className="block text-blue-100 hover:text-white transition-all duration-300 hover:translate-x-2 hover:scale-105"
              >
                🏠 Find Therapists
              </Link>
              <Link
                href="/how-to-choose"
                className="block text-blue-100 hover:text-white transition-all duration-300 hover:translate-x-2 hover:scale-105"
              >
                🎯 How to Choose
              </Link>
              <Link
                href="/therapists"
                className="block text-blue-100 hover:text-white transition-all duration-300 hover:translate-x-2 hover:scale-105"
              >
                🧠 Therapist Directory
              </Link>
              <Link
                href="/for-therapists"
                className="block text-blue-100 hover:text-white transition-all duration-300 hover:translate-x-2 hover:scale-105"
              >
                👩‍⚕️ For Therapists
              </Link>
            </div>
          </div>

          {/* Resources & Legal */}
          <div>
            <h3 className="font-bold mb-6 text-lg">Resources & Legal</h3>
            <div className="space-y-3">
              {/* TODO: Create /about page
              <Link
                href="/about"
                className="block text-blue-100 hover:text-white transition-all duration-300 hover:translate-x-2 hover:scale-105"
              >
                ℹ️ About Us
              </Link>
              */}
              <Link
                href="/contact"
                className="block text-blue-100 hover:text-white transition-all duration-300 hover:translate-x-2 hover:scale-105"
              >
                📞 Contact Us
              </Link>
              <Link
                href="/privacy"
                className="block text-blue-100 hover:text-white transition-all duration-300 hover:translate-x-2 hover:scale-105"
              >
                🔒 Privacy Policy
              </Link>
              {/* TODO: Create /terms page
              <Link
                href="/terms"
                className="block text-blue-100 hover:text-white transition-all duration-300 hover:translate-x-2 hover:scale-105"
              >
                📋 Terms of Service
              </Link>
              */}
            </div>
          </div>
        </div>

        {/* Social Media & Bottom Section */}
        <div
          className={`border-t border-white/20 mt-12 pt-8 transition-all duration-1000 delay-500 ${isVisible ? "animate-slide-up" : "opacity-0"}`}
        >
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-6">
              <span className="text-blue-100">Follow us:</span>
              <div className="flex gap-4">
                <a
                  href="#"
                  aria-label="Instagram"
                  className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-all duration-300 hover:scale-110 hover:rotate-12"
                >
                  <Instagram className="h-5 w-5" />
                </a>
                <a
                  href="#"
                  aria-label="TikTok"
                  className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-all duration-300 hover:scale-110 hover:rotate-12"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-5 w-5" fill="currentColor">
                    <path d="M39.6 17.2c-3.3 0-6.5-1.1-9-3.2v14.2c0 6.6-5.4 12-12 12S6.6 34.8 6.6 28.2c0-6.6 5.4-12 12-12 1 0 2 .1 3 .4v5.4c-.9-.4-1.9-.6-3-.6-3.7 0-6.6 3-6.6 6.6s3 6.6 6.6 6.6 6.6-3 6.6-6.6V4.2h5c.8 2.8 3.1 5.1 5.8 6v6.9z"/>
                  </svg>
                </a>
              </div>
            </div>
            <div className="text-center text-blue-100">
              <p>&copy; 2025 LinkTherapy. All rights reserved.</p>
              <p className="text-sm mt-1">Made with ❤️ for mental health</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
