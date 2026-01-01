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
          drop_location_text: string | null;
          assigned_transporter_id: string | null;
          pickup_date: string | null;
          pickup_location_text: string | null;
          quantity_kg: number | null;
          trip_id: string | null;
          status: string;
        };
        Insert: {
          created_at?: string;
          crop_id: string;
          farmer_id: string;
          id?: string;
          drop_location_text?: string | null;
          assigned_transporter_id?: string | null;
          pickup_date?: string | null;
          pickup_location_text?: string | null;
          quantity_kg?: number | null;
          trip_id?: string | null;
          status?: string;
        };
        Update: {
          created_at?: string;
          crop_id?: string;
          farmer_id?: string;
          id?: string;
          drop_location_text?: string | null;
          assigned_transporter_id?: string | null;
          pickup_date?: string | null;
          pickup_location_text?: string | null;
          quantity_kg?: number | null;
          trip_id?: string | null;
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
          {
            foreignKeyName: "transport_requests_assigned_transporter_id_fkey";
            columns: ["assigned_transporter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transport_requests_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
        ];
      };
      trips: {
        Row: {
          completed_at: string | null;
          created_at: string;
          id: string;
          status: string;
          transporter_id: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          id?: string;
          status?: string;
          transporter_id: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          id?: string;
          status?: string;
          transporter_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "trips_transporter_id_fkey";
            columns: ["transporter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      trip_stops: {
        Row: {
          completed_at: string | null;
          created_at: string;
          id: string;
          location_text: string | null;
          sequence: number;
          status: string;
          stop_type: string;
          transport_request_id: string | null;
          trip_id: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          id?: string;
          location_text?: string | null;
          sequence: number;
          status?: string;
          stop_type: string;
          transport_request_id?: string | null;
          trip_id: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          id?: string;
          location_text?: string | null;
          sequence?: number;
          status?: string;
          stop_type?: string;
          transport_request_id?: string | null;
          trip_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "trip_stops_transport_request_id_fkey";
            columns: ["transport_request_id"];
            isOneToOne: false;
            referencedRelation: "transport_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trip_stops_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
        ];
      };
      proofs: {
        Row: {
          created_at: string;
          created_by: string;
          id: string;
          note: string | null;
          photo_url: string | null;
          proof_type: string;
          trip_stop_id: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          id?: string;
          note?: string | null;
          photo_url?: string | null;
          proof_type: string;
          trip_stop_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          id?: string;
          note?: string | null;
          photo_url?: string | null;
          proof_type?: string;
          trip_stop_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "proofs_trip_stop_id_fkey";
            columns: ["trip_stop_id"];
            isOneToOne: false;
            referencedRelation: "trip_stops";
            referencedColumns: ["id"];
          },
        ];
      };
      reverse_load_suggestions: {
        Row: {
          created_at: string;
          from_location_text: string | null;
          id: string;
          status: string;
          suggested_items: Json | null;
          to_location_text: string | null;
          transporter_id: string;
        };
        Insert: {
          created_at?: string;
          from_location_text?: string | null;
          id?: string;
          status?: string;
          suggested_items?: Json | null;
          to_location_text?: string | null;
          transporter_id: string;
        };
        Update: {
          created_at?: string;
          from_location_text?: string | null;
          id?: string;
          status?: string;
          suggested_items?: Json | null;
          to_location_text?: string | null;
          transporter_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reverse_load_suggestions_transporter_id_fkey";
            columns: ["transporter_id"];
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
