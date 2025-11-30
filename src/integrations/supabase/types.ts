export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          age_min: number | null
          cancellation_policy_text: string | null
          category: Database["public"]["Enums"]["activity_category"]
          created_at: string
          default_max_capacity: number
          default_price_per_person: number
          description: string | null
          difficulty_level: string | null
          duration_minutes: number
          faq: Json | null
          full_description: string | null
          guest_can_book: boolean
          guest_can_cancel: boolean
          guest_cancel_cutoff_hours: number
          guest_cutoff_hours: number
          health_and_safety_notes: string | null
          highlights: Json | null
          id: string
          includes: string | null
          is_active: boolean
          is_swimming_required: boolean
          max_age: number | null
          max_pax_per_booking: number
          min_capacity: number | null
          name: string
          requires_approval: boolean
          resort_id: string
          short_description: string | null
          suitable_for_non_swimmers: boolean
          updated_at: string
        }
        Insert: {
          age_min?: number | null
          cancellation_policy_text?: string | null
          category?: Database["public"]["Enums"]["activity_category"]
          created_at?: string
          default_max_capacity?: number
          default_price_per_person?: number
          description?: string | null
          difficulty_level?: string | null
          duration_minutes?: number
          faq?: Json | null
          full_description?: string | null
          guest_can_book?: boolean
          guest_can_cancel?: boolean
          guest_cancel_cutoff_hours?: number
          guest_cutoff_hours?: number
          health_and_safety_notes?: string | null
          highlights?: Json | null
          id?: string
          includes?: string | null
          is_active?: boolean
          is_swimming_required?: boolean
          max_age?: number | null
          max_pax_per_booking?: number
          min_capacity?: number | null
          name: string
          requires_approval?: boolean
          resort_id: string
          short_description?: string | null
          suitable_for_non_swimmers?: boolean
          updated_at?: string
        }
        Update: {
          age_min?: number | null
          cancellation_policy_text?: string | null
          category?: Database["public"]["Enums"]["activity_category"]
          created_at?: string
          default_max_capacity?: number
          default_price_per_person?: number
          description?: string | null
          difficulty_level?: string | null
          duration_minutes?: number
          faq?: Json | null
          full_description?: string | null
          guest_can_book?: boolean
          guest_can_cancel?: boolean
          guest_cancel_cutoff_hours?: number
          guest_cutoff_hours?: number
          health_and_safety_notes?: string | null
          highlights?: Json | null
          id?: string
          includes?: string | null
          is_active?: boolean
          is_swimming_required?: boolean
          max_age?: number | null
          max_pax_per_booking?: number
          min_capacity?: number | null
          name?: string
          requires_approval?: boolean
          resort_id?: string
          short_description?: string | null
          suitable_for_non_swimmers?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_bookings: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          discount_amount: number
          guest_id: string
          id: string
          notes: string | null
          num_adults: number
          num_children: number
          price_per_person: number
          resort_id: string
          room_number: string
          session_id: string
          source: Database["public"]["Enums"]["booking_source"]
          status: Database["public"]["Enums"]["booking_status"]
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          discount_amount?: number
          guest_id: string
          id?: string
          notes?: string | null
          num_adults?: number
          num_children?: number
          price_per_person?: number
          resort_id: string
          room_number: string
          session_id: string
          source?: Database["public"]["Enums"]["booking_source"]
          status?: Database["public"]["Enums"]["booking_status"]
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          discount_amount?: number
          guest_id?: string
          id?: string
          notes?: string | null
          num_adults?: number
          num_children?: number
          price_per_person?: number
          resort_id?: string
          room_number?: string
          session_id?: string
          source?: Database["public"]["Enums"]["booking_source"]
          status?: Database["public"]["Enums"]["booking_status"]
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_bookings_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_bookings_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_bookings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "activity_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_sessions: {
        Row: {
          activity_id: string
          capacity: number
          created_at: string
          date: string
          end_time: string
          id: string
          lead_staff_id: string | null
          notes: string | null
          resort_id: string
          resource_id: string | null
          start_time: string
          status: Database["public"]["Enums"]["session_status"]
          updated_at: string
        }
        Insert: {
          activity_id: string
          capacity?: number
          created_at?: string
          date: string
          end_time: string
          id?: string
          lead_staff_id?: string | null
          notes?: string | null
          resort_id: string
          resource_id?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["session_status"]
          updated_at?: string
        }
        Update: {
          activity_id?: string
          capacity?: number
          created_at?: string
          date?: string
          end_time?: string
          id?: string
          lead_staff_id?: string | null
          notes?: string | null
          resort_id?: string
          resource_id?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["session_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_sessions_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_sessions_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_sessions_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      guests: {
        Row: {
          booking_reference: string | null
          channel: string | null
          check_in_date: string
          check_out_date: string
          created_at: string
          email: string | null
          full_name: string
          id: string
          last_login_at: string | null
          nationality: string | null
          notes: string | null
          phone: string | null
          portal_enabled: boolean
          portal_pin_hash: string | null
          resort_id: string
          room_number: string
          updated_at: string
        }
        Insert: {
          booking_reference?: string | null
          channel?: string | null
          check_in_date: string
          check_out_date: string
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          last_login_at?: string | null
          nationality?: string | null
          notes?: string | null
          phone?: string | null
          portal_enabled?: boolean
          portal_pin_hash?: string | null
          resort_id: string
          room_number: string
          updated_at?: string
        }
        Update: {
          booking_reference?: string | null
          channel?: string | null
          check_in_date?: string
          check_out_date?: string
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          last_login_at?: string | null
          nationality?: string | null
          notes?: string | null
          phone?: string | null
          portal_enabled?: boolean
          portal_pin_hash?: string | null
          resort_id?: string
          room_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guests_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          audience: Database["public"]["Enums"]["notification_audience"]
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          guest_id: string | null
          id: string
          is_read: boolean
          link_url: string | null
          message: string
          read_at: string | null
          resort_id: string | null
          title: string
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          audience: Database["public"]["Enums"]["notification_audience"]
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          guest_id?: string | null
          id?: string
          is_read?: boolean
          link_url?: string | null
          message: string
          read_at?: string | null
          resort_id?: string | null
          title: string
          type: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          audience?: Database["public"]["Enums"]["notification_audience"]
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          guest_id?: string | null
          id?: string
          is_read?: boolean
          link_url?: string | null
          message?: string
          read_at?: string | null
          resort_id?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          department: string | null
          full_name: string | null
          global_role: Database["public"]["Enums"]["global_role"]
          id: string
          resort_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          full_name?: string | null
          global_role?: Database["public"]["Enums"]["global_role"]
          id: string
          resort_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string | null
          full_name?: string | null
          global_role?: Database["public"]["Enums"]["global_role"]
          id?: string
          resort_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      resort_memberships: {
        Row: {
          created_at: string
          department: string | null
          id: string
          resort_id: string
          resort_role: Database["public"]["Enums"]["resort_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          id?: string
          resort_id: string
          resort_role: Database["public"]["Enums"]["resort_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          department?: string | null
          id?: string
          resort_id?: string
          resort_role?: Database["public"]["Enums"]["resort_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resort_memberships_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      resorts: {
        Row: {
          code: string
          created_at: string
          currency: string
          demo_expires_at: string | null
          demo_note: string | null
          guest_login_instructions: string | null
          guest_login_subtitle: string | null
          guest_login_title: string | null
          id: string
          is_demo: boolean
          login_accent_color: string | null
          login_hero_image_url: string | null
          login_logo_url: string | null
          login_primary_color: string | null
          name: string
          onboarding_activities_done: boolean
          onboarding_basics_done: boolean
          onboarding_portal_done: boolean
          onboarding_restaurants_done: boolean
          onboarding_staff_done: boolean
          onboarding_status: string
          status: Database["public"]["Enums"]["resort_status"]
          timezone: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          currency?: string
          demo_expires_at?: string | null
          demo_note?: string | null
          guest_login_instructions?: string | null
          guest_login_subtitle?: string | null
          guest_login_title?: string | null
          id?: string
          is_demo?: boolean
          login_accent_color?: string | null
          login_hero_image_url?: string | null
          login_logo_url?: string | null
          login_primary_color?: string | null
          name: string
          onboarding_activities_done?: boolean
          onboarding_basics_done?: boolean
          onboarding_portal_done?: boolean
          onboarding_restaurants_done?: boolean
          onboarding_staff_done?: boolean
          onboarding_status?: string
          status?: Database["public"]["Enums"]["resort_status"]
          timezone?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          currency?: string
          demo_expires_at?: string | null
          demo_note?: string | null
          guest_login_instructions?: string | null
          guest_login_subtitle?: string | null
          guest_login_title?: string | null
          id?: string
          is_demo?: boolean
          login_accent_color?: string | null
          login_hero_image_url?: string | null
          login_logo_url?: string | null
          login_primary_color?: string | null
          name?: string
          onboarding_activities_done?: boolean
          onboarding_basics_done?: boolean
          onboarding_portal_done?: boolean
          onboarding_restaurants_done?: boolean
          onboarding_staff_done?: boolean
          onboarding_status?: string
          status?: Database["public"]["Enums"]["resort_status"]
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      resources: {
        Row: {
          capacity: number
          created_at: string
          id: string
          is_active: boolean
          name: string
          resort_id: string
          type: Database["public"]["Enums"]["resource_type"]
          updated_at: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          resort_id: string
          type?: Database["public"]["Enums"]["resource_type"]
          updated_at?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          resort_id?: string
          type?: Database["public"]["Enums"]["resource_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_reservations: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          guest_id: string
          id: string
          num_adults: number
          num_children: number
          resort_id: string
          restaurant_slot_id: string
          room_number: string
          source: Database["public"]["Enums"]["booking_source"]
          special_requests: string | null
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          guest_id: string
          id?: string
          num_adults?: number
          num_children?: number
          resort_id: string
          restaurant_slot_id: string
          room_number: string
          source?: Database["public"]["Enums"]["booking_source"]
          special_requests?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          guest_id?: string
          id?: string
          num_adults?: number
          num_children?: number
          resort_id?: string
          restaurant_slot_id?: string
          room_number?: string
          source?: Database["public"]["Enums"]["booking_source"]
          special_requests?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_reservations_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_reservations_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_reservations_restaurant_slot_id_fkey"
            columns: ["restaurant_slot_id"]
            isOneToOne: false
            referencedRelation: "restaurant_time_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_time_slots: {
        Row: {
          capacity: number
          created_at: string
          date: string
          end_time: string
          id: string
          meal_period: Database["public"]["Enums"]["meal_period"]
          resort_id: string
          restaurant_id: string
          start_time: string
          status: Database["public"]["Enums"]["slot_status"]
          updated_at: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          date: string
          end_time: string
          id?: string
          meal_period?: Database["public"]["Enums"]["meal_period"]
          resort_id: string
          restaurant_id: string
          start_time: string
          status?: Database["public"]["Enums"]["slot_status"]
          updated_at?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          date?: string
          end_time?: string
          id?: string
          meal_period?: Database["public"]["Enums"]["meal_period"]
          resort_id?: string
          restaurant_id?: string
          start_time?: string
          status?: Database["public"]["Enums"]["slot_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_time_slots_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_time_slots_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          created_at: string
          description: string | null
          guest_can_book: boolean
          guest_can_cancel: boolean
          guest_cancel_cutoff_minutes: number
          guest_cutoff_minutes: number
          id: string
          is_active: boolean
          max_pax_per_booking: number
          name: string
          requires_approval: boolean
          resort_id: string
          total_capacity: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          guest_can_book?: boolean
          guest_can_cancel?: boolean
          guest_cancel_cutoff_minutes?: number
          guest_cutoff_minutes?: number
          id?: string
          is_active?: boolean
          max_pax_per_booking?: number
          name: string
          requires_approval?: boolean
          resort_id: string
          total_capacity?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          guest_can_book?: boolean
          guest_can_cancel?: boolean
          guest_cancel_cutoff_minutes?: number
          guest_cutoff_minutes?: number
          id?: string
          is_active?: boolean
          max_pax_per_booking?: number
          name?: string
          requires_approval?: boolean
          resort_id?: string
          total_capacity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurants_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_invitations: {
        Row: {
          created_at: string
          department: string | null
          email: string
          expires_at: string
          id: string
          invited_by_user_id: string | null
          name: string | null
          resort_id: string
          resort_role: Database["public"]["Enums"]["resort_role"]
          status: string
          token: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          email: string
          expires_at: string
          id?: string
          invited_by_user_id?: string | null
          name?: string | null
          resort_id: string
          resort_role: Database["public"]["Enums"]["resort_role"]
          status?: string
          token: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by_user_id?: string | null
          name?: string | null
          resort_id?: string
          resort_role?: Database["public"]["Enums"]["resort_role"]
          status?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_invitations_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      stay_feedback: {
        Row: {
          check_in_date: string
          check_out_date: string
          created_at: string
          guest_id: string
          highlight_comment: string | null
          id: string
          improvement_comment: string | null
          overall_rating: number
          rating_activities: number | null
          rating_diving: number | null
          rating_fnb: number | null
          rating_room: number | null
          rating_service: number | null
          resort_id: string
          room_number: string
          source: Database["public"]["Enums"]["feedback_source"]
          updated_at: string
          would_recommend: Database["public"]["Enums"]["recommendation_response"]
        }
        Insert: {
          check_in_date: string
          check_out_date: string
          created_at?: string
          guest_id: string
          highlight_comment?: string | null
          id?: string
          improvement_comment?: string | null
          overall_rating: number
          rating_activities?: number | null
          rating_diving?: number | null
          rating_fnb?: number | null
          rating_room?: number | null
          rating_service?: number | null
          resort_id: string
          room_number: string
          source?: Database["public"]["Enums"]["feedback_source"]
          updated_at?: string
          would_recommend: Database["public"]["Enums"]["recommendation_response"]
        }
        Update: {
          check_in_date?: string
          check_out_date?: string
          created_at?: string
          guest_id?: string
          highlight_comment?: string | null
          id?: string
          improvement_comment?: string | null
          overall_rating?: number
          rating_activities?: number | null
          rating_diving?: number | null
          rating_fnb?: number | null
          rating_room?: number | null
          rating_service?: number | null
          resort_id?: string
          room_number?: string
          source?: Database["public"]["Enums"]["feedback_source"]
          updated_at?: string
          would_recommend?: Database["public"]["Enums"]["recommendation_response"]
        }
        Relationships: [
          {
            foreignKeyName: "stay_feedback_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stay_feedback_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_staff_invitation: {
        Args: { p_token: string; p_user_id: string }
        Returns: Json
      }
      create_guest_notification: {
        Args: {
          p_guest_id: string
          p_link_url?: string
          p_message: string
          p_resort_id: string
          p_title: string
          p_type: string
        }
        Returns: string
      }
      create_staff_notification_for_user: {
        Args: {
          p_link_url?: string
          p_message: string
          p_resort_id: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      create_staff_notifications_for_roles: {
        Args: {
          p_link_url?: string
          p_message: string
          p_resort_id: string
          p_roles: Database["public"]["Enums"]["resort_role"][]
          p_title: string
          p_type: string
        }
        Returns: number
      }
      guest_can_submit_feedback: { Args: { p_guest_id: string }; Returns: Json }
      guest_cancel_activity_booking: {
        Args: { p_booking_id: string; p_guest_id: string }
        Returns: Json
      }
      guest_cancel_restaurant_reservation: {
        Args: { p_guest_id: string; p_reservation_id: string }
        Returns: Json
      }
      guest_create_activity_booking: {
        Args: {
          p_guest_id: string
          p_notes?: string
          p_num_adults: number
          p_num_children: number
          p_session_id: string
        }
        Returns: Json
      }
      guest_create_restaurant_reservation: {
        Args: {
          p_guest_id: string
          p_num_adults: number
          p_num_children: number
          p_slot_id: string
          p_special_requests?: string
        }
        Returns: Json
      }
      guest_get_available_sessions: {
        Args: {
          p_category?: Database["public"]["Enums"]["activity_category"]
          p_date?: string
          p_guest_id: string
        }
        Returns: Json
      }
      guest_get_available_slots: {
        Args: { p_date?: string; p_guest_id: string; p_restaurant_id?: string }
        Returns: Json
      }
      guest_get_bookings: { Args: { p_guest_id: string }; Returns: Json }
      guest_get_notifications: { Args: { p_guest_id: string }; Returns: Json }
      guest_get_restaurants: { Args: { p_resort_id: string }; Returns: Json }
      guest_get_unread_notification_count: {
        Args: { p_guest_id: string }
        Returns: number
      }
      guest_mark_all_notifications_read: {
        Args: { p_guest_id: string }
        Returns: number
      }
      guest_mark_notification_read: {
        Args: { p_guest_id: string; p_notification_id: string }
        Returns: boolean
      }
      guest_portal_login: {
        Args: {
          p_last_name: string
          p_pin_hash: string
          p_resort_id: string
          p_room_number: string
        }
        Returns: {
          check_in_date: string
          check_out_date: string
          full_name: string
          guest_id: string
          resort_id: string
          room_number: string
        }[]
      }
      guest_submit_stay_feedback: {
        Args: {
          p_guest_id: string
          p_highlight_comment?: string
          p_improvement_comment?: string
          p_overall_rating: number
          p_rating_activities?: number
          p_rating_diving?: number
          p_rating_fnb?: number
          p_rating_room?: number
          p_rating_service?: number
          p_would_recommend: string
        }
        Returns: Json
      }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_resort_membership: {
        Args: { _resort_id: string; _user_id: string }
        Returns: boolean
      }
      has_resort_role: {
        Args: {
          _resort_id: string
          _roles: Database["public"]["Enums"]["resort_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      activity_category: "DIVE" | "EXCURSION" | "WATERSPORT" | "SPA" | "OTHER"
      app_role: "ADMIN" | "MANAGER" | "FRONT_OFFICE" | "ACTIVITIES" | "FNB"
      booking_source:
        | "STAFF_FRONT_DESK"
        | "STAFF_DIVE"
        | "STAFF_FNB"
        | "GUEST_PORTAL"
      booking_status:
        | "PENDING"
        | "CONFIRMED"
        | "CANCELLED"
        | "NO_SHOW"
        | "COMPLETED"
      feedback_source: "GUEST_PORTAL" | "STAFF_FILLED"
      global_role: "SUPER_ADMIN" | "STANDARD"
      meal_period: "BREAKFAST" | "LUNCH" | "DINNER" | "EVENT"
      notification_audience: "STAFF" | "GUEST"
      notification_channel: "IN_APP" | "EMAIL" | "WHATSAPP"
      recommendation_response: "YES" | "NO" | "MAYBE"
      resort_role:
        | "RESORT_ADMIN"
        | "MANAGER"
        | "FRONT_OFFICE"
        | "ACTIVITIES"
        | "FNB"
      resort_status: "ACTIVE" | "INACTIVE" | "DEMO"
      resource_type: "BOAT" | "VAN" | "CABANA" | "OTHER"
      session_status: "SCHEDULED" | "CANCELLED" | "COMPLETED"
      slot_status: "OPEN" | "CLOSED" | "FULL"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      activity_category: ["DIVE", "EXCURSION", "WATERSPORT", "SPA", "OTHER"],
      app_role: ["ADMIN", "MANAGER", "FRONT_OFFICE", "ACTIVITIES", "FNB"],
      booking_source: [
        "STAFF_FRONT_DESK",
        "STAFF_DIVE",
        "STAFF_FNB",
        "GUEST_PORTAL",
      ],
      booking_status: [
        "PENDING",
        "CONFIRMED",
        "CANCELLED",
        "NO_SHOW",
        "COMPLETED",
      ],
      feedback_source: ["GUEST_PORTAL", "STAFF_FILLED"],
      global_role: ["SUPER_ADMIN", "STANDARD"],
      meal_period: ["BREAKFAST", "LUNCH", "DINNER", "EVENT"],
      notification_audience: ["STAFF", "GUEST"],
      notification_channel: ["IN_APP", "EMAIL", "WHATSAPP"],
      recommendation_response: ["YES", "NO", "MAYBE"],
      resort_role: [
        "RESORT_ADMIN",
        "MANAGER",
        "FRONT_OFFICE",
        "ACTIVITIES",
        "FNB",
      ],
      resort_status: ["ACTIVE", "INACTIVE", "DEMO"],
      resource_type: ["BOAT", "VAN", "CABANA", "OTHER"],
      session_status: ["SCHEDULED", "CANCELLED", "COMPLETED"],
      slot_status: ["OPEN", "CLOSED", "FULL"],
    },
  },
} as const
