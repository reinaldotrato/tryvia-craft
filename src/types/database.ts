export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type AppRole = 'admin' | 'moderator' | 'user'
export type TenantPlan = 'starter' | 'pro' | 'enterprise'
export type TenantStatus = 'active' | 'inactive' | 'suspended'
export type TenantUserRole = 'owner' | 'admin' | 'member' | 'viewer'
export type TenantUserStatus = 'pending' | 'active' | 'inactive'
export type AgentModel = 'gpt-4o' | 'gpt-4o-mini' | 'gpt-4-turbo' | 'claude-3-sonnet' | 'claude-3-haiku'
export type AgentStatus = 'draft' | 'active' | 'paused' | 'archived'
export type ConversationStatus = 'active' | 'waiting' | 'transferred' | 'closed'
export type MessageRole = 'user' | 'assistant' | 'system'
export type ContentType = 'text' | 'image' | 'audio' | 'document' | 'location'
export type DeliveryStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
export type Sentiment = 'positive' | 'neutral' | 'negative'
export type ApiKeyStatus = 'active' | 'revoked'

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
          plan: TenantPlan
          zapi_instance_id: string | null
          zapi_token: string | null
          zapi_webhook_url: string | null
          n8n_webhook_base: string | null
          n8n_api_key: string | null
          max_agents: number
          max_messages_month: number
          settings: Json
          status: TenantStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          logo_url?: string | null
          plan?: TenantPlan
          zapi_instance_id?: string | null
          zapi_token?: string | null
          zapi_webhook_url?: string | null
          n8n_webhook_base?: string | null
          n8n_api_key?: string | null
          max_agents?: number
          max_messages_month?: number
          settings?: Json
          status?: TenantStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          logo_url?: string | null
          plan?: TenantPlan
          zapi_instance_id?: string | null
          zapi_token?: string | null
          zapi_webhook_url?: string | null
          n8n_webhook_base?: string | null
          n8n_api_key?: string | null
          max_agents?: number
          max_messages_month?: number
          settings?: Json
          status?: TenantStatus
          created_at?: string
          updated_at?: string
        }
      }
      tenant_users: {
        Row: {
          id: string
          tenant_id: string
          user_id: string
          role: TenantUserRole
          invited_by: string | null
          invited_at: string | null
          accepted_at: string | null
          status: TenantUserStatus
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          user_id: string
          role?: TenantUserRole
          invited_by?: string | null
          invited_at?: string | null
          accepted_at?: string | null
          status?: TenantUserStatus
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          user_id?: string
          role?: TenantUserRole
          invited_by?: string | null
          invited_at?: string | null
          accepted_at?: string | null
          status?: TenantUserStatus
          created_at?: string
        }
      }
      agents: {
        Row: {
          id: string
          tenant_id: string
          name: string
          description: string | null
          avatar_url: string | null
          model: AgentModel
          system_prompt: string
          temperature: number
          max_tokens: number
          welcome_message: string
          fallback_message: string
          transfer_message: string
          context_window: number
          typing_delay_ms: number
          auto_transfer_keywords: string[] | null
          n8n_workflow_id: string | null
          webhook_url: string | null
          business_hours: Json
          out_of_hours_message: string
          total_conversations: number
          total_messages: number
          avg_response_time_ms: number
          status: AgentStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          description?: string | null
          avatar_url?: string | null
          model?: AgentModel
          system_prompt: string
          temperature?: number
          max_tokens?: number
          welcome_message?: string
          fallback_message?: string
          transfer_message?: string
          context_window?: number
          typing_delay_ms?: number
          auto_transfer_keywords?: string[] | null
          n8n_workflow_id?: string | null
          webhook_url?: string | null
          business_hours?: Json
          out_of_hours_message?: string
          total_conversations?: number
          total_messages?: number
          avg_response_time_ms?: number
          status?: AgentStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          description?: string | null
          avatar_url?: string | null
          model?: AgentModel
          system_prompt?: string
          temperature?: number
          max_tokens?: number
          welcome_message?: string
          fallback_message?: string
          transfer_message?: string
          context_window?: number
          typing_delay_ms?: number
          auto_transfer_keywords?: string[] | null
          n8n_workflow_id?: string | null
          webhook_url?: string | null
          business_hours?: Json
          out_of_hours_message?: string
          total_conversations?: number
          total_messages?: number
          avg_response_time_ms?: number
          status?: AgentStatus
          created_at?: string
          updated_at?: string
        }
      }
      conversations: {
        Row: {
          id: string
          tenant_id: string
          agent_id: string | null
          phone: string
          contact_name: string | null
          contact_photo_url: string | null
          status: ConversationStatus
          is_bot_active: boolean
          transferred_to: string | null
          context: Json
          tags: string[] | null
          sentiment: Sentiment | null
          last_message_at: string
          started_at: string
          closed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          agent_id?: string | null
          phone: string
          contact_name?: string | null
          contact_photo_url?: string | null
          status?: ConversationStatus
          is_bot_active?: boolean
          transferred_to?: string | null
          context?: Json
          tags?: string[] | null
          sentiment?: Sentiment | null
          last_message_at?: string
          started_at?: string
          closed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          agent_id?: string | null
          phone?: string
          contact_name?: string | null
          contact_photo_url?: string | null
          status?: ConversationStatus
          is_bot_active?: boolean
          transferred_to?: string | null
          context?: Json
          tags?: string[] | null
          sentiment?: Sentiment | null
          last_message_at?: string
          started_at?: string
          closed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          role: MessageRole
          content: string
          content_type: ContentType
          media_url: string | null
          tokens_used: number | null
          response_time_ms: number | null
          model_used: string | null
          zapi_message_id: string | null
          delivery_status: DeliveryStatus
          is_from_bot: boolean
          is_edited: boolean
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          role: MessageRole
          content: string
          content_type?: ContentType
          media_url?: string | null
          tokens_used?: number | null
          response_time_ms?: number | null
          model_used?: string | null
          zapi_message_id?: string | null
          delivery_status?: DeliveryStatus
          is_from_bot?: boolean
          is_edited?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          role?: MessageRole
          content?: string
          content_type?: ContentType
          media_url?: string | null
          tokens_used?: number | null
          response_time_ms?: number | null
          model_used?: string | null
          zapi_message_id?: string | null
          delivery_status?: DeliveryStatus
          is_from_bot?: boolean
          is_edited?: boolean
          created_at?: string
        }
      }
      agent_analytics: {
        Row: {
          id: string
          tenant_id: string
          agent_id: string
          date: string
          conversations_started: number
          conversations_closed: number
          messages_received: number
          messages_sent: number
          tokens_used: number
          avg_response_time_ms: number
          transfers_to_human: number
          positive_count: number
          neutral_count: number
          negative_count: number
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          agent_id: string
          date: string
          conversations_started?: number
          conversations_closed?: number
          messages_received?: number
          messages_sent?: number
          tokens_used?: number
          avg_response_time_ms?: number
          transfers_to_human?: number
          positive_count?: number
          neutral_count?: number
          negative_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          agent_id?: string
          date?: string
          conversations_started?: number
          conversations_closed?: number
          messages_received?: number
          messages_sent?: number
          tokens_used?: number
          avg_response_time_ms?: number
          transfers_to_human?: number
          positive_count?: number
          neutral_count?: number
          negative_count?: number
          created_at?: string
        }
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: AppRole
        }
        Insert: {
          id?: string
          user_id: string
          role: AppRole
        }
        Update: {
          id?: string
          user_id?: string
          role?: AppRole
        }
      }
      profiles: {
        Row: {
          id: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Functions: {
      get_user_tenant_id: {
        Args: Record<string, never>
        Returns: string
      }
      has_role: {
        Args: {
          _user_id: string
          _role: AppRole
        }
        Returns: boolean
      }
    }
  }
}
