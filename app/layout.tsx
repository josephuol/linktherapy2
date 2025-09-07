import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import Script from "next/script"
import "./globals.css"
import { ConditionalNavigation } from "@/components/conditional-navigation"
import { Footer } from "@/components/footer"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID || "G-3S5N6EQQVQ"

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
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} strategy="afterInteractive" />
        <Script id="gtag-init" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}');`}
        </Script>
        <ConditionalNavigation />
        {children}
        <Footer />
        <Toaster />
      </body>
    </html>
  )
}
