import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          created_at?: string;
        };
      };
      students: {
        Row: {
          id: string;
          name: string;
          class: string;
          added_by: string;
          created_at: string;
          roll_number: string;
          register_number: string;
          department: string;
          shift: number;
        };
        Insert: {
          id?: string;
          name: string;
          class: string;
          added_by: string;
          created_at?: string;
          roll_number: string;
          register_number: string;
          department: string;
          shift: number;
        };
        Update: {
          id?: string;
          name?: string;
          class?: string;
          added_by?: string;
          created_at?: string;
          roll_number?: string;
          register_number?: string;
          department?: string;
          shift?: number;
        };
      };
      attendance: {
        Row: {
          id: string;
          student_name: string;
          student_class: string;
          status: 'present' | 'absent';
          recorded_by: string;
          recorded_at: string;
          date: string;
          student_id: string | null;
        };
        Insert: {
          id?: string;
          student_name: string;
          student_class: string;
          status: 'present' | 'absent';
          recorded_by: string;
          recorded_at?: string;
          date?: string;
          student_id?: string | null;
        };
        Update: {
          id?: string;
          student_name?: string;
          student_class?: string;
          status?: 'present' | 'absent';
          recorded_by?: string;
          recorded_at?: string;
          date?: string;
          student_id?: string | null;
        };
      };
    };
  };
};