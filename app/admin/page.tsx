"use client"

import { useEffect, useState, ReactNode } from "react"
import { useRouter } from "next/navigation"
import { supabaseBrowser } from "@/lib/supabase-browser"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { format } from "date-fns"
import { cn, ADMIN_COMMISSION_PER_SESSION } from "@/lib/utils"
import { ArrowRightIcon, DollarLineIcon, CalenderIcon, PieChartIcon, GroupIcon } from "@/components/icons/index"

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

export default function AdminDashboardPage() {
  const supabase = supabaseBrowser()
  const router = useRouter()
  const [therapists, setTherapists] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<any | null>(null)

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
      const { data } = await supabase.from("therapists").select("user_id, full_name, title, status, ranking_points, churn_rate_monthly, total_sessions").order("ranking_points", { ascending: false })
      setTherapists(data ?? [])
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

  const updateStatus = async (user_id: string, status: 'active' | 'warning' | 'suspended') => {
    await supabase.from("therapists").update({ status }).eq("user_id", user_id)
    setTherapists((prev) => prev.map((t) => (t.user_id === user_id ? { ...t, status } : t)))
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-[#056DBA]">Loading…</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50/30 to-blue-100/20 py-10">
      <div className="container mx-auto px-4 max-w-7xl">
        <h1 className="text-3xl md:text-4xl font-bold mb-6 text-[#056DBA]">Admin Dashboard</h1>
        {metrics && (
          <div className="mb-6">
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
          </div>
        )}
        <Card>
          <CardHeader>
            <div className="text-xl font-bold text-gray-900">Therapists</div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-gray-200 overflow-x-auto bg-white -mx-4 sm:mx-0 px-4 sm:px-0">
              <div className="min-w-[720px]">
              <Table className="text-xs sm:text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Name</TableHead>
                    <TableHead className="hidden md:table-cell whitespace-nowrap">Title</TableHead>
                    <TableHead className="whitespace-nowrap">Status</TableHead>
                    <TableHead className="hidden sm:table-cell whitespace-nowrap">Ranking</TableHead>
                    <TableHead className="hidden lg:table-cell whitespace-nowrap">Churn</TableHead>
                    <TableHead className="hidden lg:table-cell whitespace-nowrap">Sessions</TableHead>
                    <TableHead className="whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {therapists.map((t) => (
                    <TableRow key={t.user_id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        <button
                          className="text-[#056DBA] hover:underline"
                          onClick={() => router.push(`/admin/therapists/${t.user_id}`)}
                        >
                          {t.full_name}
                        </button>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{t.title || '—'}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span className="px-2 py-1 rounded-md text-xs bg-blue-50 text-[#056DBA] border border-blue-100">{t.status}</span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{t.ranking_points}</TableCell>
                      <TableCell className="hidden lg:table-cell">{(t.churn_rate_monthly * 100).toFixed(0)}%</TableCell>
                      <TableCell className="hidden lg:table-cell">{t.total_sessions}</TableCell>
                      <TableCell className="space-x-2 whitespace-nowrap">
                        <Button size="sm" className="bg-[#056DBA] hover:bg-[#045A99]" onClick={() => updateStatus(t.user_id, 'active')}>Activate</Button>
                        <Button size="sm" variant="outline" onClick={() => updateStatus(t.user_id, 'warning')}>Warn</Button>
                        <Button size="sm" variant="destructive" onClick={() => updateStatus(t.user_id, 'suspended')}>Suspend</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}



