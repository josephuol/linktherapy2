/**
 * Search Types
 * Types for the Smart Search component and related functionality
 */

export type Location = {
  id: string
  city: string
  country: string
}

export type Specialty = {
  id: string
  name: string
  description?: string
}

export type SearchStep = 'initial' | 'category' | 'location' | 'specialty' | 'name'

export type SearchSelections = {
  city?: string
  problem?: string
  remote?: boolean
  q?: string
}

export type SearchCategory =
  | 'location'
  | 'specialty'
  | 'online'
  | 'name'
