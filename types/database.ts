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
      quotes: {
        Row: {
          id: string;
          quote_number: string;
          user_id: string;
          vehicle_id: string;
          vehicle_make: string;
          vehicle_model: string;
          vehicle_year: number;
          vehicle_price_usd: number;
          vehicle_source: string;
          destination_id: string;
          destination_name: string;
          destination_country: string;
          shipping_type: string;
          shipping_cost_xaf: number;
          insurance_cost_xaf: number;
          inspection_fee_xaf: number;
          total_cost_xaf: number;
          status: string;
          valid_until: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          quote_number: string;
          user_id: string;
          vehicle_id: string;
          vehicle_make: string;
          vehicle_model: string;
          vehicle_year: number;
          vehicle_price_usd: number;
          vehicle_source: string;
          destination_id: string;
          destination_name: string;
          destination_country: string;
          shipping_type: string;
          shipping_cost_xaf: number;
          insurance_cost_xaf: number;
          inspection_fee_xaf: number;
          total_cost_xaf: number;
          status?: string;
          valid_until: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          quote_number?: string;
          user_id?: string;
          vehicle_id?: string;
          vehicle_make?: string;
          vehicle_model?: string;
          vehicle_year?: number;
          vehicle_price_usd?: number;
          vehicle_source?: string;
          destination_id?: string;
          destination_name?: string;
          destination_country?: string;
          shipping_type?: string;
          shipping_cost_xaf?: number;
          insurance_cost_xaf?: number;
          inspection_fee_xaf?: number;
          total_cost_xaf?: number;
          status?: string;
          valid_until?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quotes_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
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
          role: 'user' | 'admin' | 'super_admin' | 'collaborator';
          assigned_country: string | null;
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
          role?: 'user' | 'admin' | 'super_admin' | 'collaborator';
          assigned_country?: string | null;
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
          role?: 'user' | 'admin' | 'super_admin' | 'collaborator';
          assigned_country?: string | null;
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
          status: string | null;
          is_visible: boolean;
          admin_notes: string | null;
          lot_number: string | null;
          images: string[] | null;
          video_url: string | null;
          has_360_view: boolean;
          views_count: number;
          favorites_count: number;
          added_by_collaborator_id: string | null;
          is_collaborator_listing: boolean;
          collaborator_approved: boolean;
          rejection_reason: string | null;
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
          status?: string | null;
          is_visible?: boolean;
          admin_notes?: string | null;
          lot_number?: string | null;
          images?: string[] | null;
          video_url?: string | null;
          has_360_view?: boolean;
          views_count?: number;
          favorites_count?: number;
          added_by_collaborator_id?: string | null;
          is_collaborator_listing?: boolean;
          collaborator_approved?: boolean;
          rejection_reason?: string | null;
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
          status?: string | null;
          is_visible?: boolean;
          admin_notes?: string | null;
          lot_number?: string | null;
          images?: string[] | null;
          video_url?: string | null;
          has_360_view?: boolean;
          views_count?: number;
          favorites_count?: number;
          added_by_collaborator_id?: string | null;
          is_collaborator_listing?: boolean;
          collaborator_approved?: boolean;
          rejection_reason?: string | null;
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
          // New columns for invoice/payment tracking
          order_number: string | null;
          invoice_number: string | null;
          quote_id: string | null;
          vehicle_make: string | null;
          vehicle_model: string | null;
          vehicle_year: number | null;
          vehicle_source: string | null;
          destination_id: string | null;
          destination_name: string | null;
          shipping_type: string | null;
          shipping_cost_xaf: number | null;
          insurance_cost_xaf: number | null;
          inspection_fee_xaf: number | null;
          total_cost_xaf: number | null;
          deposit_amount_usd: number | null;
          deposit_amount_xaf: number | null;
          deposit_paid_at: string | null;
          deposit_payment_method: string | null;
          deposit_payment_reference: string | null;
          balance_amount_xaf: number | null;
          balance_paid_at: string | null;
          balance_payment_method: string | null;
          balance_payment_reference: string | null;
          shipping_eta: string | null;
          tracking_url: string | null;
          customer_name: string | null;
          customer_email: string | null;
          customer_whatsapp: string | null;
          customer_country: string | null;
          admin_notes: string | null;
          customer_notes: string | null;
          documentation_fee_usd: number | null;
          uploaded_documents: Json;
          documents_sent_at: string | null;
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
          // New columns for invoice/payment tracking
          order_number?: string | null;
          invoice_number?: string | null;
          quote_id?: string | null;
          vehicle_make?: string | null;
          vehicle_model?: string | null;
          vehicle_year?: number | null;
          vehicle_source?: string | null;
          destination_id?: string | null;
          destination_name?: string | null;
          shipping_type?: string | null;
          shipping_cost_xaf?: number | null;
          insurance_cost_xaf?: number | null;
          inspection_fee_xaf?: number | null;
          total_cost_xaf?: number | null;
          deposit_amount_usd?: number | null;
          deposit_amount_xaf?: number | null;
          deposit_paid_at?: string | null;
          deposit_payment_method?: string | null;
          deposit_payment_reference?: string | null;
          balance_amount_xaf?: number | null;
          balance_paid_at?: string | null;
          balance_payment_method?: string | null;
          balance_payment_reference?: string | null;
          shipping_eta?: string | null;
          tracking_url?: string | null;
          customer_name?: string | null;
          customer_email?: string | null;
          customer_whatsapp?: string | null;
          customer_country?: string | null;
          admin_notes?: string | null;
          customer_notes?: string | null;
          documentation_fee_usd?: number | null;
          uploaded_documents?: Json;
          documents_sent_at?: string | null;
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
          // New columns for invoice/payment tracking
          order_number?: string | null;
          invoice_number?: string | null;
          quote_id?: string | null;
          vehicle_make?: string | null;
          vehicle_model?: string | null;
          vehicle_year?: number | null;
          vehicle_source?: string | null;
          destination_id?: string | null;
          destination_name?: string | null;
          shipping_type?: string | null;
          shipping_cost_xaf?: number | null;
          insurance_cost_xaf?: number | null;
          inspection_fee_xaf?: number | null;
          total_cost_xaf?: number | null;
          deposit_amount_usd?: number | null;
          deposit_amount_xaf?: number | null;
          deposit_paid_at?: string | null;
          deposit_payment_method?: string | null;
          deposit_payment_reference?: string | null;
          balance_amount_xaf?: number | null;
          balance_paid_at?: string | null;
          balance_payment_method?: string | null;
          balance_payment_reference?: string | null;
          shipping_eta?: string | null;
          tracking_url?: string | null;
          customer_name?: string | null;
          customer_email?: string | null;
          customer_whatsapp?: string | null;
          customer_country?: string | null;
          admin_notes?: string | null;
          customer_notes?: string | null;
          documentation_fee_usd?: number | null;
          uploaded_documents?: Json;
          documents_sent_at?: string | null;
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
          // New columns
          category: 'user' | 'admin' | 'system';
          priority: 'low' | 'normal' | 'high' | 'urgent';
          action_url: string | null;
          action_label: string | null;
          icon: string | null;
          expires_at: string | null;
          dismissed: boolean;
          related_entity_type: string | null;
          related_entity_id: string | null;
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
          category?: 'user' | 'admin' | 'system';
          priority?: 'low' | 'normal' | 'high' | 'urgent';
          action_url?: string | null;
          action_label?: string | null;
          icon?: string | null;
          expires_at?: string | null;
          dismissed?: boolean;
          related_entity_type?: string | null;
          related_entity_id?: string | null;
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
          category?: 'user' | 'admin' | 'system';
          priority?: 'low' | 'normal' | 'high' | 'urgent';
          action_url?: string | null;
          action_label?: string | null;
          icon?: string | null;
          expires_at?: string | null;
          dismissed?: boolean;
          related_entity_type?: string | null;
          related_entity_id?: string | null;
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
      admin_notifications: {
        Row: {
          id: string;
          type: string;
          title: string;
          message: string | null;
          data: Json | null;
          priority: 'low' | 'normal' | 'high' | 'urgent';
          action_url: string | null;
          action_label: string | null;
          icon: string | null;
          related_entity_type: string | null;
          related_entity_id: string | null;
          read_by: string[];
          dismissed_by: string[];
          created_at: string;
          expires_at: string | null;
        };
        Insert: {
          id?: string;
          type: string;
          title: string;
          message?: string | null;
          data?: Json | null;
          priority?: 'low' | 'normal' | 'high' | 'urgent';
          action_url?: string | null;
          action_label?: string | null;
          icon?: string | null;
          related_entity_type?: string | null;
          related_entity_id?: string | null;
          read_by?: string[];
          dismissed_by?: string[];
          created_at?: string;
          expires_at?: string | null;
        };
        Update: {
          id?: string;
          type?: string;
          title?: string;
          message?: string | null;
          data?: Json | null;
          priority?: 'low' | 'normal' | 'high' | 'urgent';
          action_url?: string | null;
          action_label?: string | null;
          icon?: string | null;
          related_entity_type?: string | null;
          related_entity_id?: string | null;
          read_by?: string[];
          dismissed_by?: string[];
          created_at?: string;
          expires_at?: string | null;
        };
        Relationships: [];
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
      chat_conversations: {
        Row: {
          id: string;
          user_id: string;
          title: string | null;
          status: string;
          agent_requested_at: string | null;
          agent_assigned_id: string | null;
          last_message_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string | null;
          status?: string;
          agent_requested_at?: string | null;
          agent_assigned_id?: string | null;
          last_message_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string | null;
          status?: string;
          agent_requested_at?: string | null;
          agent_assigned_id?: string | null;
          last_message_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chat_conversations_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chat_conversations_agent_assigned_id_fkey";
            columns: ["agent_assigned_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      chat_messages: {
        Row: {
          id: string;
          conversation_id: string;
          user_id: string | null;
          sender_type: string;
          content: string;
          metadata: Json;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          user_id?: string | null;
          sender_type: string;
          content: string;
          metadata?: Json;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          user_id?: string | null;
          sender_type?: string;
          content?: string;
          metadata?: Json;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey";
            columns: ["conversation_id"];
            referencedRelation: "chat_conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chat_messages_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      quote_reassignments: {
        Row: {
          id: string;
          original_quote_id: string;
          user_id: string;
          original_vehicle_id: string;
          original_vehicle_make: string;
          original_vehicle_model: string;
          original_vehicle_year: number;
          original_vehicle_price_usd: number;
          reason: string;
          status: string;
          proposed_vehicles: Json;
          selected_vehicle_id: string | null;
          new_quote_id: string | null;
          whatsapp_sent_at: string | null;
          whatsapp_message_id: string | null;
          customer_response: string | null;
          customer_responded_at: string | null;
          admin_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          original_quote_id: string;
          user_id: string;
          original_vehicle_id: string;
          original_vehicle_make: string;
          original_vehicle_model: string;
          original_vehicle_year: number;
          original_vehicle_price_usd: number;
          reason: string;
          status?: string;
          proposed_vehicles?: Json;
          selected_vehicle_id?: string | null;
          new_quote_id?: string | null;
          whatsapp_sent_at?: string | null;
          whatsapp_message_id?: string | null;
          customer_response?: string | null;
          customer_responded_at?: string | null;
          admin_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          original_quote_id?: string;
          user_id?: string;
          original_vehicle_id?: string;
          original_vehicle_make?: string;
          original_vehicle_model?: string;
          original_vehicle_year?: number;
          original_vehicle_price_usd?: number;
          reason?: string;
          status?: string;
          proposed_vehicles?: Json;
          selected_vehicle_id?: string | null;
          new_quote_id?: string | null;
          whatsapp_sent_at?: string | null;
          whatsapp_message_id?: string | null;
          customer_response?: string | null;
          customer_responded_at?: string | null;
          admin_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quote_reassignments_original_quote_id_fkey";
            columns: ["original_quote_id"];
            referencedRelation: "quotes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quote_reassignments_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      shipping_routes: {
        Row: {
          id: string;
          destination_name: string;
          destination_country: string;
          destination_port: string | null;
          origin_country: string;
          origin_port: string | null;
          shipping_cost_usd: number;
          insurance_rate: number;
          transit_days: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          destination_name: string;
          destination_country: string;
          destination_port?: string | null;
          origin_country: string;
          origin_port?: string | null;
          shipping_cost_usd: number;
          insurance_rate?: number;
          transit_days: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          destination_name?: string;
          destination_country?: string;
          destination_port?: string | null;
          origin_country?: string;
          origin_port?: string | null;
          shipping_cost_usd?: number;
          insurance_rate?: number;
          transit_days?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      collaborator_notifications: {
        Row: {
          id: string;
          type: string;
          title: string;
          message: string | null;
          data: Json | null;
          priority: 'low' | 'normal' | 'high' | 'urgent';
          action_url: string | null;
          related_entity_type: string | null;
          related_entity_id: string | null;
          read_by: string[];
          dismissed_by: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          type: string;
          title: string;
          message?: string | null;
          data?: Json | null;
          priority?: 'low' | 'normal' | 'high' | 'urgent';
          action_url?: string | null;
          related_entity_type?: string | null;
          related_entity_id?: string | null;
          read_by?: string[];
          dismissed_by?: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          type?: string;
          title?: string;
          message?: string | null;
          data?: Json | null;
          priority?: 'low' | 'normal' | 'high' | 'urgent';
          action_url?: string | null;
          related_entity_type?: string | null;
          related_entity_id?: string | null;
          read_by?: string[];
          dismissed_by?: string[];
          created_at?: string;
        };
        Relationships: [];
      };
      collaborator_activity_log: {
        Row: {
          id: string;
          collaborator_id: string;
          action_type: string;
          order_id: string | null;
          quote_id: string | null;
          details: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          collaborator_id: string;
          action_type: string;
          order_id?: string | null;
          quote_id?: string | null;
          details?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          collaborator_id?: string;
          action_type?: string;
          order_id?: string | null;
          quote_id?: string | null;
          details?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "collaborator_activity_log_collaborator_id_fkey";
            columns: ["collaborator_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      vehicle_batches: {
        Row: {
          id: string;
          added_by_collaborator_id: string;
          make: string;
          model: string;
          year: number;
          title: string;
          description: string | null;
          price_per_unit_usd: number;
          total_quantity: number;
          available_quantity: number;
          minimum_order_quantity: number;
          source_country: 'china' | 'korea' | 'dubai';
          specs: Json | null;
          images: string[] | null;
          status: 'pending' | 'approved' | 'rejected' | 'sold_out';
          is_visible: boolean;
          rejection_reason: string | null;
          admin_notes: string | null;
          collaborator_notes: string | null;
          approved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          added_by_collaborator_id: string;
          make: string;
          model: string;
          year: number;
          title: string;
          description?: string | null;
          price_per_unit_usd: number;
          total_quantity: number;
          available_quantity: number;
          minimum_order_quantity: number;
          source_country: 'china' | 'korea' | 'dubai';
          specs?: Json | null;
          images?: string[] | null;
          status?: 'pending' | 'approved' | 'rejected' | 'sold_out';
          is_visible?: boolean;
          rejection_reason?: string | null;
          admin_notes?: string | null;
          collaborator_notes?: string | null;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          added_by_collaborator_id?: string;
          make?: string;
          model?: string;
          year?: number;
          title?: string;
          description?: string | null;
          price_per_unit_usd?: number;
          total_quantity?: number;
          available_quantity?: number;
          minimum_order_quantity?: number;
          source_country?: 'china' | 'korea' | 'dubai';
          specs?: Json | null;
          images?: string[] | null;
          status?: 'pending' | 'approved' | 'rejected' | 'sold_out';
          is_visible?: boolean;
          rejection_reason?: string | null;
          admin_notes?: string | null;
          collaborator_notes?: string | null;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vehicle_batches_added_by_collaborator_id_fkey";
            columns: ["added_by_collaborator_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      batch_orders: {
        Row: {
          id: string;
          batch_id: string;
          user_id: string;
          quantity_ordered: number;
          price_per_unit_usd: number;
          total_price_usd: number;
          destination_country: string;
          destination_port: string | null;
          status: 'pending' | 'confirmed' | 'in_transit' | 'delivered' | 'cancelled';
          payment_status: 'pending' | 'paid' | 'failed';
          payment_reference: string | null;
          shipping_reference: string | null;
          estimated_delivery_date: string | null;
          actual_delivery_date: string | null;
          customer_notes: string | null;
          admin_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          batch_id: string;
          user_id: string;
          quantity_ordered: number;
          price_per_unit_usd: number;
          total_price_usd: number;
          destination_country: string;
          destination_port?: string | null;
          status?: 'pending' | 'confirmed' | 'in_transit' | 'delivered' | 'cancelled';
          payment_status?: 'pending' | 'paid' | 'failed';
          payment_reference?: string | null;
          shipping_reference?: string | null;
          estimated_delivery_date?: string | null;
          actual_delivery_date?: string | null;
          customer_notes?: string | null;
          admin_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          batch_id?: string;
          user_id?: string;
          quantity_ordered?: number;
          price_per_unit_usd?: number;
          total_price_usd?: number;
          destination_country?: string;
          destination_port?: string | null;
          status?: 'pending' | 'confirmed' | 'in_transit' | 'delivered' | 'cancelled';
          payment_status?: 'pending' | 'paid' | 'failed';
          payment_reference?: string | null;
          shipping_reference?: string | null;
          estimated_delivery_date?: string | null;
          actual_delivery_date?: string | null;
          customer_notes?: string | null;
          admin_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "batch_orders_batch_id_fkey";
            columns: ["batch_id"];
            referencedRelation: "vehicle_batches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "batch_orders_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      notification_queue: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          recipient: string;
          subject: string;
          subject_zh: string;
          message: string;
          message_zh: string;
          data: Json | null;
          priority: string;
          scheduled_for: string;
          sent_at: string | null;
          status: 'pending' | 'sent' | 'failed';
          error: string | null;
          retry_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          recipient: string;
          subject: string;
          subject_zh: string;
          message: string;
          message_zh: string;
          data?: Json | null;
          priority?: string;
          scheduled_for?: string;
          sent_at?: string | null;
          status?: 'pending' | 'sent' | 'failed';
          error?: string | null;
          retry_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          recipient?: string;
          subject?: string;
          subject_zh?: string;
          message?: string;
          message_zh?: string;
          data?: Json | null;
          priority?: string;
          scheduled_for?: string;
          sent_at?: string | null;
          status?: 'pending' | 'sent' | 'failed';
          error?: string | null;
          retry_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_queue_user_id_fkey";
            columns: ["user_id"];
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
export type Quote = Database['public']['Tables']['quotes']['Row'];
export type ChatConversation = Database['public']['Tables']['chat_conversations']['Row'];
export type ChatMessage = Database['public']['Tables']['chat_messages']['Row'];
export type QuoteReassignment = Database['public']['Tables']['quote_reassignments']['Row'];
export type AdminNotification = Database['public']['Tables']['admin_notifications']['Row'];
export type ShippingRoute = Database['public']['Tables']['shipping_routes']['Row'];
export type CollaboratorNotification = Database['public']['Tables']['collaborator_notifications']['Row'];
export type CollaboratorActivityLog = Database['public']['Tables']['collaborator_activity_log']['Row'];
export type VehicleBatchDb = Database['public']['Tables']['vehicle_batches']['Row'];
export type BatchOrder = Database['public']['Tables']['batch_orders']['Row'];

// Insert types
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type VehicleInsert = Database['public']['Tables']['vehicles']['Insert'];
export type BidInsert = Database['public']['Tables']['bids']['Insert'];
export type OrderInsert = Database['public']['Tables']['orders']['Insert'];
export type FavoriteInsert = Database['public']['Tables']['favorites']['Insert'];
export type NotificationInsert = Database['public']['Tables']['notifications']['Insert'];
export type QuoteInsert = Database['public']['Tables']['quotes']['Insert'];
export type VehicleBatchInsert = Database['public']['Tables']['vehicle_batches']['Insert'];
export type BatchOrderInsert = Database['public']['Tables']['batch_orders']['Insert'];

// Update types
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];
export type VehicleUpdate = Database['public']['Tables']['vehicles']['Update'];
export type BidUpdate = Database['public']['Tables']['bids']['Update'];
export type OrderUpdate = Database['public']['Tables']['orders']['Update'];
export type QuoteUpdate = Database['public']['Tables']['quotes']['Update'];
export type VehicleBatchUpdate = Database['public']['Tables']['vehicle_batches']['Update'];
export type BatchOrderUpdate = Database['public']['Tables']['batch_orders']['Update'];
