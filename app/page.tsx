import { HeroSection } from "@/components/hero-section"
import TherapistDirectoryLoader from "@/components/therapist-directory-loader"
import { WhatsAppButton } from "@/components/whatsapp-button"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <HeroSection />
      {/* Server-side prefetch for faster first paint */}
      {/* eslint-disable-next-line @next/next/no-async-client-component */}
      <TherapistDirectoryLoader />
      <WhatsAppButton />
    </div>
  )
}
