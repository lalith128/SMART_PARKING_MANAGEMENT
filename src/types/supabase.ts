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
        }
        Insert: {
          id: string
          full_name: string
          role: UserRole
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          role?: UserRole
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      parking_lots: {
        Row: {
          id: number
          owner_id: string
          name: string
          location: string
          total_slots: number
          price_per_hour: number
          created_at: string
        }
        Insert: {
          id?: number
          owner_id: string
          name: string
          location: string
          total_slots: number
          price_per_hour: number
          created_at?: string
        }
        Update: {
          id?: number
          owner_id?: string
          name?: string
          location?: string
          total_slots?: number
          price_per_hour?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parking_lots_owner_id_fkey"
            columns: ["owner_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      bookings: {
        Row: {
          id: number
          user_id: string
          parking_lot_id: number
          start_time: string
          end_time: string | null
          total_cost: number | null
          status: BookingStatus
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          parking_lot_id: number
          start_time: string
          end_time?: string | null
          status?: BookingStatus
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          parking_lot_id?: number
          start_time?: string
          end_time?: string | null
          status?: BookingStatus
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_parking_lot_id_fkey"
            columns: ["parking_lot_id"]
            referencedRelation: "parking_lots"
            referencedColumns: ["id"]
          }
        ]
      }
      payments: {
        Row: {
          id: number
          booking_id: number
          user_id: string
          amount: number
          payment_method: PaymentMethod
          status: PaymentStatus
          created_at: string
        }
        Insert: {
          id?: number
          booking_id: number
          user_id: string
          amount: number
          payment_method: PaymentMethod
          status?: PaymentStatus
          created_at?: string
        }
        Update: {
          id?: number
          booking_id?: number
          user_id?: string
          amount?: number
          payment_method?: PaymentMethod
          status?: PaymentStatus
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      notifications: {
        Row: {
          id: number
          user_id: string
          message: string
          type: NotificationType
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          message: string
          type: NotificationType
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          message?: string
          type?: NotificationType
          is_read?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
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
  }
}
