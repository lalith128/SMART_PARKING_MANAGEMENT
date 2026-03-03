export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type NotificationType =
  | 'info'
  | 'warning'
  | 'success'
  | 'error'
  | 'booking_confirmed'
  | 'new_booking'
  | 'booking_cancelled'
  | 'booking_completed'
  | 'payment_received';
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
          images: string[] | null
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
          two_wheeler_capacity?: number
          four_wheeler_capacity?: number
          heavy_vehicle_capacity?: number
          location_search?: unknown | null
          images?: string[] | null
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
          images?: string[] | null
        }
      }
      profiles: {
        Row: {
          id: string
          created_at: string
          full_name: string
          email?: string
          phone_number: string | null
          role: UserRole
          is_banned?: boolean
          updated_at?: string | null
        }
        Insert: {
          id: string
          created_at?: string
          full_name: string
          phone_number?: string | null
          email?: string
          role?: UserRole
          is_banned?: boolean
          updated_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          full_name?: string
          phone_number?: string | null
          email?: string
          role?: UserRole
          is_banned?: boolean
          updated_at?: string | null
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: NotificationType
          booking_id?: string | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          type: NotificationType
          booking_id?: string | null
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          message?: string
          type?: NotificationType
          booking_id?: string | null
          is_read?: boolean
          created_at?: string
        }
      }
      bookings: {
        Row: {
          id: string
          user_id: string
          owner_id: string
          parking_space_id: string
          slot_number: string | null
          vehicle_type: string
          vehicle_number: string | null
          start_time: string
          end_time: string | null
          amount: number
          status: 'pending' | 'active' | 'completed' | 'cancelled'
          user_name?: string | null
          user_email?: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          owner_id: string
          parking_space_id: string
          slot_number?: string | null
          vehicle_type: string
          vehicle_number?: string | null
          start_time: string
          end_time?: string | null
          amount: number
          status?: 'pending' | 'active' | 'completed' | 'cancelled'
          user_name?: string | null
          user_email?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          owner_id?: string
          parking_space_id?: string
          slot_number?: string | null
          vehicle_type?: string
          vehicle_number?: string | null
          start_time?: string
          end_time?: string | null
          amount?: number
          status?: 'pending' | 'active' | 'completed' | 'cancelled'
          user_name?: string | null
          user_email?: string | null
          created_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          booking_id: string
          amount: number
          status: 'pending' | 'completed' | 'failed' | 'refunded'
          created_at: string
          payment_method?: string
        }
        Insert: {
          id?: string
          booking_id: string
          amount: number
          status?: 'pending' | 'completed' | 'failed' | 'refunded'
          created_at?: string
          payment_method?: string
        }
        Update: {
          id?: string
          booking_id?: string
          amount?: number
          status?: 'pending' | 'completed' | 'failed' | 'refunded'
          created_at?: string
          payment_method?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_account_locked: {
        Args: {
          p_email: string
        }
        Returns: string | null
      }
      record_failed_login_attempt: {
        Args: {
          p_email: string
          p_ip?: string | null
        }
        Returns: string | null
      }
      clear_failed_login_attempts: {
        Args: {
          p_email: string
        }
        Returns: void
      }
      create_parking_booking: {
        Args: {
          p_user_id: string
          p_parking_space_id: string
          p_slot_number: string
          p_vehicle_type: string
          p_vehicle_number: string
          p_start_time: string
          p_end_time: string
          p_amount: number
          p_user_name: string
          p_user_email: string
          p_payment_method?: string
        }
        Returns: string
      }
      cancel_booking: {
        Args: {
          p_booking_id: string
          p_cancelled_by_user_id: string
        }
        Returns: boolean
      }
      check_time_slot_availability: {
        Args: {
          p_parking_space_id: string
          p_vehicle_type: string
          p_start_time: string
          p_end_time: string
        }
        Returns: boolean
      }
      show_vehicle_count: {
        Args: {
          p_parking_space_id: string
          p_start_time: string
          p_end_time: string
        }
        Returns: {
          vehicle_type: string
          total_capacity: number
          active_count: number
          completed_count: number
          cancelled_count: number
          available_count: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
