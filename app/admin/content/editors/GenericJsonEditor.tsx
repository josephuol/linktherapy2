"use client"

import { useState, useEffect } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

interface GenericJsonEditorProps {
  initialData: unknown
  onSave: (data: unknown) => Promise<void>
  isSaving: boolean
}

export function GenericJsonEditor({
  initialData,
  onSave,
  isSaving,
}: GenericJsonEditorProps) {
  const [jsonText, setJsonText] = useState(() =>
    JSON.stringify(initialData || {}, null, 2)
  )
  const [parseError, setParseError] = useState<string | null>(null)

  // Update the JSON text when initialData changes
  useEffect(() => {
    setJsonText(JSON.stringify(initialData || {}, null, 2))
    setParseError(null)
  }, [initialData])

  const handleTextChange = (value: string) => {
    setJsonText(value)

    // Validate JSON on blur or after a short delay
    try {
      JSON.parse(value)
      setParseError(null)
    } catch (e) {
      if (e instanceof SyntaxError) {
        setParseError(e.message)
      } else {
        setParseError("Invalid JSON")
      }
    }
  }

  const handleSave = async () => {
    try {
      const parsedData = JSON.parse(jsonText)
      setParseError(null)
      await onSave(parsedData)
    } catch (e) {
      if (e instanceof SyntaxError) {
        setParseError(e.message)
      } else {
        setParseError("Invalid JSON")
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Textarea
          rows={12}
          value={jsonText}
          onChange={(e) => handleTextChange(e.target.value)}
          className="font-mono text-sm"
          placeholder='{"key": "value"}'
        />
        {parseError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Invalid JSON: {parseError}
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !!parseError}
          className="bg-[#056DBA] hover:bg-[#045A99]"
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  )
}
