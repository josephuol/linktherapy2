"use client"

import { usePathname } from "next/navigation"
import { Navigation } from "@/components/navigation"

export function ConditionalNavigation() {
  const pathname = usePathname()
  if (pathname?.startsWith("/dashboard")) return null
  return <Navigation />
}


