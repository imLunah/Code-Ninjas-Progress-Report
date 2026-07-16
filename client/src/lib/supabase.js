import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

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
