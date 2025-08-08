"use client"

import { useState, useEffect } from "react"
import { Filter, MapPin, Star, DollarSign, Clock, Heart, Award, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { ContactModal } from "@/components/contact-modal"

type PublicTherapist = {
  id: string
  full_name: string | null
  title: string | null
  profile_image_url: string | null
  bio_short: string | null
  years_of_experience: number | null
  session_price_60_min: number | null
  session_price_30_min: number | null
  ranking_points: number | null
  rating: number | null
}

export function TherapistDirectory({ initialTherapists = [] as any[] }: { initialTherapists?: any[] }) {
  const [selectedTherapist, setSelectedTherapist] = useState<any>(null)
  const [sortBy, setSortBy] = useState("rating")
  const [priceRange, setPriceRange] = useState([50, 200])
  const [specialtyFilter, setSpecialtyFilter] = useState("all")
  const [locationFilter, setLocationFilter] = useState("all")
  const [isVisible, setIsVisible] = useState(false)
  const [experienceFilter, setExperienceFilter] = useState("all")
  const [therapists, setTherapists] = useState<PublicTherapist[]>(initialTherapists as any)

  useEffect(() => {
    // Background refresh after first paint
    ;(async () => {
      try {
        const res = await fetch("/api/therapists", { cache: "no-store" })
        const json = await res.json()
        if (Array.isArray(json.therapists)) setTherapists(json.therapists)
      } catch {}
    })()
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 },
    )

    const element = document.getElementById("therapist-directory")
    if (element) observer.observe(element)

    return () => observer.disconnect()
  }, [])

  const sortedTherapists = [...therapists].sort((a, b) => {
    switch (sortBy) {
      case "price-high":
        return (b.session_price_60_min || 0) - (a.session_price_60_min || 0)
      case "price-low":
        return (a.session_price_60_min || 0) - (b.session_price_60_min || 0)
      case "experience":
        return (b.years_of_experience || 0) - (a.years_of_experience || 0)
      case "rating":
      default:
        return (b.rating || 0) - (a.rating || 0)
    }
  })

  const filteredTherapists = sortedTherapists.filter((therapist) => {
    const price = therapist.session_price_60_min || 0
    const exp = therapist.years_of_experience || 0
    const priceMatch = price >= priceRange[0] && price <= priceRange[1]
    const specialtyMatch = specialtyFilter === "all"
    const locationMatch = locationFilter === "all"
    const experienceMatch =
      experienceFilter === "all" ||
      (experienceFilter === "0-5" && exp <= 5) ||
      (experienceFilter === "6-10" && exp >= 6 && exp <= 10) ||
      (experienceFilter === "11-15" && exp >= 11 && exp <= 15) ||
      (experienceFilter === "16+" && exp >= 16)

    return priceMatch && specialtyMatch && locationMatch && experienceMatch
  })

  return (
    <section id="therapist-directory" className="py-20 bg-gradient-to-br from-gray-50 via-white to-blue-50/20">
      <div className="container mx-auto px-4">
        <div
          className={`text-center mb-16 transition-all duration-1000 ${isVisible ? "animate-slide-up" : "opacity-0"}`}
        >
          <div className="inline-flex items-center gap-2 bg-[#056DBA]/10 px-4 py-2 rounded-full mb-4">
            <Heart className="h-5 w-5 text-[#176c9c]" />
            <span className="text-[#056DBA] font-medium">Find Your Match</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Meet Our <span className="text-[#056DBA]">Expert Therapists</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Browse through our carefully vetted network of mental health professionals
          </p>
          <div className="mt-8 flex items-center justify-center gap-4 flex-wrap">
            <Button
              asChild
              size="lg"
              className="bg-[#056DBA] hover:bg-[#045A99] text-white shadow-md"
            >
              <a href="#therapist-directory">Get Matched With a Therapist</a>
            </Button>
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="bg-white text-[#056DBA] border border-[#056DBA]/30 hover:bg-blue-50"
            >
              <Link href="/how-to-choose">Explore Personal Growth</Link>
            </Button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Enhanced Filters Sidebar */}
          <div className="w-full lg:w-1/4">
            <div
              className={`transition-all duration-1000 delay-200 ${isVisible ? "animate-slide-in-left" : "opacity-0"}`}
            >
              <Card className="lg:sticky lg:top-8 hover-lift border-0 shadow-lg bg-gradient-to-br from-white to-blue-50/50 max-w-md mx-auto lg:mx-0">
                <CardHeader className="pb-4">
                  <h3 className="text-xl font-bold flex items-center gap-2 text-gray-900">
                    <Filter className="h-5 w-5 text-[#056DBA]" />
                    Refine Your Search
                  </h3>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="group">
                    <label className="text-sm font-semibold mb-3 block text-gray-700 group-hover:text-[#176c9c] transition-colors">
                      Sort By
                    </label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="border-gray-200 hover:border-[#056DBA] transition-colors">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rating">⭐ Highest Rated</SelectItem>
                        <SelectItem value="price-high">💰 Price: High to Low</SelectItem>
                        <SelectItem value="price-low">💸 Price: Low to High</SelectItem>
                        <SelectItem value="experience">🎓 Most Experience</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="group">
                    <label className="text-sm font-semibold mb-3 block text-gray-700 group-hover:text-[#056DBA] transition-colors">
                      Specialty
                    </label>
                    <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
                      <SelectTrigger className="border-gray-200 hover:border-[#056DBA] transition-colors">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Specialties</SelectItem>
                        <SelectItem value="anxiety">🧠 Anxiety & Depression</SelectItem>
                        <SelectItem value="couples">💕 Couples Therapy</SelectItem>
                        <SelectItem value="trauma">🛡️ Trauma & PTSD</SelectItem>
                        <SelectItem value="addiction">🔄 Addiction Recovery</SelectItem>
                        <SelectItem value="child">👶 Child Psychology</SelectItem>
                        <SelectItem value="family">👨‍👩‍👧‍👦 Family Therapy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="group">
                    <label className="text-sm font-semibold mb-3 block text-gray-700 group-hover:text-[#056DBA] transition-colors">
                      Location
                    </label>
                    <Select value={locationFilter} onValueChange={setLocationFilter}>
                      <SelectTrigger className="border-gray-200 hover:border-[#056DBA] transition-colors">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">📍 All Locations</SelectItem>
                        <SelectItem value="downtown">🏢 Downtown</SelectItem>
                        <SelectItem value="westside">🌅 Westside</SelectItem>
                        <SelectItem value="north">⛰️ North Hills</SelectItem>
                        <SelectItem value="east">🌆 East Side</SelectItem>
                        <SelectItem value="suburban">🏘️ Suburban Area</SelectItem>
                        <SelectItem value="central">🏛️ Central District</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="group">
                    <label className="text-sm font-semibold mb-3 block text-gray-700 group-hover:text-[#056DBA] transition-colors">
                      Years of Experience
                    </label>
                    <Select value={experienceFilter} onValueChange={setExperienceFilter}>
                      <SelectTrigger className="border-gray-200 hover:border-[#056DBA] transition-colors">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">🎯 Any Experience</SelectItem>
                        <SelectItem value="0-5">🌱 0-5 Years</SelectItem>
                        <SelectItem value="6-10">📈 6-10 Years</SelectItem>
                        <SelectItem value="11-15">🏆 11-15 Years</SelectItem>
                        <SelectItem value="16+">👑 16+ Years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="group">
                    <label className="text-sm font-semibold mb-3 block text-gray-700 group-hover:text-[#056DBA] transition-colors">
                      Price Range: ${priceRange[0]} - ${priceRange[1]}
                    </label>
                    <div className="px-2">
                      <Slider
                        value={priceRange}
                        onValueChange={setPriceRange}
                        max={250}
                        min={50}
                        step={10}
                        className="mt-2"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Enhanced Therapist Grid */}
          <div className="lg:w-3/4 w-full max-w-5xl mx-auto">
            <div
              className={`mb-8 transition-all duration-1000 delay-300 ${isVisible ? "animate-slide-in-right" : "opacity-0"}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    Available Therapists ({filteredTherapists.length})
                  </h3>
                  <p className="text-gray-600">Find the right mental health professional for your needs</p>
                </div>
                <div className="hidden md:flex items-center gap-2 text-sm text-gray-500">
                  <Award className="h-4 w-4" />
                  All therapists are verified
                </div>
              </div>
            </div>

            <div className={`grid gap-8 md:grid-cols-2 stagger-animation ${isVisible ? "" : "opacity-0"}`}>
              {filteredTherapists.map((therapist, index) => (
                <Card
                  key={therapist.id}
                  className="group hover-lift border-0 shadow-lg hover:shadow-2xl transition-all duration-500 bg-gradient-to-br from-white to-gray-50/50 overflow-hidden"
                  style={{ animationDelay: `${(index + 4) * 0.1}s` }}
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-[#056DBA]" />

                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      <div className="relative">
                        <div className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-white shadow-lg group-hover:ring-[#176c9c]/20 transition-all duration-300">
                          <img
                            src={therapist.profile_image_url || "/placeholder.svg"}
                            alt={therapist.full_name || "Therapist"}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        </div>
                        {therapist.verified && (
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                            <Award className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-xl font-bold text-gray-900 group-hover:text-[#056DBA] transition-colors">
                            {therapist.full_name}
                          </h3>
                          <div className="flex items-center gap-1 text-yellow-500">
                            <Star className="h-4 w-4 fill-current" />
                            <span className="font-semibold text-gray-900">{therapist.rating}</span>
                          </div>
                        </div>

                        {therapist.title && (
                          <Badge
                            variant="secondary"
                            className="mb-3 bg-[#056DBA]/10 text-[#056DBA] hover:bg-[#056DBA]/20 transition-colors"
                          >
                            {therapist.title}
                          </Badge>
                        )}

                        <div className="space-y-2 text-sm text-gray-600 mb-4">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-[#056DBA]" />
                            Public profile
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-[#056DBA]" />
                            {(therapist.years_of_experience || 0)} years experience
                          </div>
                          <div className="flex items-center gap-2">
                            <MessageCircle className="h-4 w-4 text-[#056DBA]" />
                            Typically responds within 24 hours
                          </div>
                        </div>

                        <p className="text-sm text-gray-600 mb-4 line-clamp-2 group-hover:text-gray-700 transition-colors">
                          {therapist.bio}
                        </p>

                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-1 font-bold text-[#056DBA] text-lg">
                            <DollarSign className="h-5 w-5" />
                            {therapist.session_price_60_min || "—"}
                            <span className="text-sm font-normal text-gray-500">/session</span>
                          </div>
                          <div className="text-sm text-gray-500">({therapist.reviews} reviews)</div>
                        </div>

                          <Button
                          onClick={() => setSelectedTherapist({
                            id: therapist.id,
                            name: therapist.full_name || "",
                            image: therapist.profile_image_url || "/placeholder.svg",
                            specialty: therapist.title || "",
                            location: "",
                            city: "",
                            experience: therapist.years_of_experience || 0,
                            price: therapist.session_price_60_min || 0,
                            rating: therapist.rating || 0,
                            reviews: 0,
                            bio: therapist.bio_short || "",
                            credentials: "",
                            verified: true,
                            responseTime: "Usually responds within 24 hours",
                            languages: [],
                          })}
                            className="w-full bg-[#056DBA] hover:bg-[#045A99] text-white font-semibold py-3 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg group-hover:animate-pulse-glow"
                        >
                          <Heart className="h-4 w-4 mr-2" />
                          Connect Now
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ContactModal
        therapist={selectedTherapist}
        isOpen={!!selectedTherapist}
        onClose={() => setSelectedTherapist(null)}
      />
    </section>
  )
}
