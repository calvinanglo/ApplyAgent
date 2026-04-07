export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          email: string | null
          phone: string | null
          linkedin_url: string | null
          github_url: string | null
          portfolio_url: string | null
          location: string | null
          target_roles: string[]
          salary_min: number | null
          salary_max: number | null
          salary_currency: string
          work_arrangement: string[]
          job_types: string[]
          willing_to_relocate: boolean
          onboarding_completed: boolean
          referral_code: string | null
          referred_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          email?: string | null
          phone?: string | null
          linkedin_url?: string | null
          github_url?: string | null
          portfolio_url?: string | null
          location?: string | null
          target_roles?: string[]
          salary_min?: number | null
          salary_max?: number | null
          salary_currency?: string
          work_arrangement?: string[]
          job_types?: string[]
          willing_to_relocate?: boolean
          onboarding_completed?: boolean
          referral_code?: string | null
          referred_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          email?: string | null
          phone?: string | null
          linkedin_url?: string | null
          github_url?: string | null
          portfolio_url?: string | null
          location?: string | null
          target_roles?: string[]
          salary_min?: number | null
          salary_max?: number | null
          salary_currency?: string
          work_arrangement?: string[]
          job_types?: string[]
          willing_to_relocate?: boolean
          onboarding_completed?: boolean
          referral_code?: string | null
          referred_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      cv_documents: {
        Row: {
          id: string
          user_id: string
          content: string
          version: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          content: string
          version?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          content?: string
          version?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      credit_balances: {
        Row: {
          id: string
          user_id: string
          balance: number
          free_evaluations_used: number
          free_evaluations_reset_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          balance?: number
          free_evaluations_used?: number
          free_evaluations_reset_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          balance?: number
          free_evaluations_used?: number
          free_evaluations_reset_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      credit_transactions: {
        Row: {
          id: string
          user_id: string
          amount: number
          balance_after: number
          type: 'purchase' | 'usage' | 'refund' | 'free_tier'
          action: string | null
          reference_id: string | null
          stripe_session_id: string | null
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          balance_after: number
          type: 'purchase' | 'usage' | 'refund' | 'free_tier'
          action?: string | null
          reference_id?: string | null
          stripe_session_id?: string | null
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          balance_after?: number
          type?: 'purchase' | 'usage' | 'refund' | 'free_tier'
          action?: string | null
          reference_id?: string | null
          stripe_session_id?: string | null
          description?: string | null
          created_at?: string
        }
      }
      applications: {
        Row: {
          id: string
          user_id: string
          sequence_number: number
          company: string
          role: string
          score: number | null
          status: 'Evaluated' | 'Applied' | 'Interview' | 'Offer' | 'Rejected' | 'Withdrawn' | 'Accepted'
          applied_date: string | null
          url: string | null
          notes: string | null
          has_pdf: boolean
          has_cover_letter: boolean
          report_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          sequence_number: number
          company: string
          role: string
          score?: number | null
          status?: 'Evaluated' | 'Applied' | 'Interview' | 'Offer' | 'Rejected' | 'Withdrawn' | 'Accepted'
          applied_date?: string | null
          url?: string | null
          notes?: string | null
          has_pdf?: boolean
          has_cover_letter?: boolean
          report_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          sequence_number?: number
          company?: string
          role?: string
          score?: number | null
          status?: 'Evaluated' | 'Applied' | 'Interview' | 'Offer' | 'Rejected' | 'Withdrawn' | 'Accepted'
          applied_date?: string | null
          url?: string | null
          notes?: string | null
          has_pdf?: boolean
          has_cover_letter?: boolean
          report_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      reports: {
        Row: {
          id: string
          user_id: string
          application_id: string | null
          company: string
          role: string
          archetype: string | null
          score: number | null
          jd_text: string | null
          jd_url: string | null
          block_a: Json | null
          block_b: Json | null
          block_c: Json | null
          block_d: Json | null
          block_e: Json | null
          block_f: Json | null
          block_g: Json | null
          block_h: Json | null
          keywords: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          application_id?: string | null
          company: string
          role: string
          archetype?: string | null
          score?: number | null
          jd_text?: string | null
          jd_url?: string | null
          block_a?: Json | null
          block_b?: Json | null
          block_c?: Json | null
          block_d?: Json | null
          block_e?: Json | null
          block_f?: Json | null
          block_g?: Json | null
          block_h?: Json | null
          keywords?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          application_id?: string | null
          company?: string
          role?: string
          archetype?: string | null
          score?: number | null
          jd_text?: string | null
          jd_url?: string | null
          block_a?: Json | null
          block_b?: Json | null
          block_c?: Json | null
          block_d?: Json | null
          block_e?: Json | null
          block_f?: Json | null
          block_g?: Json | null
          block_h?: Json | null
          keywords?: string[]
          created_at?: string
          updated_at?: string
        }
      }
      generated_files: {
        Row: {
          id: string
          user_id: string
          report_id: string | null
          file_type: 'resume' | 'cover_letter'
          storage_path: string
          file_name: string
          file_size: number | null
          page_count: number | null
          font_size: number | null
          keyword_coverage: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          report_id?: string | null
          file_type: 'resume' | 'cover_letter'
          storage_path: string
          file_name: string
          file_size?: number | null
          page_count?: number | null
          font_size?: number | null
          keyword_coverage?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          report_id?: string | null
          file_type?: 'resume' | 'cover_letter'
          storage_path?: string
          file_name?: string
          file_size?: number | null
          page_count?: number | null
          font_size?: number | null
          keyword_coverage?: number | null
          created_at?: string
        }
      }
      stripe_events: {
        Row: {
          id: string
          type: string
          processed_at: string
        }
        Insert: {
          id: string
          type: string
          processed_at?: string
        }
        Update: {
          id?: string
          type?: string
          processed_at?: string
        }
      }
      archetypes: {
        Row: {
          id: string
          user_id: string | null
          name: string
          description: string | null
          proof_point_priorities: string[]
          is_system: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          name: string
          description?: string | null
          proof_point_priorities?: string[]
          is_system?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          name?: string
          description?: string | null
          proof_point_priorities?: string[]
          is_system?: boolean
          created_at?: string
        }
      }
      proof_points: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          metrics: Json
          tags: string[]
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          metrics?: Json
          tags?: string[]
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          metrics?: Json
          tags?: string[]
          created_at?: string
        }
      }
      portal_companies: {
        Row: {
          id: string
          user_id: string
          name: string
          careers_url: string | null
          platform: string | null
          api_id: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          careers_url?: string | null
          platform?: string | null
          api_id?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          careers_url?: string | null
          platform?: string | null
          api_id?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      portal_search_queries: {
        Row: {
          id: string
          user_id: string
          query: string
          source: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          query: string
          source?: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          query?: string
          source?: string
          is_active?: boolean
          created_at?: string
        }
      }
      title_filters: {
        Row: {
          id: string
          user_id: string
          filter_type: 'positive' | 'negative' | 'seniority'
          keyword: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          filter_type: 'positive' | 'negative' | 'seniority'
          keyword: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          filter_type?: 'positive' | 'negative' | 'seniority'
          keyword?: string
          created_at?: string
        }
      }
      scan_history: {
        Row: {
          id: string
          user_id: string
          url: string
          company: string | null
          role: string | null
          source: string | null
          scanned_at: string
        }
        Insert: {
          id?: string
          user_id: string
          url: string
          company?: string | null
          role?: string | null
          source?: string | null
          scanned_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          url?: string
          company?: string | null
          role?: string | null
          source?: string | null
          scanned_at?: string
        }
      }
      pipeline_items: {
        Row: {
          id: string
          user_id: string
          url: string
          company: string | null
          role: string | null
          title: string | null
          source: string | null
          status: 'pending' | 'processing' | 'done' | 'evaluated' | 'skipped' | 'error'
          score: number | null
          report_id: string | null
          error_message: string | null
          created_at: string
          processed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          url: string
          company?: string | null
          role?: string | null
          title?: string | null
          source?: string | null
          status?: 'pending' | 'processing' | 'done' | 'evaluated' | 'skipped' | 'error'
          score?: number | null
          report_id?: string | null
          error_message?: string | null
          created_at?: string
          processed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          url?: string
          company?: string | null
          role?: string | null
          title?: string | null
          source?: string | null
          status?: 'pending' | 'processing' | 'done' | 'evaluated' | 'skipped' | 'error'
          score?: number | null
          report_id?: string | null
          error_message?: string | null
          created_at?: string
          processed_at?: string | null
        }
      }
      story_bank: {
        Row: {
          id: string
          user_id: string
          title: string
          jd_requirement: string | null
          situation: string | null
          task: string | null
          action: string | null
          result: string | null
          reflection: string | null
          tags: string[]
          source_report_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          jd_requirement?: string | null
          situation?: string | null
          task?: string | null
          action?: string | null
          result?: string | null
          reflection?: string | null
          tags?: string[]
          source_report_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          jd_requirement?: string | null
          situation?: string | null
          task?: string | null
          action?: string | null
          result?: string | null
          reflection?: string | null
          tags?: string[]
          source_report_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      referrals: {
        Row: {
          id: string
          referrer_id: string
          referred_id: string
          referral_code: string
          credits_awarded: boolean
          created_at: string
        }
        Insert: {
          id?: string
          referrer_id: string
          referred_id: string
          referral_code: string
          credits_awarded?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          referrer_id?: string
          referred_id?: string
          referral_code?: string
          credits_awarded?: boolean
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      deduct_credits: {
        Args: {
          p_user_id: string
          p_amount: number
          p_action: string
          p_reference_id?: string | null
          p_description?: string | null
        }
        Returns: Json
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
