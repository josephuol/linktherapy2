"use client"

import { createBrowserClient } from "@supabase/ssr"

export const supabaseBrowser = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
  )

// Implicit-flow client for email links that must work across browsers/incognito
export const supabaseImplicitBrowser = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    {
      auth: {
        flowType: "implicit",
      },
    },
  )



