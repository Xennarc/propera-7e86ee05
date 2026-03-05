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
      access_audit_log: {
        Row: {
          action_key: string
          actor_user_id: string
          created_at: string
          details_json: Json | null
          id: string
          resort_id: string | null
          target_user_id: string | null
        }
        Insert: {
          action_key: string
          actor_user_id: string
          created_at?: string
          details_json?: Json | null
          id?: string
          resort_id?: string | null
          target_user_id?: string | null
        }
        Update: {
          action_key?: string
          actor_user_id?: string
          created_at?: string
          details_json?: Json | null
          id?: string
          resort_id?: string | null
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_audit_log_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      activities: {
        Row: {
          age_min: number | null
          cancellation_policy_text: string | null
          category: Database["public"]["Enums"]["activity_category"]
          created_at: string
          default_max_capacity: number
          default_price_per_person: number
          department_key: string | null
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
          icon_key: string | null
          id: string
          image_url: string | null
          includes: string | null
          is_active: boolean
          is_swimming_required: boolean
          max_age: number | null
          max_pax_per_booking: number
          min_capacity: number | null
          name: string
          ops_rules_json: Json | null
          provider_type: Database["public"]["Enums"]["provider_type"]
          requirements_json: Json | null
          requires_approval: boolean
          resort_id: string
          short_description: string | null
          suitable_for_non_swimmers: boolean
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          age_min?: number | null
          cancellation_policy_text?: string | null
          category?: Database["public"]["Enums"]["activity_category"]
          created_at?: string
          default_max_capacity?: number
          default_price_per_person?: number
          department_key?: string | null
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
          icon_key?: string | null
          id?: string
          image_url?: string | null
          includes?: string | null
          is_active?: boolean
          is_swimming_required?: boolean
          max_age?: number | null
          max_pax_per_booking?: number
          min_capacity?: number | null
          name: string
          ops_rules_json?: Json | null
          provider_type?: Database["public"]["Enums"]["provider_type"]
          requirements_json?: Json | null
          requires_approval?: boolean
          resort_id: string
          short_description?: string | null
          suitable_for_non_swimmers?: boolean
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          age_min?: number | null
          cancellation_policy_text?: string | null
          category?: Database["public"]["Enums"]["activity_category"]
          created_at?: string
          default_max_capacity?: number
          default_price_per_person?: number
          department_key?: string | null
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
          icon_key?: string | null
          id?: string
          image_url?: string | null
          includes?: string | null
          is_active?: boolean
          is_swimming_required?: boolean
          max_age?: number | null
          max_pax_per_booking?: number
          min_capacity?: number | null
          name?: string
          ops_rules_json?: Json | null
          provider_type?: Database["public"]["Enums"]["provider_type"]
          requirements_json?: Json | null
          requires_approval?: boolean
          resort_id?: string
          short_description?: string | null
          suitable_for_non_swimmers?: boolean
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_booking_readiness: {
        Row: {
          booking_id: string
          cert_media_path: string | null
          cert_notes: string | null
          cert_status: string
          cert_verification_status: string
          cert_verified_at: string | null
          cert_verified_by: string | null
          created_at: string
          gear_json: Json | null
          gear_status: string
          guest_id: string
          id: string
          medical_answers_json: Json | null
          medical_notes: string | null
          medical_review_status: string
          medical_reviewed_at: string | null
          medical_reviewed_by: string | null
          medical_status: string
          resort_id: string
          session_id: string
          updated_at: string
          waiver_status: string
        }
        Insert: {
          booking_id: string
          cert_media_path?: string | null
          cert_notes?: string | null
          cert_status?: string
          cert_verification_status?: string
          cert_verified_at?: string | null
          cert_verified_by?: string | null
          created_at?: string
          gear_json?: Json | null
          gear_status?: string
          guest_id: string
          id?: string
          medical_answers_json?: Json | null
          medical_notes?: string | null
          medical_review_status?: string
          medical_reviewed_at?: string | null
          medical_reviewed_by?: string | null
          medical_status?: string
          resort_id: string
          session_id: string
          updated_at?: string
          waiver_status?: string
        }
        Update: {
          booking_id?: string
          cert_media_path?: string | null
          cert_notes?: string | null
          cert_status?: string
          cert_verification_status?: string
          cert_verified_at?: string | null
          cert_verified_by?: string | null
          created_at?: string
          gear_json?: Json | null
          gear_status?: string
          guest_id?: string
          id?: string
          medical_answers_json?: Json | null
          medical_notes?: string | null
          medical_review_status?: string
          medical_reviewed_at?: string | null
          medical_reviewed_by?: string | null
          medical_status?: string
          resort_id?: string
          session_id?: string
          updated_at?: string
          waiver_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_booking_readiness_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "activity_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_booking_readiness_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_booking_readiness_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_booking_readiness_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "activity_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_bookings: {
        Row: {
          booking_source:
            | Database["public"]["Enums"]["booking_source_context"]
            | null
          created_at: string
          created_by_user_id: string | null
          discount_amount: number
          guest_id: string
          id: string
          notes: string | null
          num_adults: number
          num_children: number
          origin: string | null
          payout_status: Database["public"]["Enums"]["payout_status"]
          price_per_person: number
          provider_type: Database["public"]["Enums"]["provider_type"]
          resort_commission_amount: number | null
          resort_id: string
          room_number: string
          session_id: string
          source: Database["public"]["Enums"]["booking_source"]
          status: Database["public"]["Enums"]["booking_status"]
          stay_id: string | null
          total_amount: number
          updated_at: string
          vendor_amount: number | null
          vendor_id: string | null
          vendor_last_notified_at: string | null
          vendor_rate_used: number | null
          vendor_status:
            | Database["public"]["Enums"]["vendor_booking_status"]
            | null
          version: number
        }
        Insert: {
          booking_source?:
            | Database["public"]["Enums"]["booking_source_context"]
            | null
          created_at?: string
          created_by_user_id?: string | null
          discount_amount?: number
          guest_id: string
          id?: string
          notes?: string | null
          num_adults?: number
          num_children?: number
          origin?: string | null
          payout_status?: Database["public"]["Enums"]["payout_status"]
          price_per_person?: number
          provider_type?: Database["public"]["Enums"]["provider_type"]
          resort_commission_amount?: number | null
          resort_id: string
          room_number: string
          session_id: string
          source?: Database["public"]["Enums"]["booking_source"]
          status?: Database["public"]["Enums"]["booking_status"]
          stay_id?: string | null
          total_amount?: number
          updated_at?: string
          vendor_amount?: number | null
          vendor_id?: string | null
          vendor_last_notified_at?: string | null
          vendor_rate_used?: number | null
          vendor_status?:
            | Database["public"]["Enums"]["vendor_booking_status"]
            | null
          version?: number
        }
        Update: {
          booking_source?:
            | Database["public"]["Enums"]["booking_source_context"]
            | null
          created_at?: string
          created_by_user_id?: string | null
          discount_amount?: number
          guest_id?: string
          id?: string
          notes?: string | null
          num_adults?: number
          num_children?: number
          origin?: string | null
          payout_status?: Database["public"]["Enums"]["payout_status"]
          price_per_person?: number
          provider_type?: Database["public"]["Enums"]["provider_type"]
          resort_commission_amount?: number | null
          resort_id?: string
          room_number?: string
          session_id?: string
          source?: Database["public"]["Enums"]["booking_source"]
          status?: Database["public"]["Enums"]["booking_status"]
          stay_id?: string | null
          total_amount?: number
          updated_at?: string
          vendor_amount?: number | null
          vendor_id?: string | null
          vendor_last_notified_at?: string | null
          vendor_rate_used?: number | null
          vendor_status?:
            | Database["public"]["Enums"]["vendor_booking_status"]
            | null
          version?: number
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
          {
            foreignKeyName: "activity_bookings_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: false
            referencedRelation: "guest_stays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_bookings_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_closures: {
        Row: {
          activity_id: string
          closure_date: string
          created_at: string
          id: string
          reason: string | null
          resort_id: string
          updated_at: string
        }
        Insert: {
          activity_id: string
          closure_date: string
          created_at?: string
          id?: string
          reason?: string | null
          resort_id: string
          updated_at?: string
        }
        Update: {
          activity_id?: string
          closure_date?: string
          created_at?: string
          id?: string
          reason?: string | null
          resort_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_closures_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_closures_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_recurring_rules: {
        Row: {
          activity_id: string
          capacity: number
          created_at: string
          days_of_week: number[] | null
          end_date: string
          end_time: string
          frequency: Database["public"]["Enums"]["recurrence_frequency"]
          id: string
          is_active: boolean
          resort_id: string
          start_date: string
          start_time: string
          updated_at: string
        }
        Insert: {
          activity_id: string
          capacity?: number
          created_at?: string
          days_of_week?: number[] | null
          end_date: string
          end_time: string
          frequency?: Database["public"]["Enums"]["recurrence_frequency"]
          id?: string
          is_active?: boolean
          resort_id: string
          start_date: string
          start_time: string
          updated_at?: string
        }
        Update: {
          activity_id?: string
          capacity?: number
          created_at?: string
          days_of_week?: number[] | null
          end_date?: string
          end_time?: string
          frequency?: Database["public"]["Enums"]["recurrence_frequency"]
          id?: string
          is_active?: boolean
          resort_id?: string
          start_date?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_recurring_rules_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_recurring_rules_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_session_templates: {
        Row: {
          activity_id: string
          capacity: number
          created_at: string
          end_time: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          resort_id: string
          resource_id: string | null
          start_time: string
          updated_at: string
        }
        Insert: {
          activity_id: string
          capacity?: number
          created_at?: string
          end_time: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          resort_id: string
          resource_id?: string | null
          start_time: string
          updated_at?: string
        }
        Update: {
          activity_id?: string
          capacity?: number
          created_at?: string
          end_time?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          resort_id?: string
          resource_id?: string | null
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_session_templates_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_session_templates_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_session_templates_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
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
          provider_type: Database["public"]["Enums"]["provider_type"]
          resort_id: string
          resource_id: string | null
          start_time: string
          status: Database["public"]["Enums"]["session_status"]
          updated_at: string
          vendor_id: string | null
          version: number
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
          provider_type?: Database["public"]["Enums"]["provider_type"]
          resort_id: string
          resource_id?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["session_status"]
          updated_at?: string
          vendor_id?: string | null
          version?: number
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
          provider_type?: Database["public"]["Enums"]["provider_type"]
          resort_id?: string
          resource_id?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["session_status"]
          updated_at?: string
          vendor_id?: string | null
          version?: number
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
          {
            foreignKeyName: "activity_sessions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_waitlist: {
        Row: {
          created_at: string
          expires_at: string | null
          guest_id: string
          id: string
          notes: string | null
          num_adults: number
          num_children: number
          priority: number
          promoted_at: string | null
          resort_id: string
          session_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          guest_id: string
          id?: string
          notes?: string | null
          num_adults?: number
          num_children?: number
          priority?: number
          promoted_at?: string | null
          resort_id: string
          session_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          guest_id?: string
          id?: string
          notes?: string | null
          num_adults?: number
          num_children?: number
          priority?: number
          promoted_at?: string | null
          resort_id?: string
          session_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_waitlist_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_waitlist_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_waitlist_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "activity_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      addon_feature_categories: {
        Row: {
          addon_key: string
          category: string
          created_at: string
          id: string
        }
        Insert: {
          addon_key: string
          category: string
          created_at?: string
          id?: string
        }
        Update: {
          addon_key?: string
          category?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "addon_feature_categories_addon_key_fkey"
            columns: ["addon_key"]
            isOneToOne: false
            referencedRelation: "addon_pricing"
            referencedColumns: ["key"]
          },
        ]
      }
      addon_pricing: {
        Row: {
          currency: string
          description: string | null
          id: string
          is_active: boolean
          key: string
          metadata_json: Json
          monthly_price_cents: number
          name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key: string
          metadata_json?: Json
          monthly_price_cents: number
          name: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key?: string
          metadata_json?: Json
          monthly_price_cents?: number
          name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      admin_audit_logs: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          id: string
          metadata_json: Json | null
          resort_id: string | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          id?: string
          metadata_json?: Json | null
          resort_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          id?: string
          metadata_json?: Json | null
          resort_id?: string | null
        }
        Relationships: []
      }
      admin_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link_url: string | null
          message: string
          read_at: string | null
          resort_id: string | null
          severity: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link_url?: string | null
          message: string
          read_at?: string | null
          resort_id?: string | null
          severity?: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link_url?: string | null
          message?: string
          read_at?: string | null
          resort_id?: string | null
          severity?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_notifications_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_unavailability: {
        Row: {
          asset_id: string
          created_at: string
          created_by: string | null
          end_time: string | null
          id: string
          reason: string | null
          resort_id: string
          start_time: string | null
          unavailable_date: string
          updated_at: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          created_by?: string | null
          end_time?: string | null
          id?: string
          reason?: string | null
          resort_id: string
          start_time?: string | null
          unavailable_date: string
          updated_at?: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          created_by?: string | null
          end_time?: string | null
          id?: string
          reason?: string | null
          resort_id?: string
          start_time?: string | null
          unavailable_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_unavailability_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "ops_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_unavailability_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          after: Json | null
          before: Json | null
          created_at: string
          effective_user_id: string | null
          entity: string
          entity_id: string | null
          id: string
          metadata: Json | null
          resort_id: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          effective_user_id?: string | null
          entity: string
          entity_id?: string | null
          id?: string
          metadata?: Json | null
          resort_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          effective_user_id?: string | null
          entity?: string
          entity_id?: string | null
          id?: string
          metadata?: Json | null
          resort_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_attendees: {
        Row: {
          activity_booking_id: string | null
          attendee_type: Database["public"]["Enums"]["travel_party_member_type"]
          created_at: string
          display_name: string
          guest_id: string | null
          id: string
          member_id: string | null
          resort_id: string
          restaurant_reservation_id: string | null
        }
        Insert: {
          activity_booking_id?: string | null
          attendee_type?: Database["public"]["Enums"]["travel_party_member_type"]
          created_at?: string
          display_name: string
          guest_id?: string | null
          id?: string
          member_id?: string | null
          resort_id: string
          restaurant_reservation_id?: string | null
        }
        Update: {
          activity_booking_id?: string | null
          attendee_type?: Database["public"]["Enums"]["travel_party_member_type"]
          created_at?: string
          display_name?: string
          guest_id?: string | null
          id?: string
          member_id?: string | null
          resort_id?: string
          restaurant_reservation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_attendees_activity_booking_id_fkey"
            columns: ["activity_booking_id"]
            isOneToOne: false
            referencedRelation: "activity_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_attendees_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_attendees_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "travel_party_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_attendees_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_attendees_restaurant_reservation_id_fkey"
            columns: ["restaurant_reservation_id"]
            isOneToOne: false
            referencedRelation: "restaurant_reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_audit_logs: {
        Row: {
          action: string
          booking_id: string
          booking_type: string
          change_summary: string | null
          changed_at: string
          changed_by_user_id: string | null
          id: string
          new_values: Json | null
          old_values: Json | null
        }
        Insert: {
          action: string
          booking_id: string
          booking_type: string
          change_summary?: string | null
          changed_at?: string
          changed_by_user_id?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
        }
        Update: {
          action?: string
          booking_id?: string
          booking_type?: string
          change_summary?: string | null
          changed_at?: string
          changed_by_user_id?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
        }
        Relationships: []
      }
      booking_readiness: {
        Row: {
          booking_id: string
          cert_file_path: string | null
          cert_type: string | null
          cert_verified: boolean
          cert_verified_at: string | null
          created_at: string
          gear_confirmed: boolean
          gear_confirmed_at: string | null
          guest_id: string
          id: string
          resort_id: string
          sizes_confirmed: boolean
          sizes_confirmed_at: string | null
          sizes_data: Json | null
          updated_at: string
          waiver_signed: boolean
          waiver_signed_at: string | null
        }
        Insert: {
          booking_id: string
          cert_file_path?: string | null
          cert_type?: string | null
          cert_verified?: boolean
          cert_verified_at?: string | null
          created_at?: string
          gear_confirmed?: boolean
          gear_confirmed_at?: string | null
          guest_id: string
          id?: string
          resort_id: string
          sizes_confirmed?: boolean
          sizes_confirmed_at?: string | null
          sizes_data?: Json | null
          updated_at?: string
          waiver_signed?: boolean
          waiver_signed_at?: string | null
        }
        Update: {
          booking_id?: string
          cert_file_path?: string | null
          cert_type?: string | null
          cert_verified?: boolean
          cert_verified_at?: string | null
          created_at?: string
          gear_confirmed?: boolean
          gear_confirmed_at?: string | null
          guest_id?: string
          id?: string
          resort_id?: string
          sizes_confirmed?: boolean
          sizes_confirmed_at?: string | null
          sizes_data?: Json | null
          updated_at?: string
          waiver_signed?: boolean
          waiver_signed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_readiness_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "activity_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_readiness_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_readiness_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      buggies: {
        Row: {
          capacity: number
          created_at: string
          current_stop_id: string | null
          id: string
          is_accessible: boolean
          last_location: Json | null
          last_location_at: string | null
          metadata: Json
          name: string
          resort_id: string
          status: Database["public"]["Enums"]["buggy_status"]
          updated_at: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          current_stop_id?: string | null
          id?: string
          is_accessible?: boolean
          last_location?: Json | null
          last_location_at?: string | null
          metadata?: Json
          name: string
          resort_id: string
          status?: Database["public"]["Enums"]["buggy_status"]
          updated_at?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          current_stop_id?: string | null
          id?: string
          is_accessible?: boolean
          last_location?: Json | null
          last_location_at?: string | null
          metadata?: Json
          name?: string
          resort_id?: string
          status?: Database["public"]["Enums"]["buggy_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "buggies_current_stop_id_fkey"
            columns: ["current_stop_id"]
            isOneToOne: false
            referencedRelation: "buggy_stops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buggies_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      buggy_drivers: {
        Row: {
          assigned_buggy_id: string | null
          created_at: string
          id: string
          last_seen_at: string | null
          metadata: Json
          resort_id: string
          status: Database["public"]["Enums"]["driver_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_buggy_id?: string | null
          created_at?: string
          id?: string
          last_seen_at?: string | null
          metadata?: Json
          resort_id: string
          status?: Database["public"]["Enums"]["driver_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_buggy_id?: string | null
          created_at?: string
          id?: string
          last_seen_at?: string | null
          metadata?: Json
          resort_id?: string
          status?: Database["public"]["Enums"]["driver_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "buggy_drivers_assigned_buggy_id_fkey"
            columns: ["assigned_buggy_id"]
            isOneToOne: false
            referencedRelation: "buggies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buggy_drivers_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      buggy_request_events: {
        Row: {
          actor_type: string
          actor_user_id: string | null
          created_at: string
          event_type: string
          from_status: string | null
          id: string
          payload: Json
          request_id: string
          resort_id: string
          to_status: string | null
        }
        Insert: {
          actor_type: string
          actor_user_id?: string | null
          created_at?: string
          event_type: string
          from_status?: string | null
          id?: string
          payload?: Json
          request_id: string
          resort_id: string
          to_status?: string | null
        }
        Update: {
          actor_type?: string
          actor_user_id?: string | null
          created_at?: string
          event_type?: string
          from_status?: string | null
          id?: string
          payload?: Json
          request_id?: string
          resort_id?: string
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buggy_request_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "buggy_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buggy_request_events_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      buggy_requests: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          assigned_at: string | null
          attached_trip_id: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          created_by_staff_user_id: string | null
          dropoff_location: Json | null
          dropoff_stop_id: string | null
          dropoff_text: string | null
          eta_minutes: number | null
          guest_id: string | null
          id: string
          idempotency_key: string | null
          needs_accessible: boolean
          party_size: number
          pickup_location: Json | null
          pickup_stop_id: string | null
          pickup_text: string | null
          priority: Database["public"]["Enums"]["buggy_priority"]
          request_source: Database["public"]["Enums"]["buggy_request_source"]
          request_type: Database["public"]["Enums"]["buggy_request_type"]
          resort_id: string
          route_id: string | null
          scheduled_for: string | null
          status: Database["public"]["Enums"]["buggy_request_status"]
          status_reason: string | null
          updated_at: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          assigned_at?: string | null
          attached_trip_id?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          created_by_staff_user_id?: string | null
          dropoff_location?: Json | null
          dropoff_stop_id?: string | null
          dropoff_text?: string | null
          eta_minutes?: number | null
          guest_id?: string | null
          id?: string
          idempotency_key?: string | null
          needs_accessible?: boolean
          party_size?: number
          pickup_location?: Json | null
          pickup_stop_id?: string | null
          pickup_text?: string | null
          priority?: Database["public"]["Enums"]["buggy_priority"]
          request_source: Database["public"]["Enums"]["buggy_request_source"]
          request_type: Database["public"]["Enums"]["buggy_request_type"]
          resort_id: string
          route_id?: string | null
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["buggy_request_status"]
          status_reason?: string | null
          updated_at?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          assigned_at?: string | null
          attached_trip_id?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          created_by_staff_user_id?: string | null
          dropoff_location?: Json | null
          dropoff_stop_id?: string | null
          dropoff_text?: string | null
          eta_minutes?: number | null
          guest_id?: string | null
          id?: string
          idempotency_key?: string | null
          needs_accessible?: boolean
          party_size?: number
          pickup_location?: Json | null
          pickup_stop_id?: string | null
          pickup_text?: string | null
          priority?: Database["public"]["Enums"]["buggy_priority"]
          request_source?: Database["public"]["Enums"]["buggy_request_source"]
          request_type?: Database["public"]["Enums"]["buggy_request_type"]
          resort_id?: string
          route_id?: string | null
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["buggy_request_status"]
          status_reason?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "buggy_requests_attached_trip_id_fkey"
            columns: ["attached_trip_id"]
            isOneToOne: false
            referencedRelation: "buggy_trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buggy_requests_dropoff_stop_id_fkey"
            columns: ["dropoff_stop_id"]
            isOneToOne: false
            referencedRelation: "buggy_stops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buggy_requests_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buggy_requests_pickup_stop_id_fkey"
            columns: ["pickup_stop_id"]
            isOneToOne: false
            referencedRelation: "buggy_stops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buggy_requests_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buggy_requests_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "buggy_routes"
            referencedColumns: ["id"]
          },
        ]
      }
      buggy_route_schedules: {
        Row: {
          created_at: string
          days_of_week: number[]
          departure_times: string[] | null
          end_time: string
          id: string
          interval_minutes: number | null
          is_active: boolean
          resort_id: string
          route_id: string
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          days_of_week: number[]
          departure_times?: string[] | null
          end_time: string
          id?: string
          interval_minutes?: number | null
          is_active?: boolean
          resort_id: string
          route_id: string
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          days_of_week?: number[]
          departure_times?: string[] | null
          end_time?: string
          id?: string
          interval_minutes?: number | null
          is_active?: boolean
          resort_id?: string
          route_id?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "buggy_route_schedules_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buggy_route_schedules_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "buggy_routes"
            referencedColumns: ["id"]
          },
        ]
      }
      buggy_route_stops: {
        Row: {
          created_at: string
          dwell_minutes: number
          id: string
          resort_id: string
          route_id: string
          sort_order: number
          stop_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dwell_minutes?: number
          id?: string
          resort_id: string
          route_id: string
          sort_order?: number
          stop_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dwell_minutes?: number
          id?: string
          resort_id?: string
          route_id?: string
          sort_order?: number
          stop_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "buggy_route_stops_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buggy_route_stops_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "buggy_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buggy_route_stops_stop_id_fkey"
            columns: ["stop_id"]
            isOneToOne: false
            referencedRelation: "buggy_stops"
            referencedColumns: ["id"]
          },
        ]
      }
      buggy_routes: {
        Row: {
          color_tag: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          resort_id: string
          updated_at: string
        }
        Insert: {
          color_tag?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          resort_id: string
          updated_at?: string
        }
        Update: {
          color_tag?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          resort_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "buggy_routes_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      buggy_stops: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          lat: number | null
          lng: number | null
          name: string
          resort_id: string
          sort_order: number
          updated_at: string
          zone: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          lat?: number | null
          lng?: number | null
          name: string
          resort_id: string
          sort_order?: number
          updated_at?: string
          zone?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          lat?: number | null
          lng?: number | null
          name?: string
          resort_id?: string
          sort_order?: number
          updated_at?: string
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buggy_stops_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      buggy_trip_events: {
        Row: {
          actor_type: string
          actor_user_id: string | null
          created_at: string
          event_type: string
          from_status: string | null
          id: string
          payload: Json
          resort_id: string
          to_status: string | null
          trip_id: string
        }
        Insert: {
          actor_type: string
          actor_user_id?: string | null
          created_at?: string
          event_type: string
          from_status?: string | null
          id?: string
          payload?: Json
          resort_id: string
          to_status?: string | null
          trip_id: string
        }
        Update: {
          actor_type?: string
          actor_user_id?: string | null
          created_at?: string
          event_type?: string
          from_status?: string | null
          id?: string
          payload?: Json
          resort_id?: string
          to_status?: string | null
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "buggy_trip_events_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buggy_trip_events_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "buggy_trips"
            referencedColumns: ["id"]
          },
        ]
      }
      buggy_trip_requests: {
        Row: {
          created_at: string
          id: string
          party_size: number
          request_id: string
          resort_id: string
          state: Database["public"]["Enums"]["buggy_trip_request_state"]
          trip_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          party_size: number
          request_id: string
          resort_id: string
          state?: Database["public"]["Enums"]["buggy_trip_request_state"]
          trip_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          party_size?: number
          request_id?: string
          resort_id?: string
          state?: Database["public"]["Enums"]["buggy_trip_request_state"]
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "buggy_trip_requests_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "buggy_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buggy_trip_requests_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buggy_trip_requests_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "buggy_trips"
            referencedColumns: ["id"]
          },
        ]
      }
      buggy_trip_stops: {
        Row: {
          arrived_at: string | null
          completed_at: string | null
          created_at: string
          id: string
          location: Json | null
          related_request_id: string | null
          resort_id: string
          sequence: number
          status: Database["public"]["Enums"]["buggy_trip_stop_status"]
          stop_id: string | null
          stop_kind: Database["public"]["Enums"]["buggy_trip_stop_kind"]
          title: string | null
          trip_id: string
          updated_at: string
        }
        Insert: {
          arrived_at?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          location?: Json | null
          related_request_id?: string | null
          resort_id: string
          sequence?: number
          status?: Database["public"]["Enums"]["buggy_trip_stop_status"]
          stop_id?: string | null
          stop_kind: Database["public"]["Enums"]["buggy_trip_stop_kind"]
          title?: string | null
          trip_id: string
          updated_at?: string
        }
        Update: {
          arrived_at?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          location?: Json | null
          related_request_id?: string | null
          resort_id?: string
          sequence?: number
          status?: Database["public"]["Enums"]["buggy_trip_stop_status"]
          stop_id?: string | null
          stop_kind?: Database["public"]["Enums"]["buggy_trip_stop_kind"]
          title?: string | null
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "buggy_trip_stops_related_request_id_fkey"
            columns: ["related_request_id"]
            isOneToOne: false
            referencedRelation: "buggy_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buggy_trip_stops_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buggy_trip_stops_stop_id_fkey"
            columns: ["stop_id"]
            isOneToOne: false
            referencedRelation: "buggy_stops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buggy_trip_stops_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "buggy_trips"
            referencedColumns: ["id"]
          },
        ]
      }
      buggy_trips: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          buggy_id: string | null
          cancelled_at: string | null
          capacity_total: number | null
          completed_at: string | null
          created_at: string
          created_by_staff_id: string | null
          driver_user_id: string | null
          end_at: string | null
          id: string
          lifecycle_state: string | null
          metadata: Json
          notes: string | null
          resort_id: string
          start_at: string | null
          status: Database["public"]["Enums"]["buggy_trip_status"]
          trip_type: Database["public"]["Enums"]["buggy_trip_type"]
          updated_at: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          buggy_id?: string | null
          cancelled_at?: string | null
          capacity_total?: number | null
          completed_at?: string | null
          created_at?: string
          created_by_staff_id?: string | null
          driver_user_id?: string | null
          end_at?: string | null
          id?: string
          lifecycle_state?: string | null
          metadata?: Json
          notes?: string | null
          resort_id: string
          start_at?: string | null
          status?: Database["public"]["Enums"]["buggy_trip_status"]
          trip_type?: Database["public"]["Enums"]["buggy_trip_type"]
          updated_at?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          buggy_id?: string | null
          cancelled_at?: string | null
          capacity_total?: number | null
          completed_at?: string | null
          created_at?: string
          created_by_staff_id?: string | null
          driver_user_id?: string | null
          end_at?: string | null
          id?: string
          lifecycle_state?: string | null
          metadata?: Json
          notes?: string | null
          resort_id?: string
          start_at?: string | null
          status?: Database["public"]["Enums"]["buggy_trip_status"]
          trip_type?: Database["public"]["Enums"]["buggy_trip_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "buggy_trips_buggy_id_fkey"
            columns: ["buggy_id"]
            isOneToOne: false
            referencedRelation: "buggies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buggy_trips_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_leads: {
        Row: {
          created_at: string
          email: string
          id: string
          last_seen_at: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          last_seen_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          last_seen_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      demo_login_tokens: {
        Row: {
          created_at: string
          demo_lead_id: string | null
          expires_at: string
          guest_id: string | null
          id: string
          resort_id: string | null
          token: string
          token_type: string
          used_at: string | null
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          demo_lead_id?: string | null
          expires_at?: string
          guest_id?: string | null
          id?: string
          resort_id?: string | null
          token: string
          token_type: string
          used_at?: string | null
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          demo_lead_id?: string | null
          expires_at?: string
          guest_id?: string | null
          id?: string
          resort_id?: string | null
          token?: string
          token_type?: string
          used_at?: string | null
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "demo_login_tokens_demo_lead_id_fkey"
            columns: ["demo_lead_id"]
            isOneToOne: false
            referencedRelation: "demo_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demo_login_tokens_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demo_login_tokens_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demo_login_tokens_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "demo_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_rate_limits: {
        Row: {
          attempts: number
          created_at: string
          email_domain: string
          id: string
          last_attempt_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          email_domain: string
          id?: string
          last_attempt_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          email_domain?: string
          id?: string
          last_attempt_at?: string
        }
        Relationships: []
      }
      demo_reset_logs: {
        Row: {
          action: string
          availability_updates_json: Json | null
          deleted_counts_json: Json | null
          duration_ms: number | null
          error_message: string | null
          freshness_updates_json: Json | null
          id: string
          ran_at: string
          seeded_bookings_json: Json | null
          status: string
        }
        Insert: {
          action?: string
          availability_updates_json?: Json | null
          deleted_counts_json?: Json | null
          duration_ms?: number | null
          error_message?: string | null
          freshness_updates_json?: Json | null
          id?: string
          ran_at?: string
          seeded_bookings_json?: Json | null
          status?: string
        }
        Update: {
          action?: string
          availability_updates_json?: Json | null
          deleted_counts_json?: Json | null
          duration_ms?: number | null
          error_message?: string | null
          freshness_updates_json?: Json | null
          id?: string
          ran_at?: string
          seeded_bookings_json?: Json | null
          status?: string
        }
        Relationships: []
      }
      demo_reset_runs: {
        Row: {
          demo_instance_after: number | null
          demo_instance_before: number | null
          error: string | null
          finished_at: string | null
          id: string
          resort_id: string
          seed_version: string
          started_at: string
          status: string
          summary: Json | null
          trigger: string
        }
        Insert: {
          demo_instance_after?: number | null
          demo_instance_before?: number | null
          error?: string | null
          finished_at?: string | null
          id?: string
          resort_id: string
          seed_version?: string
          started_at?: string
          status?: string
          summary?: Json | null
          trigger: string
        }
        Update: {
          demo_instance_after?: number | null
          demo_instance_before?: number | null
          error?: string | null
          finished_at?: string | null
          id?: string
          resort_id?: string
          seed_version?: string
          started_at?: string
          status?: string
          summary?: Json | null
          trigger?: string
        }
        Relationships: [
          {
            foreignKeyName: "demo_reset_runs_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_tenants: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          is_converted: boolean
          lead_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          is_converted?: boolean
          lead_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          is_converted?: boolean
          lead_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "demo_tenants_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demo_tenants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_workspaces: {
        Row: {
          created_at: string
          departments: Json | null
          email: string
          expires_at: string
          guest_id: string | null
          guest_last_name: string | null
          guest_room: string | null
          id: string
          last_email_sent_at: string | null
          last_error: string | null
          resort_code: string | null
          resort_id: string | null
          resort_name: string
          rooms_range: string | null
          seeded_at: string | null
          staff_email: string | null
          staff_user_id: string | null
          status: string
          timezone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          departments?: Json | null
          email: string
          expires_at?: string
          guest_id?: string | null
          guest_last_name?: string | null
          guest_room?: string | null
          id?: string
          last_email_sent_at?: string | null
          last_error?: string | null
          resort_code?: string | null
          resort_id?: string | null
          resort_name: string
          rooms_range?: string | null
          seeded_at?: string | null
          staff_email?: string | null
          staff_user_id?: string | null
          status?: string
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          departments?: Json | null
          email?: string
          expires_at?: string
          guest_id?: string | null
          guest_last_name?: string | null
          guest_room?: string | null
          id?: string
          last_email_sent_at?: string | null
          last_error?: string | null
          resort_code?: string | null
          resort_id?: string | null
          resort_name?: string
          rooms_range?: string | null
          seeded_at?: string | null
          staff_email?: string | null
          staff_user_id?: string | null
          status?: string
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "demo_workspaces_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      department_bindings: {
        Row: {
          binding_key: string
          binding_type: string
          created_at: string
          department_id: string
          id: string
          is_active: boolean
          resort_id: string
          updated_at: string
        }
        Insert: {
          binding_key: string
          binding_type: string
          created_at?: string
          department_id: string
          id?: string
          is_active?: boolean
          resort_id: string
          updated_at?: string
        }
        Update: {
          binding_key?: string
          binding_type?: string
          created_at?: string
          department_id?: string
          id?: string
          is_active?: boolean
          resort_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_bindings_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "resort_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_bindings_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      department_memberships: {
        Row: {
          created_at: string
          department_id: string | null
          department_key: string
          dept_role: string
          id: string
          is_active: boolean
          resort_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          department_key: string
          dept_role: string
          id?: string
          is_active?: boolean
          resort_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          department_key?: string
          dept_role?: string
          id?: string
          is_active?: boolean
          resort_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_memberships_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "resort_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_memberships_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      department_module_access: {
        Row: {
          department_id: string
          enabled: boolean
          id: string
          module_key: string
          resort_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          department_id: string
          enabled?: boolean
          id?: string
          module_key: string
          resort_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          department_id?: string
          enabled?: boolean
          id?: string
          module_key?: string
          resort_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_module_access_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "resort_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_module_access_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      department_retention_overrides: {
        Row: {
          archive_after_days: number | null
          created_at: string
          delete_after_days: number | null
          department_key: string
          id: string
          resort_id: string
        }
        Insert: {
          archive_after_days?: number | null
          created_at?: string
          delete_after_days?: number | null
          department_key: string
          id?: string
          resort_id: string
        }
        Update: {
          archive_after_days?: number | null
          created_at?: string
          delete_after_days?: number | null
          department_key?: string
          id?: string
          resort_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_retention_overrides_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          key: string
          name: string
          resort_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          key: string
          name: string
          resort_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          key?: string
          name?: string
          resort_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      event_outbox: {
        Row: {
          attempts: number
          created_at: string
          event_type: string
          id: string
          last_error: string | null
          next_attempt_at: string
          payload: Json
          processed_at: string | null
          resort_id: string
          status: Database["public"]["Enums"]["outbox_status"]
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          event_type: string
          id?: string
          last_error?: string | null
          next_attempt_at?: string
          payload: Json
          processed_at?: string | null
          resort_id: string
          status?: Database["public"]["Enums"]["outbox_status"]
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          event_type?: string
          id?: string
          last_error?: string | null
          next_attempt_at?: string
          payload?: Json
          processed_at?: string | null
          resort_id?: string
          status?: Database["public"]["Enums"]["outbox_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_outbox_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_dangerous: boolean
          is_enabled: boolean
          key: string
          label: string
          resort_id: string | null
          scope: string
          tier: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_dangerous?: boolean
          is_enabled?: boolean
          key: string
          label: string
          resort_id?: string | null
          scope?: string
          tier?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_dangerous?: boolean
          is_enabled?: boolean
          key?: string
          label?: string
          resort_id?: string | null
          scope?: string
          tier?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_flags_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_access_links: {
        Row: {
          consumed_at: string | null
          created_at: string
          expires_at: string
          guest_id: string
          id: string
          legacy_token_id: string | null
          purpose: string
          resort_id: string
          stay_id: string
          token_hash: string
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          guest_id: string
          id?: string
          legacy_token_id?: string | null
          purpose?: string
          resort_id: string
          stay_id: string
          token_hash: string
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          guest_id?: string
          id?: string
          legacy_token_id?: string | null
          purpose?: string
          resort_id?: string
          stay_id?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_access_links_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_access_links_legacy_token_id_fkey"
            columns: ["legacy_token_id"]
            isOneToOne: false
            referencedRelation: "prearrival_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_access_links_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_access_links_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: false
            referencedRelation: "guest_stays"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_login_tokens: {
        Row: {
          consumed_at: string | null
          created_at: string
          created_by_staff_id: string | null
          expires_at: string
          guest_id: string
          id: string
          resort_id: string
          token_hash: string
          type: Database["public"]["Enums"]["guest_login_token_type"]
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          created_by_staff_id?: string | null
          expires_at: string
          guest_id: string
          id?: string
          resort_id: string
          token_hash: string
          type: Database["public"]["Enums"]["guest_login_token_type"]
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          created_by_staff_id?: string | null
          expires_at?: string
          guest_id?: string
          id?: string
          resort_id?: string
          token_hash?: string
          type?: Database["public"]["Enums"]["guest_login_token_type"]
        }
        Relationships: [
          {
            foreignKeyName: "guest_login_tokens_created_by_staff_id_fkey"
            columns: ["created_by_staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_login_tokens_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_login_tokens_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_outbound_messages: {
        Row: {
          body_preview: string | null
          channel: string
          created_at: string
          created_by_staff_id: string | null
          error_message: string | null
          guest_id: string
          id: string
          provider_message_id: string | null
          resort_id: string
          sent_at: string | null
          status: string
          subject: string | null
          template_key: string
          to_address: string
          updated_at: string
        }
        Insert: {
          body_preview?: string | null
          channel?: string
          created_at?: string
          created_by_staff_id?: string | null
          error_message?: string | null
          guest_id: string
          id?: string
          provider_message_id?: string | null
          resort_id: string
          sent_at?: string | null
          status?: string
          subject?: string | null
          template_key: string
          to_address: string
          updated_at?: string
        }
        Update: {
          body_preview?: string | null
          channel?: string
          created_at?: string
          created_by_staff_id?: string | null
          error_message?: string | null
          guest_id?: string
          id?: string
          provider_message_id?: string | null
          resort_id?: string
          sent_at?: string | null
          status?: string
          subject?: string | null
          template_key?: string
          to_address?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_outbound_messages_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_outbound_messages_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_preferences: {
        Row: {
          category: string
          created_at: string
          created_by_user_id: string | null
          guest_id: string
          id: string
          priority: number
          resort_id: string
          source: string
          updated_at: string
          value: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by_user_id?: string | null
          guest_id: string
          id?: string
          priority?: number
          resort_id: string
          source?: string
          updated_at?: string
          value: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by_user_id?: string | null
          guest_id?: string
          id?: string
          priority?: number
          resort_id?: string
          source?: string
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_preferences_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_preferences_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_preferences_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_profile_events: {
        Row: {
          actor: string
          actor_user_id: string | null
          changed_fields: Json | null
          created_at: string
          event_type: string
          guest_id: string
          id: string
          resort_id: string
          summary: string | null
        }
        Insert: {
          actor?: string
          actor_user_id?: string | null
          changed_fields?: Json | null
          created_at?: string
          event_type: string
          guest_id: string
          id?: string
          resort_id: string
          summary?: string | null
        }
        Update: {
          actor?: string
          actor_user_id?: string | null
          changed_fields?: Json | null
          created_at?: string
          event_type?: string
          guest_id?: string
          id?: string
          resort_id?: string
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guest_profile_events_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_profile_events_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_requests: {
        Row: {
          activity_booking_id: string | null
          created_at: string
          guest_id: string
          id: string
          origin: string | null
          reservation_date: string | null
          reservation_time: string | null
          resort_id: string
          restaurant_reservation_id: string | null
          room_number: string | null
          source_type: Database["public"]["Enums"]["guest_request_source"]
          special_request_text: string
          staff_notes: string | null
          status: Database["public"]["Enums"]["guest_request_status"]
          updated_at: string
        }
        Insert: {
          activity_booking_id?: string | null
          created_at?: string
          guest_id: string
          id?: string
          origin?: string | null
          reservation_date?: string | null
          reservation_time?: string | null
          resort_id: string
          restaurant_reservation_id?: string | null
          room_number?: string | null
          source_type: Database["public"]["Enums"]["guest_request_source"]
          special_request_text: string
          staff_notes?: string | null
          status?: Database["public"]["Enums"]["guest_request_status"]
          updated_at?: string
        }
        Update: {
          activity_booking_id?: string | null
          created_at?: string
          guest_id?: string
          id?: string
          origin?: string | null
          reservation_date?: string | null
          reservation_time?: string | null
          resort_id?: string
          restaurant_reservation_id?: string | null
          room_number?: string | null
          source_type?: Database["public"]["Enums"]["guest_request_source"]
          special_request_text?: string
          staff_notes?: string | null
          status?: Database["public"]["Enums"]["guest_request_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_requests_activity_booking_id_fkey"
            columns: ["activity_booking_id"]
            isOneToOne: false
            referencedRelation: "activity_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_requests_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_requests_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_requests_restaurant_reservation_id_fkey"
            columns: ["restaurant_reservation_id"]
            isOneToOne: false
            referencedRelation: "restaurant_reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_sessions: {
        Row: {
          browser_name: string | null
          created_at: string
          device_fingerprint: string | null
          device_name: string | null
          device_type: string | null
          expires_at: string
          guest_id: string
          id: string
          ip_address: string | null
          last_active_at: string | null
          os_name: string | null
          resort_id: string
          revoked_at: string | null
          revoked_reason: string | null
          session_token_hash: string
          user_agent: string | null
        }
        Insert: {
          browser_name?: string | null
          created_at?: string
          device_fingerprint?: string | null
          device_name?: string | null
          device_type?: string | null
          expires_at?: string
          guest_id: string
          id?: string
          ip_address?: string | null
          last_active_at?: string | null
          os_name?: string | null
          resort_id: string
          revoked_at?: string | null
          revoked_reason?: string | null
          session_token_hash: string
          user_agent?: string | null
        }
        Update: {
          browser_name?: string | null
          created_at?: string
          device_fingerprint?: string | null
          device_name?: string | null
          device_type?: string | null
          expires_at?: string
          guest_id?: string
          id?: string
          ip_address?: string | null
          last_active_at?: string | null
          os_name?: string | null
          resort_id?: string
          revoked_at?: string | null
          revoked_reason?: string | null
          session_token_hash?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guest_sessions_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_sessions_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_stays: {
        Row: {
          arrival_date: string
          created_at: string
          departure_date: string
          guest_id: string
          id: string
          resort_id: string
          room_number: string | null
          status: string
          updated_at: string
        }
        Insert: {
          arrival_date: string
          created_at?: string
          departure_date: string
          guest_id: string
          id?: string
          resort_id: string
          room_number?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          arrival_date?: string
          created_at?: string
          departure_date?: string
          guest_id?: string
          id?: string
          resort_id?: string
          room_number?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_stays_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_stays_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
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
          is_vip: boolean
          last_login_at: string | null
          loyalty_tier: string | null
          nationality: string | null
          notes: string | null
          notes_internal: string | null
          phone: string | null
          portal_enabled: boolean
          portal_pin_hash: string | null
          portal_pin_last4: string | null
          portal_pin_set_at: string | null
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
          is_vip?: boolean
          last_login_at?: string | null
          loyalty_tier?: string | null
          nationality?: string | null
          notes?: string | null
          notes_internal?: string | null
          phone?: string | null
          portal_enabled?: boolean
          portal_pin_hash?: string | null
          portal_pin_last4?: string | null
          portal_pin_set_at?: string | null
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
          is_vip?: boolean
          last_login_at?: string | null
          loyalty_tier?: string | null
          nationality?: string | null
          notes?: string | null
          notes_internal?: string | null
          phone?: string | null
          portal_enabled?: boolean
          portal_pin_hash?: string | null
          portal_pin_last4?: string | null
          portal_pin_set_at?: string | null
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
      incidents: {
        Row: {
          affected_resort_ids: string[] | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          metadata_json: Json | null
          related_error_ids: string[] | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          affected_resort_ids?: string[] | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          metadata_json?: Json | null
          related_error_ids?: string[] | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          affected_resort_ids?: string[] | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          metadata_json?: Json | null
          related_error_ids?: string[] | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      lead_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          lead_id: string
          meta: Json | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          lead_id: string
          meta?: Json | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          lead_id?: string
          meta?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          country: string | null
          created_at: string
          current_system: string | null
          departments: string[] | null
          email: string
          id: string
          lead_score: number
          primary_pain: string | null
          resort_name: string
          role: string | null
          rooms_range: string | null
          status: Database["public"]["Enums"]["lead_status"]
          timeline: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          current_system?: string | null
          departments?: string[] | null
          email: string
          id?: string
          lead_score?: number
          primary_pain?: string | null
          resort_name: string
          role?: string | null
          rooms_range?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          timeline?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          country?: string | null
          created_at?: string
          current_system?: string | null
          departments?: string[] | null
          email?: string
          id?: string
          lead_score?: number
          primary_pain?: string | null
          resort_name?: string
          role?: string | null
          rooms_range?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          timeline?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      loyalty_earn_rules: {
        Row: {
          category: string
          created_at: string
          earn_rate: number
          earn_type: string
          id: string
          is_active: boolean
          program_id: string
          resort_id: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          earn_rate?: number
          earn_type?: string
          id?: string
          is_active?: boolean
          program_id: string
          resort_id: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          earn_rate?: number
          earn_type?: string
          id?: string
          is_active?: boolean
          program_id?: string
          resort_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_earn_rules_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "loyalty_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_earn_rules_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_members: {
        Row: {
          current_tier_id: string | null
          guest_id: string
          id: string
          joined_at: string
          lifetime_points: number
          points_balance: number
          program_id: string
          resort_id: string
          status: string
          updated_at: string
        }
        Insert: {
          current_tier_id?: string | null
          guest_id: string
          id?: string
          joined_at?: string
          lifetime_points?: number
          points_balance?: number
          program_id: string
          resort_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          current_tier_id?: string | null
          guest_id?: string
          id?: string
          joined_at?: string
          lifetime_points?: number
          points_balance?: number
          program_id?: string
          resort_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_members_current_tier_id_fkey"
            columns: ["current_tier_id"]
            isOneToOne: false
            referencedRelation: "loyalty_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_members_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_members_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "loyalty_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_members_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_programs: {
        Row: {
          base_earn_rate: number
          created_at: string
          currency_name: string
          description: string | null
          id: string
          is_enabled: boolean
          name: string
          resort_id: string
          tier_mode: Database["public"]["Enums"]["loyalty_tier_mode"]
          updated_at: string
          welcome_bonus_points: number
        }
        Insert: {
          base_earn_rate?: number
          created_at?: string
          currency_name?: string
          description?: string | null
          id?: string
          is_enabled?: boolean
          name?: string
          resort_id: string
          tier_mode?: Database["public"]["Enums"]["loyalty_tier_mode"]
          updated_at?: string
          welcome_bonus_points?: number
        }
        Update: {
          base_earn_rate?: number
          created_at?: string
          currency_name?: string
          description?: string | null
          id?: string
          is_enabled?: boolean
          name?: string
          resort_id?: string
          tier_mode?: Database["public"]["Enums"]["loyalty_tier_mode"]
          updated_at?: string
          welcome_bonus_points?: number
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_programs_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: true
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_redemptions: {
        Row: {
          expires_at: string | null
          id: string
          member_id: string
          note: string | null
          points_spent: number
          redeemed_at: string
          resort_id: string
          reward_id: string
          status: string
          transaction_id: string | null
          used_at: string | null
          voucher_code: string | null
        }
        Insert: {
          expires_at?: string | null
          id?: string
          member_id: string
          note?: string | null
          points_spent: number
          redeemed_at?: string
          resort_id: string
          reward_id: string
          status?: string
          transaction_id?: string | null
          used_at?: string | null
          voucher_code?: string | null
        }
        Update: {
          expires_at?: string | null
          id?: string
          member_id?: string
          note?: string | null
          points_spent?: number
          redeemed_at?: string
          resort_id?: string
          reward_id?: string
          status?: string
          transaction_id?: string | null
          used_at?: string | null
          voucher_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_redemptions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "loyalty_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_redemptions_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "loyalty_rewards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_redemptions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "loyalty_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_rewards: {
        Row: {
          available_quantity: number | null
          cost_points: number
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          min_tier_id: string | null
          name: string
          program_id: string
          resort_id: string
          reward_type: Database["public"]["Enums"]["loyalty_reward_type"]
          reward_value: number | null
          updated_at: string
        }
        Insert: {
          available_quantity?: number | null
          cost_points: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          min_tier_id?: string | null
          name: string
          program_id: string
          resort_id: string
          reward_type?: Database["public"]["Enums"]["loyalty_reward_type"]
          reward_value?: number | null
          updated_at?: string
        }
        Update: {
          available_quantity?: number | null
          cost_points?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          min_tier_id?: string | null
          name?: string
          program_id?: string
          resort_id?: string
          reward_type?: Database["public"]["Enums"]["loyalty_reward_type"]
          reward_value?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_rewards_min_tier_id_fkey"
            columns: ["min_tier_id"]
            isOneToOne: false
            referencedRelation: "loyalty_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_rewards_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "loyalty_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_rewards_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_tiers: {
        Row: {
          badge_color: string
          badge_icon: string | null
          created_at: string
          description: string | null
          id: string
          is_default: boolean
          is_elite: boolean
          min_points: number
          name: string
          perks_json: Json
          priority: number
          program_id: string
          resort_id: string
          updated_at: string
        }
        Insert: {
          badge_color?: string
          badge_icon?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          is_elite?: boolean
          min_points?: number
          name: string
          perks_json?: Json
          priority?: number
          program_id: string
          resort_id: string
          updated_at?: string
        }
        Update: {
          badge_color?: string
          badge_icon?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          is_elite?: boolean
          min_points?: number
          name?: string
          perks_json?: Json
          priority?: number
          program_id?: string
          resort_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_tiers_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "loyalty_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_tiers_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_transactions: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          id: string
          member_id: string
          note: string | null
          points_balance_after: number
          points_change: number
          reference_id: string | null
          reference_type: string | null
          resort_id: string
          source: Database["public"]["Enums"]["loyalty_earn_source"]
          type: Database["public"]["Enums"]["loyalty_transaction_type"]
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          member_id: string
          note?: string | null
          points_balance_after: number
          points_change: number
          reference_id?: string | null
          reference_type?: string | null
          resort_id: string
          source: Database["public"]["Enums"]["loyalty_earn_source"]
          type: Database["public"]["Enums"]["loyalty_transaction_type"]
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          member_id?: string
          note?: string | null
          points_balance_after?: number
          points_change?: number
          reference_id?: string | null
          reference_type?: string | null
          resort_id?: string
          source?: Database["public"]["Enums"]["loyalty_earn_source"]
          type?: Database["public"]["Enums"]["loyalty_transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_transactions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "loyalty_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_resort_id_fkey"
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
      onboarding_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          step_key: string
          tenant_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          step_key: string
          tenant_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          step_key?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_progress_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_assets: {
        Row: {
          capacity_int: number | null
          created_at: string
          id: string
          is_active: boolean
          meta_json: Json | null
          name: string
          resort_id: string
          type: string
          updated_at: string
        }
        Insert: {
          capacity_int?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          meta_json?: Json | null
          name: string
          resort_id: string
          type: string
          updated_at?: string
        }
        Update: {
          capacity_int?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          meta_json?: Json | null
          name?: string
          resort_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ops_assets_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_dangerous: boolean
          key: string
          label: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          is_dangerous?: boolean
          key: string
          label: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_dangerous?: boolean
          key?: string
          label?: string
        }
        Relationships: []
      }
      plan_pricing: {
        Row: {
          currency: string
          display_price_text: string | null
          id: string
          is_active: boolean
          metadata_json: Json
          monthly_price_cents: number
          overage_text: string | null
          tier: string
          updated_at: string
          updated_by: string | null
          usage_included: string | null
        }
        Insert: {
          currency?: string
          display_price_text?: string | null
          id?: string
          is_active?: boolean
          metadata_json?: Json
          monthly_price_cents: number
          overage_text?: string | null
          tier: string
          updated_at?: string
          updated_by?: string | null
          usage_included?: string | null
        }
        Update: {
          currency?: string
          display_price_text?: string | null
          id?: string
          is_active?: boolean
          metadata_json?: Json
          monthly_price_cents?: number
          overage_text?: string | null
          tier?: string
          updated_at?: string
          updated_by?: string | null
          usage_included?: string | null
        }
        Relationships: []
      }
      platform_activity_events: {
        Row: {
          actor_id: string | null
          actor_name: string | null
          actor_type: string | null
          created_at: string
          event_type: string
          id: string
          metadata_json: Json | null
          resort_id: string | null
          target_id: string | null
          target_name: string | null
          target_type: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_name?: string | null
          actor_type?: string | null
          created_at?: string
          event_type: string
          id?: string
          metadata_json?: Json | null
          resort_id?: string | null
          target_id?: string | null
          target_name?: string | null
          target_type?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_name?: string | null
          actor_type?: string | null
          created_at?: string
          event_type?: string
          id?: string
          metadata_json?: Json | null
          resort_id?: string | null
          target_id?: string | null
          target_name?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_activity_events_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_audit_log: {
        Row: {
          action: string
          actor_type: string
          actor_user_id: string | null
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          new_value: Json | null
          old_value: Json | null
          request_id: string | null
          resort_id: string | null
          target_id: string | null
          target_table: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_type: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          request_id?: string | null
          resort_id?: string | null
          target_id?: string | null
          target_table?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_type?: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          request_id?: string | null
          resort_id?: string | null
          target_id?: string | null
          target_table?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_audit_log_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_errors: {
        Row: {
          action: string | null
          created_at: string
          error_message: string
          error_stack: string | null
          id: string
          metadata_json: Json | null
          resolved_at: string | null
          resolved_by: string | null
          resort_id: string | null
          route: string
          severity: string
          user_id: string | null
          user_type: string | null
        }
        Insert: {
          action?: string | null
          created_at?: string
          error_message: string
          error_stack?: string | null
          id?: string
          metadata_json?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          resort_id?: string | null
          route: string
          severity?: string
          user_id?: string | null
          user_type?: string | null
        }
        Update: {
          action?: string | null
          created_at?: string
          error_message?: string
          error_stack?: string | null
          id?: string
          metadata_json?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          resort_id?: string | null
          route?: string
          severity?: string
          user_id?: string | null
          user_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_errors_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      pre_arrival_submissions: {
        Row: {
          completed_at: string | null
          guest_id: string
          id: string
          payload: Json
          resort_id: string
          stay_id: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          guest_id: string
          id?: string
          payload?: Json
          resort_id: string
          stay_id: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          guest_id?: string
          id?: string
          payload?: Json
          resort_id?: string
          stay_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pre_arrival_submissions_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pre_arrival_submissions_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pre_arrival_submissions_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: true
            referencedRelation: "guest_stays"
            referencedColumns: ["id"]
          },
        ]
      }
      prearrival_profiles: {
        Row: {
          allergies: string | null
          arrival_date: string | null
          arrival_flight_number: string | null
          arrival_time: string | null
          baggage_count: number | null
          checkin_completed_at: string | null
          created_at: string
          custom_answers_json: Json | null
          dietary_preferences: Json | null
          esignature_date: string | null
          esignature_name: string | null
          guest_id: string
          guest_names: Json | null
          id: string
          passport_details: Json | null
          pickup_notes: string | null
          policy_acknowledged_at: string | null
          prearrival_status: Database["public"]["Enums"]["prearrival_status"]
          resort_id: string
          room_preferences: Json | null
          special_occasions: Json | null
          special_requests: string | null
          staff_notes: string | null
          staff_processed: boolean
          stay_confirmation_notes: string | null
          stay_confirmed: boolean | null
          transfer_preference: string | null
          updated_at: string
          water_comfort_level: string | null
        }
        Insert: {
          allergies?: string | null
          arrival_date?: string | null
          arrival_flight_number?: string | null
          arrival_time?: string | null
          baggage_count?: number | null
          checkin_completed_at?: string | null
          created_at?: string
          custom_answers_json?: Json | null
          dietary_preferences?: Json | null
          esignature_date?: string | null
          esignature_name?: string | null
          guest_id: string
          guest_names?: Json | null
          id?: string
          passport_details?: Json | null
          pickup_notes?: string | null
          policy_acknowledged_at?: string | null
          prearrival_status?: Database["public"]["Enums"]["prearrival_status"]
          resort_id: string
          room_preferences?: Json | null
          special_occasions?: Json | null
          special_requests?: string | null
          staff_notes?: string | null
          staff_processed?: boolean
          stay_confirmation_notes?: string | null
          stay_confirmed?: boolean | null
          transfer_preference?: string | null
          updated_at?: string
          water_comfort_level?: string | null
        }
        Update: {
          allergies?: string | null
          arrival_date?: string | null
          arrival_flight_number?: string | null
          arrival_time?: string | null
          baggage_count?: number | null
          checkin_completed_at?: string | null
          created_at?: string
          custom_answers_json?: Json | null
          dietary_preferences?: Json | null
          esignature_date?: string | null
          esignature_name?: string | null
          guest_id?: string
          guest_names?: Json | null
          id?: string
          passport_details?: Json | null
          pickup_notes?: string | null
          policy_acknowledged_at?: string | null
          prearrival_status?: Database["public"]["Enums"]["prearrival_status"]
          resort_id?: string
          room_preferences?: Json | null
          special_occasions?: Json | null
          special_requests?: string | null
          staff_notes?: string | null
          staff_processed?: boolean
          stay_confirmation_notes?: string | null
          stay_confirmed?: boolean | null
          transfer_preference?: string | null
          updated_at?: string
          water_comfort_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prearrival_profiles_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: true
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prearrival_profiles_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      prearrival_settings: {
        Row: {
          allow_activity_bookings: boolean
          allow_dining_bookings: boolean
          allow_spa_bookings: boolean
          created_at: string
          custom_questions_json: Json | null
          esignature_instruction: string | null
          id: string
          internal_guidance_notes: string | null
          is_enabled: boolean
          open_days_before_checkin: number
          policy_text: string | null
          require_esignature: boolean | null
          require_policy_acknowledgement: boolean | null
          resort_id: string
          show_arrival_details: boolean
          show_preferences: boolean
          show_special_occasions: boolean
          updated_at: string
          verification_mode:
            | Database["public"]["Enums"]["prearrival_verification_mode"]
            | null
          welcome_message: string | null
        }
        Insert: {
          allow_activity_bookings?: boolean
          allow_dining_bookings?: boolean
          allow_spa_bookings?: boolean
          created_at?: string
          custom_questions_json?: Json | null
          esignature_instruction?: string | null
          id?: string
          internal_guidance_notes?: string | null
          is_enabled?: boolean
          open_days_before_checkin?: number
          policy_text?: string | null
          require_esignature?: boolean | null
          require_policy_acknowledgement?: boolean | null
          resort_id: string
          show_arrival_details?: boolean
          show_preferences?: boolean
          show_special_occasions?: boolean
          updated_at?: string
          verification_mode?:
            | Database["public"]["Enums"]["prearrival_verification_mode"]
            | null
          welcome_message?: string | null
        }
        Update: {
          allow_activity_bookings?: boolean
          allow_dining_bookings?: boolean
          allow_spa_bookings?: boolean
          created_at?: string
          custom_questions_json?: Json | null
          esignature_instruction?: string | null
          id?: string
          internal_guidance_notes?: string | null
          is_enabled?: boolean
          open_days_before_checkin?: number
          policy_text?: string | null
          require_esignature?: boolean | null
          require_policy_acknowledgement?: boolean | null
          resort_id?: string
          show_arrival_details?: boolean
          show_preferences?: boolean
          show_special_occasions?: boolean
          updated_at?: string
          verification_mode?:
            | Database["public"]["Enums"]["prearrival_verification_mode"]
            | null
          welcome_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prearrival_settings_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: true
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      prearrival_staff_reviews: {
        Row: {
          created_at: string
          guest_id: string
          id: string
          internal_notes: string | null
          resort_id: string
          reviewed_at: string
          reviewed_by: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          guest_id: string
          id?: string
          internal_notes?: string | null
          resort_id: string
          reviewed_at?: string
          reviewed_by?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          guest_id?: string
          id?: string
          internal_notes?: string | null
          resort_id?: string
          reviewed_at?: string
          reviewed_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prearrival_staff_reviews_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: true
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prearrival_staff_reviews_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      prearrival_tokens: {
        Row: {
          completed_at: string | null
          created_at: string
          expires_at: string
          guest_id: string
          id: string
          last_opened_at: string | null
          resort_id: string
          revoked_at: string | null
          status: Database["public"]["Enums"]["prearrival_link_status"] | null
          token: string
          token_hint: string | null
          updated_at: string
          verification_completed_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          expires_at: string
          guest_id: string
          id?: string
          last_opened_at?: string | null
          resort_id: string
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["prearrival_link_status"] | null
          token: string
          token_hint?: string | null
          updated_at?: string
          verification_completed_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          guest_id?: string
          id?: string
          last_opened_at?: string | null
          resort_id?: string
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["prearrival_link_status"] | null
          token?: string
          token_hint?: string | null
          updated_at?: string
          verification_completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prearrival_tokens_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prearrival_tokens_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_publish_log: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          id: string
          metadata_json: Json
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          id?: string
          metadata_json?: Json
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          id?: string
          metadata_json?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          department: string | null
          disabled_at: string | null
          disabled_by: string | null
          full_name: string | null
          global_role: Database["public"]["Enums"]["global_role"]
          id: string
          is_disabled: boolean
          must_reset_password: boolean
          password_reset_completed_at: string | null
          resort_id: string | null
          temp_password_expires_at: string | null
          updated_at: string
          username: string | null
          vendor_id: string | null
          vendor_role: Database["public"]["Enums"]["vendor_role"] | null
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"]
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          department?: string | null
          disabled_at?: string | null
          disabled_by?: string | null
          full_name?: string | null
          global_role?: Database["public"]["Enums"]["global_role"]
          id: string
          is_disabled?: boolean
          must_reset_password?: boolean
          password_reset_completed_at?: string | null
          resort_id?: string | null
          temp_password_expires_at?: string | null
          updated_at?: string
          username?: string | null
          vendor_id?: string | null
          vendor_role?: Database["public"]["Enums"]["vendor_role"] | null
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          department?: string | null
          disabled_at?: string | null
          disabled_by?: string | null
          full_name?: string | null
          global_role?: Database["public"]["Enums"]["global_role"]
          id?: string
          is_disabled?: boolean
          must_reset_password?: boolean
          password_reset_completed_at?: string | null
          resort_id?: string | null
          temp_password_expires_at?: string | null
          updated_at?: string
          username?: string | null
          vendor_id?: string | null
          vendor_role?: Database["public"]["Enums"]["vendor_role"] | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          expires_at: string | null
          guest_id: string
          id: string
          p256dh: string
          resort_id: string
          user_agent: string | null
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          expires_at?: string | null
          guest_id: string
          id?: string
          p256dh: string
          resort_id: string
          user_agent?: string | null
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          expires_at?: string | null
          guest_id?: string
          id?: string
          p256dh?: string
          resort_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_logs: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          identifier: string
          secondary_key: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          identifier: string
          secondary_key?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          identifier?: string
          secondary_key?: string | null
        }
        Relationships: []
      }
      request_catalog: {
        Row: {
          category: string
          code: string
          color_class: string | null
          created_at: string
          default_priority: string
          department_key: string
          description: string | null
          display_label: string | null
          display_order: number | null
          icon_key: string | null
          id: string
          is_active: boolean
          is_billable: boolean
          resort_id: string | null
          title: string
        }
        Insert: {
          category: string
          code: string
          color_class?: string | null
          created_at?: string
          default_priority?: string
          department_key: string
          description?: string | null
          display_label?: string | null
          display_order?: number | null
          icon_key?: string | null
          id?: string
          is_active?: boolean
          is_billable?: boolean
          resort_id?: string | null
          title: string
        }
        Update: {
          category?: string
          code?: string
          color_class?: string | null
          created_at?: string
          default_priority?: string
          department_key?: string
          description?: string | null
          display_label?: string | null
          display_order?: number | null
          icon_key?: string | null
          id?: string
          is_active?: boolean
          is_billable?: boolean
          resort_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_catalog_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      resort_addons: {
        Row: {
          addon_key: string
          created_at: string
          ends_at: string | null
          id: string
          is_active: boolean
          metadata_json: Json
          resort_id: string
          started_at: string
          updated_at: string
        }
        Insert: {
          addon_key: string
          created_at?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          metadata_json?: Json
          resort_id: string
          started_at?: string
          updated_at?: string
        }
        Update: {
          addon_key?: string
          created_at?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          metadata_json?: Json
          resort_id?: string
          started_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resort_addons_addon_key_fkey"
            columns: ["addon_key"]
            isOneToOne: false
            referencedRelation: "addon_pricing"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "resort_addons_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      resort_departments: {
        Row: {
          activity_scope_key: string | null
          created_at: string
          id: string
          is_active: boolean
          key: string
          name: string
          resort_id: string
          scope_type: string
        }
        Insert: {
          activity_scope_key?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          key: string
          name: string
          resort_id: string
          scope_type?: string
        }
        Update: {
          activity_scope_key?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          key?: string
          name?: string
          resort_id?: string
          scope_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "resort_departments_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      resort_directory: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean
          name: string
          phone_number: string
          resort_id: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name: string
          phone_number: string
          resort_id: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name?: string
          phone_number?: string
          resort_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resort_directory_resort_id_fkey"
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
      resort_purge_jobs: {
        Row: {
          current_step: string | null
          error: string | null
          finished_at: string | null
          id: string
          is_demo: boolean
          progress: number
          reason: string | null
          requested_at: string
          requested_by: string
          resort_code: string
          resort_id: string
          resort_name: string
          started_at: string | null
          status: string
          summary: Json
        }
        Insert: {
          current_step?: string | null
          error?: string | null
          finished_at?: string | null
          id?: string
          is_demo?: boolean
          progress?: number
          reason?: string | null
          requested_at?: string
          requested_by: string
          resort_code: string
          resort_id: string
          resort_name: string
          started_at?: string | null
          status?: string
          summary?: Json
        }
        Update: {
          current_step?: string | null
          error?: string | null
          finished_at?: string | null
          id?: string
          is_demo?: boolean
          progress?: number
          reason?: string | null
          requested_at?: string
          requested_by?: string
          resort_code?: string
          resort_id?: string
          resort_name?: string
          started_at?: string | null
          status?: string
          summary?: Json
        }
        Relationships: []
      }
      resort_request_settings: {
        Row: {
          asap_response_max_minutes: number | null
          asap_response_min_minutes: number | null
          created_at: string | null
          empty_state_description: string | null
          empty_state_title: string | null
          footer_response_text: string | null
          header_tagline: string | null
          id: string
          max_bundle_items: number | null
          max_total_quantity: number | null
          quick_suggestions: Json | null
          requests_end_hour: number | null
          requests_start_hour: number | null
          resort_id: string
          scheduled_response_max_minutes: number | null
          scheduled_response_min_minutes: number | null
          updated_at: string | null
        }
        Insert: {
          asap_response_max_minutes?: number | null
          asap_response_min_minutes?: number | null
          created_at?: string | null
          empty_state_description?: string | null
          empty_state_title?: string | null
          footer_response_text?: string | null
          header_tagline?: string | null
          id?: string
          max_bundle_items?: number | null
          max_total_quantity?: number | null
          quick_suggestions?: Json | null
          requests_end_hour?: number | null
          requests_start_hour?: number | null
          resort_id: string
          scheduled_response_max_minutes?: number | null
          scheduled_response_min_minutes?: number | null
          updated_at?: string | null
        }
        Update: {
          asap_response_max_minutes?: number | null
          asap_response_min_minutes?: number | null
          created_at?: string | null
          empty_state_description?: string | null
          empty_state_title?: string | null
          footer_response_text?: string | null
          header_tagline?: string | null
          id?: string
          max_bundle_items?: number | null
          max_total_quantity?: number | null
          quick_suggestions?: Json | null
          requests_end_hour?: number | null
          requests_start_hour?: number | null
          resort_id?: string
          scheduled_response_max_minutes?: number | null
          scheduled_response_min_minutes?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resort_request_settings_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: true
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      resort_retention_policies: {
        Row: {
          created_at: string
          default_archive_after_days: number
          default_delete_after_days: number
          department_visibility_policy: string
          id: string
          resort_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_archive_after_days?: number
          default_delete_after_days?: number
          department_visibility_policy?: string
          id?: string
          resort_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_archive_after_days?: number
          default_delete_after_days?: number
          department_visibility_policy?: string
          id?: string
          resort_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resort_retention_policies_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: true
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      resort_settings: {
        Row: {
          activities_enabled: boolean
          branding_version: number
          created_at: string
          dining_enabled: boolean
          guest_booking_enabled: boolean
          id: string
          loyalty_enabled: boolean
          prearrival_enabled: boolean
          resort_id: string
          seo_version: number
          transport_enabled: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          activities_enabled?: boolean
          branding_version?: number
          created_at?: string
          dining_enabled?: boolean
          guest_booking_enabled?: boolean
          id?: string
          loyalty_enabled?: boolean
          prearrival_enabled?: boolean
          resort_id: string
          seo_version?: number
          transport_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          activities_enabled?: boolean
          branding_version?: number
          created_at?: string
          dining_enabled?: boolean
          guest_booking_enabled?: boolean
          id?: string
          loyalty_enabled?: boolean
          prearrival_enabled?: boolean
          resort_id?: string
          seo_version?: number
          transport_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resort_settings_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: true
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      resorts: {
        Row: {
          brand_background_tint: string | null
          brand_button_style: string | null
          brand_card_style: string | null
          brand_corner_radius: number | null
          brand_font_family: string | null
          brand_success_color: string | null
          brand_theme: string | null
          brand_warning_color: string | null
          brand_wordmark: string | null
          code: string
          created_at: string
          currency: string
          demo_expires_at: string | null
          demo_instance_id: number | null
          demo_last_reset_at: string | null
          demo_note: string | null
          demo_seed_version: string | null
          favicon_url: string | null
          guest_login_instructions: string | null
          guest_login_subtitle: string | null
          guest_login_title: string | null
          home_hero_image_url: string | null
          id: string
          is_demo: boolean
          login_accent_color: string | null
          login_hero_image_url: string | null
          login_logo_url: string | null
          login_primary_color: string | null
          name: string
          onboarding_activities_done: boolean
          onboarding_basics_done: boolean
          onboarding_branding_done: boolean | null
          onboarding_portal_done: boolean
          onboarding_prearrival_done: boolean | null
          onboarding_restaurants_done: boolean
          onboarding_staff_done: boolean
          onboarding_status: string
          pricing_charges: Json
          status: Database["public"]["Enums"]["resort_status"]
          subscription_expires_at: string | null
          subscription_started_at: string | null
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          timezone: string
          updated_at: string
        }
        Insert: {
          brand_background_tint?: string | null
          brand_button_style?: string | null
          brand_card_style?: string | null
          brand_corner_radius?: number | null
          brand_font_family?: string | null
          brand_success_color?: string | null
          brand_theme?: string | null
          brand_warning_color?: string | null
          brand_wordmark?: string | null
          code: string
          created_at?: string
          currency?: string
          demo_expires_at?: string | null
          demo_instance_id?: number | null
          demo_last_reset_at?: string | null
          demo_note?: string | null
          demo_seed_version?: string | null
          favicon_url?: string | null
          guest_login_instructions?: string | null
          guest_login_subtitle?: string | null
          guest_login_title?: string | null
          home_hero_image_url?: string | null
          id?: string
          is_demo?: boolean
          login_accent_color?: string | null
          login_hero_image_url?: string | null
          login_logo_url?: string | null
          login_primary_color?: string | null
          name: string
          onboarding_activities_done?: boolean
          onboarding_basics_done?: boolean
          onboarding_branding_done?: boolean | null
          onboarding_portal_done?: boolean
          onboarding_prearrival_done?: boolean | null
          onboarding_restaurants_done?: boolean
          onboarding_staff_done?: boolean
          onboarding_status?: string
          pricing_charges?: Json
          status?: Database["public"]["Enums"]["resort_status"]
          subscription_expires_at?: string | null
          subscription_started_at?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          timezone?: string
          updated_at?: string
        }
        Update: {
          brand_background_tint?: string | null
          brand_button_style?: string | null
          brand_card_style?: string | null
          brand_corner_radius?: number | null
          brand_font_family?: string | null
          brand_success_color?: string | null
          brand_theme?: string | null
          brand_warning_color?: string | null
          brand_wordmark?: string | null
          code?: string
          created_at?: string
          currency?: string
          demo_expires_at?: string | null
          demo_instance_id?: number | null
          demo_last_reset_at?: string | null
          demo_note?: string | null
          demo_seed_version?: string | null
          favicon_url?: string | null
          guest_login_instructions?: string | null
          guest_login_subtitle?: string | null
          guest_login_title?: string | null
          home_hero_image_url?: string | null
          id?: string
          is_demo?: boolean
          login_accent_color?: string | null
          login_hero_image_url?: string | null
          login_logo_url?: string | null
          login_primary_color?: string | null
          name?: string
          onboarding_activities_done?: boolean
          onboarding_basics_done?: boolean
          onboarding_branding_done?: boolean | null
          onboarding_portal_done?: boolean
          onboarding_prearrival_done?: boolean | null
          onboarding_restaurants_done?: boolean
          onboarding_staff_done?: boolean
          onboarding_status?: string
          pricing_charges?: Json
          status?: Database["public"]["Enums"]["resort_status"]
          subscription_expires_at?: string | null
          subscription_started_at?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
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
      restaurant_closures: {
        Row: {
          closure_date: string
          created_at: string
          id: string
          reason: string | null
          resort_id: string
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          closure_date: string
          created_at?: string
          id?: string
          reason?: string | null
          resort_id: string
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          closure_date?: string
          created_at?: string
          id?: string
          reason?: string | null
          resort_id?: string
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_closures_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_closures_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_recurring_rules: {
        Row: {
          capacity: number
          created_at: string
          days_of_week: number[] | null
          end_date: string
          end_time: string
          frequency: Database["public"]["Enums"]["recurrence_frequency"]
          id: string
          is_active: boolean
          meal_period: Database["public"]["Enums"]["meal_period"]
          resort_id: string
          restaurant_id: string
          start_date: string
          start_time: string
          updated_at: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          days_of_week?: number[] | null
          end_date: string
          end_time: string
          frequency?: Database["public"]["Enums"]["recurrence_frequency"]
          id?: string
          is_active?: boolean
          meal_period?: Database["public"]["Enums"]["meal_period"]
          resort_id: string
          restaurant_id: string
          start_date: string
          start_time: string
          updated_at?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          days_of_week?: number[] | null
          end_date?: string
          end_time?: string
          frequency?: Database["public"]["Enums"]["recurrence_frequency"]
          id?: string
          is_active?: boolean
          meal_period?: Database["public"]["Enums"]["meal_period"]
          resort_id?: string
          restaurant_id?: string
          start_date?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_recurring_rules_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_recurring_rules_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_reservations: {
        Row: {
          booking_source:
            | Database["public"]["Enums"]["booking_source_context"]
            | null
          created_at: string
          created_by_user_id: string | null
          guest_id: string
          id: string
          num_adults: number
          num_children: number
          origin: string | null
          resort_id: string
          restaurant_slot_id: string
          room_number: string
          source: Database["public"]["Enums"]["booking_source"]
          special_requests: string | null
          status: Database["public"]["Enums"]["booking_status"]
          total_amount: number
          updated_at: string
          version: number
        }
        Insert: {
          booking_source?:
            | Database["public"]["Enums"]["booking_source_context"]
            | null
          created_at?: string
          created_by_user_id?: string | null
          guest_id: string
          id?: string
          num_adults?: number
          num_children?: number
          origin?: string | null
          resort_id: string
          restaurant_slot_id: string
          room_number: string
          source?: Database["public"]["Enums"]["booking_source"]
          special_requests?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          total_amount?: number
          updated_at?: string
          version?: number
        }
        Update: {
          booking_source?:
            | Database["public"]["Enums"]["booking_source_context"]
            | null
          created_at?: string
          created_by_user_id?: string | null
          guest_id?: string
          id?: string
          num_adults?: number
          num_children?: number
          origin?: string | null
          resort_id?: string
          restaurant_slot_id?: string
          room_number?: string
          source?: Database["public"]["Enums"]["booking_source"]
          special_requests?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          total_amount?: number
          updated_at?: string
          version?: number
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
          version: number
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
          version?: number
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
          version?: number
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
          closing_time: string | null
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
          opening_time: string | null
          requires_approval: boolean
          resort_id: string
          total_capacity: number
          updated_at: string
        }
        Insert: {
          closing_time?: string | null
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
          opening_time?: string | null
          requires_approval?: boolean
          resort_id: string
          total_capacity?: number
          updated_at?: string
        }
        Update: {
          closing_time?: string | null
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
          opening_time?: string | null
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
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission_key: string
          role_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission_key: string
          role_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permission_key?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system_role: boolean
          key: string
          name: string
          resort_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system_role?: boolean
          key: string
          name: string
          resort_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system_role?: boolean
          key?: string
          name?: string
          resort_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      rollout_history: {
        Row: {
          affected_resort_ids: string[] | null
          change_label: string
          change_type: string
          executed_at: string
          executed_by: string
          id: string
          metadata_json: Json | null
          notes: string | null
          rollback_at: string | null
          rollback_by: string | null
          scope: string
          status: string
        }
        Insert: {
          affected_resort_ids?: string[] | null
          change_label: string
          change_type: string
          executed_at?: string
          executed_by: string
          id?: string
          metadata_json?: Json | null
          notes?: string | null
          rollback_at?: string | null
          rollback_by?: string | null
          scope: string
          status?: string
        }
        Update: {
          affected_resort_ids?: string[] | null
          change_label?: string
          change_type?: string
          executed_at?: string
          executed_by?: string
          id?: string
          metadata_json?: Json | null
          notes?: string | null
          rollback_at?: string | null
          rollback_by?: string | null
          scope?: string
          status?: string
        }
        Relationships: []
      }
      rollout_job_steps: {
        Row: {
          created_at: string
          error_message: string | null
          finished_at: string | null
          id: string
          job_id: string
          new_value_json: Json
          old_value_json: Json
          resort_id: string
          started_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          job_id: string
          new_value_json?: Json
          old_value_json?: Json
          resort_id: string
          started_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          job_id?: string
          new_value_json?: Json
          old_value_json?: Json
          resort_id?: string
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "rollout_job_steps_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "rollout_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rollout_job_steps_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      rollout_jobs: {
        Row: {
          change_label: string
          change_type: string
          created_at: string
          created_by: string
          dry_run_result_json: Json | null
          error_message: string | null
          finished_at: string | null
          id: string
          notes: string | null
          payload_json: Json | null
          scope: string
          started_at: string | null
          status: string
          target_resort_ids: string[]
        }
        Insert: {
          change_label: string
          change_type: string
          created_at?: string
          created_by: string
          dry_run_result_json?: Json | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          notes?: string | null
          payload_json?: Json | null
          scope: string
          started_at?: string | null
          status?: string
          target_resort_ids?: string[]
        }
        Update: {
          change_label?: string
          change_type?: string
          created_at?: string
          created_by?: string
          dry_run_result_json?: Json | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          notes?: string | null
          payload_json?: Json | null
          scope?: string
          started_at?: string | null
          status?: string
          target_resort_ids?: string[]
        }
        Relationships: []
      }
      room_service_item_modifier_groups: {
        Row: {
          group_id: string
          id: string
          item_id: string
          resort_id: string
          sort_order: number
        }
        Insert: {
          group_id: string
          id?: string
          item_id: string
          resort_id: string
          sort_order?: number
        }
        Update: {
          group_id?: string
          id?: string
          item_id?: string
          resort_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "room_service_item_modifier_groups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "room_service_modifier_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_service_item_modifier_groups_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "room_service_menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_service_item_modifier_groups_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      room_service_menu_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          resort_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          resort_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          resort_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_service_menu_categories_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      room_service_menu_items: {
        Row: {
          allergens: string[] | null
          category_id: string
          created_at: string
          currency: string
          description: string | null
          dietary_tags: string[] | null
          id: string
          image_url: string | null
          is_active: boolean
          is_available: boolean
          is_featured: boolean
          name: string
          prep_time_minutes: number | null
          price: number
          resort_id: string
          sort_order: number
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          allergens?: string[] | null
          category_id: string
          created_at?: string
          currency?: string
          description?: string | null
          dietary_tags?: string[] | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_available?: boolean
          is_featured?: boolean
          name: string
          prep_time_minutes?: number | null
          price?: number
          resort_id: string
          sort_order?: number
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          allergens?: string[] | null
          category_id?: string
          created_at?: string
          currency?: string
          description?: string | null
          dietary_tags?: string[] | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_available?: boolean
          is_featured?: boolean
          name?: string
          prep_time_minutes?: number | null
          price?: number
          resort_id?: string
          sort_order?: number
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_service_menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "room_service_menu_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_service_menu_items_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      room_service_modifier_groups: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          max_selected: number | null
          min_selected: number
          name: string
          resort_id: string
          selection_type: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          max_selected?: number | null
          min_selected?: number
          name: string
          resort_id: string
          selection_type?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          max_selected?: number | null
          min_selected?: number
          name?: string
          resort_id?: string
          selection_type?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_service_modifier_groups_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      room_service_modifier_options: {
        Row: {
          created_at: string
          group_id: string
          id: string
          is_available: boolean
          name: string
          price_delta: number
          resort_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          is_available?: boolean
          name: string
          price_delta?: number
          resort_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          is_available?: boolean
          name?: string
          price_delta?: number
          resort_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_service_modifier_options_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "room_service_modifier_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_service_modifier_options_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      room_service_order_item_modifiers: {
        Row: {
          created_at: string
          id: string
          modifier_option_id: string
          name_snapshot: string
          order_item_id: string
          price_delta_snapshot: number
          resort_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          modifier_option_id: string
          name_snapshot: string
          order_item_id: string
          price_delta_snapshot?: number
          resort_id: string
        }
        Update: {
          created_at?: string
          id?: string
          modifier_option_id?: string
          name_snapshot?: string
          order_item_id?: string
          price_delta_snapshot?: number
          resort_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_service_order_item_modifiers_modifier_option_id_fkey"
            columns: ["modifier_option_id"]
            isOneToOne: false
            referencedRelation: "room_service_modifier_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_service_order_item_modifiers_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "room_service_order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_service_order_item_modifiers_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      room_service_order_items: {
        Row: {
          created_at: string
          id: string
          item_name: string
          menu_item_id: string
          notes: string | null
          order_id: string
          quantity: number
          resort_id: string
          special_requests: string | null
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          item_name: string
          menu_item_id: string
          notes?: string | null
          order_id: string
          quantity?: number
          resort_id: string
          special_requests?: string | null
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          item_name?: string
          menu_item_id?: string
          notes?: string | null
          order_id?: string
          quantity?: number
          resort_id?: string
          special_requests?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "room_service_order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "room_service_menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_service_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "room_service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_service_order_items_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      room_service_ordering_hours: {
        Row: {
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean
          resort_id: string
          start_time: string
        }
        Insert: {
          day_of_week: number
          end_time: string
          id?: string
          is_active?: boolean
          resort_id: string
          start_time: string
        }
        Update: {
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean
          resort_id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_service_ordering_hours_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      room_service_orders: {
        Row: {
          allergy_notes: string | null
          assigned_runner_staff_id: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          created_at: string
          created_by_staff_id: string | null
          currency: string
          delivered_at: string | null
          delivery_notes: string | null
          estimated_delivery_minutes: number | null
          guest_id: string
          id: string
          idempotency_key: string | null
          payment_method: string
          placed_at: string
          promised_at: string | null
          resort_id: string
          room_number: string
          scheduled_for: string | null
          service_charge: number
          special_instructions: string | null
          status: string
          stay_id: string | null
          subtotal: number
          tax: number
          total_amount: number
          updated_at: string
          villa_label: string | null
        }
        Insert: {
          allergy_notes?: string | null
          assigned_runner_staff_id?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          created_by_staff_id?: string | null
          currency?: string
          delivered_at?: string | null
          delivery_notes?: string | null
          estimated_delivery_minutes?: number | null
          guest_id: string
          id?: string
          idempotency_key?: string | null
          payment_method?: string
          placed_at?: string
          promised_at?: string | null
          resort_id: string
          room_number: string
          scheduled_for?: string | null
          service_charge?: number
          special_instructions?: string | null
          status?: string
          stay_id?: string | null
          subtotal?: number
          tax?: number
          total_amount?: number
          updated_at?: string
          villa_label?: string | null
        }
        Update: {
          allergy_notes?: string | null
          assigned_runner_staff_id?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          created_by_staff_id?: string | null
          currency?: string
          delivered_at?: string | null
          delivery_notes?: string | null
          estimated_delivery_minutes?: number | null
          guest_id?: string
          id?: string
          idempotency_key?: string | null
          payment_method?: string
          placed_at?: string
          promised_at?: string | null
          resort_id?: string
          room_number?: string
          scheduled_for?: string | null
          service_charge?: number
          special_instructions?: string | null
          status?: string
          stay_id?: string | null
          subtotal?: number
          tax?: number
          total_amount?: number
          updated_at?: string
          villa_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "room_service_orders_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_service_orders_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_service_orders_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: false
            referencedRelation: "guest_stays"
            referencedColumns: ["id"]
          },
        ]
      }
      room_service_status_events: {
        Row: {
          actor_id: string | null
          actor_type: string
          created_at: string
          id: string
          message: string | null
          new_status: string
          old_status: string | null
          order_id: string
          resort_id: string
        }
        Insert: {
          actor_id?: string | null
          actor_type: string
          created_at?: string
          id?: string
          message?: string | null
          new_status: string
          old_status?: string | null
          order_id: string
          resort_id: string
        }
        Update: {
          actor_id?: string | null
          actor_type?: string
          created_at?: string
          id?: string
          message?: string | null
          new_status?: string
          old_status?: string | null
          order_id?: string
          resort_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_service_status_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "room_service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_service_status_events_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      service_request_events: {
        Row: {
          actor_guest_id: string | null
          actor_type: string | null
          actor_user_id: string | null
          event_at: string
          event_type: string
          id: string
          meta: Json
          notes: string | null
          request_id: string
          resort_id: string
        }
        Insert: {
          actor_guest_id?: string | null
          actor_type?: string | null
          actor_user_id?: string | null
          event_at?: string
          event_type: string
          id?: string
          meta?: Json
          notes?: string | null
          request_id: string
          resort_id: string
        }
        Update: {
          actor_guest_id?: string | null
          actor_type?: string | null
          actor_user_id?: string | null
          event_at?: string
          event_type?: string
          id?: string
          meta?: Json
          notes?: string | null
          request_id?: string
          resort_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_request_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_request_events_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      service_request_items: {
        Row: {
          catalog_id: string | null
          created_at: string
          id: string
          quantity: number
          request_id: string
          resort_id: string
          title: string
        }
        Insert: {
          catalog_id?: string | null
          created_at?: string
          id?: string
          quantity?: number
          request_id: string
          resort_id: string
          title: string
        }
        Update: {
          catalog_id?: string | null
          created_at?: string
          id?: string
          quantity?: number
          request_id?: string
          resort_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_request_items_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "request_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_request_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_request_items_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      service_request_items_archive: {
        Row: {
          catalog_id: string | null
          created_at: string
          id: string
          quantity: number
          request_archive_id: string
          resort_id: string
          title: string
        }
        Insert: {
          catalog_id?: string | null
          created_at: string
          id?: string
          quantity?: number
          request_archive_id: string
          resort_id: string
          title: string
        }
        Update: {
          catalog_id?: string | null
          created_at?: string
          id?: string
          quantity?: number
          request_archive_id?: string
          resort_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_request_items_archive_request_archive_id_fkey"
            columns: ["request_archive_id"]
            isOneToOne: false
            referencedRelation: "service_requests_archive"
            referencedColumns: ["id"]
          },
        ]
      }
      service_request_submissions: {
        Row: {
          created_at: string
          guest_id: string
          guest_notes: string | null
          id: string
          is_asap: boolean
          requested_for_at: string | null
          resort_id: string
          room_number: string | null
        }
        Insert: {
          created_at?: string
          guest_id: string
          guest_notes?: string | null
          id?: string
          is_asap?: boolean
          requested_for_at?: string | null
          resort_id: string
          room_number?: string | null
        }
        Update: {
          created_at?: string
          guest_id?: string
          guest_notes?: string | null
          id?: string
          is_asap?: boolean
          requested_for_at?: string | null
          resort_id?: string
          room_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_request_submissions_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_request_submissions_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      service_requests: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          assigned_at: string | null
          assigned_by: string | null
          assigned_to: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          catalog_id: string | null
          category: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          department_key: string
          guest_id: string
          id: string
          internal_notes: string | null
          is_asap: boolean
          notes: string | null
          priority: string
          quantity: number
          requested_for_at: string | null
          resort_id: string
          room_id: string | null
          status: string
          submission_id: string | null
          title: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          catalog_id?: string | null
          category?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          department_key: string
          guest_id: string
          id?: string
          internal_notes?: string | null
          is_asap?: boolean
          notes?: string | null
          priority?: string
          quantity?: number
          requested_for_at?: string | null
          resort_id: string
          room_id?: string | null
          status?: string
          submission_id?: string | null
          title: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          catalog_id?: string | null
          category?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          department_key?: string
          guest_id?: string
          id?: string
          internal_notes?: string | null
          is_asap?: boolean
          notes?: string | null
          priority?: string
          quantity?: number
          requested_for_at?: string | null
          resort_id?: string
          room_id?: string | null
          status?: string
          submission_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_requests_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "request_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "service_request_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      service_requests_archive: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          archived_at: string
          archived_by: string | null
          assigned_at: string | null
          assigned_by: string | null
          assigned_to: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          catalog_id: string | null
          category: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          department_key: string
          guest_id: string
          id: string
          internal_notes: string | null
          is_asap: boolean
          notes: string | null
          priority: string
          quantity: number
          requested_for_at: string | null
          resort_id: string
          room_id: string | null
          status: string
          submission_id: string | null
          title: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          archived_at?: string
          archived_by?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          catalog_id?: string | null
          category?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at: string
          department_key: string
          guest_id: string
          id: string
          internal_notes?: string | null
          is_asap?: boolean
          notes?: string | null
          priority: string
          quantity?: number
          requested_for_at?: string | null
          resort_id: string
          room_id?: string | null
          status: string
          submission_id?: string | null
          title: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          archived_at?: string
          archived_by?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          catalog_id?: string | null
          category?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          department_key?: string
          guest_id?: string
          id?: string
          internal_notes?: string | null
          is_asap?: boolean
          notes?: string | null
          priority?: string
          quantity?: number
          requested_for_at?: string | null
          resort_id?: string
          room_id?: string | null
          status?: string
          submission_id?: string | null
          title?: string
        }
        Relationships: []
      }
      session_asset_assignments: {
        Row: {
          asset_id: string | null
          asset_label: string
          asset_ref_id: string | null
          asset_type: Database["public"]["Enums"]["session_asset_type"]
          assigned_by: string | null
          created_at: string
          id: string
          notes: string | null
          quantity: number
          resort_id: string
          session_id: string
          updated_at: string
        }
        Insert: {
          asset_id?: string | null
          asset_label: string
          asset_ref_id?: string | null
          asset_type: Database["public"]["Enums"]["session_asset_type"]
          assigned_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          quantity?: number
          resort_id: string
          session_id: string
          updated_at?: string
        }
        Update: {
          asset_id?: string | null
          asset_label?: string
          asset_ref_id?: string | null
          asset_type?: Database["public"]["Enums"]["session_asset_type"]
          assigned_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          quantity?: number
          resort_id?: string
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_asset_assignments_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "ops_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_asset_assignments_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_asset_assignments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "activity_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          event_type: string
          from_status: string | null
          id: string
          notes: string | null
          resort_id: string
          session_id: string
          to_status: string | null
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          event_type: string
          from_status?: string | null
          id?: string
          notes?: string | null
          resort_id: string
          session_id: string
          to_status?: string | null
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          event_type?: string
          from_status?: string | null
          id?: string
          notes?: string | null
          resort_id?: string
          session_id?: string
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_events_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "activity_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_staff_assignments: {
        Row: {
          assigned_by: string | null
          created_at: string
          id: string
          resort_id: string
          role: string
          session_id: string
          staff_user_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          resort_id: string
          role: string
          session_id: string
          staff_user_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          resort_id?: string
          role?: string
          session_id?: string
          staff_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_staff_assignments_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_staff_assignments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "activity_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_transport_links: {
        Row: {
          created_at: string
          id: string
          link_type: string
          resort_id: string
          session_id: string
          trip_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link_type: string
          resort_id: string
          session_id: string
          trip_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link_type?: string
          resort_id?: string
          session_id?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_transport_links_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_transport_links_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "activity_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_transport_links_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "buggy_trips"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_audit_logs: {
        Row: {
          action: string
          actor_id: string
          created_at: string | null
          id: string
          metadata_json: Json | null
          resort_id: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string | null
          id?: string
          metadata_json?: Json | null
          resort_id?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string | null
          id?: string
          metadata_json?: Json | null
          resort_id?: string | null
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_audit_logs_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by_user_id: string | null
          created_at: string
          department: string | null
          email: string
          expires_at: string
          id: string
          invite_message: string | null
          invited_by_name: string | null
          invited_by_user_id: string | null
          name: string | null
          resort_id: string
          resort_role: Database["public"]["Enums"]["resort_role"]
          status: string
          token: string
          updated_at: string
          username: string | null
        }
        Insert: {
          accepted_at?: string | null
          accepted_by_user_id?: string | null
          created_at?: string
          department?: string | null
          email: string
          expires_at: string
          id?: string
          invite_message?: string | null
          invited_by_name?: string | null
          invited_by_user_id?: string | null
          name?: string | null
          resort_id: string
          resort_role: Database["public"]["Enums"]["resort_role"]
          status?: string
          token: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          accepted_at?: string | null
          accepted_by_user_id?: string | null
          created_at?: string
          department?: string | null
          email?: string
          expires_at?: string
          id?: string
          invite_message?: string | null
          invited_by_name?: string | null
          invited_by_user_id?: string | null
          name?: string | null
          resort_id?: string
          resort_role?: Database["public"]["Enums"]["resort_role"]
          status?: string
          token?: string
          updated_at?: string
          username?: string | null
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
      staff_shifts: {
        Row: {
          created_at: string
          created_by: string | null
          department_key: string
          end_time: string
          id: string
          notes: string | null
          resort_id: string
          shift_date: string
          start_time: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department_key: string
          end_time: string
          id?: string
          notes?: string | null
          resort_id: string
          shift_date: string
          start_time: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department_key?: string
          end_time?: string
          id?: string
          notes?: string | null
          resort_id?: string
          shift_date?: string
          start_time?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_shifts_resort_id_fkey"
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
      subscription_alerts: {
        Row: {
          alert_type: string
          created_at: string
          expires_at: string | null
          id: string
          is_resolved: boolean
          last_seen_at: string | null
          metadata_json: Json
          resolved_at: string | null
          resolved_by: string | null
          resort_id: string
          threshold_days: number | null
        }
        Insert: {
          alert_type: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_resolved?: boolean
          last_seen_at?: string | null
          metadata_json?: Json
          resolved_at?: string | null
          resolved_by?: string | null
          resort_id: string
          threshold_days?: number | null
        }
        Update: {
          alert_type?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_resolved?: boolean
          last_seen_at?: string | null
          metadata_json?: Json
          resolved_at?: string | null
          resolved_by?: string | null
          resort_id?: string
          threshold_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_alerts_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      support_sessions: {
        Row: {
          actions_taken: Json | null
          admin_user_id: string
          ended_at: string | null
          expires_at: string
          id: string
          read_only: boolean
          reason: string
          resort_id: string
          session_type: string
          started_at: string
          target_user_id: string | null
        }
        Insert: {
          actions_taken?: Json | null
          admin_user_id: string
          ended_at?: string | null
          expires_at: string
          id?: string
          read_only?: boolean
          reason: string
          resort_id: string
          session_type: string
          started_at?: string
          target_user_id?: string | null
        }
        Update: {
          actions_taken?: Json | null
          admin_user_id?: string
          ended_at?: string | null
          expires_at?: string
          id?: string
          read_only?: boolean
          reason?: string
          resort_id?: string
          session_type?: string
          started_at?: string
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_sessions_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_events: {
        Row: {
          actor_id: string | null
          actor_type: string
          created_at: string
          event_type: string
          id: string
          payload: Json | null
          request_id: string | null
          resort_id: string
          trip_id: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_type: string
          created_at?: string
          event_type: string
          id?: string
          payload?: Json | null
          request_id?: string | null
          resort_id: string
          trip_id?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_type?: string
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json | null
          request_id?: string | null
          resort_id?: string
          trip_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transport_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "buggy_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_events_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_events_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "buggy_trips"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_settings: {
        Row: {
          archive_after_days: number
          created_at: string
          gps_throttle_seconds: number
          guest_booking_enabled: boolean
          history_retention_days: number
          id: string
          location_required: boolean
          max_party_size: number
          max_pickup_detour_meters: number
          max_stops_per_trip: number
          max_wait_minutes: number
          notify_guest_eta_minutes: number
          notify_guest_on_arrived: boolean
          notify_guest_on_assigned: boolean
          notify_guest_on_driver_en_route: boolean
          pooling_enabled: boolean
          pooling_window_minutes: number
          presence_interval_seconds: number
          resort_id: string
          service_enabled: boolean
          service_hours: Json
          updated_at: string
        }
        Insert: {
          archive_after_days?: number
          created_at?: string
          gps_throttle_seconds?: number
          guest_booking_enabled?: boolean
          history_retention_days?: number
          id?: string
          location_required?: boolean
          max_party_size?: number
          max_pickup_detour_meters?: number
          max_stops_per_trip?: number
          max_wait_minutes?: number
          notify_guest_eta_minutes?: number
          notify_guest_on_arrived?: boolean
          notify_guest_on_assigned?: boolean
          notify_guest_on_driver_en_route?: boolean
          pooling_enabled?: boolean
          pooling_window_minutes?: number
          presence_interval_seconds?: number
          resort_id: string
          service_enabled?: boolean
          service_hours?: Json
          updated_at?: string
        }
        Update: {
          archive_after_days?: number
          created_at?: string
          gps_throttle_seconds?: number
          guest_booking_enabled?: boolean
          history_retention_days?: number
          id?: string
          location_required?: boolean
          max_party_size?: number
          max_pickup_detour_meters?: number
          max_stops_per_trip?: number
          max_wait_minutes?: number
          notify_guest_eta_minutes?: number
          notify_guest_on_arrived?: boolean
          notify_guest_on_assigned?: boolean
          notify_guest_on_driver_en_route?: boolean
          pooling_enabled?: boolean
          pooling_window_minutes?: number
          presence_interval_seconds?: number
          resort_id?: string
          service_enabled?: boolean
          service_hours?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transport_settings_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: true
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_parties: {
        Row: {
          created_at: string
          id: string
          lead_guest_id: string
          name: string | null
          resort_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_guest_id: string
          name?: string | null
          resort_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_guest_id?: string
          name?: string | null
          resort_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "travel_parties_lead_guest_id_fkey"
            columns: ["lead_guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_parties_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_party_members: {
        Row: {
          birth_year: number | null
          created_at: string
          display_name: string
          guest_id: string | null
          id: string
          is_lead: boolean
          member_type: Database["public"]["Enums"]["travel_party_member_type"]
          relationship_label: string | null
          resort_id: string
          room_number: string | null
          travel_party_id: string
          updated_at: string
        }
        Insert: {
          birth_year?: number | null
          created_at?: string
          display_name: string
          guest_id?: string | null
          id?: string
          is_lead?: boolean
          member_type?: Database["public"]["Enums"]["travel_party_member_type"]
          relationship_label?: string | null
          resort_id: string
          room_number?: string | null
          travel_party_id: string
          updated_at?: string
        }
        Update: {
          birth_year?: number | null
          created_at?: string
          display_name?: string
          guest_id?: string | null
          id?: string
          is_lead?: boolean
          member_type?: Database["public"]["Enums"]["travel_party_member_type"]
          relationship_label?: string | null
          resort_id?: string
          room_number?: string | null
          travel_party_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "travel_party_members_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_party_members_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_party_members_travel_party_id_fkey"
            columns: ["travel_party_id"]
            isOneToOne: false
            referencedRelation: "travel_parties"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_party_room_links: {
        Row: {
          created_at: string
          guest_id: string
          id: string
          link_status: Database["public"]["Enums"]["travel_party_link_status"]
          resort_id: string
          room_number: string
          travel_party_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          guest_id: string
          id?: string
          link_status?: Database["public"]["Enums"]["travel_party_link_status"]
          resort_id: string
          room_number: string
          travel_party_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          guest_id?: string
          id?: string
          link_status?: Database["public"]["Enums"]["travel_party_link_status"]
          resort_id?: string
          room_number?: string
          travel_party_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "travel_party_room_links_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_party_room_links_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_party_room_links_travel_party_id_fkey"
            columns: ["travel_party_id"]
            isOneToOne: false
            referencedRelation: "travel_parties"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permission_overrides: {
        Row: {
          created_at: string
          created_by: string | null
          effect: Database["public"]["Enums"]["permission_effect"]
          id: string
          permission_key: string
          resort_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          effect: Database["public"]["Enums"]["permission_effect"]
          id?: string
          permission_key: string
          resort_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          effect?: Database["public"]["Enums"]["permission_effect"]
          id?: string
          permission_key?: string
          resort_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permission_overrides_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "user_permission_overrides_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_resort_roles: {
        Row: {
          created_at: string
          id: string
          resort_id: string
          role_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          resort_id: string
          role_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          resort_id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_resort_roles_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_resort_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
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
      vendor_booking_requests: {
        Row: {
          booking_id: string
          created_at: string
          id: string
          message: string
          resort_id: string
          status: Database["public"]["Enums"]["vendor_request_status"]
          type: Database["public"]["Enums"]["vendor_request_type"]
          updated_at: string
          vendor_id: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          id?: string
          message: string
          resort_id: string
          status?: Database["public"]["Enums"]["vendor_request_status"]
          type: Database["public"]["Enums"]["vendor_request_type"]
          updated_at?: string
          vendor_id: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          id?: string
          message?: string
          resort_id?: string
          status?: Database["public"]["Enums"]["vendor_request_status"]
          type?: Database["public"]["Enums"]["vendor_request_type"]
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_booking_requests_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "activity_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_booking_requests_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_booking_requests_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_resorts: {
        Row: {
          ack_sla_minutes: number | null
          commission_rate_override: number | null
          created_at: string
          id: string
          operational_notes: string | null
          resort_id: string
          status: Database["public"]["Enums"]["vendor_resort_status"]
          updated_at: string
          vendor_id: string
        }
        Insert: {
          ack_sla_minutes?: number | null
          commission_rate_override?: number | null
          created_at?: string
          id?: string
          operational_notes?: string | null
          resort_id: string
          status?: Database["public"]["Enums"]["vendor_resort_status"]
          updated_at?: string
          vendor_id: string
        }
        Update: {
          ack_sla_minutes?: number | null
          commission_rate_override?: number | null
          created_at?: string
          id?: string
          operational_notes?: string | null
          resort_id?: string
          status?: Database["public"]["Enums"]["vendor_resort_status"]
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_resorts_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_resorts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          contact_name: string | null
          created_at: string
          default_commission_rate: number | null
          email: string | null
          id: string
          name: string
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          contact_name?: string | null
          created_at?: string
          default_commission_rate?: number | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          contact_name?: string | null
          created_at?: string
          default_commission_rate?: number | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      feature_category_entitlements_v: {
        Row: {
          addon_keys: string[] | null
          category: string | null
          flag_keys: string[] | null
          flags_count: number | null
        }
        Relationships: []
      }
      resort_addons_with_details_v: {
        Row: {
          addon_description: string | null
          addon_key: string | null
          addon_name: string | null
          created_at: string | null
          currency: string | null
          ends_at: string | null
          id: string | null
          is_active: boolean | null
          metadata_json: Json | null
          monthly_price_cents: number | null
          resort_id: string | null
          started_at: string | null
          unlocked_categories: string[] | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resort_addons_addon_key_fkey"
            columns: ["addon_key"]
            isOneToOne: false
            referencedRelation: "addon_pricing"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "resort_addons_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      security_rls_audit: {
        Row: {
          details: string | null
          issue_type: string | null
          recommended_fix: string | null
          schema_name: string | null
          severity: string | null
          severity_order: number | null
          table_name: string | null
          type_order: number | null
        }
        Relationships: []
      }
      service_request_events_compat: {
        Row: {
          actor_guest_id: string | null
          actor_type: string | null
          actor_user_id: string | null
          created_at: string | null
          event_type: string | null
          id: string | null
          metadata: Json | null
          notes: string | null
          request_id: string | null
          resort_id: string | null
        }
        Insert: {
          actor_guest_id?: string | null
          actor_type?: string | null
          actor_user_id?: string | null
          created_at?: string | null
          event_type?: string | null
          id?: string | null
          metadata?: Json | null
          notes?: string | null
          request_id?: string | null
          resort_id?: string | null
        }
        Update: {
          actor_guest_id?: string | null
          actor_type?: string | null
          actor_user_id?: string | null
          created_at?: string | null
          event_type?: string | null
          id?: string | null
          metadata?: Json | null
          notes?: string | null
          request_id?: string | null
          resort_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_request_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_request_events_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_staff_invitation: {
        Args: { p_token: string; p_user_id: string }
        Returns: Json
      }
      add_request_to_trip: {
        Args: { p_request_id: string; p_trip_id: string }
        Returns: Json
      }
      adjust_loyalty_points: {
        Args: {
          p_member_id: string
          p_note?: string
          p_points: number
          p_user_id?: string
        }
        Returns: Json
      }
      admin_add_resort_member: {
        Args: {
          p_department?: string
          p_resort_id: string
          p_role: Database["public"]["Enums"]["resort_role"]
          p_user_id: string
        }
        Returns: string
      }
      admin_remove_membership_by_id: {
        Args: { p_membership_id: string }
        Returns: boolean
      }
      admin_remove_resort_member: {
        Args: { p_resort_id: string; p_user_id: string }
        Returns: boolean
      }
      admin_reset_staff_password: {
        Args: { p_new_password: string; p_user_id: string }
        Returns: Json
      }
      admin_update_resort_member_role: {
        Args: {
          p_membership_id: string
          p_new_role: Database["public"]["Enums"]["resort_role"]
        }
        Returns: boolean
      }
      archive_closed_requests: { Args: never; Returns: Json }
      assign_trip_atomic: {
        Args: { _buggy_id: string; _driver_user_id: string; _trip_id: string }
        Returns: Json
      }
      assign_user_role: {
        Args: { p_resort_id: string; p_role_id: string; p_user_id: string }
        Returns: Json
      }
      award_loyalty_points: {
        Args: {
          p_guest_id: string
          p_note?: string
          p_points: number
          p_reference_id?: string
          p_reference_type?: string
          p_resort_id: string
          p_source: Database["public"]["Enums"]["loyalty_earn_source"]
        }
        Returns: Json
      }
      backfill_guest_stays_from_guests: { Args: never; Returns: Json }
      backfill_submissions_from_profiles: { Args: never; Returns: Json }
      cancel_activity_booking_safe: {
        Args: {
          p_booking_id: string
          p_cancelled_by_user_id?: string
          p_expected_version?: number
        }
        Returns: Json
      }
      cancel_buggy_request: {
        Args: { _reason?: string; _request_id: string }
        Returns: Json
      }
      cancel_restaurant_reservation_safe: {
        Args: {
          p_cancelled_by_user_id?: string
          p_expected_version?: number
          p_reservation_id: string
        }
        Returns: Json
      }
      check_rate_limit: {
        Args: {
          p_endpoint: string
          p_identifier: string
          p_max_attempts: number
          p_window_minutes: number
        }
        Returns: undefined
      }
      check_username_available: {
        Args: { p_resort_id: string; p_username: string }
        Returns: Json
      }
      claim_outbox_events: {
        Args: { p_limit?: number }
        Returns: {
          attempts: number
          created_at: string
          event_type: string
          id: string
          last_error: string | null
          next_attempt_at: string
          payload: Json
          processed_at: string | null
          resort_id: string
          status: Database["public"]["Enums"]["outbox_status"]
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "event_outbox"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      cleanup_orphan_planning_trips: { Args: never; Returns: undefined }
      complete_prearrival_checkin: {
        Args: {
          p_esignature_name?: string
          p_policy_acknowledged?: boolean
          p_token: string
        }
        Returns: Json
      }
      consume_guest_access_link: {
        Args: { p_raw_token: string }
        Returns: Json
      }
      consume_guest_login_token: {
        Args: { p_raw_token: string }
        Returns: Json
      }
      create_activity_booking_idempotent: {
        Args: {
          p_created_by_user_id?: string
          p_guest_id: string
          p_idempotency_key?: string
          p_notes?: string
          p_num_adults: number
          p_num_children: number
          p_resort_id: string
          p_room_number: string
          p_session_id: string
          p_source?: string
        }
        Returns: Json
      }
      create_admin_notification: {
        Args: {
          p_link_url?: string
          p_message: string
          p_resort_id?: string
          p_severity?: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      create_buggy_request_idempotent: {
        Args: {
          _created_by_staff_user_id?: string
          _dropoff_location?: Json
          _dropoff_stop_id?: string
          _dropoff_text?: string
          _guest_id?: string
          _idempotency_key?: string
          _needs_accessible?: boolean
          _party_size?: number
          _pickup_location?: Json
          _pickup_stop_id?: string
          _pickup_text?: string
          _priority?: Database["public"]["Enums"]["buggy_priority"]
          _request_source?: Database["public"]["Enums"]["buggy_request_source"]
          _request_type?: Database["public"]["Enums"]["buggy_request_type"]
          _resort_id: string
          _route_id?: string
          _scheduled_for?: string
        }
        Returns: Json
      }
      create_guest_access_link: { Args: { p_stay_id: string }; Returns: Json }
      create_guest_login_token: {
        Args: { p_guest_id: string; p_token_type: string }
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
      create_guest_pairing_token: {
        Args: {
          p_guest_id: string
          p_resort_id: string
          p_session_token: string
        }
        Returns: Json
      }
      create_restaurant_reservation_idempotent: {
        Args: {
          p_created_by_user_id?: string
          p_guest_id: string
          p_num_adults: number
          p_num_children: number
          p_resort_id: string
          p_room_number: string
          p_slot_id: string
          p_source?: string
          p_special_requests?: string
        }
        Returns: Json
      }
      create_service_request_bundle: {
        Args: { p_guest_id: string; p_resort_id: string; payload: Json }
        Returns: Json
      }
      create_staff_account: {
        Args: {
          p_department?: string
          p_email: string
          p_full_name: string
          p_global_role?: Database["public"]["Enums"]["global_role"]
          p_password: string
          p_resort_id?: string
          p_resort_role?: Database["public"]["Enums"]["resort_role"]
          p_username: string
        }
        Returns: Json
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
      create_trip_from_requests: {
        Args: {
          _request_ids: string[]
          _resort_id: string
          _trip_type?: Database["public"]["Enums"]["buggy_trip_type"]
        }
        Returns: Json
      }
      current_guest_id: { Args: never; Returns: string }
      current_guest_resort_id: { Args: never; Returns: string }
      driver_can_access_trip: { Args: { p_trip_id: string }; Returns: boolean }
      driver_complete_trip_atomic: { Args: { _trip_id: string }; Returns: Json }
      driver_set_status_atomic: {
        Args: { p_new_status: string }
        Returns: Json
      }
      driver_start_trip_atomic: { Args: { _trip_id: string }; Returns: Json }
      driver_update_trip_stop_status: {
        Args: {
          _new_status: Database["public"]["Enums"]["buggy_trip_stop_status"]
          _stop_id: string
        }
        Returns: Json
      }
      enqueue_event: {
        Args: { p_event_type: string; p_payload: Json; p_resort_id: string }
        Returns: string
      }
      find_orphaned_transport_requests: {
        Args: { _resort_id: string }
        Returns: {
          created_at: string
          has_trip_link: boolean
          issue: string
          request_id: string
          status: string
        }[]
      }
      generate_guest_pin: { Args: { p_guest_id: string }; Returns: Json }
      generate_prearrival_token: { Args: { p_guest_id: string }; Returns: Json }
      generate_subscription_alerts: {
        Args: { threshold_days_param?: number }
        Returns: Json
      }
      get_booking_attendees: {
        Args: {
          p_activity_booking_id?: string
          p_restaurant_reservation_id?: string
        }
        Returns: Json
      }
      get_daily_ops_sheet: {
        Args: { p_date: string; p_department?: string; p_resort_id: string }
        Returns: Json
      }
      get_demo_workspace_by_email: { Args: { p_email: string }; Returns: Json }
      get_effective_feature_flags: {
        Args: { _guest_id?: string; _resort_id: string }
        Returns: {
          category: string
          is_enabled: boolean
          key: string
          label: string
        }[]
      }
      get_effective_retention: {
        Args: { _dept_key: string; _resort_id: string }
        Returns: {
          archive_after_days: number
          delete_after_days: number
        }[]
      }
      get_eligible_drivers_for_resort: {
        Args: { _resort_id: string }
        Returns: {
          full_name: string
          resort_role: Database["public"]["Enums"]["resort_role"]
          user_id: string
        }[]
      }
      get_guest_session: {
        Args: never
        Returns: {
          guest_id: string
          resort_id: string
        }[]
      }
      get_guest_sessions: {
        Args: { p_guest_id: string; p_resort_id: string }
        Returns: Json
      }
      get_or_create_loyalty_member: {
        Args: { p_guest_id: string; p_resort_id: string }
        Returns: string
      }
      get_or_create_prearrival_profile: {
        Args: { p_guest_id: string }
        Returns: string
      }
      get_prearrival_data_unified: {
        Args: { p_guest_id: string; p_resort_id: string }
        Returns: Json
      }
      get_resort_by_id: { Args: { p_resort_id: string }; Returns: Json }
      get_resort_entitled_categories: {
        Args: { p_resort_id: string }
        Returns: string[]
      }
      get_resort_public_info: { Args: { p_resort_code: string }; Returns: Json }
      get_role_id_for_resort_role: {
        Args: { p_resort_role: string }
        Returns: string
      }
      get_security_audit_results: {
        Args: never
        Returns: {
          details: string
          issue_type: string
          recommended_fix: string
          schema_name: string
          severity: string
          table_name: string
        }[]
      }
      get_security_audit_summary: { Args: never; Returns: Json }
      get_session_conflicts: {
        Args: { p_resort_id: string; p_session_id: string }
        Returns: Json
      }
      get_staff_invitation_by_token: {
        Args: { p_token: string }
        Returns: {
          department: string
          email: string
          expires_at: string
          id: string
          invite_message: string
          invited_by_name: string
          name: string
          resort_id: string
          resort_name: string
          resort_role: string
          status: string
          username: string
        }[]
      }
      get_user_effective_permissions: {
        Args: { p_resort_id: string; p_user_id: string }
        Returns: {
          permission_key: string
          source: string
        }[]
      }
      get_user_resort_info: {
        Args: { p_resort_id: string; p_user_id: string }
        Returns: {
          is_super_admin: boolean
          resort_role: string
          role_id: string
          role_name: string
        }[]
      }
      get_vendor_bookings:
        | {
            Args: {
              p_date_from?: string
              p_date_to?: string
              p_vendor_id: string
            }
            Returns: {
              activity_name: string
              booking_id: string
              created_at: string
              end_time: string
              guest_name: string
              notes: string
              num_adults: number
              num_children: number
              resort_id: string
              resort_name: string
              room_number: string
              session_date: string
              session_id: string
              start_time: string
              total_amount: number
              vendor_status: Database["public"]["Enums"]["vendor_booking_status"]
            }[]
          }
        | {
            Args: { p_status_filter?: string; p_vendor_id: string }
            Returns: {
              activity_name: string
              booking_id: string
              created_at: string
              end_time: string
              guest_name: string
              notes: string
              num_adults: number
              num_children: number
              resort_id: string
              resort_name: string
              room_number: string
              session_date: string
              session_id: string
              start_time: string
              total_amount: number
              vendor_status: Database["public"]["Enums"]["vendor_booking_status"]
            }[]
          }
      guest_add_party_member: {
        Args: {
          p_birth_year?: number
          p_display_name: string
          p_guest_id: string
          p_member_type: Database["public"]["Enums"]["travel_party_member_type"]
          p_relationship_label?: string
        }
        Returns: Json
      }
      guest_can_access_guest: { Args: { _guest_id: string }; Returns: boolean }
      guest_can_access_transport_event: {
        Args: { _event_id: string }
        Returns: boolean
      }
      guest_can_access_trip: { Args: { _trip_id: string }; Returns: boolean }
      guest_can_submit_feedback: { Args: { p_guest_id: string }; Returns: Json }
      guest_cancel_activity_booking: {
        Args: { p_booking_id: string; p_guest_id: string }
        Returns: boolean
      }
      guest_cancel_restaurant_reservation: {
        Args: { p_guest_id: string; p_reservation_id: string }
        Returns: boolean
      }
      guest_cancel_service_request: {
        Args: { p_guest_id: string; p_request_id: string; p_resort_id: string }
        Returns: boolean
      }
      guest_create_activity_booking:
        | {
            Args: {
              p_guest_id: string
              p_notes?: string
              p_num_adults: number
              p_num_children: number
              p_session_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_guest_id: string
              p_notes?: string
              p_num_adults: number
              p_num_children: number
              p_session_id: string
              p_stay_id?: string
            }
            Returns: Json
          }
      guest_create_activity_booking_with_attendees: {
        Args: {
          p_guest_id: string
          p_member_ids: string[]
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
      guest_create_service_request: {
        Args: {
          p_catalog_id?: string
          p_category?: string
          p_department_key?: string
          p_guest_id: string
          p_is_asap?: boolean
          p_notes?: string
          p_priority?: string
          p_quantity?: number
          p_requested_for_at?: string
          p_resort_id: string
          p_title?: string
        }
        Returns: string
      }
      guest_get_activity_details: {
        Args: { p_activity_id?: string; p_resort_id: string }
        Returns: {
          age_min: number
          cancellation_policy_text: string
          category: string
          default_max_capacity: number
          default_price_per_person: number
          description: string
          difficulty_level: string
          duration_minutes: number
          faq: Json
          full_description: string
          guest_can_book: boolean
          guest_can_cancel: boolean
          guest_cancel_cutoff_hours: number
          guest_cutoff_hours: number
          health_and_safety_notes: string
          highlights: Json
          id: string
          image_url: string
          includes: string
          is_swimming_required: boolean
          max_age: number
          max_pax_per_booking: number
          name: string
          requires_approval: boolean
          short_description: string
          suitable_for_non_swimmers: boolean
        }[]
      }
      guest_get_available_sessions: {
        Args: { p_category?: string; p_date: string; p_guest_id: string }
        Returns: {
          activity_id: string
          activity_name: string
          capacity: number
          category: string
          description: string
          difficulty_level: string
          duration_minutes: number
          end_time: string
          id: string
          image_url: string
          remaining_spots: number
          requires_approval: boolean
          start_time: string
        }[]
      }
      guest_get_available_slots: {
        Args: { p_date?: string; p_guest_id: string; p_restaurant_id?: string }
        Returns: Json
      }
      guest_get_bookings: {
        Args: { p_guest_id: string }
        Returns: {
          booked_by_guest_id: string
          booked_by_name: string
          booking_id: string
          booking_type: string
          date: string
          end_time: string
          location: string
          name: string
          notes: string
          num_adults: number
          num_children: number
          start_time: string
          status: string
        }[]
      }
      guest_get_loyalty_info: { Args: { p_guest_id: string }; Returns: Json }
      guest_get_notifications: { Args: { p_guest_id: string }; Returns: Json }
      guest_get_or_create_travel_party: {
        Args: { p_guest_id: string }
        Returns: Json
      }
      guest_get_prearrival_data: { Args: { p_guest_id: string }; Returns: Json }
      guest_get_request_catalog: {
        Args: { p_resort_id: string }
        Returns: {
          category: string
          code: string
          color_class: string
          default_priority: string
          department_key: string
          description: string
          display_label: string
          display_order: number
          icon_key: string
          id: string
          is_billable: boolean
          title: string
        }[]
      }
      guest_get_request_settings: {
        Args: { p_resort_id: string }
        Returns: Json
      }
      guest_get_restaurants: { Args: { p_resort_id: string }; Returns: Json }
      guest_get_room_bookings: { Args: { p_guest_id: string }; Returns: Json }
      guest_get_room_service_menu: {
        Args: { p_guest_id: string; p_resort_id: string }
        Returns: Json
      }
      guest_get_room_service_order_detail: {
        Args: { p_guest_id: string; p_order_id: string; p_resort_id: string }
        Returns: Json
      }
      guest_get_room_service_orders: {
        Args: { p_guest_id: string; p_resort_id: string }
        Returns: Json
      }
      guest_get_service_requests: {
        Args: { p_guest_id: string; p_resort_id: string }
        Returns: {
          acknowledged_at: string
          cancelled_at: string
          catalog_icon_key: string
          category: string
          completed_at: string
          created_at: string
          department_key: string
          id: string
          is_asap: boolean
          notes: string
          priority: string
          quantity: number
          requested_for_at: string
          status: string
          submission_id: string
          title: string
        }[]
      }
      guest_get_unread_notification_count: {
        Args: { p_guest_id: string }
        Returns: number
      }
      guest_in_resort: {
        Args: { _guest_id: string; _resort_id: string }
        Returns: boolean
      }
      guest_link_room_to_party: {
        Args: {
          p_last_name: string
          p_lead_guest_id: string
          p_pin: string
          p_room_number: string
        }
        Returns: Json
      }
      guest_login_with_pin: {
        Args: {
          p_last_name: string
          p_pin: string
          p_resort_id: string
          p_room_number: string
        }
        Returns: Json
      }
      guest_mark_all_notifications_read: {
        Args: { p_guest_id: string }
        Returns: number
      }
      guest_mark_notification_read: {
        Args: { p_guest_id: string; p_notification_id: string }
        Returns: boolean
      }
      guest_place_room_service_order: {
        Args: {
          p_guest_id: string
          p_items: Json
          p_resort_id: string
          p_room_number: string
          p_special_instructions?: string
          p_stay_id?: string
        }
        Returns: string
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
          resort_code: string
          resort_id: string
          resort_logo_url: string
          resort_name: string
          room_number: string
        }[]
      }
      guest_remove_party_member: {
        Args: { p_lead_guest_id: string; p_member_id: string }
        Returns: Json
      }
      guest_remove_push_subscription: {
        Args: { p_endpoint: string; p_guest_id: string }
        Returns: undefined
      }
      guest_save_push_subscription: {
        Args: {
          p_auth: string
          p_endpoint: string
          p_guest_id: string
          p_p256dh: string
          p_resort_id: string
          p_user_agent?: string
        }
        Returns: string
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
      guest_update_prearrival_profile: {
        Args: {
          p_allergies?: string
          p_arrival_date?: string
          p_arrival_flight_number?: string
          p_arrival_time?: string
          p_baggage_count?: number
          p_complete_checkin?: boolean
          p_custom_answers_json?: Json
          p_dietary_preferences?: Json
          p_esignature_date?: string
          p_esignature_name?: string
          p_guest_id: string
          p_guest_names?: Json
          p_passport_details?: Json
          p_pickup_notes?: string
          p_policy_acknowledged?: boolean
          p_room_preferences?: Json
          p_special_occasions?: Json
          p_special_requests?: string
          p_stay_confirmation_notes?: string
          p_stay_confirmed?: boolean
          p_transfer_preference?: string
          p_water_comfort_level?: string
        }
        Returns: boolean
      }
      guest_upsert_prearrival_submission: {
        Args: { p_mark_completed?: boolean; p_payload: Json; p_stay_id: string }
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
      initialize_guest_requests_for_resort: {
        Args: { p_resort_id: string }
        Returns: undefined
      }
      is_demo_write_blocked: { Args: never; Returns: boolean }
      is_dept_manager_or_admin: {
        Args: { _resort_id: string; _user_id: string }
        Returns: boolean
      }
      is_guest_session: { Args: never; Returns: boolean }
      is_resort_driver: {
        Args: { _resort_id: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      is_vendor_for_booking: {
        Args: { p_booking_id: string; p_user_id: string }
        Returns: boolean
      }
      link_legacy_tokens_to_stays: { Args: never; Returns: Json }
      log_access_change: {
        Args: {
          p_action_key: string
          p_details?: Json
          p_resort_id: string
          p_target_user_id?: string
        }
        Returns: string
      }
      log_admin_action: {
        Args: { p_action: string; p_metadata?: Json; p_resort_id?: string }
        Returns: string
      }
      log_audit: {
        Args: {
          p_action: string
          p_actor_user_id?: string
          p_after?: Json
          p_before?: Json
          p_effective_user_id?: string
          p_entity: string
          p_entity_id?: string
          p_metadata?: Json
          p_resort_id?: string
        }
        Returns: string
      }
      log_platform_activity: {
        Args: {
          p_event_type: string
          p_metadata?: Json
          p_resort_id?: string
          p_target_id?: string
          p_target_name?: string
          p_target_type?: string
        }
        Returns: string
      }
      log_platform_error: {
        Args: {
          p_action?: string
          p_error_message: string
          p_error_stack?: string
          p_metadata?: Json
          p_resort_id?: string
          p_route: string
          p_severity?: string
          p_user_type?: string
        }
        Returns: string
      }
      log_security_event: {
        Args: {
          p_action: string
          p_metadata?: Json
          p_new_value?: Json
          p_old_value?: Json
          p_resort_id?: string
          p_target_id?: string
          p_target_table?: string
        }
        Returns: string
      }
      log_staff_action: {
        Args: {
          p_action: string
          p_metadata?: Json
          p_resort_id?: string
          p_target_user_id?: string
        }
        Returns: string
      }
      log_view_as_session: {
        Args: {
          p_action?: string
          p_target_resort_id: string
          p_target_user_id: string
        }
        Returns: string
      }
      mark_outbox_done: { Args: { p_event_id: string }; Returns: undefined }
      mark_outbox_failed: {
        Args: { p_error: string; p_event_id: string; p_max_attempts?: number }
        Returns: undefined
      }
      now_in_resort_tz: { Args: { p_resort_id: string }; Returns: string }
      peek_guest_login_token: { Args: { p_raw_token: string }; Returns: Json }
      purge_archived_requests: { Args: never; Returns: Json }
      record_request_event: {
        Args: {
          _actor_type: string
          _actor_user_id: string
          _event_type: string
          _from_status?: string
          _payload?: Json
          _request_id: string
          _resort_id: string
          _to_status?: string
        }
        Returns: string
      }
      record_transport_event: {
        Args: {
          _actor_id: string
          _actor_type: string
          _event_type: string
          _payload?: Json
          _request_id: string
          _resort_id: string
          _trip_id: string
        }
        Returns: string
      }
      record_trip_event: {
        Args: {
          _actor_type: string
          _actor_user_id: string
          _event_type: string
          _from_status?: string
          _payload?: Json
          _resort_id: string
          _to_status?: string
          _trip_id: string
        }
        Returns: string
      }
      regenerate_prearrival_link: {
        Args: { p_guest_id: string }
        Returns: Json
      }
      register_guest_session: {
        Args: {
          p_browser_name?: string
          p_device_fingerprint?: string
          p_device_name?: string
          p_device_type?: string
          p_guest_id: string
          p_os_name?: string
          p_resort_id: string
        }
        Returns: Json
      }
      remove_permission_override: {
        Args: {
          p_permission_key: string
          p_resort_id: string
          p_user_id: string
        }
        Returns: Json
      }
      remove_request_from_trip: {
        Args: { _reason?: string; _request_id: string; _trip_id: string }
        Returns: Json
      }
      remove_user_role: {
        Args: { p_resort_id: string; p_role_id: string; p_user_id: string }
        Returns: Json
      }
      reorder_trip_stops: {
        Args: { _ordered_stop_ids: string[]; _trip_id: string }
        Returns: Json
      }
      request_resort_purge: {
        Args: {
          p_confirm_word: string
          p_reason?: string
          p_resort_code: string
          p_resort_id: string
        }
        Returns: string
      }
      reset_demo_resort: {
        Args: {
          p_resort_id: string
          p_seed_version?: string
          p_trigger?: string
        }
        Returns: Json
      }
      resolve_permissions: {
        Args: { p_resort_id: string; p_user_id: string }
        Returns: {
          permission_key: string
          source: string
        }[]
      }
      resort_now: { Args: { p_resort_id: string }; Returns: string }
      resort_tz_to_utc: {
        Args: { p_local_timestamp: string; p_resort_id: string }
        Returns: string
      }
      retry_failed_events: { Args: { p_event_ids: string[] }; Returns: number }
      revoke_all_guest_sessions: {
        Args: { p_guest_id: string; p_reason?: string }
        Returns: Json
      }
      revoke_guest_session: {
        Args: { p_guest_id: string; p_reason?: string; p_session_id: string }
        Returns: Json
      }
      revoke_prearrival_link: { Args: { p_link_id: string }; Returns: Json }
      room_service_create_order_idempotent: {
        Args: {
          p_allergy_notes?: string
          p_delivery_notes?: string
          p_guest_id: string
          p_idempotency_key: string
          p_items: Json
          p_resort_id: string
          p_scheduled_for?: string
          p_villa_label?: string
        }
        Returns: Json
      }
      room_service_guest_cancel: {
        Args: {
          p_guest_id: string
          p_order_id: string
          p_reason?: string
          p_resort_id: string
        }
        Returns: Json
      }
      room_service_set_status: {
        Args: {
          p_assigned_runner_staff_id?: string
          p_message?: string
          p_new_status: string
          p_order_id: string
          p_promised_at?: string
        }
        Returns: Json
      }
      rpc_transport_assign_trip: {
        Args: {
          p_buggy_id: string
          p_driver_user_id: string
          p_resort_id: string
          p_trip_id: string
        }
        Returns: Json
      }
      rpc_transport_attach_requests_to_trip: {
        Args: {
          p_request_ids: string[]
          p_resort_id: string
          p_trip_id: string
        }
        Returns: Json
      }
      rpc_transport_cancel_empty_trip: {
        Args: { p_resort_id: string; p_trip_id: string }
        Returns: Json
      }
      rpc_transport_cancel_request: {
        Args: {
          p_actor_id: string
          p_actor_type: string
          p_reason?: string
          p_request_id: string
          p_resort_id: string
        }
        Returns: Json
      }
      rpc_transport_create_trip_from_requests: {
        Args: {
          p_created_by_staff_id?: string
          p_request_ids: string[]
          p_resort_id: string
        }
        Returns: Json
      }
      rpc_transport_driver_update_trip_state: {
        Args: {
          p_driver_user_id: string
          p_next_state: string
          p_resort_id: string
          p_trip_id: string
        }
        Returns: Json
      }
      rpc_transport_staff_update_trip_status: {
        Args: {
          p_action: string
          p_reason?: string
          p_resort_id: string
          p_staff_user_id: string
          p_trip_id: string
        }
        Returns: Json
      }
      seed_resort_departments: {
        Args: { p_resort_id: string }
        Returns: undefined
      }
      seed_resort_request_catalog: {
        Args: { p_resort_id: string }
        Returns: undefined
      }
      seed_resort_retention_policy: {
        Args: { p_resort_id: string }
        Returns: undefined
      }
      session_start_timestamptz: {
        Args: { p_date: string; p_resort_id: string; p_start_time: string }
        Returns: string
      }
      set_permission_override: {
        Args: {
          p_effect: Database["public"]["Enums"]["permission_effect"]
          p_permission_key: string
          p_resort_id: string
          p_user_id: string
        }
        Returns: Json
      }
      should_reset_demo: {
        Args: {
          p_max_age_minutes?: number
          p_resort_id: string
          p_seed_version?: string
        }
        Returns: Json
      }
      staff_can_assign_request: {
        Args: { _dept_key: string; _resort_id: string; _user_id: string }
        Returns: boolean
      }
      staff_can_manage_request: {
        Args: {
          _assigned_to: string
          _dept_key: string
          _resort_id: string
          _user_id: string
        }
        Returns: boolean
      }
      staff_can_view_request: {
        Args: {
          _assigned_to: string
          _dept_key: string
          _resort_id: string
          _user_id: string
        }
        Returns: boolean
      }
      staff_can_view_transport: {
        Args: { _resort_id: string; _user_id: string }
        Returns: boolean
      }
      staff_can_write_resort: {
        Args: {
          _resort_id: string
          _roles: Database["public"]["Enums"]["resort_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      staff_can_write_transport: {
        Args: { _resort_id: string; _user_id: string }
        Returns: boolean
      }
      staff_dept_role: {
        Args: { _dept_key: string; _resort_id: string; _user_id: string }
        Returns: string
      }
      staff_has_dept_access: {
        Args: { _resort_id: string; _user_id: string }
        Returns: boolean
      }
      staff_has_resort_access: {
        Args: { _resort_id: string; _user_id: string }
        Returns: boolean
      }
      staff_lookup_by_identifier: {
        Args: { p_identifier: string }
        Returns: {
          email: string
          full_name: string
          user_id: string
          username: string
        }[]
      }
      superadmin_list_users_filtered: {
        Args: {
          _access?: string
          _global_role?: string
          _joined_from?: string
          _joined_to?: string
          _limit?: number
          _multi_resort_only?: boolean
          _offset?: number
          _q?: string
          _resort_id?: string
          _resort_role?: string
          _sort_by?: string
          _sort_dir?: string
          _status?: string
        }
        Returns: {
          created_at: string
          deleted_at: string
          full_name: string
          global_role: string
          id: string
          is_disabled: boolean
          memberships: Json
          memberships_count: number
          total_count: number
          username: string
        }[]
      }
      update_department_settings: {
        Args: {
          p_activity_scope_key?: string
          p_department_id: string
          p_is_active?: boolean
          p_name?: string
        }
        Returns: Json
      }
      update_staff_username: {
        Args: { p_new_username: string; p_user_id: string }
        Returns: Json
      }
      upsert_transport_settings_atomic: {
        Args: { p_resort_id: string; p_settings: Json }
        Returns: Json
      }
      user_has_all_permissions: {
        Args: {
          p_permission_keys: string[]
          p_resort_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      user_has_any_permission: {
        Args: {
          p_permission_keys: string[]
          p_resort_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      user_has_department_access: {
        Args: { _department_id: string }
        Returns: boolean
      }
      user_has_department_module: {
        Args: { _department_id: string; _module_key: string }
        Returns: boolean
      }
      user_has_permission: {
        Args: {
          p_permission_key: string
          p_resort_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      user_is_active: { Args: { p_user_id: string }; Returns: boolean }
      user_is_department_manager: {
        Args: { _department_id: string }
        Returns: boolean
      }
      utc_to_resort_tz: {
        Args: { p_resort_id: string; p_timestamp: string }
        Returns: string
      }
      validate_demo_login_token: { Args: { p_token: string }; Returns: Json }
      validate_guest_session: {
        Args: { p_session_token: string }
        Returns: Json
      }
      validate_prearrival_link: {
        Args: { p_last_name?: string; p_token: string }
        Returns: Json
      }
      validate_prearrival_token: { Args: { p_token: string }; Returns: Json }
      vendor_update_booking_status: {
        Args: {
          p_booking_id: string
          p_decline_reason?: string
          p_new_status: Database["public"]["Enums"]["vendor_booking_status"]
        }
        Returns: Json
      }
    }
    Enums: {
      account_type: "staff" | "guest" | "vendor"
      activity_category: "DIVE" | "EXCURSION" | "WATERSPORT" | "SPA" | "OTHER"
      app_role:
        | "ADMIN"
        | "MANAGER"
        | "FRONT_OFFICE"
        | "ACTIVITIES"
        | "FNB"
        | "RESERVATIONS"
      booking_source:
        | "STAFF_FRONT_DESK"
        | "STAFF_DIVE"
        | "STAFF_FNB"
        | "GUEST_PORTAL"
      booking_source_context: "NORMAL" | "PRE_STAY" | "IN_STAY_SUGGESTION"
      booking_status:
        | "PENDING"
        | "CONFIRMED"
        | "CANCELLED"
        | "NO_SHOW"
        | "COMPLETED"
      buggy_priority: "normal" | "high" | "vip"
      buggy_request_source: "guest" | "staff"
      buggy_request_status:
        | "requested"
        | "queued"
        | "assigned_to_trip"
        | "driver_en_route"
        | "arrived"
        | "picked_up"
        | "completed"
        | "cancelled"
        | "failed"
        | "no_show"
      buggy_request_type: "on_demand" | "scheduled" | "fixed_route"
      buggy_status:
        | "available"
        | "en_route"
        | "out_of_service"
        | "charging"
        | "in_use"
      buggy_trip_request_state:
        | "queued"
        | "picked_up"
        | "dropped_off"
        | "cancelled"
        | "no_show"
      buggy_trip_status:
        | "planning"
        | "assigned"
        | "en_route"
        | "active"
        | "completed"
        | "cancelled"
      buggy_trip_stop_kind: "pickup" | "dropoff" | "waypoint"
      buggy_trip_stop_status: "pending" | "arrived" | "completed" | "skipped"
      buggy_trip_type:
        | "pooled_custom"
        | "scheduled_pool"
        | "fixed_route_run"
        | "activity_pickup"
      driver_status: "offline" | "online" | "on_trip" | "break"
      feedback_source: "GUEST_PORTAL" | "STAFF_FILLED"
      global_role: "SUPER_ADMIN" | "STANDARD"
      guest_login_token_type: "instant" | "confirm" | "pairing"
      guest_request_source: "ACTIVITY" | "RESTAURANT"
      guest_request_status: "OPEN" | "IN_PROGRESS" | "COMPLETED"
      lead_status:
        | "new"
        | "sandbox_created"
        | "live_demo_booked"
        | "trial_active"
        | "paid"
        | "converted"
        | "lost"
      loyalty_earn_source:
        | "activity_booking"
        | "dining_booking"
        | "room_night"
        | "spa_booking"
        | "manual_adjustment"
        | "welcome_bonus"
        | "tier_bonus"
        | "referral"
      loyalty_reward_type:
        | "discount_percent"
        | "discount_fixed"
        | "free_activity"
        | "upgrade"
        | "voucher"
        | "perk"
      loyalty_tier_mode: "points" | "nights" | "spend"
      loyalty_transaction_type: "earn" | "redeem" | "adjustment" | "expire"
      meal_period: "BREAKFAST" | "LUNCH" | "DINNER" | "EVENT"
      notification_audience: "STAFF" | "GUEST"
      notification_channel: "IN_APP" | "EMAIL" | "WHATSAPP"
      outbox_status: "PENDING" | "PROCESSING" | "DONE" | "FAILED"
      payout_status: "UNBATCHED" | "BATCHED" | "PAID"
      permission_effect: "grant" | "revoke"
      prearrival_link_status: "active" | "expired" | "revoked" | "completed"
      prearrival_status: "not_started" | "partial" | "completed"
      prearrival_verification_mode: "none" | "light" | "otp"
      provider_type: "IN_HOUSE" | "VENDOR"
      recommendation_response: "YES" | "NO" | "MAYBE"
      recurrence_frequency: "DAILY" | "WEEKLY"
      resort_role:
        | "RESORT_ADMIN"
        | "MANAGER"
        | "FRONT_OFFICE"
        | "ACTIVITIES"
        | "FNB"
        | "RESERVATIONS"
        | "TRANSPORT"
      resort_status: "ACTIVE" | "INACTIVE" | "DEMO"
      resource_type: "BOAT" | "VAN" | "CABANA" | "OTHER"
      session_asset_type: "guide" | "boat" | "equipment"
      session_status:
        | "SCHEDULED"
        | "CANCELLED"
        | "COMPLETED"
        | "CHECK_IN"
        | "DEPARTED"
      slot_status: "OPEN" | "CLOSED" | "FULL"
      subscription_tier: "ESSENTIAL" | "PROFESSIONAL" | "ELITE"
      travel_party_link_status: "pending" | "linked"
      travel_party_member_type: "adult" | "child"
      vendor_booking_status:
        | "PENDING_ACK"
        | "ACKED"
        | "DECLINED"
        | "COMPLETED"
        | "NO_SHOW"
      vendor_request_status: "open" | "resolved"
      vendor_request_type: "REQUEST_CHANGE" | "NOTE"
      vendor_resort_status: "approved" | "suspended"
      vendor_role: "vendor_admin" | "vendor_staff"
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
      account_type: ["staff", "guest", "vendor"],
      activity_category: ["DIVE", "EXCURSION", "WATERSPORT", "SPA", "OTHER"],
      app_role: [
        "ADMIN",
        "MANAGER",
        "FRONT_OFFICE",
        "ACTIVITIES",
        "FNB",
        "RESERVATIONS",
      ],
      booking_source: [
        "STAFF_FRONT_DESK",
        "STAFF_DIVE",
        "STAFF_FNB",
        "GUEST_PORTAL",
      ],
      booking_source_context: ["NORMAL", "PRE_STAY", "IN_STAY_SUGGESTION"],
      booking_status: [
        "PENDING",
        "CONFIRMED",
        "CANCELLED",
        "NO_SHOW",
        "COMPLETED",
      ],
      buggy_priority: ["normal", "high", "vip"],
      buggy_request_source: ["guest", "staff"],
      buggy_request_status: [
        "requested",
        "queued",
        "assigned_to_trip",
        "driver_en_route",
        "arrived",
        "picked_up",
        "completed",
        "cancelled",
        "failed",
        "no_show",
      ],
      buggy_request_type: ["on_demand", "scheduled", "fixed_route"],
      buggy_status: [
        "available",
        "en_route",
        "out_of_service",
        "charging",
        "in_use",
      ],
      buggy_trip_request_state: [
        "queued",
        "picked_up",
        "dropped_off",
        "cancelled",
        "no_show",
      ],
      buggy_trip_status: [
        "planning",
        "assigned",
        "en_route",
        "active",
        "completed",
        "cancelled",
      ],
      buggy_trip_stop_kind: ["pickup", "dropoff", "waypoint"],
      buggy_trip_stop_status: ["pending", "arrived", "completed", "skipped"],
      buggy_trip_type: [
        "pooled_custom",
        "scheduled_pool",
        "fixed_route_run",
        "activity_pickup",
      ],
      driver_status: ["offline", "online", "on_trip", "break"],
      feedback_source: ["GUEST_PORTAL", "STAFF_FILLED"],
      global_role: ["SUPER_ADMIN", "STANDARD"],
      guest_login_token_type: ["instant", "confirm", "pairing"],
      guest_request_source: ["ACTIVITY", "RESTAURANT"],
      guest_request_status: ["OPEN", "IN_PROGRESS", "COMPLETED"],
      lead_status: [
        "new",
        "sandbox_created",
        "live_demo_booked",
        "trial_active",
        "paid",
        "converted",
        "lost",
      ],
      loyalty_earn_source: [
        "activity_booking",
        "dining_booking",
        "room_night",
        "spa_booking",
        "manual_adjustment",
        "welcome_bonus",
        "tier_bonus",
        "referral",
      ],
      loyalty_reward_type: [
        "discount_percent",
        "discount_fixed",
        "free_activity",
        "upgrade",
        "voucher",
        "perk",
      ],
      loyalty_tier_mode: ["points", "nights", "spend"],
      loyalty_transaction_type: ["earn", "redeem", "adjustment", "expire"],
      meal_period: ["BREAKFAST", "LUNCH", "DINNER", "EVENT"],
      notification_audience: ["STAFF", "GUEST"],
      notification_channel: ["IN_APP", "EMAIL", "WHATSAPP"],
      outbox_status: ["PENDING", "PROCESSING", "DONE", "FAILED"],
      payout_status: ["UNBATCHED", "BATCHED", "PAID"],
      permission_effect: ["grant", "revoke"],
      prearrival_link_status: ["active", "expired", "revoked", "completed"],
      prearrival_status: ["not_started", "partial", "completed"],
      prearrival_verification_mode: ["none", "light", "otp"],
      provider_type: ["IN_HOUSE", "VENDOR"],
      recommendation_response: ["YES", "NO", "MAYBE"],
      recurrence_frequency: ["DAILY", "WEEKLY"],
      resort_role: [
        "RESORT_ADMIN",
        "MANAGER",
        "FRONT_OFFICE",
        "ACTIVITIES",
        "FNB",
        "RESERVATIONS",
        "TRANSPORT",
      ],
      resort_status: ["ACTIVE", "INACTIVE", "DEMO"],
      resource_type: ["BOAT", "VAN", "CABANA", "OTHER"],
      session_asset_type: ["guide", "boat", "equipment"],
      session_status: [
        "SCHEDULED",
        "CANCELLED",
        "COMPLETED",
        "CHECK_IN",
        "DEPARTED",
      ],
      slot_status: ["OPEN", "CLOSED", "FULL"],
      subscription_tier: ["ESSENTIAL", "PROFESSIONAL", "ELITE"],
      travel_party_link_status: ["pending", "linked"],
      travel_party_member_type: ["adult", "child"],
      vendor_booking_status: [
        "PENDING_ACK",
        "ACKED",
        "DECLINED",
        "COMPLETED",
        "NO_SHOW",
      ],
      vendor_request_status: ["open", "resolved"],
      vendor_request_type: ["REQUEST_CHANGE", "NOTE"],
      vendor_resort_status: ["approved", "suspended"],
      vendor_role: ["vendor_admin", "vendor_staff"],
    },
  },
} as const
