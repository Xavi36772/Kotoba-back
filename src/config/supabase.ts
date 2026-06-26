import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Faltan las credenciales de Supabase en el archivo .env');
}

// Cliente público normal
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cliente administrador (salta RLS, usar solo en el backend con precaución)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

