
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'user' | 'owner';
export type BookingStatus = 'pending' | 'active' | 'completed' | 'cancelled';
export type PaymentStatus = 'pending' | 'completed' | 'failed';
export type PaymentMethod = 'credit_card' | 'wallet' | 'cash';
export type NotificationType = 'info' | 'warning' | 'success' | 'error';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          role: UserRole
          created_at: string
          updated_at?: string
        }
        Insert: {
          id: string
          full_name: string
          role: UserRole
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          role?: UserRole
          created_at?: string
          updated_at?: string
        }
      }
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
          hourly_rate: number
          bike_capacity: number
          car_capacity: number
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
          hourly_rate: number
          bike_capacity: number
          car_capacity: number
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
          hourly_rate?: number
          bike_capacity?: number
          car_capacity?: number
        }
      }
      bookings: {
        Row: {
          id: string
          user_id: string
          parking_space_id: string
          start_time: string
          end_time?: string
          status: BookingStatus
          created_at: string
          total_cost?: number
        }
        Insert: {
          id?: string
          user_id: string
          parking_space_id: string
          start_time: string
          end_time?: string
          status?: BookingStatus
          created_at?: string
          total_cost?: number
        }
        Update: {
          id?: string
          user_id?: string
          parking_space_id?: string
          start_time?: string
          end_time?: string
          status?: BookingStatus
          created_at?: string
          total_cost?: number
        }
      }
      payments: {
        Row: {
          id: string
          booking_id: string
          user_id: string
          amount: number
          payment_method: PaymentMethod
          status: PaymentStatus
          created_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          user_id: string
          amount: number
          payment_method: PaymentMethod
          status?: PaymentStatus
          created_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          user_id?: string
          amount?: number
          payment_method?: PaymentMethod
          status?: PaymentStatus
          created_at?: string
        }
      }
    }
  }
}
