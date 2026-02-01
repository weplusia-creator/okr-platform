export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          invite_code: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          invite_code?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          invite_code?: string
          created_at?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          organization_id: string | null
          role: string
          created_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          organization_id?: string | null
          role?: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          organization_id?: string | null
          role?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      objectives: {
        Row: {
          id: string
          organization_id: string
          title: string
          description: string | null
          quarter: string
          year: number
          status: string
          owner: string
          start_date: string
          end_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          title: string
          description?: string | null
          quarter: string
          year: number
          status?: string
          owner: string
          start_date: string
          end_date: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          title?: string
          description?: string | null
          quarter?: string
          year?: number
          status?: string
          owner?: string
          start_date?: string
          end_date?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "objectives_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      key_results: {
        Row: {
          id: string
          objective_id: string
          title: string
          progress: number
          current_value: number | null
          target_value: number | null
          unit: string | null
          created_at: string
        }
        Insert: {
          id?: string
          objective_id: string
          title: string
          progress?: number
          current_value?: number | null
          target_value?: number | null
          unit?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          objective_id?: string
          title?: string
          progress?: number
          current_value?: number | null
          target_value?: number | null
          unit?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "key_results_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "objectives"
            referencedColumns: ["id"]
          }
        ]
      }
      clients: {
        Row: {
          id: string
          organization_id: string
          name: string
          company: string | null
          email: string | null
          phone: string | null
          address: string | null
          cuit: string | null
          industry: string | null
          employee_count: string | null
          website: string | null
          contact_name: string | null
          contact_role: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          company?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          cuit?: string | null
          industry?: string | null
          employee_count?: string | null
          website?: string | null
          contact_name?: string | null
          contact_role?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          company?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          cuit?: string | null
          industry?: string | null
          employee_count?: string | null
          website?: string | null
          contact_name?: string | null
          contact_role?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      invoices: {
        Row: {
          id: string
          organization_id: string
          client_id: string
          invoice_number: string
          status: string
          issue_date: string
          due_date: string
          paid_date: string | null
          subtotal: number
          tax: number
          total: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          client_id: string
          invoice_number: string
          status?: string
          issue_date: string
          due_date: string
          paid_date?: string | null
          subtotal?: number
          tax?: number
          total?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          client_id?: string
          invoice_number?: string
          status?: string
          issue_date?: string
          due_date?: string
          paid_date?: string | null
          subtotal?: number
          tax?: number
          total?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          }
        ]
      }
      invoice_items: {
        Row: {
          id: string
          invoice_id: string
          description: string
          quantity: number
          unit_price: number
          total: number
          created_at: string
        }
        Insert: {
          id?: string
          invoice_id: string
          description: string
          quantity?: number
          unit_price: number
          total: number
          created_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string
          description?: string
          quantity?: number
          unit_price?: number
          total?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          }
        ]
      }
      cash_flow_categories: {
        Row: {
          id: string
          organization_id: string
          name: string
          type: string
          color: string
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          type: string
          color?: string
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          type?: string
          color?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_flow_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      cash_flow_transactions: {
        Row: {
          id: string
          organization_id: string
          category_id: string
          type: string
          amount: number
          description: string
          date: string
          invoice_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          category_id: string
          type: string
          amount: number
          description: string
          date: string
          invoice_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          category_id?: string
          type?: string
          amount?: number
          description?: string
          date?: string
          invoice_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_flow_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "cash_flow_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
