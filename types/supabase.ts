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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_profile_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          target_id: string | null
          target_table: string | null
        }
        Insert: {
          action: string
          actor_profile_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_table?: string | null
        }
        Update: {
          action?: string
          actor_profile_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_table?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          approved_at: string | null
          approved_by: string | null
          city: string | null
          contact_email: string
          contact_phone: string | null
          country: string | null
          created_at: string
          id: string
          logo_path: string | null
          name: string
          postal_code: string | null
          profile_id: string
          region: string | null
          rejected_reason: string | null
          slug: string
          status: Database["public"]["Enums"]["company_status"]
          updated_at: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          approved_at?: string | null
          approved_by?: string | null
          city?: string | null
          contact_email: string
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          id?: string
          logo_path?: string | null
          name: string
          postal_code?: string | null
          profile_id: string
          region?: string | null
          rejected_reason?: string | null
          slug: string
          status?: Database["public"]["Enums"]["company_status"]
          updated_at?: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          approved_at?: string | null
          approved_by?: string | null
          city?: string | null
          contact_email?: string
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          id?: string
          logo_path?: string | null
          name?: string
          postal_code?: string | null
          profile_id?: string
          region?: string | null
          rejected_reason?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["company_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          about_text: string | null
          admin_commission_pct: number
          company_id: string
          custom_css: string | null
          default_is_attendees_required: boolean | null
          default_is_cash_allowed: boolean | null
          default_is_donation_allowed: boolean | null
          default_is_enable_donation: boolean | null
          default_is_show_address: boolean | null
          default_is_show_app_fee: boolean | null
          default_is_show_regulation: boolean | null
          default_is_show_stripe: boolean | null
          donation_excluded_from_commission: boolean
          facebook_url: string | null
          font_family: string | null
          hero_image_path: string | null
          instagram_url: string | null
          platform_fee_pct: number | null
          platform_fee_text: string | null
          primary_color: string | null
          secondary_color: string | null
          step_1_title: string | null
          step_2_title: string | null
          step_3_title: string | null
          step_4_title: string | null
          step_5_title: string | null
          twitter_url: string | null
          updated_at: string
          website_url: string | null
          youtube_url: string | null
        }
        Insert: {
          about_text?: string | null
          admin_commission_pct?: number
          company_id: string
          custom_css?: string | null
          default_is_attendees_required?: boolean | null
          default_is_cash_allowed?: boolean | null
          default_is_donation_allowed?: boolean | null
          default_is_enable_donation?: boolean | null
          default_is_show_address?: boolean | null
          default_is_show_app_fee?: boolean | null
          default_is_show_regulation?: boolean | null
          default_is_show_stripe?: boolean | null
          donation_excluded_from_commission?: boolean
          facebook_url?: string | null
          font_family?: string | null
          hero_image_path?: string | null
          instagram_url?: string | null
          platform_fee_pct?: number | null
          platform_fee_text?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          step_1_title?: string | null
          step_2_title?: string | null
          step_3_title?: string | null
          step_4_title?: string | null
          step_5_title?: string | null
          twitter_url?: string | null
          updated_at?: string
          website_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          about_text?: string | null
          admin_commission_pct?: number
          company_id?: string
          custom_css?: string | null
          default_is_attendees_required?: boolean | null
          default_is_cash_allowed?: boolean | null
          default_is_donation_allowed?: boolean | null
          default_is_enable_donation?: boolean | null
          default_is_show_address?: boolean | null
          default_is_show_app_fee?: boolean | null
          default_is_show_regulation?: boolean | null
          default_is_show_stripe?: boolean | null
          donation_excluded_from_commission?: boolean
          facebook_url?: string | null
          font_family?: string | null
          hero_image_path?: string | null
          instagram_url?: string | null
          platform_fee_pct?: number | null
          platform_fee_text?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          step_1_title?: string | null
          step_2_title?: string | null
          step_3_title?: string | null
          step_4_title?: string | null
          step_5_title?: string | null
          twitter_url?: string | null
          updated_at?: string
          website_url?: string | null
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "public_company_profile"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "company_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "public_events_view"
            referencedColumns: ["company_id"]
          },
        ]
      }
      donation_fields: {
        Row: {
          allow_custom_amount: boolean
          created_at: string
          description: string | null
          event_id: string
          id: string
          is_active: boolean
          sort_order: number
          suggested_amount: number | null
          title: string
        }
        Insert: {
          allow_custom_amount?: boolean
          created_at?: string
          description?: string | null
          event_id: string
          id?: string
          is_active?: boolean
          sort_order?: number
          suggested_amount?: number | null
          title: string
        }
        Update: {
          allow_custom_amount?: boolean
          created_at?: string
          description?: string | null
          event_id?: string
          id?: string
          is_active?: boolean
          sort_order?: number
          suggested_amount?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "donation_fields_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donation_fields_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "public_events_view"
            referencedColumns: ["id"]
          },
        ]
      }
      donations: {
        Row: {
          amount: number
          created_at: string
          donation_field_id: string | null
          id: string
          registration_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          donation_field_id?: string | null
          id?: string
          registration_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          donation_field_id?: string | null
          id?: string
          registration_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "donations_donation_field_id_fkey"
            columns: ["donation_field_id"]
            isOneToOne: false
            referencedRelation: "donation_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_donation_field_id_fkey"
            columns: ["donation_field_id"]
            isOneToOne: false
            referencedRelation: "public_donation_fields_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body_html: string
          company_id: string | null
          id: string
          is_active: boolean
          kind: Database["public"]["Enums"]["email_template_kind"]
          subject: string
          updated_at: string
        }
        Insert: {
          body_html: string
          company_id?: string | null
          id?: string
          is_active?: boolean
          kind: Database["public"]["Enums"]["email_template_kind"]
          subject: string
          updated_at?: string
        }
        Update: {
          body_html?: string
          company_id?: string | null
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["email_template_kind"]
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "public_company_profile"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "email_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "public_events_view"
            referencedColumns: ["company_id"]
          },
        ]
      }
      events: {
        Row: {
          company_id: string | null
          cover_image_path: string | null
          created_at: string
          description: string | null
          end_date: string
          id: string
          is_master_template: boolean
          override_is_attendees_required: boolean | null
          override_is_cash_allowed: boolean | null
          override_is_donation_allowed: boolean | null
          override_is_enable_donation: boolean | null
          override_is_show_address: boolean | null
          override_is_show_app_fee: boolean | null
          override_is_show_regulation: boolean | null
          override_is_show_stripe: boolean | null
          slug: string
          source: Database["public"]["Enums"]["event_source"]
          start_date: string
          status: Database["public"]["Enums"]["event_status"]
          template_id: string | null
          timezone: string
          title: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          cover_image_path?: string | null
          created_at?: string
          description?: string | null
          end_date: string
          id?: string
          is_master_template?: boolean
          override_is_attendees_required?: boolean | null
          override_is_cash_allowed?: boolean | null
          override_is_donation_allowed?: boolean | null
          override_is_enable_donation?: boolean | null
          override_is_show_address?: boolean | null
          override_is_show_app_fee?: boolean | null
          override_is_show_regulation?: boolean | null
          override_is_show_stripe?: boolean | null
          slug: string
          source?: Database["public"]["Enums"]["event_source"]
          start_date: string
          status?: Database["public"]["Enums"]["event_status"]
          template_id?: string | null
          timezone?: string
          title: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          cover_image_path?: string | null
          created_at?: string
          description?: string | null
          end_date?: string
          id?: string
          is_master_template?: boolean
          override_is_attendees_required?: boolean | null
          override_is_cash_allowed?: boolean | null
          override_is_donation_allowed?: boolean | null
          override_is_enable_donation?: boolean | null
          override_is_show_address?: boolean | null
          override_is_show_app_fee?: boolean | null
          override_is_show_regulation?: boolean | null
          override_is_show_stripe?: boolean | null
          slug?: string
          source?: Database["public"]["Enums"]["event_source"]
          start_date?: string
          status?: Database["public"]["Enums"]["event_status"]
          template_id?: string | null
          timezone?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "public_company_profile"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "public_events_view"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "events_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "public_events_view"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_line_items: {
        Row: {
          created_at: string
          guest_id: string
          id: string
          line_total: number
          product_id: string
          quantity: number
          sub_event_id: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          guest_id: string
          id?: string
          line_total: number
          product_id: string
          quantity?: number
          sub_event_id: string
          unit_price: number
        }
        Update: {
          created_at?: string
          guest_id?: string
          id?: string
          line_total?: number
          product_id?: string
          quantity?: number
          sub_event_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "guest_line_items_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_line_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_line_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_line_items_sub_event_id_fkey"
            columns: ["sub_event_id"]
            isOneToOne: false
            referencedRelation: "public_sub_events_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_line_items_sub_event_id_fkey"
            columns: ["sub_event_id"]
            isOneToOne: false
            referencedRelation: "sub_events"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_payments: {
        Row: {
          amount: number
          application_fee_amount: number | null
          cleared_at: string | null
          cleared_by: string | null
          created_at: string
          currency: string
          failure_reason: string | null
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          registration_id: string
          status: Database["public"]["Enums"]["payment_status"]
          stripe_charge_id: string | null
          stripe_payment_intent_id: string | null
          stripe_transfer_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          application_fee_amount?: number | null
          cleared_at?: string | null
          cleared_by?: string | null
          created_at?: string
          currency?: string
          failure_reason?: string | null
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          registration_id: string
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_transfer_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          application_fee_amount?: number | null
          cleared_at?: string | null
          cleared_by?: string | null
          created_at?: string
          currency?: string
          failure_reason?: string | null
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          registration_id?: string
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_transfer_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_payments_cleared_by_fkey"
            columns: ["cleared_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_payments_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      guests: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          registration_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          phone?: string | null
          registration_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          registration_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guests_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      otp_verifications: {
        Row: {
          attempt_count: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          profile_id: string
          purpose: Database["public"]["Enums"]["otp_purpose"]
        }
        Insert: {
          attempt_count?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          profile_id: string
          purpose: Database["public"]["Enums"]["otp_purpose"]
        }
        Update: {
          attempt_count?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          profile_id?: string
          purpose?: Database["public"]["Enums"]["otp_purpose"]
        }
        Relationships: [
          {
            foreignKeyName: "otp_verifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          default_commission_pct: number
          default_is_attendees_required: boolean
          default_is_cash_allowed: boolean
          default_is_donation_allowed: boolean
          default_is_enable_donation: boolean
          default_is_show_address: boolean
          default_is_show_app_fee: boolean
          default_is_show_regulation: boolean
          default_is_show_stripe: boolean
          id: boolean
          platform_fee_pct: number
          platform_fee_text: string | null
          support_email: string | null
          updated_at: string
        }
        Insert: {
          default_commission_pct?: number
          default_is_attendees_required?: boolean
          default_is_cash_allowed?: boolean
          default_is_donation_allowed?: boolean
          default_is_enable_donation?: boolean
          default_is_show_address?: boolean
          default_is_show_app_fee?: boolean
          default_is_show_regulation?: boolean
          default_is_show_stripe?: boolean
          id?: boolean
          platform_fee_pct?: number
          platform_fee_text?: string | null
          support_email?: string | null
          updated_at?: string
        }
        Update: {
          default_commission_pct?: number
          default_is_attendees_required?: boolean
          default_is_cash_allowed?: boolean
          default_is_donation_allowed?: boolean
          default_is_enable_donation?: boolean
          default_is_show_address?: boolean
          default_is_show_app_fee?: boolean
          default_is_show_regulation?: boolean
          default_is_show_stripe?: boolean
          id?: boolean
          platform_fee_pct?: number
          platform_fee_text?: string | null
          support_email?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          capacity: number | null
          color: string | null
          created_at: string
          currency: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          price: number
          sort_order: number
          sub_event_id: string
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          color?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          price: number
          sort_order?: number
          sub_event_id: string
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          color?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          sort_order?: number
          sub_event_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_sub_event_id_fkey"
            columns: ["sub_event_id"]
            isOneToOne: false
            referencedRelation: "public_sub_events_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_sub_event_id_fkey"
            columns: ["sub_event_id"]
            isOneToOne: false
            referencedRelation: "sub_events"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      registrations: {
        Row: {
          commission_amount: number
          created_at: string
          currency: string
          donation_total: number
          event_id: string
          id: string
          notes: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          platform_fee_amount: number
          primary_guest_email: string
          primary_guest_name: string
          primary_guest_phone: string | null
          status: Database["public"]["Enums"]["registration_status"]
          subtotal: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          commission_amount?: number
          created_at?: string
          currency?: string
          donation_total?: number
          event_id: string
          id?: string
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          platform_fee_amount?: number
          primary_guest_email: string
          primary_guest_name: string
          primary_guest_phone?: string | null
          status?: Database["public"]["Enums"]["registration_status"]
          subtotal?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          commission_amount?: number
          created_at?: string
          currency?: string
          donation_total?: number
          event_id?: string
          id?: string
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          platform_fee_amount?: number
          primary_guest_email?: string
          primary_guest_name?: string
          primary_guest_phone?: string | null
          status?: Database["public"]["Enums"]["registration_status"]
          subtotal?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "public_events_view"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_accounts: {
        Row: {
          charges_enabled: boolean
          company_id: string
          connected_at: string | null
          details_submitted: boolean
          disconnected_at: string | null
          payouts_enabled: boolean
          raw_last_webhook_event: Json | null
          status: Database["public"]["Enums"]["stripe_account_status"]
          stripe_account_id: string | null
          updated_at: string
        }
        Insert: {
          charges_enabled?: boolean
          company_id: string
          connected_at?: string | null
          details_submitted?: boolean
          disconnected_at?: string | null
          payouts_enabled?: boolean
          raw_last_webhook_event?: Json | null
          status?: Database["public"]["Enums"]["stripe_account_status"]
          stripe_account_id?: string | null
          updated_at?: string
        }
        Update: {
          charges_enabled?: boolean
          company_id?: string
          connected_at?: string | null
          details_submitted?: boolean
          disconnected_at?: string | null
          payouts_enabled?: boolean
          raw_last_webhook_event?: Json | null
          status?: Database["public"]["Enums"]["stripe_account_status"]
          stripe_account_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stripe_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "public_company_profile"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "stripe_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "public_events_view"
            referencedColumns: ["company_id"]
          },
        ]
      }
      sub_events: {
        Row: {
          capacity: number | null
          created_at: string
          description: string | null
          end_at: string | null
          event_id: string
          id: string
          is_sunset_relative: boolean
          location: string | null
          sort_order: number
          start_at: string
          sunset_offset_minutes: number | null
          title: string
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          description?: string | null
          end_at?: string | null
          event_id: string
          id?: string
          is_sunset_relative?: boolean
          location?: string | null
          sort_order?: number
          start_at: string
          sunset_offset_minutes?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          created_at?: string
          description?: string | null
          end_at?: string | null
          event_id?: string
          id?: string
          is_sunset_relative?: boolean
          location?: string | null
          sort_order?: number
          start_at?: string
          sunset_offset_minutes?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "public_events_view"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_company_profile: {
        Row: {
          about_text: string | null
          company_id: string | null
          custom_css: string | null
          facebook_url: string | null
          font_family: string | null
          hero_image_path: string | null
          instagram_url: string | null
          logo_path: string | null
          name: string | null
          primary_color: string | null
          secondary_color: string | null
          slug: string | null
          website_url: string | null
        }
        Relationships: []
      }
      public_donation_fields_view: {
        Row: {
          allow_custom_amount: boolean | null
          description: string | null
          event_id: string | null
          id: string | null
          sort_order: number | null
          suggested_amount: number | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "donation_fields_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donation_fields_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "public_events_view"
            referencedColumns: ["id"]
          },
        ]
      }
      public_events_view: {
        Row: {
          company_id: string | null
          company_name: string | null
          company_slug: string | null
          cover_image_path: string | null
          description: string | null
          end_date: string | null
          id: string | null
          slug: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["event_status"] | null
          timezone: string | null
          title: string | null
        }
        Relationships: []
      }
      public_products_view: {
        Row: {
          capacity: number | null
          currency: string | null
          description: string | null
          id: string | null
          name: string | null
          price: number | null
          sort_order: number | null
          sub_event_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_sub_event_id_fkey"
            columns: ["sub_event_id"]
            isOneToOne: false
            referencedRelation: "public_sub_events_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_sub_event_id_fkey"
            columns: ["sub_event_id"]
            isOneToOne: false
            referencedRelation: "sub_events"
            referencedColumns: ["id"]
          },
        ]
      }
      public_sub_events_view: {
        Row: {
          capacity: number | null
          description: string | null
          end_at: string | null
          event_id: string | null
          id: string | null
          is_sunset_relative: boolean | null
          location: string | null
          sort_order: number | null
          start_at: string | null
          sunset_offset_minutes: number | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sub_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "public_events_view"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      approve_or_reject_company: {
        Args: {
          p_approve: boolean
          p_company_id: string
          p_rejected_reason: string
        }
        Returns: undefined
      }
      create_event_with_children: {
        Args: {
          p_advance?: Json
          p_company_id: string
          p_cover_image_path: string
          p_description: string
          p_end_date: string
          p_slug: string
          p_start_date: string
          p_sub_events: Json
          p_timezone: string
          p_title: string
        }
        Returns: string
      }
      flip_ended_events: { Args: never; Returns: undefined }
      get_dashboard_kpis: { Args: never; Returns: Json }
      is_admin: { Args: never; Returns: boolean }
      my_company_id: { Args: never; Returns: string }
      register_guest_for_event: {
        Args: {
          p_donations: Json
          p_event_id: string
          p_guests: Json
          p_payment_method: Database["public"]["Enums"]["payment_method"]
          p_primary_guest_email: string
          p_primary_guest_name: string
          p_primary_guest_phone: string
        }
        Returns: {
          currency: string
          registration_id: string
          total_amount: number
        }[]
      }
      resolve_event_advance_settings: {
        Args: { p_event_id: string }
        Returns: {
          is_attendees_required: boolean
          is_cash_allowed: boolean
          is_donation_allowed: boolean
          is_enable_donation: boolean
          is_show_address: boolean
          is_show_app_fee: boolean
          is_show_regulation: boolean
          is_show_stripe: boolean
          platform_fee_pct: number
          platform_fee_text: string
        }[]
      }
      update_event_with_children: {
        Args: {
          p_advance?: Json
          p_cover_image_path: string
          p_description: string
          p_end_date: string
          p_event_id: string
          p_slug: string
          p_start_date: string
          p_sub_events: Json
          p_timezone: string
          p_title: string
        }
        Returns: undefined
      }
      verify_and_consume_otp: {
        Args: {
          p_code: string
          p_purpose: Database["public"]["Enums"]["otp_purpose"]
        }
        Returns: boolean
      }
    }
    Enums: {
      company_status: "pending" | "active" | "suspended" | "rejected"
      email_template_kind:
        | "registration_confirmation"
        | "thank_you"
        | "company_signup"
        | "company_approved"
        | "company_rejected"
        | "otp_code"
      event_source: "standalone" | "published_from_template"
      event_status: "draft" | "active" | "ended" | "cancelled"
      otp_purpose:
        | "change_stripe_keys"
        | "change_commission_rate"
        | "change_password"
        | "change_email"
      payment_method: "card" | "cash"
      payment_status:
        | "pending"
        | "requires_action"
        | "processing"
        | "succeeded"
        | "failed"
        | "cancelled"
        | "cleared_manually"
      registration_status: "pending" | "confirmed" | "cancelled" | "refunded"
      stripe_account_status:
        | "not_connected"
        | "onboarding"
        | "restricted"
        | "active"
        | "disabled"
      user_role: "admin" | "company" | "client"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      company_status: ["pending", "active", "suspended", "rejected"],
      email_template_kind: [
        "registration_confirmation",
        "thank_you",
        "company_signup",
        "company_approved",
        "company_rejected",
        "otp_code",
      ],
      event_source: ["standalone", "published_from_template"],
      event_status: ["draft", "active", "ended", "cancelled"],
      otp_purpose: [
        "change_stripe_keys",
        "change_commission_rate",
        "change_password",
        "change_email",
      ],
      payment_method: ["card", "cash"],
      payment_status: [
        "pending",
        "requires_action",
        "processing",
        "succeeded",
        "failed",
        "cancelled",
        "cleared_manually",
      ],
      registration_status: ["pending", "confirmed", "cancelled", "refunded"],
      stripe_account_status: [
        "not_connected",
        "onboarding",
        "restricted",
        "active",
        "disabled",
      ],
      user_role: ["admin", "company", "client"],
    },
  },
} as const
