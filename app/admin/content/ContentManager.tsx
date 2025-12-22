"use client"

import { useState, useTransition } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { updateSiteContent, type SiteContent } from "./actions"
import { DEFAULT_CONTENT_KEYS, HeroSchema, QuizSchema, DirectoryLabelsSchema } from "./schemas"
import { HomeHeroEditor } from "./editors/HomeHeroEditor"
import { MatchQuizEditor } from "./editors/MatchQuizEditor"
import { DirectoryLabelsEditor } from "./editors/DirectoryLabelsEditor"
import { GenericJsonEditor } from "./editors/GenericJsonEditor"

interface ContentManagerProps {
  initialContent: SiteContent
}

type TabKey = "home" | "directory" | "quiz" | "blog"

interface TabConfig {
  value: TabKey
  label: string
  keys: readonly string[]
}

const TABS: TabConfig[] = [
  { value: "home", label: "Home", keys: ["home.hero"] },
  { value: "directory", label: "Directory", keys: ["directory.intro", "directory.labels"] },
  { value: "quiz", label: "Match Quiz", keys: ["match.quiz"] },
  { value: "blog", label: "Blog", keys: ["blog.settings"] },
]

export function ContentManager({ initialContent }: ContentManagerProps) {
  const [content, setContent] = useState<SiteContent>(initialContent)
  const [isPending, startTransition] = useTransition()
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const { toast } = useToast()

  const getTitle = (key: string) => {
    return content[key]?.title || DEFAULT_CONTENT_KEYS.find((k) => k.key === key)?.title || key
  }

  const handleSave = async (key: string, data: unknown) => {
    setSavingKey(key)
    const title = content[key]?.title || null

    startTransition(async () => {
      const result = await updateSiteContent(key, title, data)

      if (result.success) {
        setContent((prev) => ({
          ...prev,
          [key]: { ...prev[key], content: data },
        }))
        toast({
          title: "Saved",
          description: `${getTitle(key)} has been updated successfully.`,
        })
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to save content",
          variant: "destructive",
        })
        if (result.validationErrors) {
          console.error("Validation errors:", result.validationErrors)
        }
      }
      setSavingKey(null)
    })
  }

  const handleTitleChange = (key: string, newTitle: string) => {
    setContent((prev) => ({
      ...prev,
      [key]: { ...prev[key], title: newTitle },
    }))
  }

  const renderEditor = (key: string) => {
    const item = content[key]
    const isSaving = savingKey === key && isPending

    switch (key) {
      case "home.hero": {
        const parsed = HeroSchema.safeParse(item?.content || {})
        const data = parsed.success ? parsed.data : HeroSchema.parse({})
        return (
          <HomeHeroEditor
            initialData={data}
            onSave={(data) => handleSave(key, data)}
            isSaving={isSaving}
          />
        )
      }

      case "match.quiz": {
        const parsed = QuizSchema.safeParse(item?.content || {})
        const data = parsed.success ? parsed.data : QuizSchema.parse({})
        return (
          <MatchQuizEditor
            initialData={data}
            onSave={(data) => handleSave(key, data)}
            isSaving={isSaving}
          />
        )
      }

      case "directory.labels": {
        const parsed = DirectoryLabelsSchema.safeParse(item?.content || {})
        const data = parsed.success ? parsed.data : DirectoryLabelsSchema.parse({})
        return (
          <DirectoryLabelsEditor
            initialData={data}
            onSave={(data) => handleSave(key, data)}
            isSaving={isSaving}
          />
        )
      }

      default:
        return (
          <GenericJsonEditor
            initialData={item?.content || {}}
            onSave={(data) => handleSave(key, data)}
            isSaving={isSaving}
          />
        )
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50/30 to-blue-100/20 py-10">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-bold text-[#056DBA] mb-8">
          Content Management
        </h1>

        <Tabs defaultValue="home" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            {TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {TABS.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className="space-y-6">
              {tab.keys.map((key) => (
                <Card key={key}>
                  <CardHeader>
                    <CardTitle className="text-xl font-bold text-gray-900">
                      {getTitle(key)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor={`title-${key}`} className="text-sm text-gray-700">
                        Section Title
                      </Label>
                      <Input
                        id={`title-${key}`}
                        value={content[key]?.title || ""}
                        onChange={(e) => handleTitleChange(key, e.target.value)}
                        placeholder="Section title"
                      />
                    </div>

                    <div className="border-t pt-6">{renderEditor(key)}</div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  )
}
