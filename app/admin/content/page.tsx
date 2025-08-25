"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabaseBrowser } from "@/lib/supabase-browser"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

type Content = { key: string; title: string | null; content: any }

const DEFAULT_KEYS = [
  { key: "home.hero", title: "Homepage Hero" },
  { key: "directory.intro", title: "Therapist Directory Intro" },
  { key: "directory.labels", title: "Directory Labels (UI Text)" },
  { key: "blog.settings", title: "Blog Settings" },
  { key: "match.quiz", title: "Match Quiz" },
]

export default function AdminContentPage() {
  const supabase = supabaseBrowser()
  const router = useRouter()
  const [items, setItems] = useState<Record<string, Content>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace("/admin/login"); return }
      const { data: prof } = await supabase.from("profiles").select("role").eq("user_id", user.id).single()
      if (prof?.role !== "admin") { router.replace("/admin/login"); return }
      const { data } = await supabase.from("site_content").select("key, title, content")
      const map: Record<string, Content> = {}
      ;(data || []).forEach((row: any) => { map[row.key] = row })
      DEFAULT_KEYS.forEach(d => { if (!map[d.key]) map[d.key] = { key: d.key, title: d.title, content: {} } })
      setItems(map)
      setLoading(false)
    }
    init()
  }, [])

  const save = async (k: string) => {
    const it = items[k]
    // Prefer RPC (SECURITY DEFINER) to avoid RLS recursion/stack depth issues
    const { error: rpcErr } = await supabase.rpc("set_site_content", {
      p_key: it.key,
      p_title: it.title,
      p_content: it.content || {},
    })
    if (rpcErr) {
      console.error("Failed to save via RPC, falling back to direct", rpcErr)
      // Fallback: manual exists->insert/update
      const { data: existing, error: existErr } = await supabase
        .from("site_content")
        .select("key")
        .eq("key", it.key)
        .maybeSingle()
      if (existErr && existErr.code !== "PGRST116") {
        console.error("Failed to check content existence", existErr)
        alert(existErr.message || "Failed to save content")
        return
      }
      const payload = { key: it.key, title: it.title, content: it.content, updated_at: new Date().toISOString() }
      if (existing?.key) {
        const { error } = await supabase.from("site_content").update(payload).eq("key", it.key)
        if (error) {
          console.error("Failed to update content", error)
          alert(error.message || "Failed to save content")
        }
      } else {
        const { error } = await supabase.from("site_content").insert(payload)
        if (error) {
          console.error("Failed to insert content", error)
          alert(error.message || "Failed to save content")
        }
      }
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-[#056DBA]">Loading…</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50/30 to-blue-100/20 py-10">
      <div className="container mx-auto px-4 max-w-4xl space-y-6">
        <h1 className="text-3xl md:text-4xl font-bold text-[#056DBA]">Content</h1>
        {DEFAULT_KEYS.map(d => (
          <Card key={d.key}>
            <CardHeader>
              <div className="text-xl font-bold text-gray-900">{items[d.key]?.title || d.title}</div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input value={items[d.key]?.title || ""} onChange={e => setItems(prev => ({ ...prev, [d.key]: { ...prev[d.key], title: e.target.value } }))} placeholder="Section title" />

              {d.key === "directory.labels" ? (
                <div className="space-y-2">
                  <div>
                    <div className="text-sm text-gray-700 mb-1">Interests label</div>
                    <Input
                      placeholder="Interests"
                      value={(items[d.key]?.content?.interestsLabel ?? "")}
                      onChange={e => setItems(prev => ({ ...prev, [d.key]: { ...prev[d.key], content: { ...(prev[d.key]?.content || {}), interestsLabel: e.target.value } } }))}
                    />
                  </div>
                  <div className="text-xs text-gray-500">This text appears above the interests chips on therapist cards.</div>
                </div>
              ) : d.key === "home.hero" ? (
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-700 mb-1">Main heading (H1)</div>
                    <Input placeholder="A good therapist changes everything." value={(items[d.key]?.content?.h1 ?? "")} onChange={e => setItems(prev => ({ ...prev, [d.key]: { ...prev[d.key], content: { ...(prev[d.key]?.content || {}), h1: e.target.value } } }))} />
                  </div>
                  <div>
                    <div className="text-sm text-gray-700 mb-1">Sub heading (H2)</div>
                    <Input placeholder="Only 1 in 10 therapists pass our selection process." value={(items[d.key]?.content?.h2 ?? "")} onChange={e => setItems(prev => ({ ...prev, [d.key]: { ...prev[d.key], content: { ...(prev[d.key]?.content || {}), h2: e.target.value } } }))} />
                  </div>
                  <div>
                    <div className="text-sm text-gray-700 mb-1">Tagline</div>
                    <Input placeholder="So you're in the right hands from day one." value={(items[d.key]?.content?.tagline ?? "")} onChange={e => setItems(prev => ({ ...prev, [d.key]: { ...prev[d.key], content: { ...(prev[d.key]?.content || {}), tagline: e.target.value } } }))} />
                  </div>
                  <div>
                    <div className="text-sm text-gray-700 mb-1">Intro paragraph</div>
                    <Textarea rows={4} placeholder="Find a therapist that fits your budget, near you or online..." value={(items[d.key]?.content?.intro ?? "")} onChange={e => setItems(prev => ({ ...prev, [d.key]: { ...prev[d.key], content: { ...(prev[d.key]?.content || {}), intro: e.target.value } } }))} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[0,1,2].map((idx) => (
                      <div key={`stat-${idx}`} className="space-y-2 p-3 border rounded-md bg-white">
                        <div className="text-sm font-medium text-gray-800">Stat {idx + 1}</div>
                        <Input
                          placeholder={idx === 0 ? "10%" : idx === 1 ? "100+" : "25+"}
                          value={((items[d.key]?.content?.stats ?? [])[idx]?.value ?? "")}
                          onChange={e => setItems(prev => {
                            const stats = Array.isArray(prev[d.key]?.content?.stats) ? [...prev[d.key].content.stats] : []
                            while (stats.length < 3) stats.push({ value: "", title: "", subtitle: "" })
                            stats[idx] = { ...stats[idx], value: e.target.value }
                            return { ...prev, [d.key]: { ...prev[d.key], content: { ...(prev[d.key]?.content || {}), stats } } }
                          })}
                        />
                        <Input
                          placeholder={idx === 0 ? "Therapist Acceptance Rate" : idx === 1 ? "Lives Improved" : "5 star ratings on Google"}
                          value={((items[d.key]?.content?.stats ?? [])[idx]?.title ?? "")}
                          onChange={e => setItems(prev => {
                            const stats = Array.isArray(prev[d.key]?.content?.stats) ? [...prev[d.key].content.stats] : []
                            while (stats.length < 3) stats.push({ value: "", title: "", subtitle: "" })
                            stats[idx] = { ...stats[idx], title: e.target.value }
                            return { ...prev, [d.key]: { ...prev[d.key], content: { ...(prev[d.key]?.content || {}), stats } } }
                          })}
                        />
                        <Input
                          placeholder={idx === 0 ? "We only choose the best." : idx === 1 ? "Including 40 during the war" : ""}
                          value={((items[d.key]?.content?.stats ?? [])[idx]?.subtitle ?? "")}
                          onChange={e => setItems(prev => {
                            const stats = Array.isArray(prev[d.key]?.content?.stats) ? [...prev[d.key].content.stats] : []
                            while (stats.length < 3) stats.push({ value: "", title: "", subtitle: "" })
                            stats[idx] = { ...stats[idx], subtitle: e.target.value }
                            return { ...prev, [d.key]: { ...prev[d.key], content: { ...(prev[d.key]?.content || {}), stats } } }
                          })}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : d.key === "match.quiz" ? (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <div className="text-lg font-semibold text-gray-900">Questions</div>
                    {[
                      { k: "problem", label: "What would you like to solve?" },
                      { k: "location", label: "Where do you want the clinic to be located?" },
                      { k: "gender", label: "Preferred therapist gender?" },
                      { k: "lgbtq", label: "LGBTQ+ related experience?" },
                      { k: "religion", label: "Therapist religion?" },
                      { k: "age", label: "Therapist age?" },
                      { k: "experience", label: "Therapist years of experience?" },
                      { k: "budget", label: "What budget do you have in mind?" },
                    ].map(({ k, label }) => (
                      <div key={k}>
                        <div className="text-sm text-gray-700 mb-1">{label}</div>
                        <Input
                          placeholder={label}
                          value={(items[d.key]?.content?.questions?.[k] ?? "")}
                          onChange={e => setItems(prev => ({
                            ...prev,
                            [d.key]: {
                              ...prev[d.key],
                              content: {
                                ...(prev[d.key]?.content || {}),
                                questions: { ...(prev[d.key]?.content?.questions || {}), [k]: e.target.value }
                              }
                            }
                          }))}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <div className="text-lg font-semibold text-gray-900">Options</div>

                    {/* Problems */}
                    <div className="space-y-2">
                      <div className="text-sm text-gray-700">Problems</div>
                      <div className="space-y-2">
                        {((items[d.key]?.content?.options?.problems as any[]) || []).map((val: string, idx: number) => (
                          <div key={`prob-${idx}`} className="flex gap-2">
                            <Input value={val} onChange={e => setItems(prev => {
                              const arr = Array.isArray(prev[d.key]?.content?.options?.problems) ? [...prev[d.key].content.options.problems] : []
                              arr[idx] = e.target.value
                              return { ...prev, [d.key]: { ...prev[d.key], content: { ...(prev[d.key]?.content||{}), options: { ...(prev[d.key]?.content?.options||{}), problems: arr } } } }
                            })} />
                            <Button variant="secondary" onClick={() => setItems(prev => {
                              const arr = Array.isArray(prev[d.key]?.content?.options?.problems) ? [...prev[d.key].content.options.problems] : []
                              arr.splice(idx,1)
                              return { ...prev, [d.key]: { ...prev[d.key], content: { ...(prev[d.key]?.content||{}), options: { ...(prev[d.key]?.content?.options||{}), problems: arr } } } }
                            })}>Remove</Button>
                          </div>
                        ))}
                        <Button onClick={() => setItems(prev => {
                          const arr = Array.isArray(prev[d.key]?.content?.options?.problems) ? [...prev[d.key].content.options.problems] : []
                          arr.push("")
                          return { ...prev, [d.key]: { ...prev[d.key], content: { ...(prev[d.key]?.content||{}), options: { ...(prev[d.key]?.content?.options||{}), problems: arr } } } }
                        })}>Add problem</Button>
                      </div>
                    </div>

                    {/* Locations */}
                    <div className="space-y-2">
                      <div className="text-sm text-gray-700">Cities</div>
                      <div className="space-y-2">
                        {((items[d.key]?.content?.options?.locations?.cities as any[]) || []).map((val: string, idx: number) => (
                          <div key={`city-${idx}`} className="space-y-2 p-2 border rounded-md">
                            <div className="flex gap-2">
                              <Input value={val} onChange={e => setItems(prev => {
                                const loc = { ...(prev[d.key]?.content?.options?.locations || { cities: [], subLocations: {} }) }
                                const cities = Array.isArray(loc.cities) ? [...loc.cities] : []
                                const old = cities[idx]
                                cities[idx] = e.target.value
                                // move subLocations mapping if city name changes
                                const subs = { ...(loc.subLocations || {}) as any }
                                if (old && subs[old] && old !== e.target.value) {
                                  subs[e.target.value] = subs[old]
                                  delete subs[old]
                                }
                                const next = { ...(prev[d.key]?.content||{}), options: { ...(prev[d.key]?.content?.options||{}), locations: { cities, subLocations: subs } } }
                                return { ...prev, [d.key]: { ...prev[d.key], content: next } }
                              })} />
                              <Button variant="secondary" onClick={() => setItems(prev => {
                                const loc = { ...(prev[d.key]?.content?.options?.locations || { cities: [], subLocations: {} }) }
                                const cities = Array.isArray(loc.cities) ? [...loc.cities] : []
                                const removed = cities.splice(idx,1)[0]
                                const subs = { ...(loc.subLocations || {}) as any }
                                if (removed && subs[removed]) delete subs[removed]
                                const next = { ...(prev[d.key]?.content||{}), options: { ...(prev[d.key]?.content?.options||{}), locations: { cities, subLocations: subs } } }
                                return { ...prev, [d.key]: { ...prev[d.key], content: next } }
                              })}>Remove</Button>
                            </div>
                            <div>
                              <div className="text-xs text-gray-600 mb-1">Sub-locations (comma separated)</div>
                              <Input value={(() => {
                                const subs = (items[d.key]?.content?.options?.locations?.subLocations || {}) as any
                                const list = subs[val] || []
                                return Array.isArray(list) ? list.join(", ") : ""
                              })()}
                              onChange={e => setItems(prev => {
                                const loc = { ...(prev[d.key]?.content?.options?.locations || { cities: [], subLocations: {} }) }
                                const subs = { ...(loc.subLocations || {}) as any }
                                subs[(loc.cities || [])[idx]] = e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean)
                                const next = { ...(prev[d.key]?.content||{}), options: { ...(prev[d.key]?.content?.options||{}), locations: { cities: loc.cities || [], subLocations: subs } } }
                                return { ...prev, [d.key]: { ...prev[d.key], content: next } }
                              })} />
                            </div>
                          </div>
                        ))}
                        <Button onClick={() => setItems(prev => {
                          const loc = { ...(prev[d.key]?.content?.options?.locations || { cities: [], subLocations: {} }) }
                          const cities = Array.isArray(loc.cities) ? [...loc.cities] : []
                          cities.push("")
                          const next = { ...(prev[d.key]?.content||{}), options: { ...(prev[d.key]?.content?.options||{}), locations: { cities, subLocations: loc.subLocations || {} } } }
                          return { ...prev, [d.key]: { ...prev[d.key], content: next } }
                        })}>Add city</Button>
                      </div>
                    </div>

                    {/* Generic list builder */}
                    {([
                      { key: "genders", title: "Genders" },
                      { key: "lgbtq", title: "LGBTQ options" },
                      { key: "religions", title: "Religions" },
                      { key: "ages", title: "Ages" },
                      { key: "experienceBands", title: "Experience bands" },
                    ] as { key: string; title: string }[]).map(({ key, title }) => (
                      <div key={key} className="space-y-2">
                        <div className="text-sm text-gray-700">{title}</div>
                        <div className="space-y-2">
                          {((items[d.key]?.content?.options?.[key] as any[]) || []).map((val: string, idx: number) => (
                            <div key={`${key}-${idx}`} className="flex gap-2">
                              <Input value={val} onChange={e => setItems(prev => {
                                const opts = { ...(prev[d.key]?.content?.options || {}) } as any
                                const arr = Array.isArray(opts[key]) ? [...opts[key]] : []
                                arr[idx] = e.target.value
                                const next = { ...(prev[d.key]?.content||{}), options: { ...opts, [key]: arr } }
                                return { ...prev, [d.key]: { ...prev[d.key], content: next } }
                              })} />
                              <Button variant="secondary" onClick={() => setItems(prev => {
                                const opts = { ...(prev[d.key]?.content?.options || {}) } as any
                                const arr = Array.isArray(opts[key]) ? [...opts[key]] : []
                                arr.splice(idx,1)
                                const next = { ...(prev[d.key]?.content||{}), options: { ...opts, [key]: arr } }
                                return { ...prev, [d.key]: { ...prev[d.key], content: next } }
                              })}>Remove</Button>
                            </div>
                          ))}
                          <Button onClick={() => setItems(prev => {
                            const opts = { ...(prev[d.key]?.content?.options || {}) } as any
                            const arr = Array.isArray(opts[key]) ? [...opts[key]] : []
                            arr.push("")
                            const next = { ...(prev[d.key]?.content||{}), options: { ...opts, [key]: arr } }
                            return { ...prev, [d.key]: { ...prev[d.key], content: next } }
                          })}>Add {title.slice(0,-1)}</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <Textarea rows={8} value={JSON.stringify(items[d.key]?.content || {}, null, 2)} onChange={e => setItems(prev => ({ ...prev, [d.key]: { ...prev[d.key], content: safeParseJson(e.target.value) } }))} />
              )}

              <div className="flex justify-end">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button className="bg-[#056DBA] hover:bg-[#045A99]">Save</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Publish these changes?</AlertDialogTitle>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => save(d.key)}>Confirm & Save</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function safeParseJson(str: string) {
  try { return JSON.parse(str) } catch { return {} }
}


