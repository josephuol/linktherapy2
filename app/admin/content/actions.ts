"use server"

import { revalidatePath } from "next/cache"
import { supabaseAdmin } from "@/lib/supabase-server"
import { getSchemaForKey, DEFAULT_CONTENT_KEYS, type ContentRow } from "./schemas"

export type SiteContent = Record<string, ContentRow>

export type ActionResult = {
  success: boolean
  error?: string
  validationErrors?: Record<string, string[]>
}

/**
 * Fetches all site content from the database
 * Returns a map of content keyed by their key field
 */
export async function getSiteContent(): Promise<SiteContent> {
  const supabase = supabaseAdmin()

  const { data, error } = await supabase
    .from("site_content")
    .select("key, title, content")

  if (error) {
    console.error("Failed to fetch site content:", error)
    throw new Error("Failed to load site content")
  }

  // Build content map from database rows
  const contentMap: SiteContent = {}
  for (const row of data || []) {
    contentMap[row.key] = {
      key: row.key,
      title: row.title,
      content: row.content,
    }
  }

  // Fill in missing default keys with empty content
  for (const def of DEFAULT_CONTENT_KEYS) {
    if (!contentMap[def.key]) {
      contentMap[def.key] = {
        key: def.key,
        title: def.title,
        content: {},
      }
    }
  }

  return contentMap
}

/**
 * Updates a single content entry
 * Validates the data against the schema for the given key
 */
export async function updateSiteContent(
  key: string,
  title: string | null,
  data: unknown
): Promise<ActionResult> {
  const supabase = supabaseAdmin()

  // Validate data against schema
  const schema = getSchemaForKey(key)
  const parseResult = schema.safeParse(data)

  if (!parseResult.success) {
    const fieldErrors: Record<string, string[]> = {}
    for (const issue of parseResult.error.issues) {
      const path = issue.path.join(".")
      if (!fieldErrors[path]) {
        fieldErrors[path] = []
      }
      fieldErrors[path].push(issue.message)
    }
    return {
      success: false,
      error: "Validation failed",
      validationErrors: fieldErrors,
    }
  }

  const validatedData = parseResult.data

  // Check if content exists
  const { data: existing, error: existErr } = await supabase
    .from("site_content")
    .select("key")
    .eq("key", key)
    .maybeSingle()

  if (existErr && existErr.code !== "PGRST116") {
    console.error("Failed to check content existence:", existErr)
    return {
      success: false,
      error: "Failed to check if content exists",
    }
  }

  const payload = {
    key,
    title,
    content: validatedData,
    updated_at: new Date().toISOString(),
  }

  if (existing?.key) {
    // Update existing record
    const { error } = await supabase
      .from("site_content")
      .update(payload)
      .eq("key", key)

    if (error) {
      console.error("Failed to update content:", error)
      return {
        success: false,
        error: error.message || "Failed to update content",
      }
    }
  } else {
    // Insert new record
    const { error } = await supabase.from("site_content").insert(payload)

    if (error) {
      console.error("Failed to insert content:", error)
      return {
        success: false,
        error: error.message || "Failed to create content",
      }
    }
  }

  // Revalidate paths that might use this content
  revalidatePath("/admin/content")
  revalidatePath("/")
  revalidatePath("/therapists")
  revalidatePath("/onboarding")

  return { success: true }
}
