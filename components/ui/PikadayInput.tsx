"use client"

import { useEffect, useRef } from "react"
import Pikaday from "pikaday"
import "pikaday/css/pikaday.css"

type PikadayInputProps = {
  value: string
  onChange: (value: string) => void
  min?: string
  placeholder?: string
  className?: string
  id?: string
}

export default function PikadayInput({ value, onChange, min, placeholder, className, id }: PikadayInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const pickerRef = useRef<Pikaday | null>(null)

  useEffect(() => {
    if (!inputRef.current) return
    pickerRef.current = new Pikaday({
      field: inputRef.current,
      format: "YYYY-MM-DD",
      toString(date: Date) {
        const y = date.getFullYear()
        const m = String(date.getMonth() + 1).padStart(2, '0')
        const d = String(date.getDate()).padStart(2, '0')
        return `${y}-${m}-${d}`
      },
      parse(dateString: string) {
        const [y, m, d] = dateString.split('-').map(Number)
        return new Date(y, (m || 1) - 1, d || 1)
      },
      minDate: min ? new Date(min) : undefined,
      bound: true,
      reposition: true,
      onSelect: (date: Date) => {
        const y = date.getFullYear()
        const m = String(date.getMonth() + 1).padStart(2, '0')
        const d = String(date.getDate()).padStart(2, '0')
        onChange(`${y}-${m}-${d}`)
      },
    })
    return () => { pickerRef.current?.destroy(); pickerRef.current = null }
  }, [min, onChange])

  // Keep picker in sync when value prop changes externally
  useEffect(() => {
    if (!pickerRef.current) return
    if (value) {
      const [y, m, d] = value.split('-').map(Number)
      const parsed = new Date(y, (m || 1) - 1, d || 1)
      if (!isNaN(parsed.getTime())) {
        const current = pickerRef.current.getDate()
        if (!current || current.getTime() !== parsed.getTime()) {
          pickerRef.current.setDate(parsed, true)
        }
      }
    }
  }, [value])

  // Update minDate dynamically
  useEffect(() => {
    if (!pickerRef.current) return
    pickerRef.current.setMinDate(min ? new Date(min) : null)
  }, [min])

  return (
    <input
      id={id}
      ref={inputRef}
      type="text"
      className={className}
      placeholder={placeholder || "Pick a day"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => pickerRef.current?.show()}
      readOnly
    />
  )
}


