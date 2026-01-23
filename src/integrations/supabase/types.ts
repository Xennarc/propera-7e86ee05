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
          provider_type: Database["public"]["Enums"]["provider_type"]
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
          provider_type?: Database["public"]["Enums"]["provider_type"]
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
          provider_type?: Database["public"]["Enums"]["provider_type"]
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
      department_memberships: {
        Row: {
          created_at: string
          department_key: string
          dept_role: string
          id: string
          resort_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          department_key: string
          dept_role: string
          id?: string
          resort_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          department_key?: string
          dept_role?: string
          id?: string
          resort_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_memberships_resort_id_fkey"
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
          created_at: string
          expires_at: string
          guest_id: string
          id: string
          ip_address: string | null
          last_used_at: string | null
          resort_id: string
          token_hash: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string
          guest_id: string
          id?: string
          ip_address?: string | null
          last_used_at?: string | null
          resort_id: string
          token_hash: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          guest_id?: string
          id?: string
          ip_address?: string | null
          last_used_at?: string | null
          resort_id?: string
          token_hash?: string
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
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          created_at: string
          department: string | null
          full_name: string | null
          global_role: Database["public"]["Enums"]["global_role"]
          id: string
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
          department?: string | null
          full_name?: string | null
          global_role?: Database["public"]["Enums"]["global_role"]
          id: string
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
          department?: string | null
          full_name?: string | null
          global_role?: Database["public"]["Enums"]["global_role"]
          id?: string
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
          created_at: string
          default_priority: string
          department_key: string
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
          created_at?: string
          default_priority?: string
          department_key: string
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
          created_at?: string
          default_priority?: string
          department_key?: string
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
          brand_theme: string | null
          brand_wordmark: string | null
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
          pricing_charges: Json
          status: Database["public"]["Enums"]["resort_status"]
          subscription_expires_at: string | null
          subscription_started_at: string | null
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          timezone: string
          updated_at: string
        }
        Insert: {
          brand_theme?: string | null
          brand_wordmark?: string | null
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
          pricing_charges?: Json
          status?: Database["public"]["Enums"]["resort_status"]
          subscription_expires_at?: string | null
          subscription_started_at?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          timezone?: string
          updated_at?: string
        }
        Update: {
          brand_theme?: string | null
          brand_wordmark?: string | null
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
      service_request_events: {
        Row: {
          actor_guest_id: string | null
          actor_user_id: string | null
          event_at: string
          event_type: string
          id: string
          meta: Json
          request_id: string
          resort_id: string
        }
        Insert: {
          actor_guest_id?: string | null
          actor_user_id?: string | null
          event_at?: string
          event_type: string
          id?: string
          meta?: Json
          request_id: string
          resort_id: string
        }
        Update: {
          actor_guest_id?: string | null
          actor_user_id?: string | null
          event_at?: string
          event_type?: string
          id?: string
          meta?: Json
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
    }
    Functions: {
      accept_staff_invitation: {
        Args: { p_token: string; p_user_id: string }
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
      admin_remove_resort_member: {
        Args: { p_resort_id: string; p_user_id: string }
        Returns: boolean
      }
      admin_reset_staff_password: {
        Args: { p_new_password: string; p_user_id: string }
        Returns: Json
      }
      archive_closed_requests: { Args: never; Returns: Json }
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
      cancel_activity_booking_safe: {
        Args: {
          p_booking_id: string
          p_cancelled_by_user_id?: string
          p_expected_version?: number
        }
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
      complete_prearrival_checkin: {
        Args: {
          p_esignature_name?: string
          p_policy_acknowledged?: boolean
          p_token: string
        }
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
      create_service_request_bundle: { Args: { payload: Json }; Returns: Json }
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
      enqueue_event: {
        Args: { p_event_type: string; p_payload: Json; p_resort_id: string }
        Returns: string
      }
      generate_guest_pin: { Args: { p_guest_id: string }; Returns: Json }
      generate_prearrival_token: { Args: { p_guest_id: string }; Returns: Json }
      get_booking_attendees: {
        Args: {
          p_activity_booking_id?: string
          p_restaurant_reservation_id?: string
        }
        Returns: Json
      }
      get_demo_workspace_by_email: { Args: { p_email: string }; Returns: Json }
      get_effective_retention: {
        Args: { _dept_key: string; _resort_id: string }
        Returns: {
          archive_after_days: number
          delete_after_days: number
        }[]
      }
      get_guest_session: {
        Args: never
        Returns: {
          guest_id: string
          resort_id: string
        }[]
      }
      get_or_create_loyalty_member: {
        Args: { p_guest_id: string; p_resort_id: string }
        Returns: string
      }
      get_or_create_prearrival_profile: {
        Args: { p_guest_id: string }
        Returns: string
      }
      get_resort_by_id: { Args: { p_resort_id: string }; Returns: Json }
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
          department_key: string
          icon_key: string
          id: string
          is_billable: boolean
          title: string
        }[]
      }
      guest_get_restaurants: { Args: { p_resort_id: string }; Returns: Json }
      guest_get_room_bookings: { Args: { p_guest_id: string }; Returns: Json }
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
      is_guest_session: { Args: never; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      is_vendor_for_booking: {
        Args: { p_booking_id: string; p_user_id: string }
        Returns: boolean
      }
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
      purge_archived_requests: { Args: never; Returns: Json }
      regenerate_prearrival_link: {
        Args: { p_guest_id: string }
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
      remove_user_role: {
        Args: { p_resort_id: string; p_role_id: string; p_user_id: string }
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
      revoke_prearrival_link: { Args: { p_link_id: string }; Returns: Json }
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
      staff_can_write_resort: {
        Args: {
          _resort_id: string
          _roles: Database["public"]["Enums"]["resort_role"][]
          _user_id: string
        }
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
      update_staff_username: {
        Args: { p_new_username: string; p_user_id: string }
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
      user_has_permission: {
        Args: {
          p_permission_key: string
          p_resort_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      utc_to_resort_tz: {
        Args: { p_resort_id: string; p_timestamp: string }
        Returns: string
      }
      validate_demo_login_token: { Args: { p_token: string }; Returns: Json }
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
      resort_status: "ACTIVE" | "INACTIVE" | "DEMO"
      resource_type: "BOAT" | "VAN" | "CABANA" | "OTHER"
      session_status: "SCHEDULED" | "CANCELLED" | "COMPLETED"
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
      ],
      resort_status: ["ACTIVE", "INACTIVE", "DEMO"],
      resource_type: ["BOAT", "VAN", "CABANA", "OTHER"],
      session_status: ["SCHEDULED", "CANCELLED", "COMPLETED"],
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
