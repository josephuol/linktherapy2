"use client"

import { useState, useEffect } from "react"
import { Filter, MapPin, Star, DollarSign, Clock, Heart, Award, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { ContactModal } from "@/components/contact-modal"

// Mock therapist data with enhanced information
const therapists = [
  {
    id: 1,
    name: "Dr. Sarah Johnson",
    image: "/placeholder.svg?height=200&width=200",
    specialty: "Anxiety & Depression",
    location: "Downtown, City Center",
    city: "downtown",
    experience: 8,
    price: 120,
    rating: 4.9,
    reviews: 127,
    bio: "Specializing in cognitive behavioral therapy with over 8 years of experience helping clients overcome anxiety and depression.",
    credentials: "PhD in Clinical Psychology, Licensed Clinical Psychologist",
    verified: true,
    responseTime: "Usually responds within 2 hours",
    languages: ["English", "Spanish"],
  },
  {
    id: 2,
    name: "Dr. Michael Chen",
    image: "/placeholder.svg?height=200&width=200",
    specialty: "Couples Therapy",
    location: "Westside District",
    city: "westside",
    experience: 12,
    price: 150,
    rating: 4.8,
    reviews: 89,
    bio: "Expert in relationship counseling and family therapy, helping couples build stronger connections.",
    credentials: "PhD in Marriage & Family Therapy, Licensed Marriage Counselor",
    verified: true,
    responseTime: "Usually responds within 4 hours",
    languages: ["English", "Mandarin"],
  },
  {
    id: 3,
    name: "Dr. Emily Rodriguez",
    image: "/placeholder.svg?height=200&width=200",
    specialty: "Trauma & PTSD",
    location: "North Hills",
    city: "north",
    experience: 10,
    price: 135,
    rating: 4.9,
    reviews: 156,
    bio: "Specialized in trauma-informed care and EMDR therapy for PTSD and complex trauma recovery.",
    credentials: "PhD in Clinical Psychology, EMDR Certified Therapist",
    verified: true,
    responseTime: "Usually responds within 1 hour",
    languages: ["English", "Spanish", "French"],
  },
  {
    id: 4,
    name: "Dr. James Wilson",
    image: "/placeholder.svg?height=200&width=200",
    specialty: "Addiction Recovery",
    location: "East Side",
    city: "east",
    experience: 15,
    price: 110,
    rating: 4.7,
    reviews: 203,
    bio: "Comprehensive addiction treatment and recovery support with evidence-based approaches.",
    credentials: "PhD in Addiction Psychology, Certified Addiction Counselor",
    verified: true,
    responseTime: "Usually responds within 3 hours",
    languages: ["English"],
  },
  {
    id: 5,
    name: "Dr. Lisa Park",
    image: "/placeholder.svg?height=200&width=200",
    specialty: "Child Psychology",
    location: "Suburban Area",
    city: "suburban",
    experience: 6,
    price: 125,
    rating: 4.8,
    reviews: 94,
    bio: "Specialized in child and adolescent therapy with focus on behavioral and developmental issues.",
    credentials: "PhD in Child Psychology, Licensed Child Therapist",
    verified: true,
    responseTime: "Usually responds within 3 hours",
    languages: ["English", "Korean"],
  },
  {
    id: 6,
    name: "Dr. Robert Martinez",
    image: "/placeholder.svg?height=200&width=200",
    specialty: "Family Therapy",
    location: "Central District",
    city: "central",
    experience: 20,
    price: 140,
    rating: 4.9,
    reviews: 178,
    bio: "Experienced family therapist helping families navigate complex relationships and communication challenges.",
    credentials: "PhD in Family Therapy, Licensed Family Counselor",
    verified: true,
    responseTime: "Usually responds within 2 hours",
    languages: ["English", "Spanish"],
  },
]

export function TherapistDirectory() {
  const [selectedTherapist, setSelectedTherapist] = useState<(typeof therapists)[0] | null>(null)
  const [sortBy, setSortBy] = useState("rating")
  const [priceRange, setPriceRange] = useState([50, 200])
  const [specialtyFilter, setSpecialtyFilter] = useState("all")
  const [locationFilter, setLocationFilter] = useState("all")
  const [isVisible, setIsVisible] = useState(false)
  const [experienceFilter, setExperienceFilter] = useState("all")

  useEffect(() => {
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
        return b.price - a.price
      case "price-low":
        return a.price - b.price
      case "experience":
        return b.experience - a.experience
      case "rating":
      default:
        return b.rating - a.rating
    }
  })

  const filteredTherapists = sortedTherapists.filter((therapist) => {
    const priceMatch = therapist.price >= priceRange[0] && therapist.price <= priceRange[1]
    const specialtyMatch =
      specialtyFilter === "all" || therapist.specialty.toLowerCase().includes(specialtyFilter.toLowerCase())
    const locationMatch = locationFilter === "all" || therapist.city === locationFilter
    const experienceMatch =
      experienceFilter === "all" ||
      (experienceFilter === "0-5" && therapist.experience <= 5) ||
      (experienceFilter === "6-10" && therapist.experience >= 6 && therapist.experience <= 10) ||
      (experienceFilter === "11-15" && therapist.experience >= 11 && therapist.experience <= 15) ||
      (experienceFilter === "16+" && therapist.experience >= 16)

    return priceMatch && specialtyMatch && locationMatch && experienceMatch
  })

  return (
    <section id="therapist-directory" className="py-20 bg-gradient-to-br from-gray-50 via-white to-[#d1e8d9]/20">
      <div className="container mx-auto px-4">
        <div
          className={`text-center mb-16 transition-all duration-1000 ${isVisible ? "animate-slide-up" : "opacity-0"}`}
        >
          <div className="inline-flex items-center gap-2 bg-[#176c9c]/10 px-4 py-2 rounded-full mb-4">
            <Heart className="h-5 w-5 text-[#176c9c]" />
            <span className="text-[#176c9c] font-medium">Find Your Match</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Meet Our <span className="text-[#176c9c]">Expert Therapists</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Browse through our carefully vetted network of mental health professionals
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Enhanced Filters Sidebar */}
          <div className="lg:w-1/4">
            <div
              className={`transition-all duration-1000 delay-200 ${isVisible ? "animate-slide-in-left" : "opacity-0"}`}
            >
              <Card className="sticky top-8 hover-lift border-0 shadow-lg bg-gradient-to-br from-white to-blue-50/50">
                <CardHeader className="pb-4">
                  <h3 className="text-xl font-bold flex items-center gap-2 text-gray-900">
                    <Filter className="h-5 w-5 text-[#176c9c]" />
                    Refine Your Search
                  </h3>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="group">
                    <label className="text-sm font-semibold mb-3 block text-gray-700 group-hover:text-[#176c9c] transition-colors">
                      Sort By
                    </label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="border-gray-200 hover:border-[#176c9c] transition-colors">
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
                    <label className="text-sm font-semibold mb-3 block text-gray-700 group-hover:text-[#176c9c] transition-colors">
                      Specialty
                    </label>
                    <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
                      <SelectTrigger className="border-gray-200 hover:border-[#176c9c] transition-colors">
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
                    <label className="text-sm font-semibold mb-3 block text-gray-700 group-hover:text-[#176c9c] transition-colors">
                      Location
                    </label>
                    <Select value={locationFilter} onValueChange={setLocationFilter}>
                      <SelectTrigger className="border-gray-200 hover:border-[#176c9c] transition-colors">
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
                    <label className="text-sm font-semibold mb-3 block text-gray-700 group-hover:text-[#176c9c] transition-colors">
                      Years of Experience
                    </label>
                    <Select value={experienceFilter} onValueChange={setExperienceFilter}>
                      <SelectTrigger className="border-gray-200 hover:border-[#176c9c] transition-colors">
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
                    <label className="text-sm font-semibold mb-3 block text-gray-700 group-hover:text-[#176c9c] transition-colors">
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
          <div className="lg:w-3/4">
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
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#176c9c] to-[#8bb6ce]" />

                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      <div className="relative">
                        <div className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-white shadow-lg group-hover:ring-[#176c9c]/20 transition-all duration-300">
                          <img
                            src={therapist.image || "/placeholder.svg"}
                            alt={therapist.name}
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
                          <h3 className="text-xl font-bold text-gray-900 group-hover:text-[#176c9c] transition-colors">
                            {therapist.name}
                          </h3>
                          <div className="flex items-center gap-1 text-yellow-500">
                            <Star className="h-4 w-4 fill-current" />
                            <span className="font-semibold text-gray-900">{therapist.rating}</span>
                          </div>
                        </div>

                        <Badge
                          variant="secondary"
                          className="mb-3 bg-[#176c9c]/10 text-[#176c9c] hover:bg-[#176c9c]/20 transition-colors"
                        >
                          {therapist.specialty}
                        </Badge>

                        <div className="space-y-2 text-sm text-gray-600 mb-4">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-[#176c9c]" />
                            {therapist.location}
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-[#176c9c]" />
                            {therapist.experience} years experience
                          </div>
                          <div className="flex items-center gap-2">
                            <MessageCircle className="h-4 w-4 text-[#176c9c]" />
                            {therapist.responseTime}
                          </div>
                        </div>

                        <p className="text-sm text-gray-600 mb-4 line-clamp-2 group-hover:text-gray-700 transition-colors">
                          {therapist.bio}
                        </p>

                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-1 font-bold text-[#176c9c] text-lg">
                            <DollarSign className="h-5 w-5" />
                            {therapist.price}
                            <span className="text-sm font-normal text-gray-500">/session</span>
                          </div>
                          <div className="text-sm text-gray-500">({therapist.reviews} reviews)</div>
                        </div>

                        <Button
                          onClick={() => setSelectedTherapist(therapist)}
                          className="w-full bg-gradient-to-r from-[#176c9c] to-[#8bb6ce] hover:from-[#145a7d] hover:to-[#176c9c] text-white font-semibold py-3 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg group-hover:animate-pulse-glow"
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
