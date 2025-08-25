import TherapistDirectoryLoader from "@/components/therapist-directory-loader"

export default function TherapistsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Full directory with filters, no hero */}
      {/* eslint-disable-next-line @next/next/no-async-client-component */}
      <TherapistDirectoryLoader showFilters={true} showHero={false} />
    </div>
  )
}


