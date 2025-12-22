import { z } from "zod"

// Stats schema for home hero section
const StatSchema = z.object({
  value: z.string().default(""),
  title: z.string().default(""),
  subtitle: z.string().default(""),
})

// Home Hero content schema
export const HeroSchema = z.object({
  h1: z.string().default(""),
  h2: z.string().default(""),
  intro: z.string().default(""),
  stats: z.array(StatSchema).default([
    { value: "", title: "", subtitle: "" },
    { value: "", title: "", subtitle: "" },
    { value: "", title: "", subtitle: "" },
  ]),
})

// Directory labels schema
export const DirectoryLabelsSchema = z.object({
  interestsLabel: z.string().default(""),
})

// Directory intro schema (for generic content)
export const DirectoryIntroSchema = z.record(z.any()).default({})

// Blog settings schema
export const BlogSettingsSchema = z.record(z.any()).default({})

// Locations schema for quiz
const LocationsSchema = z.object({
  cities: z.array(z.string()).default([]),
  subLocations: z.record(z.array(z.string())).default({}),
})

// Quiz options schema
const QuizOptionsSchema = z.object({
  problems: z.array(z.string()).default([]),
  locations: LocationsSchema.default({ cities: [], subLocations: {} }),
  genders: z.array(z.string()).default([]),
  lgbtq: z.array(z.string()).default([]),
  religions: z.array(z.string()).default([]),
  ages: z.array(z.string()).default([]),
  experienceBands: z.array(z.string()).default([]),
})

// Quiz questions schema
const QuizQuestionsSchema = z.object({
  problem: z.string().default(""),
  location: z.string().default(""),
  gender: z.string().default(""),
  lgbtq: z.string().default(""),
  religion: z.string().default(""),
  age: z.string().default(""),
  experience: z.string().default(""),
  budget: z.string().default(""),
})

// Match Quiz content schema
export const QuizSchema = z.object({
  questions: QuizQuestionsSchema.default({
    problem: "",
    location: "",
    gender: "",
    lgbtq: "",
    religion: "",
    age: "",
    experience: "",
    budget: "",
  }),
  options: QuizOptionsSchema.default({
    problems: [],
    locations: { cities: [], subLocations: {} },
    genders: [],
    lgbtq: [],
    religions: [],
    ages: [],
    experienceBands: [],
  }),
})

// Content type discriminated by key
export const ContentSchemaMap: Record<string, z.ZodSchema> = {
  "home.hero": HeroSchema,
  "directory.labels": DirectoryLabelsSchema,
  "directory.intro": DirectoryIntroSchema,
  "blog.settings": BlogSettingsSchema,
  "match.quiz": QuizSchema,
}

// Helper to get schema for a key, defaults to generic record
export function getSchemaForKey(key: string): z.ZodSchema {
  return ContentSchemaMap[key] || z.record(z.any())
}

// Inferred types
export type HeroContent = z.infer<typeof HeroSchema>
export type DirectoryLabelsContent = z.infer<typeof DirectoryLabelsSchema>
export type QuizContent = z.infer<typeof QuizSchema>

// Content row type
export type ContentRow = {
  key: string
  title: string | null
  content: unknown
}

// Default keys configuration
export const DEFAULT_CONTENT_KEYS = [
  { key: "home.hero", title: "Homepage Hero" },
  { key: "directory.intro", title: "Therapist Directory Intro" },
  { key: "directory.labels", title: "Directory Labels (UI Text)" },
  { key: "blog.settings", title: "Blog Settings" },
  { key: "match.quiz", title: "Match Quiz" },
] as const

export type ContentKey = (typeof DEFAULT_CONTENT_KEYS)[number]["key"]
