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
          id: string;
          full_name: string | null;
          phone: string | null;
          whatsapp_number: string | null;
          country: string;
          city: string | null;
          preferred_currency: string;
          balance: number;
          verification_status: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          phone?: string | null;
          whatsapp_number?: string | null;
          country?: string;
          city?: string | null;
          preferred_currency?: string;
          balance?: number;
          verification_status?: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          phone?: string | null;
          whatsapp_number?: string | null;
          country?: string;
          city?: string | null;
          preferred_currency?: string;
          balance?: number;
          verification_status?: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      vehicles: {
        Row: {
          id: string;
          source: string;
          source_id: string;
          source_url: string | null;
          make: string;
          model: string;
          year: number | null;
          mileage: number | null;
          engine_cc: number | null;
          transmission: string | null;
          fuel_type: string | null;
          color: string | null;
          body_type: string | null;
          drive_type: string | null;
          grade: string | null;
          condition_report: Json | null;
          auction_sheet_url: string | null;
          start_price_usd: number | null;
          current_price_usd: number | null;
          buy_now_price_usd: number | null;
          auction_platform: string | null;
          auction_date: string | null;
          auction_status: string;
          lot_number: string | null;
          images: string[] | null;
          video_url: string | null;
          has_360_view: boolean;
          views_count: number;
          favorites_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          source: string;
          source_id: string;
          source_url?: string | null;
          make: string;
          model: string;
          year?: number | null;
          mileage?: number | null;
          engine_cc?: number | null;
          transmission?: string | null;
          fuel_type?: string | null;
          color?: string | null;
          body_type?: string | null;
          drive_type?: string | null;
          grade?: string | null;
          condition_report?: Json | null;
          auction_sheet_url?: string | null;
          start_price_usd?: number | null;
          current_price_usd?: number | null;
          buy_now_price_usd?: number | null;
          auction_platform?: string | null;
          auction_date?: string | null;
          auction_status?: string;
          lot_number?: string | null;
          images?: string[] | null;
          video_url?: string | null;
          has_360_view?: boolean;
          views_count?: number;
          favorites_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          source?: string;
          source_id?: string;
          source_url?: string | null;
          make?: string;
          model?: string;
          year?: number | null;
          mileage?: number | null;
          engine_cc?: number | null;
          transmission?: string | null;
          fuel_type?: string | null;
          color?: string | null;
          body_type?: string | null;
          drive_type?: string | null;
          grade?: string | null;
          condition_report?: Json | null;
          auction_sheet_url?: string | null;
          start_price_usd?: number | null;
          current_price_usd?: number | null;
          buy_now_price_usd?: number | null;
          auction_platform?: string | null;
          auction_date?: string | null;
          auction_status?: string;
          lot_number?: string | null;
          images?: string[] | null;
          video_url?: string | null;
          has_360_view?: boolean;
          views_count?: number;
          favorites_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      bids: {
        Row: {
          id: string;
          vehicle_id: string;
          user_id: string;
          amount_usd: number;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          vehicle_id: string;
          user_id: string;
          amount_usd: number;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          vehicle_id?: string;
          user_id?: string;
          amount_usd?: number;
          status?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bids_vehicle_id_fkey";
            columns: ["vehicle_id"];
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bids_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      orders: {
        Row: {
          id: string;
          user_id: string;
          vehicle_id: string;
          bid_id: string | null;
          vehicle_price_usd: number | null;
          shipping_price_usd: number | null;
          insurance_price_usd: number | null;
          customs_estimate_usd: number | null;
          total_price_usd: number | null;
          destination_country: string | null;
          destination_port: string | null;
          destination_city: string | null;
          shipping_method: string | null;
          container_type: string | null;
          status: string;
          documents: Json;
          tracking_number: string | null;
          estimated_arrival: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          vehicle_id: string;
          bid_id?: string | null;
          vehicle_price_usd?: number | null;
          shipping_price_usd?: number | null;
          insurance_price_usd?: number | null;
          customs_estimate_usd?: number | null;
          total_price_usd?: number | null;
          destination_country?: string | null;
          destination_port?: string | null;
          destination_city?: string | null;
          shipping_method?: string | null;
          container_type?: string | null;
          status?: string;
          documents?: Json;
          tracking_number?: string | null;
          estimated_arrival?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          vehicle_id?: string;
          bid_id?: string | null;
          vehicle_price_usd?: number | null;
          shipping_price_usd?: number | null;
          insurance_price_usd?: number | null;
          customs_estimate_usd?: number | null;
          total_price_usd?: number | null;
          destination_country?: string | null;
          destination_port?: string | null;
          destination_city?: string | null;
          shipping_method?: string | null;
          container_type?: string | null;
          status?: string;
          documents?: Json;
          tracking_number?: string | null;
          estimated_arrival?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "orders_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_vehicle_id_fkey";
            columns: ["vehicle_id"];
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_bid_id_fkey";
            columns: ["bid_id"];
            referencedRelation: "bids";
            referencedColumns: ["id"];
          }
        ];
      };
      order_tracking: {
        Row: {
          id: string;
          order_id: string;
          status: string;
          title: string;
          description: string | null;
          location: string | null;
          completed_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          status: string;
          title: string;
          description?: string | null;
          location?: string | null;
          completed_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          status?: string;
          title?: string;
          description?: string | null;
          location?: string | null;
          completed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "order_tracking_order_id_fkey";
            columns: ["order_id"];
            referencedRelation: "orders";
            referencedColumns: ["id"];
          }
        ];
      };
      favorites: {
        Row: {
          id: string;
          user_id: string;
          vehicle_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          vehicle_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          vehicle_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "favorites_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "favorites_vehicle_id_fkey";
            columns: ["vehicle_id"];
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          }
        ];
      };
      saved_filters: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          filters: Json;
          notify_new_matches: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          filters: Json;
          notify_new_matches?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          filters?: Json;
          notify_new_matches?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saved_filters_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          message: string | null;
          data: Json | null;
          read: boolean;
          sent_whatsapp: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          message?: string | null;
          data?: Json | null;
          read?: boolean;
          sent_whatsapp?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          title?: string;
          message?: string | null;
          data?: Json | null;
          read?: boolean;
          sent_whatsapp?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          order_id: string | null;
          type: string;
          amount: number;
          currency: string;
          payment_method: string | null;
          payment_reference: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          order_id?: string | null;
          type: string;
          amount: number;
          currency?: string;
          payment_method?: string | null;
          payment_reference?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          order_id?: string | null;
          type?: string;
          amount?: number;
          currency?: string;
          payment_method?: string | null;
          payment_reference?: string | null;
          status?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_order_id_fkey";
            columns: ["order_id"];
            referencedRelation: "orders";
            referencedColumns: ["id"];
          }
        ];
      };
      conversations: {
        Row: {
          id: string;
          user_id: string;
          manager_id: string | null;
          order_id: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          manager_id?: string | null;
          order_id?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          manager_id?: string | null;
          order_id?: string | null;
          status?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversations_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_manager_id_fkey";
            columns: ["manager_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_order_id_fkey";
            columns: ["order_id"];
            referencedRelation: "orders";
            referencedColumns: ["id"];
          }
        ];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          attachments: string[] | null;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          attachments?: string[] | null;
          read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          content?: string;
          attachments?: string[] | null;
          read?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_sender_id_fkey";
            columns: ["sender_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
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

// Convenience types - Database row types (DbVehicle to avoid conflict with Vehicle from vehicle.ts)
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type DbVehicle = Database['public']['Tables']['vehicles']['Row'];
export type Bid = Database['public']['Tables']['bids']['Row'];
export type Order = Database['public']['Tables']['orders']['Row'];
export type OrderTracking = Database['public']['Tables']['order_tracking']['Row'];
export type Favorite = Database['public']['Tables']['favorites']['Row'];
export type SavedFilter = Database['public']['Tables']['saved_filters']['Row'];
export type Notification = Database['public']['Tables']['notifications']['Row'];
export type Transaction = Database['public']['Tables']['transactions']['Row'];
export type Conversation = Database['public']['Tables']['conversations']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'];

// Insert types
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type VehicleInsert = Database['public']['Tables']['vehicles']['Insert'];
export type BidInsert = Database['public']['Tables']['bids']['Insert'];
export type OrderInsert = Database['public']['Tables']['orders']['Insert'];
export type FavoriteInsert = Database['public']['Tables']['favorites']['Insert'];
export type NotificationInsert = Database['public']['Tables']['notifications']['Insert'];

// Update types
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];
export type VehicleUpdate = Database['public']['Tables']['vehicles']['Update'];
export type BidUpdate = Database['public']['Tables']['bids']['Update'];
export type OrderUpdate = Database['public']['Tables']['orders']['Update'];
