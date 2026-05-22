import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase URL and Anon Key are missing. Please add them to your .env.local file.")
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder')

export const handleAuthError = (error) => {
  if (!error) return false;
  
  const isAuthError = 
    error.status === 401 || 
    error.code === 'PGRST301' || 
    (error.message && (
      error.message.includes('JWT') || 
      error.message.toLowerCase().includes('expired') || 
      error.message.toLowerCase().includes('invalid token') ||
      error.message.toLowerCase().includes('token')
    ));
    
  if (isAuthError) {
    console.warn("Authentication error detected globally. Force signing out.");
    supabase.auth.signOut();
    return true;
  }
  return false;
};
