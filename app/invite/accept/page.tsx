import { Suspense } from "react"
import AcceptInviteClient from "./Client"

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <AcceptInviteClient />
    </Suspense>
  )
}
