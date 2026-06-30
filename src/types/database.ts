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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      activity: {
        Row: {
          category_id: number
          created_at: string
          id: number
          irs_code: string
          name_en: string
          name_es: string
        }
        Insert: {
          category_id: number
          created_at?: string
          id?: number
          irs_code: string
          name_en?: string
          name_es: string
        }
        Update: {
          category_id?: number
          created_at?: string
          id?: number
          irs_code?: string
          name_en?: string
          name_es?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "category"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          after_data: Json | null
          before_data: Json | null
          changed_by: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          parent_id: string | null
          parent_type: string | null
        }
        Insert: {
          action: string
          after_data?: Json | null
          before_data?: Json | null
          changed_by?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          parent_id?: string | null
          parent_type?: string | null
        }
        Update: {
          action?: string
          after_data?: Json | null
          before_data?: Json | null
          changed_by?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          parent_id?: string | null
          parent_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["user_id"]
          },
        ]
      }
      billing_info: {
        Row: {
          city: string
          country_id: number
          created_at: string
          email: string | null
          id: string
          is_default: boolean
          line1: string
          line2: string | null
          phone: string | null
          state_id: number | null
          user_id: string
          zip: string | null
        }
        Insert: {
          city: string
          country_id: number
          created_at?: string
          email?: string | null
          id?: string
          is_default?: boolean
          line1: string
          line2?: string | null
          phone?: string | null
          state_id?: number | null
          user_id: string
          zip?: string | null
        }
        Update: {
          city?: string
          country_id?: number
          created_at?: string
          email?: string | null
          id?: string
          is_default?: boolean
          line1?: string
          line2?: string | null
          phone?: string | null
          state_id?: number | null
          user_id?: string
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_info_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_info_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_info_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "usuarios"
            referencedColumns: ["user_id"]
          },
        ]
      }
      category: {
        Row: {
          created_at: string
          id: number
          name: string
          name_en: string
          sector_id: number
        }
        Insert: {
          created_at?: string
          id?: number
          name: string
          name_en?: string
          sector_id: number
        }
        Update: {
          created_at?: string
          id?: number
          name?: string
          name_en?: string
          sector_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "category_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sector"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          activity_code_id: number | null
          activity_description: string | null
          created_at: string
          created_by: string | null
          entity_type: Database["public"]["Enums"]["companies_entity_type"]
          filing_number: string | null
          formation_country_id: number | null
          formation_state_id: number | null
          id: string
          identification_number: string | null
          incorporation_date: string | null
          incorporation_id: string | null
          irs_email: string | null
          joint_ownership: boolean | null
          legal_name: string | null
          legal_status: Database["public"]["Enums"]["companies_legal_status"]
          management_type: Database["public"]["Enums"]["companies_management_type"]
          tax_clasification: string | null
          updated_at: string | null
          updated_by: string | null
          us_source_income: boolean | null
          user_id: string | null
        }
        Insert: {
          activity_code_id?: number | null
          activity_description?: string | null
          created_at?: string
          created_by?: string | null
          entity_type?: Database["public"]["Enums"]["companies_entity_type"]
          filing_number?: string | null
          formation_country_id?: number | null
          formation_state_id?: number | null
          id?: string
          identification_number?: string | null
          incorporation_date?: string | null
          incorporation_id?: string | null
          irs_email?: string | null
          joint_ownership?: boolean | null
          legal_name?: string | null
          legal_status?: Database["public"]["Enums"]["companies_legal_status"]
          management_type?: Database["public"]["Enums"]["companies_management_type"]
          tax_clasification?: string | null
          updated_at?: string | null
          updated_by?: string | null
          us_source_income?: boolean | null
          user_id?: string | null
        }
        Update: {
          activity_code_id?: number | null
          activity_description?: string | null
          created_at?: string
          created_by?: string | null
          entity_type?: Database["public"]["Enums"]["companies_entity_type"]
          filing_number?: string | null
          formation_country_id?: number | null
          formation_state_id?: number | null
          id?: string
          identification_number?: string | null
          incorporation_date?: string | null
          incorporation_id?: string | null
          irs_email?: string | null
          joint_ownership?: boolean | null
          legal_name?: string | null
          legal_status?: Database["public"]["Enums"]["companies_legal_status"]
          management_type?: Database["public"]["Enums"]["companies_management_type"]
          tax_clasification?: string | null
          updated_at?: string | null
          updated_by?: string | null
          us_source_income?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_formation_state_id_fkey"
            columns: ["formation_state_id"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "company_formation_country_id_fkey"
            columns: ["formation_country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "company_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_companies_incorporation"
            columns: ["incorporation_id"]
            isOneToOne: false
            referencedRelation: "incorporations"
            referencedColumns: ["id"]
          },
        ]
      }
      company_addresses: {
        Row: {
          city: string
          company_id: string | null
          country_id: number
          county: string | null
          created_at: string
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: number
          line1: string
          line2: string | null
          state_id: number | null
          type: string
          updated_at: string | null
          updated_by: string | null
          zip: string | null
        }
        Insert: {
          city: string
          company_id?: string | null
          country_id: number
          county?: string | null
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: number
          line1: string
          line2?: string | null
          state_id?: number | null
          type: string
          updated_at?: string | null
          updated_by?: string | null
          zip?: string | null
        }
        Update: {
          city?: string
          company_id?: string | null
          country_id?: number
          county?: string | null
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: number
          line1?: string
          line2?: string | null
          state_id?: number | null
          type?: string
          updated_at?: string | null
          updated_by?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_addresses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_addresses_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_addresses_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "company_addresses_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_addresses_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["user_id"]
          },
        ]
      }
      company_members: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          end_date: string | null
          id: number
          is_active: boolean | null
          is_manager: boolean | null
          is_member: boolean | null
          member_id: string | null
          percentage: number | null
          start_date: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          end_date?: string | null
          id?: number
          is_active?: boolean | null
          is_manager?: boolean | null
          is_member?: boolean | null
          member_id?: string | null
          percentage?: number | null
          start_date?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          end_date?: string | null
          id?: number
          is_active?: boolean | null
          is_manager?: boolean | null
          is_member?: boolean | null
          member_id?: string | null
          percentage?: number | null
          start_date?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_members_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "company_members_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "company_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_members_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["user_id"]
          },
        ]
      }
      countries: {
        Row: {
          id: number
          iso: string | null
          name: string | null
          phone_code: string | null
        }
        Insert: {
          id?: number
          iso?: string | null
          name?: string | null
          phone_code?: string | null
        }
        Update: {
          id?: number
          iso?: string | null
          name?: string | null
          phone_code?: string | null
        }
        Relationships: []
      }
      incorporations: {
        Row: {
          entity_type: string | null
          formation_state_id: number | null
          id: string
          odoo_sale_order_id: number | null
          porcentaje_de_incorporacion: number | null
          possible_names: string[] | null
          principal_name: string | null
          source: string | null
          state: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          entity_type?: string | null
          formation_state_id?: number | null
          id?: string
          odoo_sale_order_id?: number | null
          porcentaje_de_incorporacion?: number | null
          possible_names?: string[] | null
          principal_name?: string | null
          source?: string | null
          state?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          entity_type?: string | null
          formation_state_id?: number | null
          id?: string
          odoo_sale_order_id?: number | null
          porcentaje_de_incorporacion?: number | null
          possible_names?: string[] | null
          principal_name?: string | null
          source?: string | null
          state?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "empresas_incorporaciones_state_id_fkey"
            columns: ["formation_state_id"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresas_incorporaciones_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["user_id"]
          },
        ]
      }
      member_addresses: {
        Row: {
          city: string | null
          country_id: number | null
          created_at: string
          created_by: string | null
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: number
          is_primary: boolean
          line1: string
          line2: string | null
          member_id: string
          state: string | null
          state_id: number | null
          type: string
          updated_at: string | null
          updated_by: string | null
          zip: string | null
        }
        Insert: {
          city?: string | null
          country_id?: number | null
          created_at?: string
          created_by?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: number
          is_primary?: boolean
          line1: string
          line2?: string | null
          member_id: string
          state?: string | null
          state_id?: number | null
          type: string
          updated_at?: string | null
          updated_by?: string | null
          zip?: string | null
        }
        Update: {
          city?: string | null
          country_id?: number | null
          created_at?: string
          created_by?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: number
          is_primary?: boolean
          line1?: string
          line2?: string | null
          member_id?: string
          state?: string | null
          state_id?: number | null
          type?: string
          updated_at?: string | null
          updated_by?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_addresses_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          birth_date: string | null
          country_id: number | null
          country_nationality_id: number | null
          country_residence_id: number | null
          created_at: string
          first_name: string | null
          full_name: string | null
          id: string
          identification_number: string | null
          identification_type: Database["public"]["Enums"]["members_identification_type"]
          incorporation_date: string | null
          is_entity: boolean | null
          is_manager: boolean | null
          is_member: boolean | null
          itin: string | null
          last_name: string | null
          marital_status:
            | Database["public"]["Enums"]["members_marital_status"]
            | null
          name: string | null
          person_type: Database["public"]["Enums"]["members_person_type"]
          ssn: string | null
          user_id: string | null
        }
        Insert: {
          birth_date?: string | null
          country_id?: number | null
          country_nationality_id?: number | null
          country_residence_id?: number | null
          created_at?: string
          first_name?: string | null
          full_name?: string | null
          id?: string
          identification_number?: string | null
          identification_type?: Database["public"]["Enums"]["members_identification_type"]
          incorporation_date?: string | null
          is_entity?: boolean | null
          is_manager?: boolean | null
          is_member?: boolean | null
          itin?: string | null
          last_name?: string | null
          marital_status?:
            | Database["public"]["Enums"]["members_marital_status"]
            | null
          name?: string | null
          person_type?: Database["public"]["Enums"]["members_person_type"]
          ssn?: string | null
          user_id?: string | null
        }
        Update: {
          birth_date?: string | null
          country_id?: number | null
          country_nationality_id?: number | null
          country_residence_id?: number | null
          created_at?: string
          first_name?: string | null
          full_name?: string | null
          id?: string
          identification_number?: string | null
          identification_type?: Database["public"]["Enums"]["members_identification_type"]
          incorporation_date?: string | null
          is_entity?: boolean | null
          is_manager?: boolean | null
          is_member?: boolean | null
          itin?: string | null
          last_name?: string | null
          marital_status?:
            | Database["public"]["Enums"]["members_marital_status"]
            | null
          name?: string | null
          person_type?: Database["public"]["Enums"]["members_person_type"]
          ssn?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_country_nationality_id_fkey"
            columns: ["country_nationality_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_country_residence_id_fkey"
            columns: ["country_residence_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["user_id"]
          },
        ]
      }
      micro_servicios: {
        Row: {
          categoria: string | null
          created_at: string
          descripcion: string | null
          estado: boolean | null
          etiqueta: string | null
          icono: string | null
          id_micro_servicios: string
          nombre: string | null
          odoo_default_code: string | null
          odoo_product_template_id: number | null
          precio: number | null
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          descripcion?: string | null
          estado?: boolean | null
          etiqueta?: string | null
          icono?: string | null
          id_micro_servicios?: string
          nombre?: string | null
          odoo_default_code?: string | null
          odoo_product_template_id?: number | null
          precio?: number | null
        }
        Update: {
          categoria?: string | null
          created_at?: string
          descripcion?: string | null
          estado?: boolean | null
          etiqueta?: string | null
          icono?: string | null
          id_micro_servicios?: string
          nombre?: string | null
          odoo_default_code?: string | null
          odoo_product_template_id?: number | null
          precio?: number | null
        }
        Relationships: []
      }
      naics_sectors: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      naics_subsectors: {
        Row: {
          id: string
          name: string
          sector_id: string | null
        }
        Insert: {
          id: string
          name: string
          sector_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          sector_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "naics_subsectors_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "naics_sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      order_lines: {
        Row: {
          created_at: string
          id: number
          order_id: string | null
          quantity: number | null
          service_id: number | null
          service_name: string | null
          sort_order: number
          source_plan_line_id: number | null
          subtotal: number | null
          total: number | null
          unit_price: number | null
        }
        Insert: {
          created_at?: string
          id?: number
          order_id?: string | null
          quantity?: number | null
          service_id?: number | null
          service_name?: string | null
          sort_order: number
          source_plan_line_id?: number | null
          subtotal?: number | null
          total?: number | null
          unit_price?: number | null
        }
        Update: {
          created_at?: string
          id?: number
          order_id?: string | null
          quantity?: number | null
          service_id?: number | null
          service_name?: string | null
          sort_order?: number
          source_plan_line_id?: number | null
          subtotal?: number | null
          total?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_lines_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_lines_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_lines_source_plan_line_id_fkey"
            columns: ["source_plan_line_id"]
            isOneToOne: false
            referencedRelation: "service_plan_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          client_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          note: string | null
          order_number: string
          payment_id: string
          payment_status: string | null
          service_plan_id: number | null
          total: number
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          note?: string | null
          order_number: string
          payment_id: string
          payment_status?: string | null
          service_plan_id?: number | null
          total: number
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          note?: string | null
          order_number?: string
          payment_id?: string
          payment_status?: string | null
          service_plan_id?: number | null
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["user_id"]
          },
        ]
      }
      pagos: {
        Row: {
          amount: number
          created_at: string
          empresa_incorporacion_id: string | null
          id_pagos: string
          odoo_invoice_id: number | null
          odoo_sale_order_id: number | null
          servicio_id: string
          source: string | null
          status: string
          stripe_payment_intent_id: string
          user_id: string
          visto_por_operaciones: boolean
        }
        Insert: {
          amount: number
          created_at?: string
          empresa_incorporacion_id?: string | null
          id_pagos?: string
          odoo_invoice_id?: number | null
          odoo_sale_order_id?: number | null
          servicio_id: string
          source?: string | null
          status: string
          stripe_payment_intent_id: string
          user_id?: string
          visto_por_operaciones?: boolean
        }
        Update: {
          amount?: number
          created_at?: string
          empresa_incorporacion_id?: string | null
          id_pagos?: string
          odoo_invoice_id?: number | null
          odoo_sale_order_id?: number | null
          servicio_id?: string
          source?: string | null
          status?: string
          stripe_payment_intent_id?: string
          user_id?: string
          visto_por_operaciones?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "pagos_empresa_incorporacion_id_fkey"
            columns: ["empresa_incorporacion_id"]
            isOneToOne: false
            referencedRelation: "incorporations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_servicio_id_fkey"
            columns: ["servicio_id"]
            isOneToOne: false
            referencedRelation: "servicios"
            referencedColumns: ["id_servicios"]
          },
          {
            foreignKeyName: "pagos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["user_id"]
          },
        ]
      }
      permissions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      referidos: {
        Row: {
          code: string
          created_at: string
          id: number
          partner_id: string
          referido_id: string
          source: string | null
        }
        Insert: {
          code: string
          created_at?: string
          id?: number
          partner_id: string
          referido_id: string
          source?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          id?: number
          partner_id?: string
          referido_id?: string
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referidos_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "referidos_referido_id_fkey"
            columns: ["referido_id"]
            isOneToOne: true
            referencedRelation: "usuarios"
            referencedColumns: ["user_id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
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
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      sector: {
        Row: {
          created_at: string
          id: number
          name: string
          name_en: string
        }
        Insert: {
          created_at?: string
          id?: number
          name: string
          name_en: string
        }
        Update: {
          created_at?: string
          id?: number
          name?: string
          name_en?: string
        }
        Relationships: []
      }
      service_plan_lines: {
        Row: {
          created_at: string
          id: number
          metadata: Json | null
          quantity: number | null
          service_id: number
          service_plan_id: string
          sort_order: number
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          metadata?: Json | null
          quantity?: number | null
          service_id: number
          service_plan_id: string
          sort_order?: number
          unit_price: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          metadata?: Json | null
          quantity?: number | null
          service_id?: number
          service_plan_id?: string
          sort_order?: number
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_plan_lines_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_plan_lines_service_plan_id_fkey"
            columns: ["service_plan_id"]
            isOneToOne: false
            referencedRelation: "service_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      service_plans: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          name: string | null
          sort_order: number
          status: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name?: string | null
          sort_order?: number
          status?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name?: string | null
          sort_order?: number
          status?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          created_at: string
          description: string | null
          id: number
          is_active: string
          metadata: Json | null
          name: string
          price: number
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: number
          is_active?: string
          metadata?: Json | null
          name: string
          price: number
          status: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: number
          is_active?: string
          metadata?: Json | null
          name?: string
          price?: number
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      servicio_extra: {
        Row: {
          categoria: string
          created_at: string
          descripcion: string
          estado: string
          id: number
          link: string
          link_imagen: string
          nombre: string
          servicio_ex_id: string
        }
        Insert: {
          categoria: string
          created_at?: string
          descripcion: string
          estado: string
          id?: number
          link: string
          link_imagen: string
          nombre: string
          servicio_ex_id?: string
        }
        Update: {
          categoria?: string
          created_at?: string
          descripcion?: string
          estado?: string
          id?: number
          link?: string
          link_imagen?: string
          nombre?: string
          servicio_ex_id?: string
        }
        Relationships: []
      }
      servicios: {
        Row: {
          categoria: string | null
          created_at: string
          descripcion: string | null
          etiqueta: string | null
          id: number
          id_servicios: string | null
          nombre: string | null
          odoo_default_code: string | null
          odoo_product_template_id: number | null
          precio: number | null
          servicio_activo: boolean | null
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          descripcion?: string | null
          etiqueta?: string | null
          id?: number
          id_servicios?: string | null
          nombre?: string | null
          odoo_default_code?: string | null
          odoo_product_template_id?: number | null
          precio?: number | null
          servicio_activo?: boolean | null
        }
        Update: {
          categoria?: string | null
          created_at?: string
          descripcion?: string | null
          etiqueta?: string | null
          id?: number
          id_servicios?: string | null
          nombre?: string | null
          odoo_default_code?: string | null
          odoo_product_template_id?: number | null
          precio?: number | null
          servicio_activo?: boolean | null
        }
        Relationships: []
      }
      states: {
        Row: {
          code: string | null
          country_id: number | null
          id: number
          name: string | null
        }
        Insert: {
          code?: string | null
          country_id?: number | null
          id?: number
          name?: string | null
        }
        Update: {
          code?: string | null
          country_id?: number | null
          id?: number
          name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "states_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          rol_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          rol_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          rol_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_rol_id_fkey"
            columns: ["rol_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["user_id"]
          },
        ]
      }
      usuarios: {
        Row: {
          apellido: string | null
          avatar_url: string | null
          codigo_de_partner: string | null
          correo: string | null
          created_at: string
          estado: string | null
          fecha_nacimiento: string | null
          nombre: string | null
          odoo_partner_id: number | null
          pais_id: number | null
          referido_por: string | null
          telf: string | null
          user_id: string
        }
        Insert: {
          apellido?: string | null
          avatar_url?: string | null
          codigo_de_partner?: string | null
          correo?: string | null
          created_at?: string
          estado?: string | null
          fecha_nacimiento?: string | null
          nombre?: string | null
          odoo_partner_id?: number | null
          pais_id?: number | null
          referido_por?: string | null
          telf?: string | null
          user_id: string
        }
        Update: {
          apellido?: string | null
          avatar_url?: string | null
          codigo_de_partner?: string | null
          correo?: string | null
          created_at?: string
          estado?: string | null
          fecha_nacimiento?: string | null
          nombre?: string | null
          odoo_partner_id?: number | null
          pais_id?: number | null
          referido_por?: string | null
          telf?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_pais_id_fkey"
            columns: ["pais_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuarios_referido_por_fkey"
            columns: ["referido_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["user_id"]
          },
        ]
      }
      wrappers_fdw_stats: {
        Row: {
          bytes_in: number | null
          bytes_out: number | null
          create_times: number | null
          created_at: string
          fdw_name: string
          metadata: Json | null
          rows_in: number | null
          rows_out: number | null
          updated_at: string
        }
        Insert: {
          bytes_in?: number | null
          bytes_out?: number | null
          create_times?: number | null
          created_at?: string
          fdw_name: string
          metadata?: Json | null
          rows_in?: number | null
          rows_out?: number | null
          updated_at?: string
        }
        Update: {
          bytes_in?: number | null
          bytes_out?: number | null
          create_times?: number | null
          created_at?: string
          fdw_name?: string
          metadata?: Json | null
          rows_in?: number | null
          rows_out?: number | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      airtable_fdw_handler: { Args: never; Returns: unknown }
      airtable_fdw_meta: {
        Args: never
        Returns: {
          author: string
          name: string
          version: string
          website: string
        }[]
      }
      airtable_fdw_validator: {
        Args: { catalog: unknown; options: string[] }
        Returns: undefined
      }
      apply_referral_code: {
        Args: { p_code: string; p_user_id: string }
        Returns: undefined
      }
      auth0_fdw_handler: { Args: never; Returns: unknown }
      auth0_fdw_meta: {
        Args: never
        Returns: {
          author: string
          name: string
          version: string
          website: string
        }[]
      }
      auth0_fdw_validator: {
        Args: { catalog: unknown; options: string[] }
        Returns: undefined
      }
      big_query_fdw_handler: { Args: never; Returns: unknown }
      big_query_fdw_meta: {
        Args: never
        Returns: {
          author: string
          name: string
          version: string
          website: string
        }[]
      }
      big_query_fdw_validator: {
        Args: { catalog: unknown; options: string[] }
        Returns: undefined
      }
      click_house_fdw_handler: { Args: never; Returns: unknown }
      click_house_fdw_meta: {
        Args: never
        Returns: {
          author: string
          name: string
          version: string
          website: string
        }[]
      }
      click_house_fdw_validator: {
        Args: { catalog: unknown; options: string[] }
        Returns: undefined
      }
      cognito_fdw_handler: { Args: never; Returns: unknown }
      cognito_fdw_meta: {
        Args: never
        Returns: {
          author: string
          name: string
          version: string
          website: string
        }[]
      }
      cognito_fdw_validator: {
        Args: { catalog: unknown; options: string[] }
        Returns: undefined
      }
      create_booking_intent: {
        Args: {
          p_category?: string
          p_incorporation_id?: string
          p_user_id: string
        }
        Returns: Json
      }
      create_workflow_for_incorporation: {
        Args: { p_incorporation_id: string; p_plan_id: number }
        Returns: string
      }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      duckdb_fdw_handler: { Args: never; Returns: unknown }
      duckdb_fdw_meta: {
        Args: never
        Returns: {
          author: string
          name: string
          version: string
          website: string
        }[]
      }
      duckdb_fdw_validator: {
        Args: { catalog: unknown; options: string[] }
        Returns: undefined
      }
      firebase_fdw_handler: { Args: never; Returns: unknown }
      firebase_fdw_meta: {
        Args: never
        Returns: {
          author: string
          name: string
          version: string
          website: string
        }[]
      }
      firebase_fdw_validator: {
        Args: { catalog: unknown; options: string[] }
        Returns: undefined
      }
      force_logout_user: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      generate_unique_partner_code: {
        Args: { code_len?: number }
        Returns: string
      }
      get_user_id_by_email: { Args: { p_email: string }; Returns: string }
      get_workflow_meeting: {
        Args: { p_incorporation_id: string }
        Returns: Json
      }
      hello_world_fdw_handler: { Args: never; Returns: unknown }
      hello_world_fdw_meta: {
        Args: never
        Returns: {
          author: string
          name: string
          version: string
          website: string
        }[]
      }
      hello_world_fdw_validator: {
        Args: { catalog: unknown; options: string[] }
        Returns: undefined
      }
      iceberg_fdw_handler: { Args: never; Returns: unknown }
      iceberg_fdw_meta: {
        Args: never
        Returns: {
          author: string
          name: string
          version: string
          website: string
        }[]
      }
      iceberg_fdw_validator: {
        Args: { catalog: unknown; options: string[] }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      is_audit_reader: { Args: never; Returns: boolean }
      is_company_staff: { Args: never; Returns: boolean }
      is_workflow_staff: { Args: { p_uid: string }; Returns: boolean }
      jwt_has_any_role: { Args: { role_names: string[] }; Returns: boolean }
      jwt_has_role: { Args: { role_name: string }; Returns: boolean }
      logflare_fdw_handler: { Args: never; Returns: unknown }
      logflare_fdw_meta: {
        Args: never
        Returns: {
          author: string
          name: string
          version: string
          website: string
        }[]
      }
      logflare_fdw_validator: {
        Args: { catalog: unknown; options: string[] }
        Returns: undefined
      }
      mark_pago_visto_secure: { Args: { p_id: string }; Returns: boolean }
      mssql_fdw_handler: { Args: never; Returns: unknown }
      mssql_fdw_meta: {
        Args: never
        Returns: {
          author: string
          name: string
          version: string
          website: string
        }[]
      }
      mssql_fdw_validator: {
        Args: { catalog: unknown; options: string[] }
        Returns: undefined
      }
      procesar_orden_odoo: {
        Args: {
          p_monto: number
          p_odoo_invoice_id: number
          p_odoo_partner_id: number
          p_odoo_sale_order_id: number
          p_perfil?: Json
          p_servicio_template_id: number
          p_user_id: string
        }
        Returns: Json
      }
      redis_fdw_handler: { Args: never; Returns: unknown }
      redis_fdw_meta: {
        Args: never
        Returns: {
          author: string
          name: string
          version: string
          website: string
        }[]
      }
      redis_fdw_validator: {
        Args: { catalog: unknown; options: string[] }
        Returns: undefined
      }
      referrals_by_day: {
        Args: { p_from?: string; p_partner: string; p_to?: string }
        Returns: {
          day: string
          total: number
        }[]
      }
      registrar_pago_desde_stripe: {
        Args: { p_payment_intent_id: string }
        Returns: Json
      }
      s3_fdw_handler: { Args: never; Returns: unknown }
      s3_fdw_meta: {
        Args: never
        Returns: {
          author: string
          name: string
          version: string
          website: string
        }[]
      }
      s3_fdw_validator: {
        Args: { catalog: unknown; options: string[] }
        Returns: undefined
      }
      stripe_fdw_handler: { Args: never; Returns: unknown }
      stripe_fdw_meta: {
        Args: never
        Returns: {
          author: string
          name: string
          version: string
          website: string
        }[]
      }
      stripe_fdw_validator: {
        Args: { catalog: unknown; options: string[] }
        Returns: undefined
      }
      upsert_planning_meeting:
        | {
            Args: {
              p_advisor_email: string
              p_duration_minutes: number
              p_incorporation_id?: string
              p_is_cancelled?: boolean
              p_meeting_external_id?: string
              p_meeting_passcode?: string
              p_meeting_url?: string
              p_platform?: string
              p_scheduled_at: string
              p_title: string
              p_user_id: string
              p_zcal_event_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_advisor_email: string
              p_duration_minutes: number
              p_incorporation_id?: string
              p_is_cancelled?: boolean
              p_is_workflow?: boolean
              p_meeting_external_id?: string
              p_meeting_passcode?: string
              p_meeting_url?: string
              p_platform?: string
              p_scheduled_at: string
              p_title: string
              p_user_id: string
              p_zcal_event_id: string
            }
            Returns: Json
          }
      user_can_access_company: {
        Args: { p_company_id: string }
        Returns: boolean
      }
      user_can_access_incorporation: {
        Args: { p_incorporation_id: string }
        Returns: boolean
      }
      wasm_fdw_handler: { Args: never; Returns: unknown }
      wasm_fdw_meta: {
        Args: never
        Returns: {
          author: string
          name: string
          version: string
          website: string
        }[]
      }
      wasm_fdw_validator: {
        Args: { catalog: unknown; options: string[] }
        Returns: undefined
      }
      workflow_advance_stage: { Args: { p_workflow_id: string }; Returns: Json }
      workflow_client_snapshot: {
        Args: { p_incorporation_id: string }
        Returns: Json
      }
      workflow_complete_task: {
        Args: { p_task_id: string; p_user_id?: string }
        Returns: Json
      }
      workflow_record_approval: {
        Args: {
          p_comments?: string
          p_decision: string
          p_stage_id: string
          p_user_id?: string
        }
        Returns: Json
      }
    }
    Enums: {
      companies_entity_type: "llc" | "lp" | "c-corp"
      companies_legal_status:
        | "draft"
        | "pending_validation"
        | "pending"
        | "active"
        | "inactive"
        | "suspended"
        | "dissolved"
      companies_management_type: "member-managed" | "manager-managed"
      document_applies_to:
        | "user"
        | "profile"
        | "member"
        | "company"
        | "incorporation_case"
        | "workflow"
        | "generic"
      document_approval_role: "operations" | "legal" | "compliance" | "tax"
      document_approval_status: "approved" | "rejected"
      document_category:
        | "identity"
        | "address"
        | "corporate"
        | "tax"
        | "compliance"
        | "authority"
        | "banking"
        | "registry"
        | "supporting"
      document_related_to_type:
        | "user"
        | "profile"
        | "member"
        | "company"
        | "incorporation_case"
        | "workflow"
      document_relation_purpose:
        | "owner"
        | "support"
        | "attachment"
        | "kyc"
        | "filing"
        | "signature"
        | "internal_reference"
      document_request_status:
        | "pending"
        | "sent"
        | "uploaded"
        | "under_review"
        | "approved"
        | "rejected"
        | "cancelled"
      document_status:
        | "pending"
        | "uploaded"
        | "under_review"
        | "approved"
        | "rejected"
        | "replaced"
        | "expired"
        | "archived"
      members_identification_type:
        | "passport"
        | "national_id"
        | "driver_licence"
        | "ein"
      members_marital_status:
        | "single"
        | "married"
        | "widowed"
        | "divorced"
        | "legally_separated"
        | "civil_union"
        | "annulled"
      members_person_type: "natural_person" | "juridical_person"
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
      companies_entity_type: ["llc", "lp", "c-corp"],
      companies_legal_status: [
        "draft",
        "pending_validation",
        "pending",
        "active",
        "inactive",
        "suspended",
        "dissolved",
      ],
      companies_management_type: ["member-managed", "manager-managed"],
      document_applies_to: [
        "user",
        "profile",
        "member",
        "company",
        "incorporation_case",
        "workflow",
        "generic",
      ],
      document_approval_role: ["operations", "legal", "compliance", "tax"],
      document_approval_status: ["approved", "rejected"],
      document_category: [
        "identity",
        "address",
        "corporate",
        "tax",
        "compliance",
        "authority",
        "banking",
        "registry",
        "supporting",
      ],
      document_related_to_type: [
        "user",
        "profile",
        "member",
        "company",
        "incorporation_case",
        "workflow",
      ],
      document_relation_purpose: [
        "owner",
        "support",
        "attachment",
        "kyc",
        "filing",
        "signature",
        "internal_reference",
      ],
      document_request_status: [
        "pending",
        "sent",
        "uploaded",
        "under_review",
        "approved",
        "rejected",
        "cancelled",
      ],
      document_status: [
        "pending",
        "uploaded",
        "under_review",
        "approved",
        "rejected",
        "replaced",
        "expired",
        "archived",
      ],
      members_identification_type: [
        "passport",
        "national_id",
        "driver_licence",
        "ein",
      ],
      members_marital_status: [
        "single",
        "married",
        "widowed",
        "divorced",
        "legally_separated",
        "civil_union",
        "annulled",
      ],
      members_person_type: ["natural_person", "juridical_person"],
    },
  },
} as const
