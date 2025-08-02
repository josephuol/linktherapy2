"use client"

import { useState, useEffect } from "react"
import { Search, Sparkles, Heart, Users, Award } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function HeroSection() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <section className="relative min-h-screen bg-gradient-to-br from-[#176c9c] via-[#8bb6ce] to-[#d1e2eb] text-white overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div
          className="absolute top-20 left-10 w-32 h-32 bg-white/10 rounded-full animate-float"
          style={{ animationDelay: "0s" }}
        />
        <div
          className="absolute top-40 right-20 w-24 h-24 bg-white/10 rounded-full animate-float"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="absolute bottom-32 left-1/4 w-20 h-20 bg-white/10 rounded-full animate-float"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="absolute bottom-20 right-1/3 w-28 h-28 bg-white/10 rounded-full animate-float"
          style={{ animationDelay: "0.5s" }}
        />
      </div>

      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          {/* Main heading with staggered animation */}
          <div className={`transition-all duration-1000 ${isVisible ? "animate-slide-up" : "opacity-0"}`}>
            <div className="flex items-center justify-center gap-2 mb-6">
              <Heart className="h-8 w-8 text-pink-300 animate-pulse" />
              <span className="text-lg font-medium text-blue-100">Welcome to LinkTherapy</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent animate-gradient">
              Find Your Perfect Therapist
            </h1>
          </div>

          <div className={`transition-all duration-1000 delay-300 ${isVisible ? "animate-slide-up" : "opacity-0"}`}>
            <p className="text-xl md:text-2xl mb-8 text-blue-100 leading-relaxed">
              Connect with qualified mental health professionals who understand your journey
            </p>
          </div>

          {/* Search bar with enhanced styling */}
          <div
            className={`max-w-3xl mx-auto mb-12 transition-all duration-1000 delay-500 ${isVisible ? "animate-scale-in" : "opacity-0"}`}
          >
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-white/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300" />
              <div className="relative flex gap-3 p-2 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/70 h-5 w-5" />
                  <Input
                    placeholder="Search by location, specialty, or therapist name..."
                    className="pl-12 h-14 bg-white/10 border-white/20 text-white placeholder:text-white/70 rounded-xl focus:bg-white/20 transition-all duration-300"
                  />
                </div>
                <Button
                  size="lg"
                  className="h-14 px-8 bg-white text-[#176c9c] hover:bg-blue-50 rounded-xl font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg"
                >
                  <Sparkles className="h-5 w-5 mr-2" />
                  Search
                </Button>
              </div>
            </div>
          </div>

          {/* Stats section */}
          <div
            className={`grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto transition-all duration-1000 delay-700 ${isVisible ? "animate-slide-up" : "opacity-0"}`}
          >
            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4 group-hover:scale-110 transition-transform duration-300">
                <Users className="h-8 w-8 text-white" />
              </div>
              <div className="text-3xl font-bold mb-2">500+</div>
              <div className="text-blue-100">Qualified Therapists</div>
            </div>
            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4 group-hover:scale-110 transition-transform duration-300">
                <Heart className="h-8 w-8 text-white" />
              </div>
              <div className="text-3xl font-bold mb-2">10k+</div>
              <div className="text-blue-100">Lives Improved</div>
            </div>
            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4 group-hover:scale-110 transition-transform duration-300">
                <Award className="h-8 w-8 text-white" />
              </div>
              <div className="text-3xl font-bold mb-2">4.9</div>
              <div className="text-blue-100">Average Rating</div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-white/70 rounded-full mt-2 animate-pulse" />
        </div>
      </div>
    </section>
  )
}
