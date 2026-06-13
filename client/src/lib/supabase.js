import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// 5-year TTL for signed URLs stored in the DB (profile pics, cover images, resources)
export const SIGNED_TTL = 60 * 60 * 24 * 365 * 5;

// Upload a file using a one-time signed upload token issued by our server.
// The server authorizes the write and picks the path; the browser no longer
// holds blanket storage access (the anon key can't read/overwrite/delete objects).
export async function uploadToSigned(bucket, path, token, file, contentType) {
  const { error } = await supabase.storage
    .from(bucket)
    .uploadToSignedUrl(path, token, file, contentType ? { contentType } : undefined);
  if (error) throw error;
  return path;
}

// Extracts the storage object path from either a public or signed Supabase URL
export function extractStoragePath(url, bucket) {
  if (!url) return null;
  try {
    const pathname = new URL(url).pathname;
    const m = pathname.match(new RegExp(`/object/(?:public|sign)/${bucket}/([^?]+)`));
    return m ? m[1] : null;
  } catch { return null; }
}
