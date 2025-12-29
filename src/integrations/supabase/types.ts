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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: unknown
          metadata: Json | null
          new_values: Json | null
          old_values: Json | null
          tenant_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          tenant_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          tenant_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_analytics: {
        Row: {
          agent_id: string
          avg_response_time_ms: number | null
          conversations_closed: number | null
          conversations_started: number | null
          created_at: string | null
          date: string
          id: string
          messages_received: number | null
          messages_sent: number | null
          negative_count: number | null
          neutral_count: number | null
          positive_count: number | null
          tenant_id: string
          tokens_used: number | null
          transfers_to_human: number | null
        }
        Insert: {
          agent_id: string
          avg_response_time_ms?: number | null
          conversations_closed?: number | null
          conversations_started?: number | null
          created_at?: string | null
          date: string
          id?: string
          messages_received?: number | null
          messages_sent?: number | null
          negative_count?: number | null
          neutral_count?: number | null
          positive_count?: number | null
          tenant_id: string
          tokens_used?: number | null
          transfers_to_human?: number | null
        }
        Update: {
          agent_id?: string
          avg_response_time_ms?: number | null
          conversations_closed?: number | null
          conversations_started?: number | null
          created_at?: string | null
          date?: string
          id?: string
          messages_received?: number | null
          messages_sent?: number | null
          negative_count?: number | null
          neutral_count?: number | null
          positive_count?: number | null
          tenant_id?: string
          tokens_used?: number | null
          transfers_to_human?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_analytics_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_analytics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_analytics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          auto_transfer_keywords: string[] | null
          avatar_url: string | null
          avg_response_time_ms: number | null
          business_hours: Json | null
          context_window: number | null
          created_at: string | null
          description: string | null
          fallback_message: string | null
          id: string
          max_tokens: number | null
          model: string | null
          n8n_workflow_id: string | null
          name: string
          out_of_hours_message: string | null
          status: string | null
          system_prompt: string
          temperature: number | null
          tenant_id: string
          total_conversations: number | null
          total_messages: number | null
          transfer_message: string | null
          typing_delay_ms: number | null
          updated_at: string | null
          webhook_url: string | null
          welcome_message: string | null
        }
        Insert: {
          auto_transfer_keywords?: string[] | null
          avatar_url?: string | null
          avg_response_time_ms?: number | null
          business_hours?: Json | null
          context_window?: number | null
          created_at?: string | null
          description?: string | null
          fallback_message?: string | null
          id?: string
          max_tokens?: number | null
          model?: string | null
          n8n_workflow_id?: string | null
          name: string
          out_of_hours_message?: string | null
          status?: string | null
          system_prompt: string
          temperature?: number | null
          tenant_id: string
          total_conversations?: number | null
          total_messages?: number | null
          transfer_message?: string | null
          typing_delay_ms?: number | null
          updated_at?: string | null
          webhook_url?: string | null
          welcome_message?: string | null
        }
        Update: {
          auto_transfer_keywords?: string[] | null
          avatar_url?: string | null
          avg_response_time_ms?: number | null
          business_hours?: Json | null
          context_window?: number | null
          created_at?: string | null
          description?: string | null
          fallback_message?: string | null
          id?: string
          max_tokens?: number | null
          model?: string | null
          n8n_workflow_id?: string | null
          name?: string
          out_of_hours_message?: string | null
          status?: string | null
          system_prompt?: string
          temperature?: number | null
          tenant_id?: string
          total_conversations?: number | null
          total_messages?: number | null
          transfer_message?: string | null
          typing_delay_ms?: number | null
          updated_at?: string | null
          webhook_url?: string | null
          welcome_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          permissions: string[] | null
          status: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          permissions?: string[] | null
          status?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          permissions?: string[] | null
          status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_keys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          agent_id: string | null
          closed_at: string | null
          contact_name: string | null
          contact_photo_url: string | null
          context: Json | null
          created_at: string | null
          id: string
          is_bot_active: boolean | null
          last_message_at: string | null
          phone: string
          sentiment: string | null
          started_at: string | null
          status: string | null
          tags: string[] | null
          tenant_id: string
          transferred_to: string | null
          updated_at: string | null
        }
        Insert: {
          agent_id?: string | null
          closed_at?: string | null
          contact_name?: string | null
          contact_photo_url?: string | null
          context?: Json | null
          created_at?: string | null
          id?: string
          is_bot_active?: boolean | null
          last_message_at?: string | null
          phone: string
          sentiment?: string | null
          started_at?: string | null
          status?: string | null
          tags?: string[] | null
          tenant_id: string
          transferred_to?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string | null
          closed_at?: string | null
          contact_name?: string | null
          contact_photo_url?: string | null
          context?: Json | null
          created_at?: string | null
          id?: string
          is_bot_active?: boolean | null
          last_message_at?: string | null
          phone?: string
          sentiment?: string | null
          started_at?: string | null
          status?: string | null
          tags?: string[] | null
          tenant_id?: string
          transferred_to?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_logs: {
        Row: {
          created_at: string
          details: Json | null
          event_type: string
          id: string
          integration_type: string
          message: string
          status: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          event_type: string
          id?: string
          integration_type: string
          message: string
          status: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
          integration_type?: string
          message?: string
          status?: string
          tenant_id?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: string
          tenant_id: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          tenant_id: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          tenant_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          content_type: string | null
          conversation_id: string
          created_at: string | null
          delivery_status: string | null
          id: string
          is_edited: boolean | null
          is_from_bot: boolean | null
          media_url: string | null
          model_used: string | null
          response_time_ms: number | null
          role: string
          tokens_used: number | null
          zapi_message_id: string | null
        }
        Insert: {
          content: string
          content_type?: string | null
          conversation_id: string
          created_at?: string | null
          delivery_status?: string | null
          id?: string
          is_edited?: boolean | null
          is_from_bot?: boolean | null
          media_url?: string | null
          model_used?: string | null
          response_time_ms?: number | null
          role: string
          tokens_used?: number | null
          zapi_message_id?: string | null
        }
        Update: {
          content?: string
          content_type?: string | null
          conversation_id?: string
          created_at?: string | null
          delivery_status?: string | null
          id?: string
          is_edited?: boolean | null
          is_from_bot?: boolean | null
          media_url?: string | null
          model_used?: string | null
          response_time_ms?: number | null
          role?: string
          tokens_used?: number | null
          zapi_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          metadata: Json | null
          read: boolean
          tenant_id: string
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          read?: boolean
          tenant_id: string
          title: string
          type?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          read?: boolean
          tenant_id?: string
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      super_admins: {
        Row: {
          created_at: string
          created_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tenant_users: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          id: string
          invited_at: string | null
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          status: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          status?: string | null
          tenant_id: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          status?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string | null
          id: string
          logo_url: string | null
          max_agents: number | null
          max_messages_month: number | null
          n8n_api_key: string | null
          n8n_webhook_base: string | null
          name: string
          plan: string | null
          settings: Json | null
          slug: string
          status: string | null
          updated_at: string | null
          zapi_instance_id: string | null
          zapi_token: string | null
          zapi_webhook_url: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
          max_agents?: number | null
          max_messages_month?: number | null
          n8n_api_key?: string | null
          n8n_webhook_base?: string | null
          name: string
          plan?: string | null
          settings?: Json | null
          slug: string
          status?: string | null
          updated_at?: string | null
          zapi_instance_id?: string | null
          zapi_token?: string | null
          zapi_webhook_url?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
          max_agents?: number | null
          max_messages_month?: number | null
          n8n_api_key?: string | null
          n8n_webhook_base?: string | null
          name?: string
          plan?: string | null
          settings?: Json | null
          slug?: string
          status?: string | null
          updated_at?: string | null
          zapi_instance_id?: string | null
          zapi_token?: string | null
          zapi_webhook_url?: string | null
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          permission: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          permission: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          permission?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      activity_logs_secure: {
        Row: {
          action: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string | null
          ip_address: string | null
          metadata: Json | null
          new_values: Json | null
          old_values: Json | null
          tenant_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string | null
          ip_address?: never
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          tenant_id?: string | null
          user_agent?: never
          user_id?: string | null
        }
        Update: {
          action?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string | null
          ip_address?: never
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          tenant_id?: string | null
          user_agent?: never
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys_secure: {
        Row: {
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string | null
          key_prefix: string | null
          last_used_at: string | null
          name: string | null
          permissions: string[] | null
          status: string | null
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string | null
          key_prefix?: string | null
          last_used_at?: string | null
          name?: string | null
          permissions?: string[] | null
          status?: string | null
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string | null
          key_prefix?: string | null
          last_used_at?: string | null
          name?: string | null
          permissions?: string[] | null
          status?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_keys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations_secure: {
        Row: {
          agent_id: string | null
          closed_at: string | null
          contact_name: string | null
          contact_photo_url: string | null
          context: Json | null
          created_at: string | null
          id: string | null
          is_bot_active: boolean | null
          last_message_at: string | null
          phone: string | null
          sentiment: string | null
          started_at: string | null
          status: string | null
          tags: string[] | null
          tenant_id: string | null
          transferred_to: string | null
          updated_at: string | null
        }
        Insert: {
          agent_id?: string | null
          closed_at?: string | null
          contact_name?: string | null
          contact_photo_url?: string | null
          context?: Json | null
          created_at?: string | null
          id?: string | null
          is_bot_active?: boolean | null
          last_message_at?: string | null
          phone?: never
          sentiment?: string | null
          started_at?: string | null
          status?: string | null
          tags?: string[] | null
          tenant_id?: string | null
          transferred_to?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string | null
          closed_at?: string | null
          contact_name?: string | null
          contact_photo_url?: string | null
          context?: Json | null
          created_at?: string | null
          id?: string | null
          is_bot_active?: boolean | null
          last_message_at?: string | null
          phone?: never
          sentiment?: string | null
          started_at?: string | null
          status?: string | null
          tags?: string[] | null
          tenant_id?: string | null
          transferred_to?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations_secure: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          email: string | null
          expires_at: string | null
          id: string | null
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          status: string | null
          tenant_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string | null
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          status?: string | null
          tenant_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string | null
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          status?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants_secure: {
        Row: {
          created_at: string | null
          id: string | null
          logo_url: string | null
          max_agents: number | null
          max_messages_month: number | null
          n8n_api_key: string | null
          n8n_webhook_base: string | null
          name: string | null
          plan: string | null
          settings: Json | null
          slug: string | null
          status: string | null
          updated_at: string | null
          zapi_instance_id: string | null
          zapi_token: string | null
          zapi_webhook_url: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          logo_url?: string | null
          max_agents?: number | null
          max_messages_month?: number | null
          n8n_api_key?: never
          n8n_webhook_base?: never
          name?: string | null
          plan?: string | null
          settings?: Json | null
          slug?: string | null
          status?: string | null
          updated_at?: string | null
          zapi_instance_id?: never
          zapi_token?: never
          zapi_webhook_url?: never
        }
        Update: {
          created_at?: string | null
          id?: string | null
          logo_url?: string | null
          max_agents?: number | null
          max_messages_month?: number | null
          n8n_api_key?: never
          n8n_webhook_base?: never
          name?: string | null
          plan?: string | null
          settings?: Json | null
          slug?: string | null
          status?: string | null
          updated_at?: string | null
          zapi_instance_id?: never
          zapi_token?: never
          zapi_webhook_url?: never
        }
        Relationships: []
      }
    }
    Functions: {
      get_user_tenant_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: never; Returns: boolean }
      is_tenant_admin: { Args: { p_tenant_id: string }; Returns: boolean }
      is_tenant_member: { Args: { p_tenant_id: string }; Returns: boolean }
      user_has_permission: {
        Args: { p_permission: string; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "owner" | "admin" | "member" | "viewer"
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
      app_role: ["owner", "admin", "member", "viewer"],
    },
  },
} as const
