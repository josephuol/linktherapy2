import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ConditionalNavigation } from "@/components/conditional-navigation"
import { Footer } from "@/components/footer"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "LinkTherapy - Find Your Perfect Therapist",
  description:
    "Connect with qualified mental health professionals in your area. Search by specialty, location, and price to find the right therapist for you.",
  keywords: "therapy, therapist, mental health, counseling, psychology, anxiety, depression",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ConditionalNavigation />
        {children}
        <Footer />
        <Toaster />
      </body>
    </html>
  )
}
