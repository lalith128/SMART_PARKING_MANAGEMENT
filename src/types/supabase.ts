
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      parking_spaces: {
        Row: {
          id: string
          created_at: string
          owner_id: string
          location: {
            lat: number
            lng: number
          }
          address: string
          district: string
          state: string
          country: string
          hourly_rate: number
          two_wheeler_capacity: number
          four_wheeler_capacity: number
          heavy_vehicle_capacity: number
          location_search: unknown | null
        }
        Insert: {
          id?: string
          created_at?: string
          owner_id: string
          location: {
            lat: number
            lng: number
          }
          address: string
          district: string
          state: string
          country: string
          hourly_rate: number
          two_wheeler_capacity: number
          four_wheeler_capacity: number
          heavy_vehicle_capacity: number
          location_search?: unknown | null
        }
        Update: {
          id?: string
          created_at?: string
          owner_id?: string
          location?: {
            lat: number
            lng: number
          }
          address?: string
          district?: string
          state?: string
          country?: string
          hourly_rate?: number
          two_wheeler_capacity?: number
          four_wheeler_capacity?: number
          heavy_vehicle_capacity?: number
          location_search?: unknown | null
        }
      }
      profiles: {
        Row: {
          id: string
          full_name: string
          role: string
          created_at: string | null
          updated_at: string | null
          email: string
          phone_number: string | null
        }
        Insert: {
          id: string
          full_name: string
          role: string
          created_at?: string | null
          updated_at?: string | null
          email: string
          phone_number?: string | null
        }
        Update: {
          id?: string
          full_name?: string
          role?: string
          created_at?: string | null
          updated_at?: string | null
          email?: string
          phone_number?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
