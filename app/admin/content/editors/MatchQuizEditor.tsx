"use client"

import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { QuizSchema, type QuizContent } from "../schemas"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X, Plus } from "lucide-react"

interface MatchQuizEditorProps {
  initialData: QuizContent
  onSave: (data: QuizContent) => Promise<void>
  isSaving: boolean
}

const QUESTION_LABELS = [
  { key: "problem", label: "What would you like to solve?" },
  { key: "location", label: "Where do you want the clinic to be located?" },
  { key: "gender", label: "Preferred therapist gender?" },
  { key: "lgbtq", label: "LGBTQ+ related experience?" },
  { key: "religion", label: "Therapist religion?" },
  { key: "age", label: "Therapist age?" },
  { key: "experience", label: "Therapist years of experience?" },
  { key: "budget", label: "What budget do you have in mind?" },
] as const

const OPTION_SECTIONS = [
  { key: "genders", title: "Genders", singular: "Gender" },
  { key: "lgbtq", title: "LGBTQ Options", singular: "LGBTQ Option" },
  { key: "religions", title: "Religions", singular: "Religion" },
  { key: "ages", title: "Ages", singular: "Age" },
  { key: "experienceBands", title: "Experience Bands", singular: "Experience Band" },
] as const

export function MatchQuizEditor({
  initialData,
  onSave,
  isSaving,
}: MatchQuizEditorProps) {
  const form = useForm<QuizContent>({
    resolver: zodResolver(QuizSchema),
    defaultValues: initialData,
  })

  const handleSubmit = async (data: QuizContent) => {
    await onSave(data)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        {/* Questions Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {QUESTION_LABELS.map(({ key, label }) => (
              <FormField
                key={key}
                control={form.control}
                name={`questions.${key}` as any}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700">{label}</FormLabel>
                    <FormControl>
                      <Input placeholder={label} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </CardContent>
        </Card>

        {/* Options Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Problems */}
            <div className="space-y-3">
              <div className="text-sm font-medium text-gray-700">Problems</div>
              <Controller
                control={form.control}
                name="options.problems"
                render={({ field }) => (
                  <div className="space-y-2">
                    {(field.value || []).map((val: string, idx: number) => (
                      <div key={idx} className="flex gap-2">
                        <Input
                          value={val}
                          onChange={(e) => {
                            const newArr = [...(field.value || [])]
                            newArr[idx] = e.target.value
                            field.onChange(newArr)
                          }}
                          placeholder="Enter a problem"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            const newArr = (field.value || []).filter(
                              (_: string, i: number) => i !== idx
                            )
                            field.onChange(newArr)
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => field.onChange([...(field.value || []), ""])}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Problem
                    </Button>
                  </div>
                )}
              />
            </div>

            {/* Cities & Sub-locations */}
            <div className="space-y-3">
              <div className="text-sm font-medium text-gray-700">Cities</div>
              <Controller
                control={form.control}
                name="options.locations"
                render={({ field }) => (
                  <div className="space-y-3">
                    {(field.value?.cities || []).map((city: string, idx: number) => (
                      <div
                        key={idx}
                        className="space-y-2 p-3 border rounded-md bg-gray-50"
                      >
                        <div className="flex gap-2">
                          <Input
                            value={city}
                            onChange={(e) => {
                              const oldCity = field.value?.cities?.[idx]
                              const newCities = [...(field.value?.cities || [])]
                              newCities[idx] = e.target.value

                              // Move subLocations mapping
                              const subs = { ...(field.value?.subLocations || {}) }
                              if (oldCity && subs[oldCity] && oldCity !== e.target.value) {
                                subs[e.target.value] = subs[oldCity]
                                delete subs[oldCity]
                              }

                              field.onChange({
                                cities: newCities,
                                subLocations: subs,
                              })
                            }}
                            placeholder="City name"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              const removed = field.value?.cities?.[idx]
                              const newCities = (field.value?.cities || []).filter(
                                (_: string, i: number) => i !== idx
                              )
                              const subs = { ...(field.value?.subLocations || {}) }
                              if (removed) delete subs[removed]
                              field.onChange({
                                cities: newCities,
                                subLocations: subs,
                              })
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600 mb-1">
                            Sub-locations (comma separated)
                          </div>
                          <Input
                            value={
                              Array.isArray(field.value?.subLocations?.[city])
                                ? field.value.subLocations[city].join(", ")
                                : ""
                            }
                            onChange={(e) => {
                              const subs = { ...(field.value?.subLocations || {}) }
                              subs[city] = e.target.value
                                .split(",")
                                .map((s: string) => s.trim())
                                .filter(Boolean)
                              field.onChange({
                                ...field.value,
                                subLocations: subs,
                              })
                            }}
                            placeholder="Area 1, Area 2, Area 3"
                          />
                        </div>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        field.onChange({
                          cities: [...(field.value?.cities || []), ""],
                          subLocations: field.value?.subLocations || {},
                        })
                      }
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add City
                    </Button>
                  </div>
                )}
              />
            </div>

            {/* Generic list builders for other options */}
            {OPTION_SECTIONS.map(({ key, title, singular }) => (
              <div key={key} className="space-y-3">
                <div className="text-sm font-medium text-gray-700">{title}</div>
                <Controller
                  control={form.control}
                  name={`options.${key}` as any}
                  render={({ field }) => (
                    <div className="space-y-2">
                      {(field.value || []).map((val: string, idx: number) => (
                        <div key={idx} className="flex gap-2">
                          <Input
                            value={val}
                            onChange={(e) => {
                              const newArr = [...(field.value || [])]
                              newArr[idx] = e.target.value
                              field.onChange(newArr)
                            }}
                            placeholder={`Enter ${singular.toLowerCase()}`}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              const newArr = (field.value || []).filter(
                                (_: string, i: number) => i !== idx
                              )
                              field.onChange(newArr)
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => field.onChange([...(field.value || []), ""])}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add {singular}
                      </Button>
                    </div>
                  )}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isSaving}
            className="bg-[#056DBA] hover:bg-[#045A99]"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
