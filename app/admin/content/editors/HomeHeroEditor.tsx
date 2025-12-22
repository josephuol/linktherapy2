"use client"

import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { HeroSchema, type HeroContent } from "../schemas"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Card, CardContent } from "@/components/ui/card"

interface HomeHeroEditorProps {
  initialData: HeroContent
  onSave: (data: HeroContent) => Promise<void>
  isSaving: boolean
}

export function HomeHeroEditor({
  initialData,
  onSave,
  isSaving,
}: HomeHeroEditorProps) {
  const form = useForm<HeroContent>({
    resolver: zodResolver(HeroSchema),
    defaultValues: initialData,
  })

  const { fields } = useFieldArray({
    control: form.control,
    name: "stats",
  })

  const handleSubmit = async (data: HeroContent) => {
    await onSave(data)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="h1"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-700">Main heading (H1)</FormLabel>
              <FormControl>
                <Input
                  placeholder="A good therapist changes everything."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="h2"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-700">Sub heading (H2)</FormLabel>
              <FormControl>
                <Input
                  placeholder="Only 1 in 10 therapists pass our selection process."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="intro"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-700">Intro paragraph</FormLabel>
              <FormControl>
                <Textarea
                  rows={4}
                  placeholder="Find a therapist that fits your budget, near you or online..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <div className="text-sm font-medium text-gray-700">Statistics</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {fields.map((field, index) => (
              <Card key={field.id} className="bg-white">
                <CardContent className="pt-4 space-y-3">
                  <div className="text-sm font-medium text-gray-800">
                    Stat {index + 1}
                  </div>
                  <FormField
                    control={form.control}
                    name={`stats.${index}.value`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-gray-600">
                          Value
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder={
                              index === 0
                                ? "10%"
                                : index === 1
                                  ? "100+"
                                  : "25+"
                            }
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`stats.${index}.title`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-gray-600">
                          Title
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder={
                              index === 0
                                ? "Therapist Acceptance Rate"
                                : index === 1
                                  ? "Lives Improved"
                                  : "5 star ratings on Google"
                            }
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`stats.${index}.subtitle`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-gray-600">
                          Subtitle
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder={
                              index === 0
                                ? "We only choose the best."
                                : index === 1
                                  ? "Including 40 during the war"
                                  : ""
                            }
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

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
