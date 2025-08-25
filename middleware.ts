import { NextResponse, NextRequest } from "next/server"

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl

  // Normalize root /?code=... redirects to /auth/callback
  if (pathname === "/" && searchParams.has("code")) {
    const code = searchParams.get("code") || ""
    const url = req.nextUrl.clone()
    url.pathname = "/auth/callback"
    url.searchParams.set("code", code)
    // Default to reset-password confirm if coming from a recovery; safe general next
    if (!url.searchParams.has("next")) url.searchParams.set("next", "/reset-password/confirm")
    return NextResponse.redirect(url)
  }

  // Also normalize /reset-password/confirm?code=... to /auth/callback with next
  if (pathname === "/reset-password/confirm" && searchParams.has("code")) {
    const code = searchParams.get("code") || ""
    const url = req.nextUrl.clone()
    url.pathname = "/auth/callback"
    url.searchParams.set("code", code)
    if (!url.searchParams.has("next")) url.searchParams.set("next", "/reset-password/confirm")
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/", "/reset-password/confirm"],
}


