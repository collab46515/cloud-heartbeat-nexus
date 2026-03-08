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
          claim_number: string
          claim_status: Database["public"]["Enums"]["claim_status"]
          claim_type: Database["public"]["Enums"]["claim_type"]
          created_at: string
          created_by: string | null
          days_in_ar: number
          denial_reason_code: string | null
          denial_reason_description: string | null
          diagnoses: Json | null
          encounter_id: string | null
          external_claim_id: string | null
          facility_name: string | null
          id: string
          patient_id: string
          patient_responsibility: number
          payer_id: string
          provider_id: string | null
          service_date: string
          submission_date: string | null
          total_charge_amount: number
          total_paid_amount: number
          updated_at: string
        }
        Insert: {
          claim_number: string
          claim_status?: Database["public"]["Enums"]["claim_status"]
          claim_type?: Database["public"]["Enums"]["claim_type"]
          created_at?: string
          created_by?: string | null
          days_in_ar?: number
          denial_reason_code?: string | null
          denial_reason_description?: string | null
          diagnoses?: Json | null
          encounter_id?: string | null
          external_claim_id?: string | null
          facility_name?: string | null
          id?: string
          patient_id: string
          patient_responsibility?: number
          payer_id: string
          provider_id?: string | null
          service_date: string
          submission_date?: string | null
          total_charge_amount?: number
          total_paid_amount?: number
          updated_at?: string
        }
        Update: {
          claim_number?: string
          claim_status?: Database["public"]["Enums"]["claim_status"]
          claim_type?: Database["public"]["Enums"]["claim_type"]
          created_at?: string
          created_by?: string | null
          days_in_ar?: number
          denial_reason_code?: string | null
          denial_reason_description?: string | null
          diagnoses?: Json | null
          encounter_id?: string | null
          external_claim_id?: string | null
          facility_name?: string | null
          id?: string
          patient_id?: string
          patient_responsibility?: number
          payer_id?: string
          provider_id?: string | null
          service_date?: string
          submission_date?: string | null
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
