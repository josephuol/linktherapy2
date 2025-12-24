"use client"

import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import { Search, MapPin, Heart, Globe, User, ChevronLeft, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Location, Specialty, SearchStep, SearchSelections, SearchCategory } from "@/types/search"

interface SmartSearchProps {
  locations: Location[]
  specialties: Specialty[]
  variant?: "default" | "compact"
}

export function SmartSearch({ locations, specialties, variant = "default" }: SmartSearchProps) {
  const [step, setStep] = useState<SearchStep>("initial")
  const [selections, setSelections] = useState<SearchSelections>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const isCompact = variant === "compact"

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setStep("initial")
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  const navigateToDirectory = useCallback((params: SearchSelections) => {
    const queryParams = new URLSearchParams()
    if (params.city) queryParams.set("city", params.city)
    if (params.problem) queryParams.set("problem", params.problem)
    if (params.remote) queryParams.set("remote", "true")
    if (params.q) queryParams.set("q", params.q)

    const url = `/therapists${queryParams.toString() ? `?${queryParams.toString()}` : ""}`
    window.location.href = url
  }, [])

  const handleCategorySelect = useCallback((category: SearchCategory) => {
    switch (category) {
      case "location":
        setStep("location")
        break
      case "specialty":
        setStep("specialty")
        break
      case "online":
        // Navigate directly to online therapists
        window.location.href = "/therapists?remote=true"
        break
      case "name":
        setStep("name")
        break
    }
  }, [])

  const handleLocationSelect = useCallback((city: string) => {
    setSelections(prev => ({ ...prev, city }))
    setStep("specialty")
  }, [])

  const handleSpecialtySelect = useCallback((specialty: string) => {
    setSelections(prev => {
      const newSelections = { ...prev, problem: specialty }
      navigateToDirectory(newSelections)
      return newSelections
    })
  }, [navigateToDirectory])

  const handleNameSearch = useCallback(() => {
    const q = searchQuery.trim()
    if (q) {
      window.location.href = `/therapists?q=${encodeURIComponent(q)}`
    } else {
      window.location.href = "/therapists"
    }
  }, [searchQuery])

  const handleBack = useCallback(() => {
    if (step === "location" || step === "specialty" || step === "name") {
      setStep("category")
    } else if (step === "category") {
      setStep("initial")
      setIsOpen(false)
    }
  }, [step])

  const handleInitialClick = useCallback(() => {
    setIsOpen(true)
    setStep("category")
  }, [])

  return (
    <div ref={containerRef} className="relative w-full z-[9999]">
      {/* Main Search Box */}
      <div className="relative group z-[9999]">
        <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-white/10 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-300" />
        <div className="relative flex gap-2 p-2 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30">
          {step === "initial" ? (
            <>
              <div className="relative flex-1" onClick={handleInitialClick}>
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/70 h-5 w-5 pointer-events-none" />
                <div className={`${isCompact ? "h-12" : "h-14"} pl-12 pr-4 bg-white/10 border-white/20 text-white/70 rounded-xl flex items-center cursor-pointer hover:bg-white/20 transition-all duration-300`}>
                  Search by location, specialty, or therapist name...
                </div>
              </div>
              <Button
                size={isCompact ? "sm" : "lg"}
                className={`${isCompact ? "h-12 px-6" : "h-14 px-8"} bg-white text-[#056DBA] hover:bg-blue-50 rounded-xl font-semibold transition-all duration-300 hover:scale-[1.02] hover:shadow-lg`}
                onClick={handleInitialClick}
              >
                <Sparkles className="h-5 w-5 mr-2" />
                Search
              </Button>
            </>
          ) : step === "name" ? (
            <>
              <Button
                size="sm"
                variant="ghost"
                className="h-12 px-3 text-white hover:bg-white/20 rounded-xl"
                onClick={handleBack}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="relative flex-1">
                <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/70 h-5 w-5" />
                <Input
                  placeholder="Enter therapist name..."
                  className={`${isCompact ? "h-12" : "h-14"} pl-12 bg-white/10 border-white/20 text-white placeholder:text-white/70 rounded-xl focus:bg-white/20 transition-all duration-300`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleNameSearch()
                    }
                  }}
                  autoFocus
                />
              </div>
              <Button
                size={isCompact ? "sm" : "lg"}
                className={`${isCompact ? "h-12 px-6" : "h-14 px-8"} bg-white text-[#056DBA] hover:bg-blue-50 rounded-xl font-semibold transition-all duration-300 hover:scale-[1.02] hover:shadow-lg`}
                onClick={handleNameSearch}
              >
                <Search className="h-5 w-5 mr-2" />
                Search
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="ghost"
                className={`${isCompact ? "h-12" : "h-14"} px-3 text-white hover:bg-white/20 rounded-xl`}
                onClick={handleBack}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className={`${isCompact ? "h-12" : "h-14"} flex-1 px-4 bg-white/10 border-white/20 text-white rounded-xl flex items-center`}>
                {step === "category" && "What are you looking for?"}
                {step === "location" && selections.city ? `Location: ${selections.city}` : step === "location" && "Select a location"}
                {step === "specialty" && selections.problem ? `Specialty: ${selections.problem}` : step === "specialty" && "Select a specialty"}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && step !== "initial" && step !== "name" && (
        <div className="absolute z-[99999] w-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-slide-up">
          {step === "category" && (
            <div className="p-3 space-y-2">
              <button
                onClick={() => handleCategorySelect("location")}
                className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-blue-50 transition-colors group"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <MapPin className="h-6 w-6 text-[#056DBA]" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-semibold text-gray-900">Therapist by Location</div>
                  <div className="text-sm text-gray-500">Find therapists near you</div>
                </div>
              </button>

              <button
                onClick={() => handleCategorySelect("specialty")}
                className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-blue-50 transition-colors group"
              >
                <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center group-hover:bg-pink-200 transition-colors">
                  <Heart className="h-6 w-6 text-pink-600" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-semibold text-gray-900">Therapist by Specialty</div>
                  <div className="text-sm text-gray-500">Find specialists for your needs</div>
                </div>
              </button>

              <button
                onClick={() => handleCategorySelect("online")}
                className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-blue-50 transition-colors group"
              >
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200 transition-colors">
                  <Globe className="h-6 w-6 text-green-600" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-semibold text-gray-900">Online Therapy</div>
                  <div className="text-sm text-gray-500">Remote sessions from anywhere</div>
                </div>
              </button>

              <button
                onClick={() => handleCategorySelect("name")}
                className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-blue-50 transition-colors group"
              >
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                  <User className="h-6 w-6 text-purple-600" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-semibold text-gray-900">Search by Name</div>
                  <div className="text-sm text-gray-500">Find a specific therapist</div>
                </div>
              </button>
            </div>
          )}

          {step === "location" && (
            <div className="max-h-[400px] overflow-y-auto">
              <div className="p-3 space-y-1">
                {locations.length > 0 ? (
                  locations.map((location) => (
                    <button
                      key={location.id}
                      onClick={() => handleLocationSelect(location.city)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50 transition-colors text-left"
                    >
                      <MapPin className="h-5 w-5 text-[#056DBA]" />
                      <div>
                        <div className="font-medium text-gray-900">{location.city}</div>
                        {location.country && <div className="text-sm text-gray-500">{location.country}</div>}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-6 text-center text-gray-500">No locations available</div>
                )}
              </div>
            </div>
          )}

          {step === "specialty" && (
            <div className="max-h-[400px] overflow-y-auto">
              <div className="p-3 space-y-1">
                {specialties.length > 0 ? (
                  specialties.map((specialty) => (
                    <button
                      key={specialty.id}
                      onClick={() => handleSpecialtySelect(specialty.name)}
                      className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-blue-50 transition-colors text-left"
                    >
                      <Heart className="h-5 w-5 text-pink-600 mt-0.5" />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{specialty.name}</div>
                        {specialty.description && <div className="text-sm text-gray-500 mt-0.5">{specialty.description}</div>}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-6 text-center text-gray-500">No specialties available</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
