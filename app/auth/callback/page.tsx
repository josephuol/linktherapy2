import { Suspense } from "react"
import AuthCallbackClient from "./Client"

export const dynamic = "force-dynamic"

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="p-6">Completing sign-in...</div>}>
      <AuthCallbackClient />
    </Suspense>
  )
}


