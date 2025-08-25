import TherapistDirectoryLoader from "@/components/therapist-directory-loader"
import { WhatsAppButton } from "@/components/whatsapp-button"
import AuthHashRedirect from "../components/auth-hash-redirect"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <AuthHashRedirect />
      {/* Server-side prefetch for faster first paint */}
      {/* eslint-disable-next-line @next/next/no-async-client-component */}
      <TherapistDirectoryLoader showFilters={false} limit={4} />
      <WhatsAppButton />
    </div>
  )
}
