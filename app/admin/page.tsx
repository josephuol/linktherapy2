"use client"

import { useEffect, useState, ReactNode, useCallback, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabaseBrowser } from "@/lib/supabase-browser"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { cn, ADMIN_COMMISSION_PER_SESSION } from "@/lib/utils"
import { ArrowRightIcon, DollarLineIcon, CalenderIcon, PieChartIcon, GroupIcon } from "@/components/icons/index"
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, Users, UserCheck, AlertTriangle, UserX } from "lucide-react"

interface StatsCardProps {
  title: string
  value: string
  change?: {
    value: string
    trend: "up" | "down"
  }
  icon: ReactNode
}

function StatsCard({ title, value, change, icon }: StatsCardProps) {
  const isPositive = change?.trend === "up"
  const trendColor = isPositive ? "text-[#056DBA]" : "text-red-500"

  return (
    <div className="relative p-4 lg:p-5 group before:absolute before:inset-y-8 before:right-0 before:w-px before:bg-gradient-to-b before:from-input/30 before:via-input before:to-input/30 last:before:hidden">
      <div className="relative flex items-center gap-4">
        <ArrowRightIcon
          className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity text-[#056DBA] w-5 h-5"
          aria-hidden="true"
        />
        <div className="max-[480px]:hidden size-10 shrink-0 rounded-full bg-[#056DBA]/10 border border-[#056DBA]/30 flex items-center justify-center text-[#056DBA]">
          {icon}
        </div>
        <div>
          <div className="font-medium tracking-widest text-xs uppercase text-muted-foreground/60">
            {title}
          </div>
          <div className="text-2xl font-semibold mb-2">{value}</div>
          {change && (
            <div className="text-xs text-muted-foreground/60">
              <span className={cn("font-medium", trendColor)}>
                {isPositive ? "↗" : "↘"} {change.value}
              </span>{" "}
              vs last month
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface StatsGridProps {
  stats: StatsCardProps[]
}

function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 min-[1200px]:grid-cols-4 border border-border rounded-xl bg-gradient-to-br from-sidebar/60 to-sidebar">
      {stats.map((stat) => (
        <StatsCard key={stat.title} {...stat} />
      ))}
    </div>
  )
}

const STATUS_TABS = [
  { value: "all", label: "All", icon: Users },
  { value: "active", label: "Active", icon: UserCheck },
  { value: "pending", label: "Pending", icon: AlertTriangle },
  { value: "warning", label: "Warning", icon: AlertTriangle },
  { value: "suspended", label: "Suspended", icon: UserX },
]

const SORT_OPTIONS = [
  { value: "ranking", label: "Ranking" },
  { value: "sessions", label: "Sessions" },
  { value: "name", label: "Name" },
  { value: "date", label: "Date Joined" },
]

function AdminDashboardContent() {
  const supabase = supabaseBrowser()
  const router = useRouter()
  const searchParams = useSearchParams()

  // URL-based state
  const currentPage = parseInt(searchParams.get("page") || "1", 10)
  const currentStatus = searchParams.get("status") || "all"
  const currentSort = searchParams.get("sort") || "ranking"
  const currentSearch = searchParams.get("search") || ""

  const [therapists, setTherapists] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<any | null>(null)
  const [meta, setMeta] = useState<{ total: number; filtered: number; page: number; limit: number; totalPages: number } | null>(null)
  const [searchInput, setSearchInput] = useState(currentSearch)

  // Commission modal state
  const [commissionModalOpen, setCommissionModalOpen] = useState(false)
  const [commissionTherapist, setCommissionTherapist] = useState<any | null>(null)
  const [customCommission, setCustomCommission] = useState("")
  const [isActivating, setIsActivating] = useState(false)

  // Update URL params
  const updateParams = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "" || (key === "page" && value === "1") || (key === "status" && value === "all") || (key === "sort" && value === "ranking")) {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    })
    const queryString = params.toString()
    router.push(queryString ? `?${queryString}` : "/admin", { scroll: false })
  }, [searchParams, router])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== currentSearch) {
        updateParams({ search: searchInput, page: "1" })
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput, currentSearch, updateParams])

  // Fetch therapists
  const fetchTherapists = useCallback(async () => {
    const params = new URLSearchParams({
      page: currentPage.toString(),
      limit: "20",
      status: currentStatus,
      sort: currentSort,
      ...(currentSearch && { search: currentSearch }),
    })
    const res = await fetch(`/api/admin/therapists?${params}`)
    if (res.ok) {
      const json = await res.json()
      setTherapists(json.therapists ?? [])
      setMeta(json.meta ?? null)
    }
  }, [currentPage, currentStatus, currentSort, currentSearch])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace("/admin/login")
        return
      }
      const { data: prof } = await supabase.from("profiles").select("role").eq("user_id", user.id).single()
      if (prof?.role !== "admin") {
        router.replace("/admin/login")
        return
      }

      await fetchTherapists()

      // Revenue and activity metrics
      const now = new Date()
      const startMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const startPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const endPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0)
      const [sessionsMonthHead, sessionsPrevHead, patientsHead, requestsHead] = await Promise.all([
        supabase.from("sessions").select("id", { count: "exact", head: true }).gte("session_date", startMonth.toISOString()),
        supabase.from("sessions").select("id", { count: "exact", head: true }).gte("session_date", startPrevMonth.toISOString()).lte("session_date", endPrevMonth.toISOString()),
        supabase.from("patients").select("id", { count: "exact", head: true }),
        supabase.from("contact_requests").select("id", { count: "exact", head: true }),
      ])
      const sessionsMonthCount = (sessionsMonthHead as any)?.count ?? 0
      const sessionsPrevCount = (sessionsPrevHead as any)?.count ?? 0
      const revenueMonth = sessionsMonthCount * ADMIN_COMMISSION_PER_SESSION
      const revenuePrev = sessionsPrevCount * ADMIN_COMMISSION_PER_SESSION
      const growth = revenuePrev ? ((revenueMonth - revenuePrev) / revenuePrev) * 100 : null
      const patientsCount = (patientsHead as any)?.count ?? 0
      const requestsCount = (requestsHead as any)?.count ?? 0
      setMetrics({ revenueMonth, revenuePrev, growth, patients: patientsCount, requests: requestsCount })
      setLoading(false)
    }
    init()
  }, [])

  // Refetch when URL params change
  useEffect(() => {
    if (!loading) {
      fetchTherapists()
    }
  }, [currentPage, currentStatus, currentSort, currentSearch, fetchTherapists, loading])

  // Handle activation - check if therapist needs custom commission
  const handleActivate = (therapist: any) => {
    const price = therapist.session_price_45_min || 0
    if (price > 60) {
      // High-priced therapist - show commission modal
      setCommissionTherapist(therapist)
      setCustomCommission(therapist.custom_commission_rate?.toString() || "")
      setCommissionModalOpen(true)
    } else {
      // Regular therapist - activate directly
      updateStatus(therapist.user_id, 'active')
    }
  }

  // Confirm activation with custom commission
  const confirmActivateWithCommission = async () => {
    if (!commissionTherapist) return

    const commissionValue = parseFloat(customCommission)
    if (isNaN(commissionValue) || commissionValue < 0) {
      alert("Please enter a valid commission amount")
      return
    }

    setIsActivating(true)
    try {
      await supabase
        .from("therapists")
        .update({
          status: 'active',
          custom_commission_rate: commissionValue
        })
        .eq("user_id", commissionTherapist.user_id)

      setTherapists((prev) =>
        prev.map((t) =>
          t.user_id === commissionTherapist.user_id
            ? { ...t, status: 'active', custom_commission_rate: commissionValue }
            : t
        )
      )
      setCommissionModalOpen(false)
      setCommissionTherapist(null)
      setCustomCommission("")
    } finally {
      setIsActivating(false)
    }
  }

  const updateStatus = async (user_id: string, status: 'active' | 'warning' | 'suspended') => {
    await supabase.from("therapists").update({ status }).eq("user_id", user_id)
    setTherapists((prev) => prev.map((t) => (t.user_id === user_id ? { ...t, status } : t)))
  }

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-50 text-green-700 border-green-200"
      case "pending":
        return "bg-yellow-50 text-yellow-700 border-yellow-200"
      case "warning":
        return "bg-orange-50 text-orange-700 border-orange-200"
      case "suspended":
        return "bg-red-50 text-red-700 border-red-200"
      default:
        return "bg-gray-50 text-gray-700 border-gray-200"
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-[#056DBA]">Loading...</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50/30 to-blue-100/20 py-6 md:py-10">
      <div className="container mx-auto px-4 max-w-7xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-[#056DBA]">Admin Dashboard</h1>
          <div className="text-sm text-gray-500">
            {meta && `${meta.filtered} therapists`}
          </div>
        </div>

        {metrics && (
          <StatsGrid
            stats={[
              {
                title: "Revenue (this month)",
                value: `$${(metrics.revenueMonth ?? 0).toFixed(0)}`,
                change:
                  metrics.growth === null
                    ? undefined
                    : {
                        value: `${Math.abs(metrics.growth).toFixed(1)}%`,
                        trend: metrics.growth >= 0 ? "up" : "down",
                      },
                icon: <DollarLineIcon className="w-5 h-5" />,
              },
              {
                title: "Revenue (last month)",
                value: `$${(metrics.revenuePrev ?? 0).toFixed(0)}`,
                icon: <CalenderIcon className="w-5 h-5" />,
              },
              {
                title: "Growth",
                value: metrics.growth === null ? "—" : `${metrics.growth.toFixed(1)}%`,
                icon: <PieChartIcon className="w-5 h-5" />,
              },
              {
                title: "Patients / Requests",
                value: `${metrics.patients || 0} / ${metrics.requests || 0}`,
                icon: <GroupIcon className="w-5 h-5" />,
              },
            ]}
          />
        )}

        <Card className="shadow-lg border-0">
          <CardHeader className="border-b bg-gray-50/50">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="text-xl font-bold text-gray-900">Therapists</div>

              {/* Search & Sort Controls */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search therapists..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="pl-9 w-full sm:w-64 bg-white"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4 text-gray-400" />
                  <select
                    value={currentSort}
                    onChange={(e) => updateParams({ sort: e.target.value, page: "1" })}
                    className="text-sm border rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#056DBA]/20"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Status Tabs */}
            <div className="flex flex-wrap gap-2 mt-4">
              {STATUS_TABS.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.value}
                    onClick={() => updateParams({ status: tab.value, page: "1" })}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                      currentStatus === tab.value
                        ? "bg-[#056DBA] text-white shadow-md"
                        : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50">
                    <TableHead className="font-semibold">Name</TableHead>
                    <TableHead className="font-semibold hidden md:table-cell">Title</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold hidden sm:table-cell text-right">Ranking</TableHead>
                    <TableHead className="font-semibold hidden lg:table-cell text-right">Churn</TableHead>
                    <TableHead className="font-semibold hidden lg:table-cell text-right">Sessions</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {therapists.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                        No therapists found
                      </TableCell>
                    </TableRow>
                  ) : (
                    therapists.map((t) => (
                      <TableRow key={t.user_id} className="hover:bg-gray-50/50 transition-colors">
                        <TableCell>
                          <button
                            className="text-[#056DBA] hover:underline font-medium"
                            onClick={() => router.push(`/admin/therapists/${t.user_id}`)}
                          >
                            {t.full_name || "(Pending Onboarding)"}
                          </button>
                          <div className="text-xs text-gray-500 mt-0.5 hidden sm:block">{t.email}</div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-gray-600">{t.title || '—'}</TableCell>
                        <TableCell>
                          <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium border", getStatusBadgeStyle(t.status))}>
                            {t.status}
                          </span>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-right font-medium">{t.ranking_points}</TableCell>
                        <TableCell className="hidden lg:table-cell text-right">{((t.churn_rate_monthly || 0) * 100).toFixed(0)}%</TableCell>
                        <TableCell className="hidden lg:table-cell text-right">{t.total_sessions}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => handleActivate(t)}
                            >
                              Activate
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                              onClick={() => updateStatus(t.user_id, 'warning')}
                            >
                              Warn
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => updateStatus(t.user_id, 'suspended')}
                            >
                              Suspend
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {meta && meta.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50/50">
                <div className="text-sm text-gray-500">
                  Page {meta.page} of {meta.totalPages} ({meta.filtered} results)
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => updateParams({ page: (currentPage - 1).toString() })}
                    className="h-8"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= meta.totalPages}
                    onClick={() => updateParams({ page: (currentPage + 1).toString() })}
                    className="h-8"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Custom Commission Modal */}
      <Dialog open={commissionModalOpen} onOpenChange={setCommissionModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Custom Commission</DialogTitle>
            <DialogDescription>
              This therapist charges ${commissionTherapist?.session_price_45_min || 0} per session (above $60).
              Please specify a custom commission rate per session.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Therapist:</strong> {commissionTherapist?.full_name}
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  <strong>Session Price:</strong> ${commissionTherapist?.session_price_45_min || 0}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="commission">Commission per Session ($)</Label>
                <Input
                  id="commission"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={`Default: $${ADMIN_COMMISSION_PER_SESSION}`}
                  value={customCommission}
                  onChange={(e) => setCustomCommission(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Default commission is ${ADMIN_COMMISSION_PER_SESSION} per session.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCommissionModalOpen(false)
                setCommissionTherapist(null)
                setCustomCommission("")
              }}
              disabled={isActivating}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmActivateWithCommission}
              disabled={isActivating || !customCommission}
              className="bg-green-600 hover:bg-green-700"
            >
              {isActivating ? "Activating..." : "Activate with Commission"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-[#056DBA]">Loading...</div>}>
      <AdminDashboardContent />
    </Suspense>
  )
}
