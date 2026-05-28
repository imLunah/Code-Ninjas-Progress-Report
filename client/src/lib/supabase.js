import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// 5-year TTL for signed URLs stored in the DB (profile pics, cover images, resources)
export const SIGNED_TTL = 60 * 60 * 24 * 365 * 5;

// Extracts the storage object path from either a public or signed Supabase URL
export function extractStoragePath(url, bucket) {
  if (!url) return null;
  try {
    const pathname = new URL(url).pathname;
    const m = pathname.match(new RegExp(`/object/(?:public|sign)/${bucket}/([^?]+)`));
    return m ? m[1] : null;
  } catch { return null; }
}
