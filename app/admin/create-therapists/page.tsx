"use client"

import { useState } from "react"
import { z } from "zod"

const emailSchema = z.string().email()

export default function CreateTherapistsPage() {
  const [emails, setEmails] = useState<string[]>([""])
  const [submitting, setSubmitting] = useState(false)
  const [results, setResults] = useState<{ email: string; status: "ok" | "error"; message?: string }[]>([])

  const handleAddLine = () => {
    if (emails.length >= 30) return
    setEmails((prev) => [...prev, ""])
  }

  const handleChange = (idx: number, value: string) => {
    setEmails((prev) => prev.map((e, i) => (i === idx ? value : e)))
  }

  const handleSubmit = async () => {
    const cleaned = emails
      .map((e) => e.trim())
      .filter((e) => e.length > 0)
      .slice(0, 30)

    const invalid = cleaned.filter((e) => !emailSchema.safeParse(e).success)
    if (invalid.length) {
      setResults(invalid.map((email) => ({ email, status: "error", message: "Invalid email" })))
      return
    }

    setSubmitting(true)
    setResults([])
    try {
      const res = await fetch("/api/admin/invite-therapist/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: cleaned }),
      })
      const data = await res.json()
      if (!res.ok) {
        setResults(cleaned.map((email) => ({ email, status: "error", message: data?.error || "Failed" })))
      } else {
        setResults(data.results)
      }
    } catch (e: any) {
      setResults(cleaned.map((email) => ({ email, status: "error", message: e?.message || "Network error" })))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Create Therapists</h1>

      <div className="space-y-2">
        {emails.map((value, idx) => (
          <div className="flex gap-2" key={idx}>
            <input
              type="email"
              value={value}
              onChange={(e) => handleChange(idx, e.target.value)}
              placeholder="therapist@example.com"
              className="w-full border rounded-md px-3 py-2"
            />
            {idx === emails.length - 1 && emails.length < 30 && (
              <button onClick={handleAddLine} className="border rounded-md px-3 py-2">
                +
              </button>
            )}
          </div>
        ))}
        <div>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-blue-600 text-white rounded-md px-4 py-2 disabled:opacity-50"
          >
            {submitting ? "Sending..." : "Send Invites"}
          </button>
        </div>
      </div>

      {results.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-medium mb-2">Results</h2>
          <ul className="space-y-1">
            {results.map((r, i) => (
              <li key={i} className="text-sm">
                <span className="font-mono">{r.email}</span>: {r.status === "ok" ? "Invited" : r.message || "Failed"}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}


