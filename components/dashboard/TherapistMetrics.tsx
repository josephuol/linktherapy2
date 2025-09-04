"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, DollarSign, TrendingUp, Users } from "lucide-react"

interface TherapistMetricsProps {
  metrics: {
    averageResponseTime: number
    churnRate: number
    totalSessions: number
    bimonthlyCommission: number
    rankingPoints: number
    hasGreenDot: boolean
  }
}

export function TherapistMetrics({ metrics }: TherapistMetricsProps) {
  const formatResponseTime = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)} minutes`
    if (hours < 24) return `${hours.toFixed(1)} hours`
    return `${(hours / 24).toFixed(1)} days`
  }

  const getResponseTimeColor = (hours: number) => {
    if (hours < 2) return "text-green-600"
    if (hours < 12) return "text-yellow-600"
    return "text-red-600"
  }

  const getChurnRateColor = (rate: number) => {
    if (rate < 10) return "text-green-600"
    if (rate < 25) return "text-yellow-600"
    return "text-red-600"
  }

  const getRankingCategory = (points: number) => {
    if (points >= 8000) return { label: "Top Rated", textClass: "text-amber-500", badgeClass: "bg-amber-100 text-amber-800" }
    if (points >= 4000) return { label: "Above Average", textClass: "text-blue-600", badgeClass: "bg-blue-100 text-blue-800" }
    if (points >= 50) return { label: "Average", textClass: "text-green-600", badgeClass: "bg-green-100 text-green-800" }
    return { label: "Below Average", textClass: "text-red-600", badgeClass: "bg-red-100 text-red-800" }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Average Response Time */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Response Time</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getResponseTimeColor(metrics.averageResponseTime)}`}>
            {formatResponseTime(metrics.averageResponseTime)}
          </div>
          <p className="text-xs text-muted-foreground">
            Average time to respond
          </p>
        </CardContent>
      </Card>

      {/* Total Sessions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">
            {metrics.totalSessions}
          </div>
          <p className="text-xs text-muted-foreground">
            Completed sessions
          </p>
        </CardContent>
      </Card>

      {/* Bimonthly Commission */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Commission</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            ${metrics.bimonthlyCommission}
          </div>
          <p className="text-xs text-muted-foreground">
            Last 2 months
          </p>
        </CardContent>
      </Card>

      {/* Ranking Points */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            Ranking Score
            {metrics.hasGreenDot && (
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Recent bonus earned!" />
            )}
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {(() => {
            const { label, textClass, badgeClass } = getRankingCategory(metrics.rankingPoints)
            const percent = Math.round((metrics.rankingPoints / 10000) * 100)
            return (
              <div className={`text-2xl font-bold flex items-center gap-2 ${textClass}`}>
                {percent}%
                <Badge variant="secondary" className={badgeClass}>{label}</Badge>
              </div>
            )
          })()}
          <p className="text-xs text-muted-foreground">
            Performance ranking
          </p>
        </CardContent>
      </Card>

      {/* Churn Rate - Full Width */}
      <Card className="md:col-span-2 lg:col-span-4">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Client Retention</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-lg font-bold ${getChurnRateColor(metrics.churnRate)}`}>
                {(100 - metrics.churnRate).toFixed(1)}% retention rate per month
              </div>
              <p className="text-xs text-muted-foreground">
                {metrics.churnRate.toFixed(1)}% churn rate this month
              </p>
            </div>
            <div className="flex gap-2">
              {metrics.churnRate < 10 && (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Excellent
                </Badge>
              )}
              {metrics.churnRate >= 10 && metrics.churnRate < 25 && (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  Good
                </Badge>
              )}
              {metrics.churnRate >= 25 && (
                <Badge variant="secondary" className="bg-red-100 text-red-800">
                  Needs Improvement
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}









