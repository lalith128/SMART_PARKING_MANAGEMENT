
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type NotificationType = 'info' | 'warning' | 'success' | 'error';
export type UserRole = 'user' | 'owner';

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
      notifications: {
        Row: {
          id: string
          user_id: string
          message: string
          type: NotificationType
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          message: string
          type: NotificationType
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          message?: string
          type?: NotificationType
          is_read?: boolean
          created_at?: string
        }
      }
      bookings: {
        Row: {
          id: string
          user_id: string
          parking_space_id: string
          start_time: string
          end_time: string | null
          status: 'pending' | 'active' | 'completed' | 'cancelled'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          parking_space_id: string
          start_time: string
          end_time?: string | null
          status?: 'pending' | 'active' | 'completed' | 'cancelled'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          parking_space_id?: string
          start_time?: string
          end_time?: string | null
          status?: 'pending' | 'active' | 'completed' | 'cancelled'
          created_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          booking_id: string
          amount: number
          status: 'pending' | 'completed' | 'failed'
          created_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          amount: number
          status?: 'pending' | 'completed' | 'failed'
          created_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          amount?: number
          status?: 'pending' | 'completed' | 'failed'
          created_at?: string
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
