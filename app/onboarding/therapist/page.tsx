import { Suspense } from "react"
import TherapistOnboardingClient from "./Client"

export const dynamic = "force-dynamic"

export default function TherapistOnboardingPage() {
  return (
    <Suspense fallback={<div className="p-6">Preparing your account...</div>}>
      <TherapistOnboardingClient />
    </Suspense>
  )
}


