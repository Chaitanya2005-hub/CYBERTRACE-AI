import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''; // Fallback for testing if missing

// Use service role key to bypass RLS for server-side insertions.
// We manually enforce case_id / user_id ownership checks in the routes before inserting.
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
