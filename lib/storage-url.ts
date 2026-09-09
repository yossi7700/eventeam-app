// Design-audit item: company/event branding paths (logo_path,
// hero_image_path, cover_image_path, avatar_path) have existed in the
// schema since the initial migration and are writable via Settings, but
// nothing in the app ever turned a stored path into a displayable URL --
// every *_path field was written and read back as a bare string, never
// rendered as an <img>. All buckets are public-read (20260827000003), so
// a plain public URL is enough; no signed-URL logic needed here.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

export type StorageBucket =
  | "avatars"
  | "company-logos"
  | "front-page-assets"
  | "event-images";

export function storageUrl(bucket: StorageBucket, path: string | null | undefined): string | null {
  if (!path || !SUPABASE_URL) return null;
  // Paths may already be stored as a full URL in some older rows -- pass
  // those through unchanged rather than double-prefixing.
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}
