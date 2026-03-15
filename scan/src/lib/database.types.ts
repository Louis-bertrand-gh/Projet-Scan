/* ═══════════════════════════════════════════════════════════════════════
 * database.types.ts — Types TypeScript du schéma Supabase
 * ═══════════════════════════════════════════════════════════════════════ */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      sites: {
        Row: {
          id: string;
          nom: string;
          localisation: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          nom: string;
          localisation: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          nom?: string;
          localisation?: string;
          created_at?: string;
        };
        Relationships: [];
      };

      emplacements: {
        Row: {
          id: string;
          nom: string;
          site_id: string;
          icone: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          nom: string;
          site_id: string;
          icone: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          nom?: string;
          site_id?: string;
          icone?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "emplacements_site_id_fkey";
            columns: ["site_id"];
            isOneToOne: false;
            referencedRelation: "sites";
            referencedColumns: ["id"];
          },
        ];
      };

      categories: {
        Row: {
          id: string;
          nom: string;
          description: string | null;
          icone: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          nom: string;
          description?: string | null;
          icone: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          nom?: string;
          description?: string | null;
          icone?: string;
          created_at?: string;
        };
        Relationships: [];
      };

      produits: {
        Row: {
          id: string;
          nom: string;
          categorie_id: string;
          unite: string;
          seuil_reassort: number;
          stock_actuel: number;
          code_barres: string | null;
          temperature_conservation: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          nom: string;
          categorie_id: string;
          unite: string;
          seuil_reassort: number;
          stock_actuel?: number;
          code_barres?: string | null;
          temperature_conservation?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          nom?: string;
          categorie_id?: string;
          unite?: string;
          seuil_reassort?: number;
          stock_actuel?: number;
          code_barres?: string | null;
          temperature_conservation?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "produits_categorie_id_fkey";
            columns: ["categorie_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };

      emplacement_categories: {
        Row: {
          emplacement_id: string;
          categorie_id: string;
        };
        Insert: {
          emplacement_id: string;
          categorie_id: string;
        };
        Update: {
          emplacement_id?: string;
          categorie_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "emplacement_categories_emplacement_id_fkey";
            columns: ["emplacement_id"];
            isOneToOne: false;
            referencedRelation: "emplacements";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "emplacement_categories_categorie_id_fkey";
            columns: ["categorie_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };

      emplacement_produits: {
        Row: {
          emplacement_id: string;
          produit_id: string;
        };
        Insert: {
          emplacement_id: string;
          produit_id: string;
        };
        Update: {
          emplacement_id?: string;
          produit_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "emplacement_produits_emplacement_id_fkey";
            columns: ["emplacement_id"];
            isOneToOne: false;
            referencedRelation: "emplacements";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "emplacement_produits_produit_id_fkey";
            columns: ["produit_id"];
            isOneToOne: false;
            referencedRelation: "produits";
            referencedColumns: ["id"];
          },
        ];
      };

      utilisateurs: {
        Row: {
          id: string;
          nom: string;
          prenom: string;
          email: string;
          role: "admin" | "cc" | "cca" | "rp" | "equipier";
          avatar: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          nom: string;
          prenom: string;
          email: string;
          role?: "admin" | "cc" | "cca" | "rp" | "equipier";
          avatar?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          nom?: string;
          prenom?: string;
          email?: string;
          role?: "admin" | "cc" | "cca" | "rp" | "equipier";
          avatar?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };

      utilisateur_sites: {
        Row: {
          utilisateur_id: string;
          site_id: string;
        };
        Insert: {
          utilisateur_id: string;
          site_id: string;
        };
        Update: {
          utilisateur_id?: string;
          site_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "utilisateur_sites_utilisateur_id_fkey";
            columns: ["utilisateur_id"];
            isOneToOne: false;
            referencedRelation: "utilisateurs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "utilisateur_sites_site_id_fkey";
            columns: ["site_id"];
            isOneToOne: false;
            referencedRelation: "sites";
            referencedColumns: ["id"];
          },
        ];
      };

      captures: {
        Row: {
          id: string;
          produit_id: string | null;
          emplacement_id: string;
          user_id: string;
          date_capture: string;
          numero_lot: string;
          dlc: string;
          nom_produit_ocr: string;
          nom_produit_valide: string;
          temperature: number | null;
          conforme: boolean;
          commentaire: string | null;
          photo_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          produit_id?: string | null;
          emplacement_id: string;
          user_id: string;
          date_capture?: string;
          numero_lot: string;
          dlc: string;
          nom_produit_ocr: string;
          nom_produit_valide: string;
          temperature?: number | null;
          conforme?: boolean;
          commentaire?: string | null;
          photo_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          produit_id?: string | null;
          emplacement_id?: string;
          user_id?: string;
          date_capture?: string;
          numero_lot?: string;
          dlc?: string;
          nom_produit_ocr?: string;
          nom_produit_valide?: string;
          temperature?: number | null;
          conforme?: boolean;
          commentaire?: string | null;
          photo_url?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "captures_produit_id_fkey";
            columns: ["produit_id"];
            isOneToOne: false;
            referencedRelation: "produits";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "captures_emplacement_id_fkey";
            columns: ["emplacement_id"];
            isOneToOne: false;
            referencedRelation: "emplacements";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "captures_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "utilisateurs";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: "admin" | "cc" | "cca" | "rp" | "equipier";
    };
    CompositeTypes: Record<string, never>;
  };
}
