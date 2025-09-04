"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabaseBrowser } from "@/lib/supabase-browser"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts"

type Aggregates = {
  from: string
  to: string
  total: number
  problems: Record<string, number>
  cities: Record<string, number>
  areas: Record<string, number>
  genders: Record<string, number>
  lgbtq: Record<string, number>
  religions: Record<string, number>
  expBands: Record<string, number>
  prices: [number, number][]
  conversions: number
}

const toChart = (obj: Record<string, number>) => Object.entries(obj).map(([name, value]) => ({ name, value }))
const toChartWithKeys = (keys: string[], obj: Record<string, number>) => keys.map((k) => ({ name: k, value: obj[k] ?? 0 }))

export default function AdminMatchAnalyticsPage() {
  const supabase = supabaseBrowser()
  const router = useRouter()
  const [range, setRange] = useState<string>("30")
  const [data, setData] = useState<Aggregates | null>(null)
  const [loading, setLoading] = useState(true)
  const [options, setOptions] = useState<{ problems: string[]; cities: string[]; genders: string[]; lgbtq: string[]; religions: string[]; expBands: string[] }>({
    problems: ["Depression","Anxiety","PTSD","Addiction","Relationship problems","Grief","Phobias","Self esteem problems"],
    cities: ["Beirut","Zahle","Jounieh/Kaslik","Antelias","Aley","Tripoli","Jbeil","Dbayeh","Ajaltoun"],
    genders: ["Male","Female","Don't care"],
    lgbtq: ["Yes","Don't care"],
    religions: ["Christian","Druze","Sunni","Shiite","Other","Don't care"],
    expBands: ["1-3","4-7","7-10","10+"],
  })

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace("/admin/login"); return }
      const { data: prof } = await supabase.from("profiles").select("role").eq("user_id", user.id).single()
      if (prof?.role !== "admin") { router.replace("/admin/login"); return }
      // Load match quiz options to pre-fill axes with all choices
      const { data: matchRow } = await supabase.from("site_content").select("content").eq("key", "match.quiz").maybeSingle()
      const content = (matchRow as any)?.content || {}
      const opt = content?.options || {}
      const cfg = {
        problems: Array.isArray(opt.problems) && opt.problems.length ? opt.problems : options.problems,
        cities: Array.isArray(opt.locations?.cities) && opt.locations.cities.length ? opt.locations.cities : options.cities,
        genders: Array.isArray(opt.genders) && opt.genders.length ? opt.genders : options.genders,
        lgbtq: Array.isArray(opt.lgbtq) && opt.lgbtq.length ? opt.lgbtq : options.lgbtq,
        religions: Array.isArray(opt.religions) && opt.religions.length ? opt.religions : options.religions,
        expBands: Array.isArray(opt.experienceBands) && opt.experienceBands.length ? opt.experienceBands : options.expBands,
      }
      setOptions(cfg)
      setLoading(false)
    }
    init()
  }, [])

  const fetchData = async (days: number) => {
    setLoading(true)
    const to = new Date()
    const from = new Date(Date.now() - days * 24 * 3600 * 1000)
    const qs = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() }).toString()
    const res = await fetch(`/api/admin/analytics/match?${qs}`, { cache: "no-store" })
    const json = await res.json()
    setData(json)
    setLoading(false)
  }

  useEffect(() => {
    fetchData(parseInt(range, 10))
  }, [range])

  const priceAvg = useMemo(() => {
    if (!data?.prices?.length) return "—"
    const mins = data.prices.map(([a]) => a)
    const maxs = data.prices.map(([, b]) => b)
    const avgMin = Math.round(mins.reduce((s, v) => s + v, 0) / mins.length)
    const avgMax = Math.round(maxs.reduce((s, v) => s + v, 0) / maxs.length)
    return `$${avgMin} - $${avgMax}`
  }, [data])

  const priceHistogram = useMemo(() => {
    if (!data?.prices?.length) return [] as { name: string; value: number }[]
    const mids = data.prices.map(([a, b]) => (Number(a || 0) + Number(b || 0)) / 2)
    const bins = [0, 50, 100, 150, 200, 250, 100000]
    const labels = ["$0-49","$50-99","$100-149","$150-199","$200-249","$250+"]
    const counts = new Array(labels.length).fill(0)
    for (const m of mids) {
      for (let i = 0; i < labels.length; i++) {
        if (m >= bins[i] && m < bins[i+1]) { counts[i]++; break }
      }
    }
    return labels.map((name, i) => ({ name, value: counts[i] }))
  }, [data])

  if (loading) return <div className="min-h-screen flex items-center justify-center text-[#056DBA]">Loading…</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50/30 to-blue-100/20 py-10">
      <div className="container mx-auto px-4 max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-3xl md:text-4xl font-bold text-[#056DBA]">Match Analytics</h1>
          <div className="flex items-center gap-3">
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="secondary" onClick={() => fetchData(parseInt(range, 10))}>Refresh</Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>Submissions</CardHeader>
            <CardContent className="text-3xl font-bold">{data?.total ?? 0}</CardContent>
          </Card>
          <Card>
            <CardHeader>Avg Price Range</CardHeader>
            <CardContent className="text-3xl font-bold">{priceAvg}</CardContent>
          </Card>
          <Card>
            <CardHeader>Sessions → Contact conversions</CardHeader>
            <CardContent className="text-3xl font-bold">{data?.conversions ?? 0}</CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>Top Problems</CardHeader>
            <CardContent className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={toChartWithKeys(options.problems, data?.problems || {})} margin={{ left: 10, right: 10 }}>
                  <XAxis dataKey="name" interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#056DBA" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>Cities</CardHeader>
            <CardContent className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={toChartWithKeys(options.cities, data?.cities || {})} margin={{ left: 10, right: 10 }}>
                  <XAxis dataKey="name" interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#5ba8e7" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>Genders</CardHeader>
            <CardContent className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={toChartWithKeys(options.genders, data?.genders || {})} margin={{ left: 10, right: 10 }}>
                  <XAxis dataKey="name" interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>Experience Bands</CardHeader>
            <CardContent className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={toChartWithKeys(options.expBands, data?.expBands || {})} margin={{ left: 10, right: 10 }}>
                  <XAxis dataKey="name" interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#ffc658" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>LGBTQ+ Choice</CardHeader>
            <CardContent className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={toChartWithKeys(options.lgbtq, data?.lgbtq || {})} margin={{ left: 10, right: 10 }}>
                  <XAxis dataKey="name" interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#a78bfa" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>Religions</CardHeader>
            <CardContent className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={toChartWithKeys(options.religions, data?.religions || {})} margin={{ left: 10, right: 10 }}>
                  <XAxis dataKey="name" interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#34d399" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>Budget (midpoint)</CardHeader>
            <CardContent className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priceHistogram} margin={{ left: 10, right: 10 }}>
                  <XAxis dataKey="name" interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#60a5fa" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}


