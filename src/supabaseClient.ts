import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://ovwktjjeoowlktdfbuuu.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_B2pz5WTA3UEVUeKACIgmBw_8_r0S3kU";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
