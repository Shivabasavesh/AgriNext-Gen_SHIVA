export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          created_at: string;
          district: string | null;
          id: string;
          name: string | null;
          phone: string | null;
          role: string;
          village: string | null;
        };
        Insert: {
          created_at?: string;
          district?: string | null;
          id: string;
          name?: string | null;
          phone?: string | null;
          role?: string;
          village?: string | null;
        };
        Update: {
          created_at?: string;
          district?: string | null;
          id?: string;
          name?: string | null;
          phone?: string | null;
          role?: string;
          village?: string | null;
        };
        Relationships: [];
      };
      crops: {
        Row: {
          created_at: string;
          crop_name: string;
          district: string | null;
          expected_harvest_date: string | null;
          expected_quantity_kg: number | null;
          farmer_id: string;
          id: string;
          status: string;
        };
        Insert: {
          created_at?: string;
          crop_name: string;
          district?: string | null;
          expected_harvest_date?: string | null;
          expected_quantity_kg?: number | null;
          farmer_id: string;
          id?: string;
          status?: string;
        };
        Update: {
          created_at?: string;
          crop_name?: string;
          district?: string | null;
          expected_harvest_date?: string | null;
          expected_quantity_kg?: number | null;
          farmer_id?: string;
          id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "crops_farmer_id_fkey";
            columns: ["farmer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      transport_requests: {
        Row: {
          created_at: string;
          crop_id: string;
          farmer_id: string;
          id: string;
          pickup_date: string | null;
          pickup_location_text: string | null;
          quantity_kg: number | null;
          status: string;
        };
        Insert: {
          created_at?: string;
          crop_id: string;
          farmer_id: string;
          id?: string;
          pickup_date?: string | null;
          pickup_location_text?: string | null;
          quantity_kg?: number | null;
          status?: string;
        };
        Update: {
          created_at?: string;
          crop_id?: string;
          farmer_id?: string;
          id?: string;
          pickup_date?: string | null;
          pickup_location_text?: string | null;
          quantity_kg?: number | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transport_requests_crop_id_fkey";
            columns: ["crop_id"];
            isOneToOne: false;
            referencedRelation: "crops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transport_requests_farmer_id_fkey";
            columns: ["farmer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_logs: {
        Row: {
          created_at: string;
          id: string;
          input_data: Json | null;
          module_type: string;
          output_data: Json | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          input_data?: Json | null;
          module_type: string;
          output_data?: Json | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          input_data?: Json | null;
          module_type?: string;
          output_data?: Json | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_logs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
