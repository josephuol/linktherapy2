"use client"

import React, { useState, useEffect } from "react"
import Image from "next/image"
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
  session_price_45_min: number | null
  ranking_points: number | null
  rating: number | null
  total_sessions: number | null
  status?: string | null
  average_response_time_hours?: number | null
  interests?: string[] | null
  lgbtq_friendly?: boolean | null
  gender?: string | null
  religion?: string | null
  age_range?: string | null
  locations?: string[] | null
}

export function TherapistDirectory({ initialTherapists = [] as any[], interestsLabel = "Interests", showFilters = true, limit }: { initialTherapists?: any[], interestsLabel?: string, showFilters?: boolean, limit?: number }) {
  const [selectedTherapist, setSelectedTherapist] = useState<any>(null)
  const [sortBy, setSortBy] = useState("ranking")
  const [priceRange, setPriceRange] = useState([0, 250])
  const [problemFilter, setProblemFilter] = useState("all")
  const [cityFilter, setCityFilter] = useState("all")
  const [areaFilter, setAreaFilter] = useState("all")
  const [isVisible, setIsVisible] = useState(false)
  const [experienceFilter, setExperienceFilter] = useState("all")
  const [genderFilter, setGenderFilter] = useState("all")
  const [lgbtqFilter, setLgbtqFilter] = useState("all")
  const [religionFilter, setReligionFilter] = useState("all")
  const [ageFilter, setAgeFilter] = useState("all")
  const [therapists, setTherapists] = useState<PublicTherapist[]>(initialTherapists as any)
  const [query, setQuery] = useState<string>("")

  useEffect(() => {
    // Background refresh after first paint
    ; (async () => {
      try {
        const res = await fetch("/api/therapists", { cache: "no-store" })
        const json = await res.json()
        if (Array.isArray(json.therapists)) setTherapists(json.therapists)
      } catch { }
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

  // Parse URL params for server-side redirected quiz selections
  useEffect(() => {
    if (!showFilters) return
    const params = new URLSearchParams(window.location.search)
    const problemParam = params.get("problem")
    const cityParam = params.get("city")
    const areaParam = params.get("area")
    const genderParam = params.get("gender")
    const lgbtqParam = params.get("lgbtq")
    const religionParam = params.get("religion")
    const ageParam = params.get("age")
    const expParam = params.get("exp")
    const minParam = params.get("price_min")
    const maxParam = params.get("price_max")
    const qParam = params.get("q")
    // Only apply price bounds if both exist
    if (minParam && maxParam) {
      const min = Math.max(0, parseInt(minParam, 10) || 0)
      const max = Math.max(min, parseInt(maxParam, 10) || 0)
      setPriceRange([min, max])
    }
    if (problemParam) setProblemFilter(problemParam)
    if (cityParam) setCityFilter(cityParam)
    if (areaParam) setAreaFilter(areaParam)
    if (genderParam) setGenderFilter(genderParam)
    if (lgbtqParam) setLgbtqFilter(lgbtqParam)
    if (religionParam) setReligionFilter(religionParam)
    if (ageParam) setAgeFilter(ageParam)
    if (qParam) setQuery(qParam)
    if (expParam) {
      // Map bands to existing options where possible
      const band = expParam
      if (["0-5", "6-10", "11-15", "16+", "1-3", "4-7", "7-10", "10+"].includes(band)) {
        // Normalize to our buckets
        const mapped = band === "1-3" ? "0-5" : band === "4-7" ? "6-10" : band === "7-10" ? "6-10" : band === "10+" ? "16+" : band
        setExperienceFilter(mapped)
      }
    }
  }, [showFilters])

  const sortedTherapists = [...therapists].sort((a, b) => {
    switch (sortBy) {
      case "price-high":
        return (b.session_price_45_min || 0) - (a.session_price_45_min || 0)
      case "price-low":
        return (a.session_price_45_min || 0) - (b.session_price_45_min || 0)
      case "experience":
        return (b.years_of_experience || 0) - (a.years_of_experience || 0)
      case "rating":
        return (b.rating || 0) - (a.rating || 0)
      case "ranking":
      default:
        return (b.ranking_points || 0) - (a.ranking_points || 0)
    }
  })

  const filteredTherapists = sortedTherapists.filter((therapist) => {
    const price = therapist.session_price_45_min || 0
    const exp = therapist.years_of_experience || 0
    const priceMatch = price >= priceRange[0] && price <= priceRange[1]
    const problemMatch = problemFilter === "all" || (Array.isArray((therapist as any).interests) && ((therapist as any).interests as string[]).some(i => i?.toLowerCase?.() === problemFilter.toLowerCase()))
    const genderMatch = genderFilter === "all" || (therapist.gender || "").toLowerCase() === genderFilter.toLowerCase()
    const lgbtqMatch = lgbtqFilter === "all" || (lgbtqFilter.toLowerCase() === "yes" ? !!therapist.lgbtq_friendly : true)
    const religionMatch = religionFilter === "all" || (therapist.religion || "").toLowerCase() === religionFilter.toLowerCase()
    const ageMatch = ageFilter === "all" || (therapist.age_range || "").toLowerCase() === ageFilter.toLowerCase()
    const cityMatch = cityFilter === "all" || (Array.isArray(therapist.locations) && (therapist.locations as string[]).some(l => l?.toLowerCase?.() === cityFilter.toLowerCase()))
    const areaMatch = areaFilter === "all" || (Array.isArray(therapist.locations) && (therapist.locations as string[]).some(l => l?.toLowerCase?.() === areaFilter.toLowerCase()))
    const experienceMatch =
      experienceFilter === "all" ||
      (experienceFilter === "0-5" && exp <= 5) ||
      (experienceFilter === "6-10" && exp >= 6 && exp <= 10) ||
      (experienceFilter === "11-15" && exp >= 11 && exp <= 15) ||
      (experienceFilter === "16+" && exp >= 16)

    const q = (query || "").trim().toLowerCase()
    const qMatch = !q || [
      therapist.full_name || "",
      therapist.title || "",
      therapist.bio_short || "",
      ...(Array.isArray((therapist as any).interests) ? ((therapist as any).interests as string[]) : []),
      ...(Array.isArray((therapist as any).locations) ? ((therapist as any).locations as string[]) : []),
    ].some((val) => val?.toLowerCase?.().includes(q))

    return priceMatch && problemMatch && genderMatch && lgbtqMatch && religionMatch && ageMatch && cityMatch && areaMatch && experienceMatch && qMatch
  })

  const formatResponseTime = (hours?: number | null) => {
    if (hours == null) return "Usually responds in 24 hours"
    if (hours < 24) {
      const rounded = Math.max(1, Math.round(hours))
      return `Usually responds in ${rounded} hour${rounded === 1 ? "" : "s"}`
    }
    const days = Math.max(1, Math.round(hours / 24))
    return `Usually responds in ${days} day${days === 1 ? "" : "s"}`
  }

  return (
    <section id="therapist-directory" className="py-20 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 relative overflow-hidden">
      {/* Premium background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100/20 via-transparent to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-blue-100/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="container mx-auto px-4 relative z-10">
        {(() => {
          // Determine list to render (limit on homepage when filters are hidden)
          return null
        })()}
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
              <Link href="/therapists">Browse Therapists</Link>

            </Button>
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="bg-white text-[#056DBA] border border-[#056DBA]/30 hover:bg-blue-50"
            >
              <a onClick={(e) => { e.preventDefault(); window.dispatchEvent(new Event("open-match-modal")) }}>Link me to a Therapist</a>
            </Button>

          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Enhanced Filters Sidebar */}
          {showFilters ? (
            <div className="w-full lg:w-1/4">
              <div
                className={`transition-all duration-1000 delay-200 ${isVisible ? "animate-slide-in-left" : "opacity-0"}`}
              >
                <Card className="lg:sticky lg:top-8 border border-white/60 shadow-xl shadow-blue-100/20 bg-white/70 backdrop-blur-sm max-w-md mx-auto lg:mx-0">
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
                          <SelectItem value="ranking">🏆 Top Rated</SelectItem>
                          <SelectItem value="rating">⭐ Highest Customer Rating</SelectItem>
                          <SelectItem value="price-high">💰 Price: High to Low</SelectItem>
                          <SelectItem value="price-low">💸 Price: Low to High</SelectItem>
                          <SelectItem value="experience">🎓 Most Experience</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="group">
                      <label className="text-sm font-semibold mb-3 block text-gray-700 group-hover:text-[#056DBA] transition-colors">
                        Problem
                      </label>
                      <Select value={problemFilter} onValueChange={setProblemFilter}>
                        <SelectTrigger className="border-gray-200 hover:border-[#056DBA] transition-colors">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Problems</SelectItem>
                          <SelectItem value="Depression">Depression</SelectItem>
                          <SelectItem value="Anxiety">Anxiety</SelectItem>
                          <SelectItem value="PTSD">PTSD</SelectItem>
                          <SelectItem value="Addiction">Addiction</SelectItem>
                          <SelectItem value="Relationship problems">Relationship problems</SelectItem>
                          <SelectItem value="Grief">Grief</SelectItem>
                          <SelectItem value="Phobias">Phobias</SelectItem>
                          <SelectItem value="Self esteem problems">Self esteem problems</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="group">
                      <label className="text-sm font-semibold mb-3 block text-gray-700 group-hover:text-[#056DBA] transition-colors">
                        Location (City)
                      </label>
                      <Select value={cityFilter} onValueChange={setCityFilter}>
                        <SelectTrigger className="border-gray-200 hover:border-[#056DBA] transition-colors">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">📍 All Cities</SelectItem>
                          <SelectItem value="Beirut">Beirut</SelectItem>
                          <SelectItem value="Zahle">Zahle</SelectItem>
                          <SelectItem value="Jounieh/Kaslik">Jounieh/Kaslik</SelectItem>
                          <SelectItem value="Antelias">Antelias</SelectItem>
                          <SelectItem value="Aley">Aley</SelectItem>
                          <SelectItem value="Tripoli">Tripoli</SelectItem>
                          <SelectItem value="Jbeil">Jbeil</SelectItem>
                          <SelectItem value="Dbayeh">Dbayeh</SelectItem>
                          <SelectItem value="Ajaltoun">Ajaltoun</SelectItem>
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
                          min={0}
                          step={10}
                          className="mt-2"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : null}

          {/* Enhanced Therapist Grid */}
          <div className={showFilters ? "lg:w-3/4 w-full max-w-5xl mx-auto" : "w-full max-w-5xl mx-auto"}>
            <div
              className={`mb-8 transition-all duration-1000 delay-300 ${isVisible ? "animate-slide-in-right" : "opacity-0"}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    Available Therapists ({(typeof limit === "number" ? Math.min(limit, filteredTherapists.length) : filteredTherapists.length)})
                  </h3>
                  <p className="text-gray-600">Find the right mental health professional for your needs</p>
                </div>
                <div className="hidden md:flex items-center gap-3 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    All therapists are verified
                  </div>
                  {!showFilters && (
                    <Button asChild variant="secondary" className="bg-white text-[#056DBA] border border-[#056DBA]/30 hover:bg-blue-50 h-9 px-3">
                      <Link href="/therapists">See all</Link>
                    </Button>
                  )}
                </div>
              </div>

            </div>

            <div className={`grid gap-8 md:grid-cols-2 stagger-animation ${isVisible ? "" : "opacity-0"}`}>
              {(typeof limit === "number" ? filteredTherapists.slice(0, limit) : filteredTherapists).map((therapist, index) => (
                <React.Fragment key={(therapist as any).id}>
                  <Card
                    className="group relative border border-white/60 shadow-lg shadow-blue-100/20 hover:shadow-2xl hover:shadow-blue-200/30 transition-all duration-500 ease-out bg-white/70 backdrop-blur-sm hover:bg-white/90 overflow-hidden hover:scale-[1.02] hover:border-[#056DBA]/20"
                    style={{ animationDelay: `${(index + 4) * 0.1}s` }}
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#056DBA] to-[#0891b2]" />

                    <CardContent className="p-6">
                      <div className="flex gap-4">
                        <div className="relative">
                          <div className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-white shadow-xl shadow-blue-100/30 group-hover:ring-[#056DBA]/30 group-hover:shadow-blue-200/40 transition-all duration-500 relative">
                            <Image
                              src={therapist.profile_image_url || "/placeholder.svg"}
                              alt={therapist.full_name || "Therapist"}
                              fill
                              sizes="80px"
                              quality={90}
                              className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                            />
                          </div>
                          {/* Verified badge can be added later if needed */}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="text-xl font-bold text-gray-900 group-hover:text-[#056DBA] transition-colors">
                                {therapist.full_name}
                              </h3>
                              {(therapist.ranking_points || 0) >= 5000 && (
                                <Badge className="mt-1 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white border-0">
                                  ✨ Top Rated
                                </Badge>
                              )}
                            </div>
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
                              <Award className="h-4 w-4 text-[#056DBA]" />
                              {(therapist.total_sessions || 0)} sessions completed
                            </div>
                            <div className="flex items-center gap-2">
                              <MessageCircle className="h-4 w-4 text-[#056DBA]" />
                              {formatResponseTime(therapist.average_response_time_hours || 24)}
                            </div>
                            {Array.isArray((therapist as any).interests) && (therapist as any).interests.length > 0 && (
                              <div className="pt-2">
                                <div className="text-[13px] text-gray-700 mb-1 font-medium">{interestsLabel}:</div>
                                <div className="flex flex-wrap gap-2">
                                  {((therapist as any).interests as string[]).slice(0, 3).map((intVal, i) => (
                                    <Badge key={`${(therapist as any).id}-interest-${i}`} variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                      {intVal}
                                    </Badge>
                                  ))}
                                  {((therapist as any).interests as string[]).length > 3 && (
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-dashed border-green-300">
                                      +{((therapist as any).interests as string[]).length - 3} more
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          <p className="text-sm text-gray-600 mb-4 line-clamp-2 group-hover:text-gray-700 transition-colors">
                            {therapist.bio_short}
                          </p>

                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-1 font-bold text-[#056DBA] text-lg">
                              <DollarSign className="h-5 w-5" />
                              {therapist.session_price_45_min || "—"}
                              <span className="text-sm font-normal text-gray-500">/session</span>
                            </div>
                            <div className="text-sm text-gray-500">{therapist.total_sessions ? `${therapist.total_sessions} sessions` : "New therapist"}</div>
                          </div>

                          <Button
                            onClick={() => {
                              const locationString = Array.isArray((therapist as any).locations) && (therapist as any).locations.length > 0
                                ? ((therapist as any).locations as string[]).join(", ")
                                : "";
                              setSelectedTherapist({
                                id: (therapist as any).id,
                                name: therapist.full_name || "",
                                image: therapist.profile_image_url || "/placeholder.svg",
                                specialty: therapist.title || "",
                                location: locationString,
                                locations: (therapist as any).locations || [],
                                gender: (therapist as any).gender || "",
                                lgbtq: !!(therapist as any).lgbtq_friendly,
                                experience: therapist.years_of_experience || 0,
                                price: therapist.session_price_45_min || 0,
                                rating: therapist.rating || 0,
                                reviews: 0,
                                bio: therapist.bio_short || "",
                                credentials: "",
                                verified: false,
                                responseTime: formatResponseTime(therapist.average_response_time_hours || 24),
                                languages: [],
                              })
                            }}
                            className="w-full bg-gradient-to-r from-[#056DBA] to-[#0891b2] hover:from-[#045A99] hover:to-[#0e7490] text-white font-semibold py-3 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-blue-300/30"
                          >
                            <Heart className="h-4 w-4 mr-2" />
                            Connect Now
                          </Button>

                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </React.Fragment>
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
