"use client"

import { useState } from "react"
import InputField from "@/components/ui/input-field"
import Label from "@/components/ui/label"
import Button from "@/components/ui/button-admin"
import Link from "next/link"

export default function ResetPasswordRequestPage() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to send reset email")
        return
      }
      setSent(true)
    } catch (err: any) {
      setError(err?.message || "An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative p-6 bg-white z-1 dark:bg-gray-900 sm:p-0 mt-16">
      <div className="relative flex w-full min-h-[calc(100vh-64px)] justify-center flex-col dark:bg-gray-900 sm:p-0">
        <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
          <div>
            <div className="mb-5 sm:mb-8">
              <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
                Reset your password
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Enter your account email and well send you a secure link.
              </p>
            </div>
            {sent ? (
              <div className="space-y-6">
                <div className="text-sm text-gray-700 dark:text-white/80">
                  If an account exists for <span className="font-medium">{email}</span>, a reset link has been sent. Please check your inbox.
                </div>
                <div className="flex gap-3">
                  <Link href="/login" className="text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400">
                    Back to sign in
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={onSubmit}>
                <div className="space-y-6">
                  <div>
                    <Label>
                      Email <span className="text-error-500">*</span>
                    </Label>
                    <InputField
                      placeholder="you@example.com"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      error={!!error}
                    />
                  </div>
                  {error && <p className="text-sm text-error-500">{error}</p>}
                  <div>
                    <Button className="w-full" size="sm" type="submit" disabled={loading || !email}>
                      {loading ? "Sending..." : "Send reset link"}
                    </Button>
                  </div>
                  <div className="text-sm">
                    <Link href="/login" className="text-brand-600 hover:text-brand-700 dark:text-brand-400">
                      Back to sign in
                    </Link>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


