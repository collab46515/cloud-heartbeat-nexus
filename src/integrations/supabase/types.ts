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
      ai_feedback: {
        Row: {
          ai_capability: string
          claim_id: string | null
          created_at: string
          feedback_text: string | null
          id: string
          outcome: string | null
          prediction_id: string | null
          prediction_was_correct: boolean | null
          rating: string
          user_id: string | null
        }
        Insert: {
          ai_capability: string
          claim_id?: string | null
          created_at?: string
          feedback_text?: string | null
          id?: string
          outcome?: string | null
          prediction_id?: string | null
          prediction_was_correct?: boolean | null
          rating: string
          user_id?: string | null
        }
        Update: {
          ai_capability?: string
          claim_id?: string | null
          created_at?: string
          feedback_text?: string | null
          id?: string
          outcome?: string | null
          prediction_id?: string | null
          prediction_was_correct?: boolean | null
          rating?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_feedback_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_logs: {
        Row: {
          capability: string
          claim_id: string | null
          created_at: string
          edge_function: string
          error_message: string | null
          estimated_cost: number | null
          id: string
          latency_ms: number | null
          model_used: string | null
          request_tokens: number | null
          response_tokens: number | null
          status: string
          user_id: string | null
        }
        Insert: {
          capability: string
          claim_id?: string | null
          created_at?: string
          edge_function: string
          error_message?: string | null
          estimated_cost?: number | null
          id?: string
          latency_ms?: number | null
          model_used?: string | null
          request_tokens?: number | null
          response_tokens?: number | null
          status?: string
          user_id?: string | null
        }
        Update: {
          capability?: string
          claim_id?: string | null
          created_at?: string
          edge_function?: string
          error_message?: string | null
          estimated_cost?: number | null
          id?: string
          latency_ms?: number | null
          model_used?: string | null
          request_tokens?: number | null
          response_tokens?: number | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_logs_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      automation_executions: {
        Row: {
          claim_id: string | null
          created_at: string
          error_message: string | null
          execution_time_ms: number | null
          id: string
          input_data: Json | null
          output_data: Json | null
          rule_id: string | null
          status: string
        }
        Insert: {
          claim_id?: string | null
          created_at?: string
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          rule_id?: string | null
          status?: string
        }
        Update: {
          claim_id?: string | null
          created_at?: string
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          rule_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_executions_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_executions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          action_config: Json
          created_at: string
          failure_count: number | null
          id: string
          is_active: boolean | null
          last_executed_at: string | null
          rule_name: string
          rule_type: string
          success_count: number | null
          trigger_condition: Json
          updated_at: string
        }
        Insert: {
          action_config?: Json
          created_at?: string
          failure_count?: number | null
          id?: string
          is_active?: boolean | null
          last_executed_at?: string | null
          rule_name: string
          rule_type: string
          success_count?: number | null
          trigger_condition?: Json
          updated_at?: string
        }
        Update: {
          action_config?: Json
          created_at?: string
          failure_count?: number | null
          id?: string
          is_active?: boolean | null
          last_executed_at?: string | null
          rule_name?: string
          rule_type?: string
          success_count?: number | null
          trigger_condition?: Json
          updated_at?: string
        }
        Relationships: []
      }
      batch_claim_items: {
        Row: {
          batch_id: string
          claim_id: string
          created_at: string
          error_message: string | null
          id: string
          line_number: number
          status: string | null
        }
        Insert: {
          batch_id: string
          claim_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          line_number: number
          status?: string | null
        }
        Update: {
          batch_id?: string
          claim_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          line_number?: number
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batch_claim_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_claim_items_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_submissions: {
        Row: {
          accepted_at: string | null
          acknowledgment_file_path: string | null
          batch_number: string
          batch_type: string
          claim_count: number | null
          clearinghouse: string | null
          created_at: string
          created_by: string | null
          edi_file_path: string | null
          error_count: number | null
          error_details: Json | null
          id: string
          payer_id: string | null
          rejected_at: string | null
          rejection_reason: string | null
          status: string
          submission_method: string | null
          submitted_at: string | null
          total_charges: number | null
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          acknowledgment_file_path?: string | null
          batch_number: string
          batch_type?: string
          claim_count?: number | null
          clearinghouse?: string | null
          created_at?: string
          created_by?: string | null
          edi_file_path?: string | null
          error_count?: number | null
          error_details?: Json | null
          id?: string
          payer_id?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          status?: string
          submission_method?: string | null
          submitted_at?: string | null
          total_charges?: number | null
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          acknowledgment_file_path?: string | null
          batch_number?: string
          batch_type?: string
          claim_count?: number | null
          clearinghouse?: string | null
          created_at?: string
          created_by?: string | null
          edi_file_path?: string | null
          error_count?: number | null
          error_details?: Json | null
          id?: string
          payer_id?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          status?: string
          submission_method?: string | null
          submitted_at?: string | null
          total_charges?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "batch_submissions_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "payers"
            referencedColumns: ["id"]
          },
        ]
      }
      cci_edit_pairs: {
        Row: {
          code_1: string
          code_2: string
          created_at: string
          edit_type: string
          effective_date: string
          end_date: string | null
          id: string
          is_active: boolean
          modifier_allowed: boolean
          modifier_indicators: string[]
        }
        Insert: {
          code_1: string
          code_2: string
          created_at?: string
          edit_type?: string
          effective_date?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          modifier_allowed?: boolean
          modifier_indicators?: string[]
        }
        Update: {
          code_1?: string
          code_2?: string
          created_at?: string
          edit_type?: string
          effective_date?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          modifier_allowed?: boolean
          modifier_indicators?: string[]
        }
        Relationships: []
      }
      claim_attachments: {
        Row: {
          attachment_type: string
          claim_id: string
          created_at: string
          description: string | null
          file_name: string
          file_path: string | null
          file_size: number | null
          id: string
          is_submitted_to_payer: boolean | null
          mime_type: string | null
          pwk_report_type: string | null
          pwk_transmission_code: string | null
          submitted_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          attachment_type: string
          claim_id: string
          created_at?: string
          description?: string | null
          file_name: string
          file_path?: string | null
          file_size?: number | null
          id?: string
          is_submitted_to_payer?: boolean | null
          mime_type?: string | null
          pwk_report_type?: string | null
          pwk_transmission_code?: string | null
          submitted_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          attachment_type?: string
          claim_id?: string
          created_at?: string
          description?: string | null
          file_name?: string
          file_path?: string | null
          file_size?: number | null
          id?: string
          is_submitted_to_payer?: boolean | null
          mime_type?: string | null
          pwk_report_type?: string | null
          pwk_transmission_code?: string | null
          submitted_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "claim_attachments_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_audit_log: {
        Row: {
          action: string
          action_category: string
          claim_id: string
          created_at: string
          hipaa_reason: string | null
          id: string
          ip_address: string | null
          new_value: Json | null
          phi_accessed: boolean | null
          previous_hash: string | null
          previous_value: Json | null
          record_hash: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          action_category: string
          claim_id: string
          created_at?: string
          hipaa_reason?: string | null
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          phi_accessed?: boolean | null
          previous_hash?: string | null
          previous_value?: Json | null
          record_hash?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          action_category?: string
          claim_id?: string
          created_at?: string
          hipaa_reason?: string | null
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          phi_accessed?: boolean | null
          previous_hash?: string | null
          previous_value?: Json | null
          record_hash?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "claim_audit_log_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_line_items: {
        Row: {
          charge_amount: number
          claim_id: string
          created_at: string
          diagnosis_pointer: string | null
          id: string
          modifiers: string[] | null
          procedure_code: string
          procedure_description: string | null
          revenue_code: string | null
          service_date: string
          units: number
        }
        Insert: {
          charge_amount?: number
          claim_id: string
          created_at?: string
          diagnosis_pointer?: string | null
          id?: string
          modifiers?: string[] | null
          procedure_code: string
          procedure_description?: string | null
          revenue_code?: string | null
          service_date: string
          units?: number
        }
        Update: {
          charge_amount?: number
          claim_id?: string
          created_at?: string
          diagnosis_pointer?: string | null
          id?: string
          modifiers?: string[] | null
          procedure_code?: string
          procedure_description?: string | null
          revenue_code?: string | null
          service_date?: string
          units?: number
        }
        Relationships: [
          {
            foreignKeyName: "claim_line_items_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
        ]
      }
      claims: {
        Row: {
          ai_recommended_actions: Json | null
          ai_risk_factors: Json | null
          ai_risk_level: string | null
          ai_risk_score: number | null
          appeal_count: number | null
          batch_id: string | null
          claim_number: string
          claim_status: Database["public"]["Enums"]["claim_status"]
          claim_type: Database["public"]["Enums"]["claim_type"]
          contract_id: string | null
          created_at: string
          created_by: string | null
          days_in_ar: number
          denial_reason_code: string | null
          denial_reason_description: string | null
          diagnoses: Json | null
          encounter_id: string | null
          expected_payment: number | null
          external_claim_id: string | null
          facility_name: string | null
          id: string
          patient_id: string
          patient_responsibility: number
          payer_id: string
          provider_id: string | null
          rta_eligible: boolean | null
          rta_status: string | null
          scrub_passed_at: string | null
          scrub_status: string | null
          service_date: string
          submission_date: string | null
          timely_filing_deadline: string | null
          total_charge_amount: number
          total_paid_amount: number
          updated_at: string
        }
        Insert: {
          ai_recommended_actions?: Json | null
          ai_risk_factors?: Json | null
          ai_risk_level?: string | null
          ai_risk_score?: number | null
          appeal_count?: number | null
          batch_id?: string | null
          claim_number: string
          claim_status?: Database["public"]["Enums"]["claim_status"]
          claim_type?: Database["public"]["Enums"]["claim_type"]
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          days_in_ar?: number
          denial_reason_code?: string | null
          denial_reason_description?: string | null
          diagnoses?: Json | null
          encounter_id?: string | null
          expected_payment?: number | null
          external_claim_id?: string | null
          facility_name?: string | null
          id?: string
          patient_id: string
          patient_responsibility?: number
          payer_id: string
          provider_id?: string | null
          rta_eligible?: boolean | null
          rta_status?: string | null
          scrub_passed_at?: string | null
          scrub_status?: string | null
          service_date: string
          submission_date?: string | null
          timely_filing_deadline?: string | null
          total_charge_amount?: number
          total_paid_amount?: number
          updated_at?: string
        }
        Update: {
          ai_recommended_actions?: Json | null
          ai_risk_factors?: Json | null
          ai_risk_level?: string | null
          ai_risk_score?: number | null
          appeal_count?: number | null
          batch_id?: string | null
          claim_number?: string
          claim_status?: Database["public"]["Enums"]["claim_status"]
          claim_type?: Database["public"]["Enums"]["claim_type"]
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          days_in_ar?: number
          denial_reason_code?: string | null
          denial_reason_description?: string | null
          diagnoses?: Json | null
          encounter_id?: string | null
          expected_payment?: number | null
          external_claim_id?: string | null
          facility_name?: string | null
          id?: string
          patient_id?: string
          patient_responsibility?: number
          payer_id?: string
          provider_id?: string | null
          rta_eligible?: boolean | null
          rta_status?: string | null
          scrub_passed_at?: string | null
          scrub_status?: string | null
          service_date?: string
          submission_date?: string | null
          timely_filing_deadline?: string | null
          total_charge_amount?: number
          total_paid_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "claims_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "encounters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "payers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      coding_suggestions: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          claim_id: string | null
          clinical_section: string | null
          confidence: number
          created_at: string
          current_code: string | null
          encounter_id: string | null
          evidence: string | null
          id: string
          model_version: string | null
          rejection_reason: string | null
          revenue_impact: number | null
          status: string
          suggested_code: string
          suggested_description: string | null
          suggestion_type: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          claim_id?: string | null
          clinical_section?: string | null
          confidence?: number
          created_at?: string
          current_code?: string | null
          encounter_id?: string | null
          evidence?: string | null
          id?: string
          model_version?: string | null
          rejection_reason?: string | null
          revenue_impact?: number | null
          status?: string
          suggested_code: string
          suggested_description?: string | null
          suggestion_type: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          claim_id?: string | null
          clinical_section?: string | null
          confidence?: number
          created_at?: string
          current_code?: string | null
          encounter_id?: string | null
          evidence?: string | null
          id?: string
          model_version?: string | null
          rejection_reason?: string | null
          revenue_impact?: number | null
          status?: string
          suggested_code?: string
          suggested_description?: string | null
          suggestion_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "coding_suggestions_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coding_suggestions_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "encounters"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_checks: {
        Row: {
          check_name: string
          check_type: string
          checked_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          remediation: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string | null
          status: string
        }
        Insert: {
          check_name: string
          check_type: string
          checked_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          remediation?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          status?: string
        }
        Update: {
          check_name?: string
          check_type?: string
          checked_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          remediation?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          status?: string
        }
        Relationships: []
      }
      credit_balances: {
        Row: {
          amount: number
          approved_by: string | null
          claim_id: string
          compliance_deadline: string | null
          created_at: string
          credit_type: string
          id: string
          identified_date: string
          is_medicare_60_day: boolean | null
          notes: string | null
          original_payment_date: string | null
          patient_id: string
          payer_id: string | null
          refund_amount: number | null
          refund_check_number: string | null
          refund_issued_date: string | null
          refund_method: string | null
          refund_status: string
          reviewed_by: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          approved_by?: string | null
          claim_id: string
          compliance_deadline?: string | null
          created_at?: string
          credit_type: string
          id?: string
          identified_date?: string
          is_medicare_60_day?: boolean | null
          notes?: string | null
          original_payment_date?: string | null
          patient_id: string
          payer_id?: string | null
          refund_amount?: number | null
          refund_check_number?: string | null
          refund_issued_date?: string | null
          refund_method?: string | null
          refund_status?: string
          reviewed_by?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_by?: string | null
          claim_id?: string
          compliance_deadline?: string | null
          created_at?: string
          credit_type?: string
          id?: string
          identified_date?: string
          is_medicare_60_day?: boolean | null
          notes?: string | null
          original_payment_date?: string | null
          patient_id?: string
          payer_id?: string | null
          refund_amount?: number | null
          refund_check_number?: string | null
          refund_issued_date?: string | null
          refund_method?: string | null
          refund_status?: string
          reviewed_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_balances_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_balances_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_balances_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "payers"
            referencedColumns: ["id"]
          },
        ]
      }
      data_residency_configs: {
        Row: {
          country_code: string
          created_at: string
          data_types: string[] | null
          encryption_standard: string | null
          id: string
          is_primary: boolean | null
          region_code: string
          region_name: string
          regulation: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          country_code: string
          created_at?: string
          data_types?: string[] | null
          encryption_standard?: string | null
          id?: string
          is_primary?: boolean | null
          region_code: string
          region_name: string
          regulation?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          country_code?: string
          created_at?: string
          data_types?: string[] | null
          encryption_standard?: string | null
          id?: string
          is_primary?: boolean | null
          region_code?: string
          region_name?: string
          regulation?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      denial_workflows: {
        Row: {
          appeal_deadline: string | null
          appeal_letter: string | null
          appeal_level: number | null
          appeal_status: string | null
          assigned_to: string | null
          carc_code: string | null
          carc_description: string | null
          claim_id: string
          created_at: string
          denial_amount: number
          denial_category: string
          escalated_to: string | null
          escalation_reason: string | null
          group_code: string | null
          id: string
          rarc_code: string | null
          rarc_description: string | null
          resolution_notes: string | null
          resolved_at: string | null
          updated_at: string
          write_off_amount: number | null
          write_off_approved_at: string | null
          write_off_approved_by: string | null
        }
        Insert: {
          appeal_deadline?: string | null
          appeal_letter?: string | null
          appeal_level?: number | null
          appeal_status?: string | null
          assigned_to?: string | null
          carc_code?: string | null
          carc_description?: string | null
          claim_id: string
          created_at?: string
          denial_amount?: number
          denial_category: string
          escalated_to?: string | null
          escalation_reason?: string | null
          group_code?: string | null
          id?: string
          rarc_code?: string | null
          rarc_description?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          updated_at?: string
          write_off_amount?: number | null
          write_off_approved_at?: string | null
          write_off_approved_by?: string | null
        }
        Update: {
          appeal_deadline?: string | null
          appeal_letter?: string | null
          appeal_level?: number | null
          appeal_status?: string | null
          assigned_to?: string | null
          carc_code?: string | null
          carc_description?: string | null
          claim_id?: string
          created_at?: string
          denial_amount?: number
          denial_category?: string
          escalated_to?: string | null
          escalation_reason?: string | null
          group_code?: string | null
          id?: string
          rarc_code?: string | null
          rarc_description?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          updated_at?: string
          write_off_amount?: number | null
          write_off_approved_at?: string | null
          write_off_approved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "denial_workflows_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
        ]
      }
      encounters: {
        Row: {
          admission_date: string
          attending_provider_id: string | null
          created_at: string
          discharge_date: string | null
          facility_name: string | null
          id: string
          patient_id: string
          status: string
          total_charges: number | null
          updated_at: string
          visit_type: Database["public"]["Enums"]["visit_type"]
        }
        Insert: {
          admission_date: string
          attending_provider_id?: string | null
          created_at?: string
          discharge_date?: string | null
          facility_name?: string | null
          id?: string
          patient_id: string
          status?: string
          total_charges?: number | null
          updated_at?: string
          visit_type?: Database["public"]["Enums"]["visit_type"]
        }
        Update: {
          admission_date?: string
          attending_provider_id?: string | null
          created_at?: string
          discharge_date?: string | null
          facility_name?: string | null
          id?: string
          patient_id?: string
          status?: string
          total_charges?: number | null
          updated_at?: string
          visit_type?: Database["public"]["Enums"]["visit_type"]
        }
        Relationships: [
          {
            foreignKeyName: "encounters_attending_provider_id_fkey"
            columns: ["attending_provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encounters_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_schedules: {
        Row: {
          allowed_amount: number
          bilateral_percent: number | null
          contract_id: string
          created_at: string
          effective_date: string
          end_date: string | null
          facility_rate: number | null
          id: string
          modifier: string | null
          multiple_procedure_percent: number | null
          non_facility_rate: number | null
          place_of_service: string | null
          procedure_code: string
        }
        Insert: {
          allowed_amount?: number
          bilateral_percent?: number | null
          contract_id: string
          created_at?: string
          effective_date: string
          end_date?: string | null
          facility_rate?: number | null
          id?: string
          modifier?: string | null
          multiple_procedure_percent?: number | null
          non_facility_rate?: number | null
          place_of_service?: string | null
          procedure_code: string
        }
        Update: {
          allowed_amount?: number
          bilateral_percent?: number | null
          contract_id?: string
          created_at?: string
          effective_date?: string
          end_date?: string | null
          facility_rate?: number | null
          id?: string
          modifier?: string | null
          multiple_procedure_percent?: number | null
          non_facility_rate?: number | null
          place_of_service?: string | null
          procedure_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_schedules_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "payer_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_configs: {
        Row: {
          connection_method: string | null
          created_at: string
          endpoint_url: string | null
          id: string
          integration_name: string
          integration_type: string
          is_active: boolean | null
          last_error: string | null
          last_sync_at: string | null
          records_synced: number | null
          status: string
          sync_frequency: string | null
          updated_at: string
          vendor: string | null
        }
        Insert: {
          connection_method?: string | null
          created_at?: string
          endpoint_url?: string | null
          id?: string
          integration_name: string
          integration_type: string
          is_active?: boolean | null
          last_error?: string | null
          last_sync_at?: string | null
          records_synced?: number | null
          status?: string
          sync_frequency?: string | null
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          connection_method?: string | null
          created_at?: string
          endpoint_url?: string | null
          id?: string
          integration_name?: string
          integration_type?: string
          is_active?: boolean | null
          last_error?: string | null
          last_sync_at?: string | null
          records_synced?: number | null
          status?: string
          sync_frequency?: string | null
          updated_at?: string
          vendor?: string | null
        }
        Relationships: []
      }
      ml_predictions: {
        Row: {
          actual_outcome: string | null
          claim_id: string
          confidence_lower: number | null
          confidence_upper: number | null
          created_at: string
          denial_probability: number
          feature_importances: Json | null
          id: string
          model_version: string | null
          outcome_captured_at: string | null
          prediction_latency_ms: number | null
          prediction_type: string
          recommended_actions: Json | null
          risk_factors: Json | null
          risk_level: string
        }
        Insert: {
          actual_outcome?: string | null
          claim_id: string
          confidence_lower?: number | null
          confidence_upper?: number | null
          created_at?: string
          denial_probability?: number
          feature_importances?: Json | null
          id?: string
          model_version?: string | null
          outcome_captured_at?: string | null
          prediction_latency_ms?: number | null
          prediction_type?: string
          recommended_actions?: Json | null
          risk_factors?: Json | null
          risk_level?: string
        }
        Update: {
          actual_outcome?: string | null
          claim_id?: string
          confidence_lower?: number | null
          confidence_upper?: number | null
          created_at?: string
          denial_probability?: number
          feature_importances?: Json | null
          id?: string
          model_version?: string | null
          outcome_captured_at?: string | null
          prediction_latency_ms?: number | null
          prediction_type?: string
          recommended_actions?: Json | null
          risk_factors?: Json | null
          risk_level?: string
        }
        Relationships: [
          {
            foreignKeyName: "ml_predictions_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
        ]
      }
      mue_limits: {
        Row: {
          adjudication_indicator: string
          created_at: string
          effective_date: string
          end_date: string | null
          id: string
          is_active: boolean
          max_units: number
          procedure_code: string
        }
        Insert: {
          adjudication_indicator?: string
          created_at?: string
          effective_date?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          max_units: number
          procedure_code: string
        }
        Update: {
          adjudication_indicator?: string
          created_at?: string
          effective_date?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          max_units?: number
          procedure_code?: string
        }
        Relationships: []
      }
      ncci_edit_pairs: {
        Row: {
          created_at: string
          edit_reason: string | null
          effective_date: string
          end_date: string | null
          id: string
          is_active: boolean
          modifier_allowed: boolean
          modifier_indicators: string[]
          primary_code: string
          secondary_code: string
        }
        Insert: {
          created_at?: string
          edit_reason?: string | null
          effective_date?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          modifier_allowed?: boolean
          modifier_indicators?: string[]
          primary_code: string
          secondary_code: string
        }
        Update: {
          created_at?: string
          edit_reason?: string | null
          effective_date?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          modifier_allowed?: boolean
          modifier_indicators?: string[]
          primary_code?: string
          secondary_code?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          category: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean
          message: string
          read_at: string | null
          severity: string
          title: string
          user_id: string | null
        }
        Insert: {
          action_url?: string | null
          category?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          message: string
          read_at?: string | null
          severity?: string
          title: string
          user_id?: string | null
        }
        Update: {
          action_url?: string | null
          category?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          message?: string
          read_at?: string | null
          severity?: string
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      patient_payment_plans: {
        Row: {
          auto_pay: boolean | null
          claim_id: string | null
          created_at: string
          id: string
          interest_rate: number | null
          monthly_amount: number
          next_payment_date: string | null
          number_of_payments: number
          patient_id: string
          payment_method: string | null
          payments_made: number | null
          remaining_balance: number
          start_date: string
          status: string
          total_balance: number
          updated_at: string
        }
        Insert: {
          auto_pay?: boolean | null
          claim_id?: string | null
          created_at?: string
          id?: string
          interest_rate?: number | null
          monthly_amount?: number
          next_payment_date?: string | null
          number_of_payments?: number
          patient_id: string
          payment_method?: string | null
          payments_made?: number | null
          remaining_balance?: number
          start_date?: string
          status?: string
          total_balance?: number
          updated_at?: string
        }
        Update: {
          auto_pay?: boolean | null
          claim_id?: string | null
          created_at?: string
          id?: string
          interest_rate?: number | null
          monthly_amount?: number
          next_payment_date?: string | null
          number_of_payments?: number
          patient_id?: string
          payment_method?: string | null
          payments_made?: number | null
          remaining_balance?: number
          start_date?: string
          status?: string
          total_balance?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_payment_plans_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_payment_plans_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_payments: {
        Row: {
          amount: number
          claim_id: string | null
          created_at: string
          id: string
          notes: string | null
          patient_id: string
          payment_date: string
          payment_method: string
          payment_plan_id: string | null
          receipt_method: string | null
          receipt_sent: boolean | null
          status: string
          transaction_id: string | null
        }
        Insert: {
          amount?: number
          claim_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          patient_id: string
          payment_date?: string
          payment_method: string
          payment_plan_id?: string | null
          receipt_method?: string | null
          receipt_sent?: boolean | null
          status?: string
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          claim_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          patient_id?: string
          payment_date?: string
          payment_method?: string
          payment_plan_id?: string | null
          receipt_method?: string | null
          receipt_sent?: boolean | null
          status?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_payments_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_payments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_payments_payment_plan_id_fkey"
            columns: ["payment_plan_id"]
            isOneToOne: false
            referencedRelation: "patient_payment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_portal_messages: {
        Row: {
          created_at: string
          direction: string
          id: string
          message: string
          patient_id: string
          replied_at: string | null
          replied_by: string | null
          status: string
          subject: string
        }
        Insert: {
          created_at?: string
          direction?: string
          id?: string
          message: string
          patient_id: string
          replied_at?: string | null
          replied_by?: string | null
          status?: string
          subject: string
        }
        Update: {
          created_at?: string
          direction?: string
          id?: string
          message?: string
          patient_id?: string
          replied_at?: string | null
          replied_by?: string | null
          status?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_portal_messages_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: Json | null
          created_at: string
          dob: string
          email: string | null
          first_name: string
          gender: string | null
          id: string
          insurance: Json | null
          is_active: boolean
          last_name: string
          mrn: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: Json | null
          created_at?: string
          dob: string
          email?: string | null
          first_name: string
          gender?: string | null
          id?: string
          insurance?: Json | null
          is_active?: boolean
          last_name: string
          mrn: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: Json | null
          created_at?: string
          dob?: string
          email?: string | null
          first_name?: string
          gender?: string | null
          id?: string
          insurance?: Json | null
          is_active?: boolean
          last_name?: string
          mrn?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      payer_contracts: {
        Row: {
          appeal_filing_days: number | null
          auto_renew: boolean | null
          charge_percent: number | null
          contract_name: string
          contract_number: string | null
          contract_type: string
          created_at: string
          effective_date: string
          id: string
          is_active: boolean | null
          medicare_percent: number | null
          notes: string | null
          payer_id: string
          reimbursement_basis: string | null
          termination_date: string | null
          timely_filing_days: number | null
          updated_at: string
        }
        Insert: {
          appeal_filing_days?: number | null
          auto_renew?: boolean | null
          charge_percent?: number | null
          contract_name: string
          contract_number?: string | null
          contract_type?: string
          created_at?: string
          effective_date: string
          id?: string
          is_active?: boolean | null
          medicare_percent?: number | null
          notes?: string | null
          payer_id: string
          reimbursement_basis?: string | null
          termination_date?: string | null
          timely_filing_days?: number | null
          updated_at?: string
        }
        Update: {
          appeal_filing_days?: number | null
          auto_renew?: boolean | null
          charge_percent?: number | null
          contract_name?: string
          contract_number?: string | null
          contract_type?: string
          created_at?: string
          effective_date?: string
          id?: string
          is_active?: boolean | null
          medicare_percent?: number | null
          notes?: string | null
          payer_id?: string
          reimbursement_basis?: string | null
          termination_date?: string | null
          timely_filing_days?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payer_contracts_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "payers"
            referencedColumns: ["id"]
          },
        ]
      }
      payer_rta_config: {
        Row: {
          api_endpoint: string | null
          api_version: string | null
          auth_type: string | null
          avg_response_time_ms: number | null
          created_at: string
          excluded_procedure_categories: string[] | null
          fallback_to_batch: boolean | null
          id: string
          is_active: boolean | null
          max_charge_amount: number | null
          payer_id: string
          retry_count: number | null
          rta_enabled: boolean | null
          success_rate: number | null
          supported_claim_types: string[] | null
          timeout_seconds: number | null
          updated_at: string
        }
        Insert: {
          api_endpoint?: string | null
          api_version?: string | null
          auth_type?: string | null
          avg_response_time_ms?: number | null
          created_at?: string
          excluded_procedure_categories?: string[] | null
          fallback_to_batch?: boolean | null
          id?: string
          is_active?: boolean | null
          max_charge_amount?: number | null
          payer_id: string
          retry_count?: number | null
          rta_enabled?: boolean | null
          success_rate?: number | null
          supported_claim_types?: string[] | null
          timeout_seconds?: number | null
          updated_at?: string
        }
        Update: {
          api_endpoint?: string | null
          api_version?: string | null
          auth_type?: string | null
          avg_response_time_ms?: number | null
          created_at?: string
          excluded_procedure_categories?: string[] | null
          fallback_to_batch?: boolean | null
          id?: string
          is_active?: boolean | null
          max_charge_amount?: number | null
          payer_id?: string
          retry_count?: number | null
          rta_enabled?: boolean | null
          success_rate?: number | null
          supported_claim_types?: string[] | null
          timeout_seconds?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payer_rta_config_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: true
            referencedRelation: "payers"
            referencedColumns: ["id"]
          },
        ]
      }
      payers: {
        Row: {
          avg_days_to_pay: number | null
          clearinghouse: string | null
          created_at: string
          denial_rate: number | null
          edi_payer_id: string | null
          id: string
          is_active: boolean
          name: string
          payer_type: string
          updated_at: string
        }
        Insert: {
          avg_days_to_pay?: number | null
          clearinghouse?: string | null
          created_at?: string
          denial_rate?: number | null
          edi_payer_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          payer_type?: string
          updated_at?: string
        }
        Update: {
          avg_days_to_pay?: number | null
          clearinghouse?: string | null
          created_at?: string
          denial_rate?: number | null
          edi_payer_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          payer_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      providers: {
        Row: {
          created_at: string
          facility_name: string | null
          first_name: string
          id: string
          is_active: boolean
          last_name: string
          npi: string
          specialty: string | null
          taxonomy_code: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          facility_name?: string | null
          first_name: string
          id?: string
          is_active?: boolean
          last_name: string
          npi: string
          specialty?: string | null
          taxonomy_code?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          facility_name?: string | null
          first_name?: string
          id?: string
          is_active?: boolean
          last_name?: string
          npi?: string
          specialty?: string | null
          taxonomy_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      revenue_code_defaults: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          note: string | null
          procedure_code: string
          revenue_code: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          note?: string | null
          procedure_code: string
          revenue_code: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          note?: string | null
          procedure_code?: string
          revenue_code?: string
        }
        Relationships: []
      }
      rta_transactions: {
        Row: {
          adjudication_id: string | null
          claim_id: string
          coinsurance: number | null
          copay: number | null
          created_at: string
          deductible_applied: number | null
          error_message: string | null
          estimated_payment_date: string | null
          id: string
          patient_responsibility: number | null
          payer_id: string
          payment_confirmation: string | null
          payment_method: string | null
          plan_pays: number | null
          request_payload: Json | null
          response_payload: Json | null
          response_status: string
          response_time_ms: number | null
          total_adjustment: number | null
          total_allowed: number | null
          transaction_id: string | null
        }
        Insert: {
          adjudication_id?: string | null
          claim_id: string
          coinsurance?: number | null
          copay?: number | null
          created_at?: string
          deductible_applied?: number | null
          error_message?: string | null
          estimated_payment_date?: string | null
          id?: string
          patient_responsibility?: number | null
          payer_id: string
          payment_confirmation?: string | null
          payment_method?: string | null
          plan_pays?: number | null
          request_payload?: Json | null
          response_payload?: Json | null
          response_status: string
          response_time_ms?: number | null
          total_adjustment?: number | null
          total_allowed?: number | null
          transaction_id?: string | null
        }
        Update: {
          adjudication_id?: string | null
          claim_id?: string
          coinsurance?: number | null
          copay?: number | null
          created_at?: string
          deductible_applied?: number | null
          error_message?: string | null
          estimated_payment_date?: string | null
          id?: string
          patient_responsibility?: number | null
          payer_id?: string
          payment_confirmation?: string | null
          payment_method?: string | null
          plan_pays?: number | null
          request_payload?: Json | null
          response_payload?: Json | null
          response_status?: string
          response_time_ms?: number | null
          total_adjustment?: number | null
          total_allowed?: number | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rta_transactions_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rta_transactions_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "payers"
            referencedColumns: ["id"]
          },
        ]
      }
      scrub_results: {
        Row: {
          auto_corrected: boolean | null
          claim_id: string
          correction_applied: string | null
          created_at: string
          details: Json | null
          id: string
          line_item_id: string | null
          message: string
          resolution_notes: string | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          rule_code: string
          rule_id: string | null
          rule_name: string
          severity: string
        }
        Insert: {
          auto_corrected?: boolean | null
          claim_id: string
          correction_applied?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          line_item_id?: string | null
          message: string
          resolution_notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          rule_code: string
          rule_id?: string | null
          rule_name: string
          severity?: string
        }
        Update: {
          auto_corrected?: boolean | null
          claim_id?: string
          correction_applied?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          line_item_id?: string | null
          message?: string
          resolution_notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          rule_code?: string
          rule_id?: string | null
          rule_name?: string
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "scrub_results_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scrub_results_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "claim_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scrub_results_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "scrub_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      scrub_rules: {
        Row: {
          auto_correct: boolean | null
          auto_correct_action: Json | null
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          governance_tags: string[]
          id: string
          is_active: boolean | null
          logic_expression: Json
          payer_id: string | null
          payer_specific: boolean | null
          rule_code: string
          rule_name: string
          rule_type: string
          severity: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          auto_correct?: boolean | null
          auto_correct_action?: Json | null
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          governance_tags?: string[]
          id?: string
          is_active?: boolean | null
          logic_expression?: Json
          payer_id?: string | null
          payer_specific?: boolean | null
          rule_code: string
          rule_name: string
          rule_type: string
          severity?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          auto_correct?: boolean | null
          auto_correct_action?: Json | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          governance_tags?: string[]
          id?: string
          is_active?: boolean | null
          logic_expression?: Json
          payer_id?: string | null
          payer_specific?: boolean | null
          rule_code?: string
          rule_name?: string
          rule_type?: string
          severity?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scrub_rules_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "payers"
            referencedColumns: ["id"]
          },
        ]
      }
      session_events: {
        Row: {
          created_at: string
          event_type: string
          geo_location: Json | null
          id: string
          ip_address: string | null
          is_anomalous: boolean | null
          metadata: Json | null
          risk_score: number | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          geo_location?: Json | null
          id?: string
          ip_address?: string | null
          is_anomalous?: boolean | null
          metadata?: Json | null
          risk_score?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          geo_location?: Json | null
          id?: string
          ip_address?: string | null
          is_anomalous?: boolean | null
          metadata?: Json | null
          risk_score?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      stp_pipeline_runs: {
        Row: {
          auto_actions_taken: Json | null
          claim_id: string | null
          completed_at: string | null
          created_at: string
          failure_reason: string | null
          id: string
          is_touchless: boolean | null
          pipeline_stage: string
          processing_time_ms: number | null
          status: string
        }
        Insert: {
          auto_actions_taken?: Json | null
          claim_id?: string | null
          completed_at?: string | null
          created_at?: string
          failure_reason?: string | null
          id?: string
          is_touchless?: boolean | null
          pipeline_stage: string
          processing_time_ms?: number | null
          status?: string
        }
        Update: {
          auto_actions_taken?: Json | null
          claim_id?: string | null
          completed_at?: string | null
          created_at?: string
          failure_reason?: string | null
          id?: string
          is_touchless?: boolean | null
          pipeline_stage?: string
          processing_time_ms?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "stp_pipeline_runs_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
        ]
      }
      timely_filing_alerts: {
        Row: {
          acknowledged: boolean | null
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_level: string
          claim_id: string
          created_at: string
          days_remaining: number
          exception_reason: string | null
          exception_type: string | null
          extended_deadline: string | null
          filing_deadline: string
          has_exception: boolean | null
          id: string
          payer_id: string
          updated_at: string
        }
        Insert: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_level?: string
          claim_id: string
          created_at?: string
          days_remaining: number
          exception_reason?: string | null
          exception_type?: string | null
          extended_deadline?: string | null
          filing_deadline: string
          has_exception?: boolean | null
          id?: string
          payer_id: string
          updated_at?: string
        }
        Update: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_level?: string
          claim_id?: string
          created_at?: string
          days_remaining?: number
          exception_reason?: string | null
          exception_type?: string | null
          extended_deadline?: string | null
          filing_deadline?: string
          has_exception?: boolean | null
          id?: string
          payer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "timely_filing_alerts_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timely_filing_alerts_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "payers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workload_items: {
        Row: {
          assigned_at: string | null
          assigned_to: string | null
          claim_id: string | null
          completed_at: string | null
          completed_by: string | null
          completion_notes: string | null
          created_at: string
          due_date: string | null
          entity_id: string
          entity_type: string
          escalated: boolean | null
          escalated_at: string | null
          escalated_to: string | null
          id: string
          priority: number | null
          queue_id: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_to?: string | null
          claim_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          completion_notes?: string | null
          created_at?: string
          due_date?: string | null
          entity_id: string
          entity_type?: string
          escalated?: boolean | null
          escalated_at?: string | null
          escalated_to?: string | null
          id?: string
          priority?: number | null
          queue_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_at?: string | null
          assigned_to?: string | null
          claim_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          completion_notes?: string | null
          created_at?: string
          due_date?: string | null
          entity_id?: string
          entity_type?: string
          escalated?: boolean | null
          escalated_at?: string | null
          escalated_to?: string | null
          id?: string
          priority?: number | null
          queue_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workload_items_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workload_items_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "workload_queues"
            referencedColumns: ["id"]
          },
        ]
      }
      workload_queues: {
        Row: {
          auto_assign: boolean | null
          created_at: string
          description: string | null
          escalation_hours: number | null
          id: string
          is_active: boolean | null
          max_items_per_user: number | null
          priority: number | null
          queue_name: string
          queue_type: string
          updated_at: string
        }
        Insert: {
          auto_assign?: boolean | null
          created_at?: string
          description?: string | null
          escalation_hours?: number | null
          id?: string
          is_active?: boolean | null
          max_items_per_user?: number | null
          priority?: number | null
          queue_name: string
          queue_type: string
          updated_at?: string
        }
        Update: {
          auto_assign?: boolean | null
          created_at?: string
          description?: string | null
          escalation_hours?: number | null
          id?: string
          is_active?: boolean | null
          max_items_per_user?: number | null
          priority?: number | null
          queue_name?: string
          queue_type?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "biller" | "coder" | "front_desk" | "manager"
      claim_status:
        | "draft"
        | "scrubbing"
        | "submitted"
        | "acknowledged"
        | "pending"
        | "paid"
        | "partial_paid"
        | "denied"
        | "appealed"
        | "void"
      claim_type: "professional" | "institutional"
      visit_type: "inpatient" | "outpatient" | "ed" | "observation"
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
      app_role: ["admin", "biller", "coder", "front_desk", "manager"],
      claim_status: [
        "draft",
        "scrubbing",
        "submitted",
        "acknowledged",
        "pending",
        "paid",
        "partial_paid",
        "denied",
        "appealed",
        "void",
      ],
      claim_type: ["professional", "institutional"],
      visit_type: ["inpatient", "outpatient", "ed", "observation"],
    },
  },
} as const
