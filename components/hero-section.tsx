"use client"

import { useState, useEffect } from "react"
import { Search, Sparkles, Heart, Users, Award } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export interface HeroStat {
  value: string
  title: string
  subtitle?: string
}

export interface HeroContent {
  h1?: string
  h2?: string
  tagline?: string
  intro?: string
  stats?: HeroStat[]
}

export function HeroSection({ content, variant = "default" }: { content?: HeroContent, variant?: "default" | "twoColumnCompact" }) {
  const [isVisible, setIsVisible] = useState(false)
  const [query, setQuery] = useState("")

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const isCompact = variant === "twoColumnCompact"

  const defaultStats: HeroStat[] = [
    { value: "10%", title: "Therapist Acceptance Rate", subtitle: "We only choose the best." },
    { value: "100+", title: "Lives Improved", subtitle: "Including 40 during the war" },
    { value: "25+", title: "5 star ratings on Google", subtitle: "" },
  ]
  const statsToRender = (content?.stats && content.stats.length > 0 ? content.stats : defaultStats).slice(0, 3)
  const icons = [Users, Heart, Award]

  return (
    <section className={`${isCompact ? "pt-0 pb-0 min-h-[calc(100vh-4rem)]" : "min-h-screen pt-16 pb-16 md:pt-20 md:pb-24"} relative bg-gradient-to-br from-[#056DBA] via-[#2F86D2] to-[#8EC5FF] text-white overflow-hidden`}>
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

      <div className="container mx-auto px-4 relative z-10">
        {isCompact ? (
          <>
            <div className="h-16 md:hidden" />
            <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center min-h-[calc(100vh-8rem)] md:min-h-[calc(100vh-4rem)] py-4 md:py-10">
            {/* Left column: condensed text and search */}
            <div>
              <div className={`transition-all duration-1000 ${isVisible ? "animate-slide-up" : "opacity-0"}`}>
                <div className="flex items-center gap-2 mb-4">
                  <Heart className="h-7 w-7 text-pink-300 animate-pulse" />
                  <span className="text-base md:text-lg font-medium text-blue-100">Welcome to LinkTherapy</span>
                </div>
                <h1 className="text-3xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent animate-gradient leading-[1.15] pb-1">
                  {content?.h1 ?? "A good therapist changes everything."}
                </h1>
                <h2 className="text-2xl md:text-3xl font-bold mb-2 bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent animate-gradient">
                  {content?.h2 ?? "Only 1 in 10 therapists pass our selection process."}
                </h2>
              </div>

              <div className={`transition-all duration-1000 delay-300 ${isVisible ? "animate-slide-up" : "opacity-0"}`}>
                <p className="text-base md:text-lg mb-6 text-blue-200 leading-relaxed">
                  {content?.intro ?? "Find a therapist that fits your budget, near you or online. No bargaining, no long trips. Start your journey in less than 12 hours, no trial and error."}
                </p>
              </div>

              {/* Search bar */}
              <div className={`max-w-xl transition-all duration-1000 delay-500 ${isVisible ? "animate-scale-in" : "opacity-0"}`}>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-white/10 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-300" />
                  <div className="relative flex gap-2 p-2 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30">
                    <div className="relative flex-1">
                      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/70 h-5 w-5" />
                      <Input
                        placeholder="Search by location, specialty, or therapist name..."
                        className="pl-12 h-12 bg-white/10 border-white/20 text-white placeholder:text-white/70 rounded-xl focus:bg-white/20 transition-all duration-300"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const q = query.trim()
                            window.location.href = q ? `/therapists?q=${encodeURIComponent(q)}` : "/therapists"
                          }
                        }}
                      />
                    </div>
                    <Button
                      size="sm"
                      className="h-12 px-6 bg-white text-[#056DBA] hover:bg-blue-50 rounded-xl font-semibold transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
                      onClick={() => {
                        const q = query.trim()
                        window.location.href = q ? `/therapists?q=${encodeURIComponent(q)}` : "/therapists"
                      }}
                    >
                      <Sparkles className="h-5 w-5 mr-2" />
                      Search
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right column: compact stats card */}
            <div className={`transition-all duration-1000 delay-700 ${isVisible ? "animate-slide-up" : "opacity-0"}`}>
              <div className="bg-white/10 border border-white/20 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
                <div className="grid grid-cols-1 gap-6">
                  {statsToRender.map((s, i) => {
                    const Icon = (icons[i] || Users) as any
                    return (
                      <div className="flex items-center gap-4" key={`hero-stat-compact-${i}`}>
                        <div className="inline-flex items-center justify-center w-12 h-12 bg-white/20 rounded-full">
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <div className="text-2xl font-bold leading-none">{s.value}</div>
                          <div className="text-blue-100 text-sm md:text-base leading-snug">{s.title}</div>
                          {s.subtitle ? (
                            <div className="text-blue-200 text-xs md:text-sm leading-snug">{s.subtitle}</div>
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
            </div>
          </>
        ) : (
          <div className="relative z-10 flex flex-col items-center justify-center">
            <div className="text-center max-w-4xl mx-auto">
              {/* Main heading with staggered animation */}
              <div className={`transition-all duration-1000 ${isVisible ? "animate-slide-up" : "opacity-0"}`}>
                <div className="flex items-center justify-center gap-2 mb-6">
                  <Heart className="h-8 w-8 text-pink-300 animate-pulse" />
                  <span className="text-lg font-medium text-blue-100">Welcome to LinkTherapy</span>
                </div>
                <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent animate-gradient leading-[1.12] pb-1 md:pb-2">
                  {content?.h1 ?? "A good therapist changes everything."}
                </h1>
                <h2 className="text-4xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent animate-gradient">
                  {content?.h2 ?? "Only 1 in 10 therapists pass our selection process."}
                </h2>
                <p className="text-2xl md:text-2xl mb-8 text-blue-200 leading-relaxed">
                  {content?.tagline ?? "So you're in the right hands from day one."}
                </p>
              </div>

              <div className={`transition-all duration-1000 delay-300 ${isVisible ? "animate-slide-up" : "opacity-0"}`}>
                <p className="text-xl md:text-2xl mb-8 text-blue-200 leading-relaxed">
                  {content?.intro ?? "Find a therapist that fits your budget, near you or online. No bargaining, no long trips. Start your journey in less than 12 hours, no trial and error."}
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
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const q = query.trim()
                            window.location.href = q ? `/therapists?q=${encodeURIComponent(q)}` : "/therapists"
                          }
                        }}
                      />
                    </div>
                    <Button
                      size="lg"
                      className="h-14 px-8 bg-white text-[#056DBA] hover:bg-blue-50 rounded-xl font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg"
                      onClick={() => {
                        const q = query.trim()
                        window.location.href = q ? `/therapists?q=${encodeURIComponent(q)}` : "/therapists"
                      }}
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
                {statsToRender.map((s, i) => {
                  const Icon = (icons[i] || Users) as any
                  return (
                    <div className="text-center group" key={`hero-stat-${i}`}>
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4 group-hover:scale-110 transition-transform duration-300">
                        <Icon className="h-8 w-8 text-white" />
                      </div>
                      <div className="text-3xl font-bold mb-2">{s.value}</div>
                      <div className="text-blue-100">{s.title}</div>
                      {s.subtitle ? (
                        <div className="text-blue-200 text-sm">{s.subtitle}</div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Scroll indicator */}
      <div className={`hidden md:block absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce`}>
        <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-white/70 rounded-full mt-2 animate-pulse" />
        </div>
      </div>
    </section>
  )
}
