"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { getOrCreateAnonSessionId } from "@/lib/utils"

export type MatchConfig = {
  questions?: Record<string, string>
  options?: {
    problems?: string[]
    locations?: { cities?: string[]; subLocations?: Record<string, string[]> }
    genders?: string[]
    lgbtq?: string[]
    religions?: string[]
    /*ages?: string[]*/
    experienceBands?: string[]
  }
}

type Props = {
  config?: MatchConfig
  minPrice?: number
  maxPrice?: number
}

export function MatchModal({ config, minPrice, maxPrice }: Props) {
  const [open, setOpen] = useState(false)

  // Selections
  const [problem, setProblem] = useState<string | null>(null)
  const [city, setCity] = useState<string | null>(null)
  const [area, setArea] = useState<string | null>(null)
  const [gender, setGender] = useState<string | null>(null)
  const [lgbtq, setLgbtq] = useState<string | null>(null)
  const [religion, setReligion] = useState<string | null>(null)
  const [age, setAge] = useState<string | null>(null)
  const [exp, setExp] = useState<string | null>(null)
  const [budget, setBudget] = useState<[number, number]>(() => {
    const min = typeof minPrice === "number" ? Math.floor(minPrice) : 50
    const max = typeof maxPrice === "number" ? Math.ceil(maxPrice) : 250
    return [min, max]
  })

  const bounds = useMemo(() => {
    const min = typeof minPrice === "number" ? Math.floor(minPrice) : 50
    const max = typeof maxPrice === "number" ? Math.ceil(maxPrice) : 250
    return { min, max }
  }, [minPrice, maxPrice])

  useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener("open-match-modal", handler as any)
    return () => window.removeEventListener("open-match-modal", handler as any)
  }, [])

  // Config and option fallbacks (must be declared before using in steps)
  const q = config?.questions || {}
  const fallbackProblems = [
    "Depression",
    "Anxiety",
    "PTSD",
    "Addiction",
    "Relationship problems",
    "Grief",
    "Phobias",
    "Self esteem problems",
  ]
  const fallbackLocations = {
    cities: [
      "Beirut",
      "Zahle",
      "Jounieh/Kaslik",
      "Antelias",
      "Aley",
      "Tripoli",
      "Jbeil",
      "Dbayeh",
      "Ajaltoun",
    ],
    subLocations: {
      Beirut: ["Ashrafiye", "Jisr El Basha"],
    } as Record<string, string[]>,
  }
  const opt = config?.options || {}
  const problems = Array.isArray(opt.problems) && opt.problems.length > 0 ? opt.problems : fallbackProblems
  const locations = opt.locations && Array.isArray(opt.locations.cities) && opt.locations.cities.length > 0
    ? opt.locations
    : fallbackLocations
  const areas = city && locations.subLocations?.[city] ? locations.subLocations?.[city] : []

  // Wizard state
  const steps = [
    { key: "problem", label: q.problem || "What would you like to solve?" },
    { key: "location", label: q.location || "Preferred clinic location?" },
    { key: "gender", label: q.gender || "Preferred therapist gender?" },
    { key: "lgbtq", label: q.lgbtq || "LGBTQ+ related experience?" },
    { key: "religion", label: q.religion || "Therapist religion?" },
    /*{ key: "age", label: q.age || "Therapist age?" },*/
    { key: "experience", label: q.experience || "Therapist years of experience?" },
    { key: "budget", label: q.budget || "What budget do you have in mind?" },
  ] as const
  const [stepIndex, setStepIndex] = useState(0)
  const pct = Math.round(((stepIndex + 1) / steps.length) * 100)

  const goNext = () => setStepIndex((i) => Math.min(i + 1, steps.length - 1))
  const goBack = () => setStepIndex((i) => Math.max(i - 1, 0))

  const reset = () => {
    setProblem(null)
    setCity(null)
    setArea(null)
    setGender(null)
    setLgbtq(null)
    setReligion(null)
    setAge(null)
    setExp(null)
    setBudget([bounds.min, bounds.max])
    setStepIndex(0)
  }

  const submit = () => {
    const params = new URLSearchParams()
    if (problem) params.set("problem", problem)
    if (city) params.set("city", city)
    if (area) params.set("area", area)
    if (gender && gender.toLowerCase() !== "don't care") params.set("gender", gender)
    if (lgbtq && lgbtq.toLowerCase() !== "don't care") params.set("lgbtq", lgbtq)
    if (religion && religion.toLowerCase() !== "don't care") params.set("religion", religion)
    /*if (age && age.toLowerCase() !== "don't care") params.set("age", age)*/
    if (exp) params.set("exp", exp)
    if (budget) {
      params.set("price_min", String(budget[0]))
      params.set("price_max", String(budget[1]))
    }
    try {
      const payload = {
        session_id: getOrCreateAnonSessionId(),
        problem,
        city,
        area,
        gender,
        lgbtq,
        religion,
        exp_band: exp,
        price_min: budget?.[0],
        price_max: budget?.[1],
        source_page: typeof window !== 'undefined' ? window.location.pathname : null,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      }
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
      const ok = typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function' && navigator.sendBeacon('/api/match-events', blob)
      if (!ok) {
        fetch('/api/match-events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), keepalive: true }).catch(() => { })
      }
    } catch { }
    window.location.href = `/therapists?${params.toString()}`
  }



  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg w-[95vw] p-0 overflow-hidden">
        <DialogHeader className="px-4 sm:px-6 pt-5 sm:pt-6">
          <DialogTitle className="text-xl sm:text-2xl text-[#056DBA]">Let&apos;s find your match</DialogTitle>
          <div className="mt-3">
            <Progress value={pct} className="h-2" />
            <div className="mt-2 text-xs text-gray-500">Step {stepIndex + 1} of {steps.length}</div>
          </div>
        </DialogHeader>
        <div className="px-4 sm:px-6 pb-5 sm:pb-6 space-y-6">
          {stepIndex === 0 && (
            <div className="space-y-2">
              <div className="text-sm font-semibold text-gray-800">{steps[0].label}</div>
              <div className="flex flex-wrap gap-2">
                {problems.map((p) => (
                  <Button key={p} variant={problem === p ? "default" : "secondary"} className={problem === p ? "bg-[#056DBA]" : "bg-gray-100 text-gray-800"} onClick={() => setProblem(problem === p ? null : p)} size="sm">{p}</Button>
                ))}
              </div>
            </div>
          )}

          {stepIndex === 1 && (
            <div className="space-y-2">
              <div className="text-sm font-semibold text-gray-800">{steps[1].label}</div>
              <div className="flex flex-wrap gap-2">
                {(locations.cities || []).map((c) => (
                  <Button key={c} variant={city === c ? "default" : "secondary"} className={city === c ? "bg-[#056DBA]" : "bg-gray-100 text-gray-800"} onClick={() => { setCity(city === c ? null : c); setArea(null) }} size="sm">{c}</Button>
                ))}
              </div>
              {city && areas && areas.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {areas.map((a) => (
                    <Badge key={a} onClick={() => setArea(area === a ? null : a)} className={`cursor-pointer ${area === a ? "bg-[#056DBA] text-white" : "bg-blue-50 text-[#056DBA]"}`}>{a}</Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {stepIndex === 2 && (
            <div className="space-y-2">
              <div className="text-sm font-semibold text-gray-800">{steps[2].label}</div>
              <div className="flex flex-wrap gap-2">
                {(opt.genders || ["Male", "Female", "Don't care"]).map((g) => (
                  <Button key={g} variant={gender === g ? "default" : "secondary"} className={gender === g ? "bg-[#056DBA]" : "bg-gray-100 text-gray-800"} onClick={() => setGender(gender === g ? null : g)} size="sm">{g}</Button>
                ))}
              </div>
            </div>
          )}

          {stepIndex === 3 && (
            <div className="space-y-2">
              <div className="text-sm font-semibold text-gray-800">{steps[3].label}</div>
              <div className="flex flex-wrap gap-2">
                {(opt.lgbtq || ["Yes", "Don't care"]).map((l) => (
                  <Button key={l} variant={lgbtq === l ? "default" : "secondary"} className={lgbtq === l ? "bg-[#056DBA]" : "bg-gray-100 text-gray-800"} onClick={() => setLgbtq(lgbtq === l ? null : l)} size="sm">{l}</Button>
                ))}
              </div>
            </div>
          )}

          {stepIndex === 4 && (
            <div className="space-y-2">
              <div className="text-sm font-semibold text-gray-800">{steps[4].label}</div>
              <div className="flex flex-wrap gap-2">
                {(opt.religions || ["Christian", "Druze", "Sunni", "Shiite", "Other", "Don't care"]).map((r) => (
                  <Button key={r} variant={religion === r ? "default" : "secondary"} className={religion === r ? "bg-[#056DBA]" : "bg-gray-100 text-gray-800"} onClick={() => setReligion(religion === r ? null : r)} size="sm">{r}</Button>
                ))}
              </div>
            </div>
          )}

          {/*{stepIndex === 5 && (
            <div className="space-y-2">
              <div className="text-sm font-semibold text-gray-800">{steps[5].label}</div>
              <div className="flex flex-wrap gap-2">
                {(opt.ages || ["21-28","29-36","37-45","46-55","55+","Don't care"]).map((a) => (
                  <Button key={a} variant={age === a ? "default" : "secondary"} className={age === a ? "bg-[#056DBA]" : "bg-gray-100 text-gray-800"} onClick={() => setAge(age === a ? null : a)} size="sm">{a}</Button>
                ))}
              </div>
            </div>
          )}*/}

          {stepIndex === 5 && (
            <div className="space-y-2">
              <div className="text-sm font-semibold text-gray-800">{steps[5].label}</div>
              <div className="flex flex-wrap gap-2">
                {(opt.experienceBands || ["1-3", "4-7", "7-10", "10+"]).map((e) => (
                  <Button key={e} variant={exp === e ? "default" : "secondary"} className={exp === e ? "bg-[#056DBA]" : "bg-gray-100 text-gray-800"} onClick={() => setExp(exp === e ? null : e)} size="sm">{e}</Button>
                ))}
              </div>
            </div>
          )}

          {stepIndex === 6 && (
            <div className="space-y-2">
              <div className="text-sm font-semibold text-gray-800">{steps[6].label}</div>
              <div className="px-1">
                <Slider value={budget} onValueChange={(v) => setBudget([v[0], v[1]])} min={bounds.min} max={bounds.max} step={5} />
                <div className="text-xs text-gray-600 mt-2">${budget[0]} - ${budget[1]} per session</div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-2">
            <div className="flex gap-2">
              <Button variant="ghost" onClick={reset}>Reset</Button>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={goBack} disabled={stepIndex === 0}>Back</Button>
              {stepIndex < steps.length - 1 ? (
                <Button className="bg-[#056DBA] hover:bg-[#045A99]" onClick={goNext}>Next</Button>
              ) : (
                <Button className="bg-[#056DBA] hover:bg-[#045A99]" onClick={submit}>See results</Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog >
  )
}


