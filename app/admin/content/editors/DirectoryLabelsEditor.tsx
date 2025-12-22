"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { DirectoryLabelsSchema, type DirectoryLabelsContent } from "../schemas"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form"

interface DirectoryLabelsEditorProps {
  initialData: DirectoryLabelsContent
  onSave: (data: DirectoryLabelsContent) => Promise<void>
  isSaving: boolean
}

export function DirectoryLabelsEditor({
  initialData,
  onSave,
  isSaving,
}: DirectoryLabelsEditorProps) {
  const form = useForm<DirectoryLabelsContent>({
    resolver: zodResolver(DirectoryLabelsSchema),
    defaultValues: initialData,
  })

  const handleSubmit = async (data: DirectoryLabelsContent) => {
    await onSave(data)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="interestsLabel"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-700">Interests Label</FormLabel>
              <FormControl>
                <Input placeholder="Interests" {...field} />
              </FormControl>
              <FormDescription>
                This text appears above the interests chips on therapist cards.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

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
