import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { NextRequest, NextResponse } from "next/server"

/**
 * Server-side helper to verify admin role
 * Use this in API routes and server components
 */
export async function verifyAdminRole() {
  const cookieStore = await cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )

  // Get authenticated user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    return { 
      authorized: false, 
      user: null, 
      error: "Not authenticated" 
    }
  }

  // Check if user has admin role
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single()

  if (profileError || !profile) {
    return { 
      authorized: false, 
      user: user, 
      error: "Profile not found" 
    }
  }

  if (profile.role !== "admin") {
    return { 
      authorized: false, 
      user: user, 
      error: "Insufficient permissions - admin role required" 
    }
  }

  return { 
    authorized: true, 
    user: user, 
    error: null 
  }
}

/**
 * Middleware wrapper for admin API routes
 * Returns 401 if not authenticated or not admin
 * 
 * Usage:
 * export async function POST(req: Request) {
 *   const authCheck = await requireAdmin()
 *   if (authCheck.error) return authCheck.error
 *   
 *   // Your protected code here
 *   const user = authCheck.user
 * }
 */
export async function requireAdmin() {
  const result = await verifyAdminRole()
  
  if (!result.authorized) {
    return {
      user: null,
      error: NextResponse.json(
        { error: result.error || "Unauthorized" },
        { status: 401 }
      )
    }
  }

  return {
    user: result.user,
    error: null
  }
}

/**
 * Check admin role in middleware (for route protection)
 */
export async function checkAdminInMiddleware(req: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return false

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single()

  return profile?.role === "admin"
}

