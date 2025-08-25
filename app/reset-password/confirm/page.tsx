import { Suspense } from "react"
import ResetPasswordConfirmClient from "./Client"

export const dynamic = "force-dynamic"

export default function ResetPasswordConfirmPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading secure session...</div>}>
      <ResetPasswordConfirmClient />
    </Suspense>
  )
}
