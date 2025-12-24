"use client"

import React, { useState } from "react"
import Image from "next/image"
import { MapPin, Star, DollarSign, Clock, Heart, Award, MessageCircle, ChevronDown, ChevronUp, Wifi } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

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
  remote_available?: boolean | null
}

interface TherapistCardProps {
  therapist: PublicTherapist
  formatResponseTime: (hours?: number | null) => string
  onConnect: (therapist: any) => void
  index: number
  interestsLabel: string
}

export function TherapistCard({ therapist, formatResponseTime, onConnect, index, interestsLabel }: TherapistCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Build location display string
  const buildLocationDisplay = () => {
    const parts: React.ReactNode[] = []

    if (Array.isArray(therapist.locations) && therapist.locations.length > 0) {
      parts.push(
        <span key="locations" className="flex items-center gap-1">
          <MapPin className="h-4 w-4 text-[#056DBA] shrink-0" />
          {therapist.locations.join(", ")}
        </span>
      )
    }

    if (therapist.remote_available) {
      parts.push(
        <span key="online" className="flex items-center gap-1">
          <Wifi className="h-4 w-4 text-green-600 shrink-0" />
          <span className="text-green-700 font-medium">Online</span>
        </span>
      )
    }

    if (parts.length === 0) {
      return (
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-[#056DBA]" />
          <span>Public profile</span>
        </div>
      )
    }

    return (
      <div className="flex items-center gap-3 flex-wrap">
        {parts}
      </div>
    )
  }

  // Check if bio is long enough to need expansion (more than ~120 chars or 2 lines)
  const bioNeedsExpansion = (therapist.bio_short?.length || 0) > 120

  return (
    <Card
      className="group relative border border-white/60 shadow-lg shadow-blue-100/20 hover:shadow-2xl hover:shadow-blue-200/30 transition-all duration-500 ease-out bg-white/70 backdrop-blur-sm hover:bg-white/90 overflow-hidden hover:scale-[1.02] hover:border-[#056DBA]/20 h-full"
      style={{ animationDelay: `${(index + 4) * 0.1}s` }}
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#056DBA] to-[#0891b2]" />

      <CardContent className="p-6 h-full">
        <div className="flex gap-4 h-full">
          <div className="relative flex-shrink-0">
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
          </div>

          <div className="flex-1 flex flex-col">
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
              {buildLocationDisplay()}
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
              {Array.isArray(therapist.interests) && therapist.interests.length > 0 && (
                <div className="pt-2">
                  <div className="text-[13px] text-gray-700 mb-1 font-medium">{interestsLabel}:</div>
                  <div className="flex flex-wrap gap-2">
                    {therapist.interests.slice(0, 3).map((intVal, i) => (
                      <Badge key={`${therapist.id}-interest-${i}`} variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        {intVal}
                      </Badge>
                    ))}
                    {therapist.interests.length > 3 && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-dashed border-green-300">
                        +{therapist.interests.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="mb-4 flex-grow">
              <p className={`text-sm text-gray-600 group-hover:text-gray-700 transition-colors ${!isExpanded && bioNeedsExpansion ? 'line-clamp-2' : ''}`}>
                {therapist.bio_short}
              </p>
              {bioNeedsExpansion && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="mt-2 text-[#056DBA] hover:text-[#045A99] text-sm font-medium flex items-center gap-1 transition-colors"
                >
                  {isExpanded ? (
                    <>
                      Read less <ChevronUp className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Read more <ChevronDown className="h-4 w-4" />
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="mt-auto">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-1 font-bold text-[#056DBA] text-lg">
                  <DollarSign className="h-5 w-5" />
                  {therapist.session_price_45_min || "—"}
                  <span className="text-sm font-normal text-gray-500">/session</span>
                </div>
                <div className="text-sm text-gray-500">{therapist.total_sessions ? `${therapist.total_sessions} sessions` : "New therapist"}</div>
              </div>

              <Button
                onClick={() => onConnect(therapist)}
                className="w-full bg-gradient-to-r from-[#056DBA] to-[#0891b2] hover:from-[#045A99] hover:to-[#0e7490] text-white font-semibold py-3 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-blue-300/30"
              >
                <Heart className="h-4 w-4 mr-2" />
                Connect Now
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
