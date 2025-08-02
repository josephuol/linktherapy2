import { HeroSection } from "@/components/hero-section"
import { TherapistDirectory } from "@/components/therapist-directory"
import { WhatsAppButton } from "@/components/whatsapp-button"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <HeroSection />
      <TherapistDirectory />
      <WhatsAppButton />
    </div>
  )
}
