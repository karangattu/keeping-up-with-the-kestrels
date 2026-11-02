import { createClient } from "@supabase/supabase-js";
import { SCORING_VERSION } from "./game";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://ovwktjjeoowlktdfbuuu.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_B2pz5WTA3UEVUeKACIgmBw_8_r0S3kU";

export const HIGH_SCORES_TABLE = `kestrel_high_scores_v${SCORING_VERSION}`;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
